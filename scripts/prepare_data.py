"""
Build the app's data files (public/data/*.json) and readable CSVs (data/processed/)
from the supplied raw datasets in data/raw and data/reference.

Run:  python3 scripts/prepare_data.py              (uses cached WorldPop results)
      python3 scripts/prepare_data.py --refresh    (re-query WorldPop for every ward)
      python3 scripts/prepare_data.py --offline    (never touch the network)

Needs: shapely, certifi (pip install shapely certifi) and pdftotext (poppler).
Network is used ONLY for WorldPop ward population, once, then cached in
data/processed/ward_population_worldpop_2026.json. The app never calls WorldPop.
Nothing is invented: missing values stay null and are shown as "—" in the app.
"""
import csv
import json
import math
import re
import ssl
import subprocess
import sys
import time
import urllib.request
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

from shapely.geometry import Point, mapping, shape
from shapely.strtree import STRtree

try:  # python.org builds on macOS ship without a CA bundle
    import certifi

    SSL_CTX = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    SSL_CTX = ssl.create_default_context()

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
PROC = ROOT / "data" / "processed"
REF = ROOT / "data" / "reference"
OUT = ROOT / "public" / "data"
REFRESH = "--refresh" in sys.argv
OFFLINE = "--offline" in sys.argv
TODAY = date.today().isoformat()

WORLDPOP = "https://api.worldpop.org/v2"
POP_YEAR = 2026

# Chennai sanity box: anything outside is treated as an invalid coordinate.
LAT_MIN, LAT_MAX, LON_MIN, LON_MAX = 12.6, 13.4, 79.8, 80.5


def valid(lat, lon):
    return isinstance(lat, (int, float)) and isinstance(lon, (int, float)) and LAT_MIN <= lat <= LAT_MAX and LON_MIN <= lon <= LON_MAX


def haversine_km(lat1, lon1, lat2, lon2):
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * 6371.0 * math.asin(math.sqrt(a))


def http_json(url, body=None, timeout=60):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout, context=SSL_CTX) as r:
        return json.loads(r.read().decode("utf-8"))


def tidy(s):
    return re.sub(r"\s+", " ", s or "").strip(" ,.") or None


def clean_phone(raw):
    if not raw:
        return None
    first = re.split(r"[;,/]", str(raw))[0]
    digits = re.sub(r"[^\d+]", "", first)
    n = len(digits.lstrip("+"))
    return digits if 8 <= n <= 13 else None  # otherwise not dialable


# ---------------------------------------------------------------- GCC official facilities (KML)
GCC_FILES = {
    "chennai_uphcs.kml": ("gcc", "Urban Primary Health Centre (UPHC)"),
    "chennai_uchcs.kml": ("gcc", "Urban Community Health Centre (UCHC, 24×7)"),
    "chennai_maternity_hosps.kml": ("gcc", "Maternity hospital / EmOC (24×7)"),
    "chennai_tbs.kml": ("gcc", "TB centre"),
    "chennai_vphcs.kml": ("vet", "Veterinary clinic (GCC)"),
    "chennai_abc_centres.kml": ("abc", "Animal Birth Control centre"),
}


def read_kml(path):
    text = path.read_text(encoding="utf-8")
    for pm in re.findall(r"<Placemark>(.*?)</Placemark>", text, re.S):
        props = {k: v.strip() for k, v in re.findall(r'<SimpleData name="([^"]+)">([^<]*)</SimpleData>', pm)}
        c = re.search(r"<coordinates>\s*([-\d.]+),([-\d.]+)", pm)
        yield props, (float(c.group(2)), float(c.group(1))) if c else (None, None)


SHORT = {"chennai_uphcs.kml": "UPHC", "chennai_uchcs.kml": "UCHC", "chennai_maternity_hosps.kml": "Maternity hospital",
         "chennai_tbs.kml": "TB centre", "chennai_vphcs.kml": "Pet clinic", "chennai_abc_centres.kml": "ABC centre"}


def gcc_name(props, fname):
    """GCC files carry no name column; derive one from LOCATION or the address."""
    short = SHORT[fname]
    if props.get("LOCATION"):
        return f"{tidy(props['LOCATION'])} {short}"
    addr = tidy(props.get("ADDRESS")) or ""
    m = re.match(r"^([^,]*?\b(UPHC|UCHC|PHC|Hospital|Clinic|Centre|Center|Dispensary)\b[^,]*)", addr, re.I)
    if m:
        return tidy(m.group(1))
    parts = [tidy(x) for x in addr.split(",") if tidy(x)]
    # first address part that looks like a place name (no digits, not a street)
    for part in parts:
        if not re.search(r"\d|street|\bst\b|road|salai|\bch\b|chennai|unit office|near", part, re.I) and 3 <= len(part) <= 30:
            place = re.sub(r"\bHP\b", "", part).strip()
            return f"{place.title()} {short}"
    if parts and short == "ABC centre":
        return f"{short}, {parts[0].title()}"
    return f"{short} {props.get('FINAL_CODE', '')}".strip()


def build_gcc(dropped):
    out = []
    for fname, (cat, kind) in GCC_FILES.items():
        for props, (lat, lon) in read_kml(RAW / "gcc_open_data" / fname):
            if not valid(lat, lon):
                dropped["gcc_bad_coord"] += 1
                continue
            out.append({
                "id": f"gcc/{props.get('FINAL_CODE') or props.get('OBJECTID')}/{fname[8:-4]}",
                "name": gcc_name(props, fname),
                "cat": cat,
                "kind": kind,
                "src": "gcc",
                "lat": round(lat, 6), "lon": round(lon, 6),
                "address": tidy(props.get("ADDRESS")),
                "phone": clean_phone(props.get("CONTACT") or props.get("CONTACT_NO")),
                "is247": "24" in (props.get("TYPE", "") + kind) or None,
                "gccZone": props.get("ZONE") or props.get("ZN"),
                "gccDivision": props.get("DIVISION") or props.get("DIV"),
            })
    return out


# ---------------------------------------------------------------- OpenStreetMap facilities
GOV_NAME = re.compile(r"\b(govt\.?|government|urban primary health|uphc|uchc|phc|chc|hsc|corporation|e\.?s\.?i\.?|primary health cent(re|er)|community health cent(re|er)|sub health cent(re|er)|health sub[- ]?cent(re|er))\b", re.I)
VET_NAME = re.compile(r"veterinar|\bvet\b|pet clinic|animal hospital|blue cross|pinjrapole", re.I)


def classify_osm(p):
    amen, hc, name = p.get("amenity"), p.get("healthcare"), p.get("name", "")
    if amen == "veterinary" or hc == "veterinary" or VET_NAME.search(name):
        return "vet", "Veterinary (OSM)"
    op = (p.get("operator:type") or "").lower()
    if op in ("government", "public") or GOV_NAME.search(name) or GOV_NAME.search(p.get("operator", "")):
        return "govh", "Government hospital / dispensary (OSM)"
    if amen == "hospital" or hc == "hospital":
        return "hospital", "Hospital (OSM)"
    return "clinic", "Clinic / doctor (OSM)"


def greater_chennai_features(known_ids):
    """Extra OSM points outside the city export (Tambaram, Chengalpattu, Kattankulathur, Avadi...),
    from scripts/download_osm.py. Converted to the same GeoJSON shape as the original export."""
    path = RAW / "osm_greater_chennai_overpass.json"
    if not path.exists():
        return []
    feats = []
    for e in json.loads(path.read_text()).get("elements", []):
        oid = f"{e['type']}/{e['id']}"
        if oid in known_ids:
            continue
        c = e.get("center") or {"lat": e.get("lat"), "lon": e.get("lon")}
        if c.get("lat") is None:
            continue
        props = dict(e.get("tags", {}))
        props["@id"] = oid
        feats.append({"type": "Feature", "id": oid, "properties": props, "geometry": {"type": "Point", "coordinates": [c["lon"], c["lat"]]}})
    return feats


def build_osm(dropped):
    src = json.loads((RAW / "chennai_osm_healthcare.geojson").read_text())
    extra = greater_chennai_features({f["properties"].get("@id") or f.get("id") for f in src["features"]})
    print("OSM greater-Chennai extra points:", len(extra))
    out = []
    for f in src["features"] + extra:
        p, g = f["properties"], f.get("geometry") or {}
        if g.get("type") != "Point":
            dropped["osm_no_point"] += 1
            continue
        lon, lat = g["coordinates"][:2]
        if not valid(lat, lon):
            dropped["osm_bad_coord"] += 1
            continue
        name = p.get("name") or p.get("name:en")
        if not name:
            dropped["osm_no_name"] += 1
            continue
        cat, kind = classify_osm(p)
        addr = p.get("addr:full") or ", ".join(x for x in [p.get("addr:housenumber"), p.get("addr:street"), p.get("addr:suburb"), p.get("addr:city")] if x)
        out.append({
            "id": p.get("@id") or f.get("id"),
            "name": tidy(name), "nameTa": p.get("name:ta"),
            "cat": cat, "kind": kind, "src": "osm",
            "lat": round(lat, 6), "lon": round(lon, 6),
            "address": tidy(addr),
            "phone": clean_phone(p.get("phone") or p.get("contact:phone") or p.get("contact:mobile") or p.get("mobile")),
            "website": p.get("website"),
            "emergency": p.get("emergency") == "yes" or None,
        })
    return out, src.get("timestamp")


def merge_gcc(gcc):
    """TB centres and some 24x7 units share a building with a UPHC/UCHC (same name, < 30 m).
    Keep one record and list all services in `kind`."""
    out = []
    for g in gcc:
        twin = next((o for o in out if o["cat"] == g["cat"] and o["name"].lower() == g["name"].lower()
                     and haversine_km(o["lat"], o["lon"], g["lat"], g["lon"]) < 0.03), None)
        if twin:
            if g["kind"] not in twin["kind"]:
                twin["kind"] += f" · {g['kind']}"
            twin["is247"] = twin["is247"] or g["is247"]
            twin["phone"] = twin["phone"] or g["phone"]
        else:
            out.append(dict(g))
    return out, len(gcc) - len(out)


def dedupe(gcc, osm):
    """Drop an OSM point when a GCC record of a compatible type sits within 75 m.
    GCC (official) wins; we never merge two different facilities by name alone."""
    kept, removed = [], 0
    for o in osm:
        dup = any(
            haversine_km(o["lat"], o["lon"], g["lat"], g["lon"]) < 0.075 and (o["cat"] in ("govh", "clinic") and g["cat"] == "gcc" or o["cat"] == g["cat"] == "vet")
            for g in gcc
        )
        if dup:
            removed += 1
        else:
            kept.append(o)
    return kept, removed


# ---------------------------------------------------------------- anti-rabies listings (sourced)
def apply_arv(facilities):
    """data/raw/arv_centres_chennai.csv links a facility id to a documented anti-rabies listing.
    status = official (government list) | news (reported in the press). Only these get an ARV badge."""
    path = RAW / "arv_centres_chennai.csv"
    if not path.exists():
        return 0
    by_id = {f["id"]: f for f in facilities}
    n = 0
    with open(path, newline="", encoding="utf-8") as fh:
        for row in csv.DictReader(fh):
            f = by_id.get(row["osm_or_gcc_id"].strip())
            if not f:
                print("  ARV listing not matched:", row["osm_or_gcc_id"], row["listed_name"])
                continue
            # every clinic on the official (state) list is a government institution
            if row["status"].strip() == "official" and f["cat"] in ("hospital", "clinic"):
                f["cat"], f["kind"] = "govh", "Government hospital (TN anti-rabies clinic list)"
            f["arv"] = {"status": row["status"].strip(), "listedName": row["listed_name"], "source": row["source"],
                        "url": row["source_url"], "date": row["source_date"], "checked": row["checked_on"]}
            n += 1
    return n


# ---------------------------------------------------------------- NRCP official list
def pdf_text(path):
    return subprocess.run(["pdftotext", "-layout", str(path), "-"], capture_output=True, text=True, check=True).stdout


def nrcp_summary():
    text = pdf_text(REF / "nrcp_anti_rabies_clinics_2026-03-26.pdf")
    serials = [int(m) for m in re.findall(r"^\s*(\d{1,3})\s{2,}[A-Za-z]", text, re.M)]
    upd = re.search(r"Last Updated on:\s*([^\n]+)", text)
    return {
        "source": "National Rabies Control Programme — List of Anti Rabies Clinic",
        "url": "https://rabiesfreeindia.mohfw.gov.in/",
        "lastUpdated": upd.group(1).strip() if upd else None,
        "entries": max(serials) if serials else None,
        "tamilNaduOrChennaiEntries": len(re.findall(r"tamil\s*nadu|chennai", text, re.I)),
    }


# ---------------------------------------------------------------- dog bites (state level)
def dog_bites():
    rows = []
    text = pdf_text(REF / "LSQ4870_dog_bites_2022_2025.pdf")
    tn = re.findall(r"^\s*Tamil Nadu\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)", text, re.M)
    labels = ["2022", "2023", "2024", "2025 (Jan)"]
    if tn:
        rows += [{"year": y, "metric": "dog_bite_cases", "value": int(v.replace(",", "")), "geography": "Tamil Nadu (state)",
                  "source": "Lok Sabha USQ 4870 (01-04-2025), Annexure-I — IDSP/IHIP as on 27-02-2025"} for y, v in zip(labels, tn[0])]
    if len(tn) > 1:
        rows += [{"year": y, "metric": "suspected_human_rabies_deaths", "value": int(v.replace(",", "")), "geography": "Tamil Nadu (state)",
                  "source": "Lok Sabha USQ 4870 (01-04-2025), Annexure-II — IDSP/IHIP"} for y, v in zip(labels, tn[1])]
    # Rajya Sabha CSV (2018–2023) uses old-Mac "\r" line endings; normalise before csv parsing.
    raw = (RAW / "RS_Session_262_AU_1058_A_to_B_i.csv").read_text(encoding="utf-8").replace("\r\n", "\n").replace("\r", "\n")
    for r in csv.DictReader(raw.splitlines()):
        if (r.get("States/UT") or "").strip() == "Tamil Nadu":
            rows += [{"year": y, "metric": "dog_bite_cases_rs", "value": int(r[y]), "geography": "Tamil Nadu (state)",
                      "source": "Rajya Sabha Session 262, Unstarred Q 1058 (data.gov.in)"} for y in ("2018", "2019", "2020", "2021", "2022", "2023") if r.get(y, "").strip().isdigit()]
    return rows


# ---------------------------------------------------------------- WorldPop (cached)
def ward_population(wards):
    cache_path = PROC / f"ward_population_worldpop_{POP_YEAR}.json"
    cache = json.loads(cache_path.read_text()) if cache_path.exists() and not REFRESH else {}
    todo = [w for w in wards if w["ward"] not in cache]
    if not todo or OFFLINE:
        return cache
    print(f"WorldPop: submitting {len(todo)} wards (year {POP_YEAR}, 100 m) ...")
    pending = {}
    for w in todo:
        try:
            r = http_json(f"{WORLDPOP}/population", {"geojson": w["geom_json"], "year": POP_YEAR, "resolution": "100m"})
            pending[r["task_id"]] = w["ward"]
        except Exception as e:
            print("  submit failed", w["ward"], e)
        time.sleep(0.2)
    for _ in range(120):
        if not pending:
            break
        time.sleep(3)
        for tid, ward in list(pending.items()):
            try:
                r = http_json(f"{WORLDPOP}/tasks/{tid}", timeout=30)
            except Exception:
                continue
            if r.get("status") == "success":
                cache[ward] = round(r["result"]["total_population"])
                del pending[tid]
            elif r.get("status") == "failure":
                print("  failed", ward, r.get("error"))
                del pending[tid]
        cache_path.write_text(json.dumps(cache, indent=0, sort_keys=True))
    if pending:
        print("WorldPop: unresolved wards", sorted(pending.values()))
    return cache


# ---------------------------------------------------------------- area search list
STOP = re.compile(r"\d|road|\brd\b|street|\bst\b|salai|lane|avenue|\bopp|near|chennai|tamil|india|block|floor|main|cross|hospital|uphc|uchc|\bch\b|^no\b", re.I)


def localities(facilities):
    pts = defaultdict(list)
    for f in facilities:
        if not f.get("address"):
            continue
        for tok in [t.strip(" .") for t in f["address"].split(",") if t.strip()][-3:]:
            if STOP.search(tok) or not (4 <= len(tok) <= 26):
                continue
            pts[re.sub(r"[^a-z]", "", tok.lower())].append((tok.title(), f["lat"], f["lon"]))
    res = []
    for items in pts.values():
        if len(items) < 3:
            continue
        lats, lons = sorted(i[1] for i in items), sorted(i[2] for i in items)
        res.append({"name": Counter(i[0] for i in items).most_common(1)[0][0], "lat": lats[len(lats) // 2], "lon": lons[len(lons) // 2]})
    return sorted(res, key=lambda x: x["name"])


# ---------------------------------------------------------------- main
def main():
    OUT.mkdir(parents=True, exist_ok=True)
    PROC.mkdir(parents=True, exist_ok=True)
    dropped = Counter()

    raw_gcc = build_gcc(dropped)
    gcc, merged = merge_gcc(raw_gcc)
    osm, osm_ts = build_osm(dropped)
    osm, dup_removed = dedupe(gcc, osm)
    facilities = gcc + osm
    arv_n = apply_arv(facilities)

    wards_raw = json.loads((RAW / "datameet_chennai" / "Wards.geojson").read_text())
    wards = []
    for f in wards_raw["features"]:
        p = f["properties"]
        g = shape(f["geometry"])
        g = g if g.is_valid else g.buffer(0)
        cantonment = p.get("Zone_No") == "-"
        wards.append({
            "ward": "STM" if cantonment else str(p["Ward_No"]),
            "label": "St. Thomas Mount (Cantonment)" if cantonment else f"Ward {p['Ward_No']}",
            "zone": None if cantonment else p.get("Zone_No"),
            "zoneName": p.get("Zone_Name", "").title().replace("-", " "),
            "geom": g, "geom_json": f["geometry"],
        })

    tree = STRtree([w["geom"] for w in wards])
    counts, outside = defaultdict(Counter), 0
    for fac in facilities:
        pt = Point(fac["lon"], fac["lat"])
        hit = next((wards[i] for i in tree.query(pt) if wards[i]["geom"].covers(pt)), None)
        fac["ward"] = hit["ward"] if hit else None
        fac["zoneName"] = hit["zoneName"] if hit else None
        if hit:
            counts[hit["ward"]][fac["cat"]] += 1
        else:
            outside += 1

    pop = ward_population(wards)
    govt = [f for f in facilities if f["cat"] in ("gcc", "govh")]
    arv_official = [f for f in facilities if f.get("arv", {}).get("status") == "official"]

    rows, features = [], []
    for w in wards:
        g, c = w["geom"], w["geom"].representative_point()
        area = g.area * 111.32 * 111.32 * math.cos(math.radians(c.y))  # deg² -> km² (approx.)
        near = min(govt, key=lambda f: haversine_km(c.y, c.x, f["lat"], f["lon"]))
        near_arv = min(arv_official, key=lambda f: haversine_km(c.y, c.x, f["lat"], f["lon"])) if arv_official else None
        cnt, p = counts[w["ward"]], pop.get(w["ward"])
        rows.append({
            "ward": w["ward"], "label": w["label"], "zone": w["zone"], "zoneName": w["zoneName"],
            "areaKm2": round(area, 2),
            "population": p,
            "density": round(p / area) if p and area else None,
            "lat": round(c.y, 5), "lon": round(c.x, 5),
            "gcc": cnt["gcc"], "govh": cnt["govh"], "hospital": cnt["hospital"], "clinic": cnt["clinic"], "vet": cnt["vet"], "abc": cnt["abc"],
            "govtTotal": cnt["gcc"] + cnt["govh"],
            "govtPer100k": round((cnt["gcc"] + cnt["govh"]) / p * 1e5, 2) if p else None,
            "nearestGovtKm": round(haversine_km(c.y, c.x, near["lat"], near["lon"]), 2),
            "nearestGovtName": near["name"],
            "nearestArvKm": round(haversine_km(c.y, c.x, near_arv["lat"], near_arv["lon"]), 2) if near_arv else None,
            "nearestArvName": near_arv["name"] if near_arv else None,
        })
        simple = g.simplify(0.0001, preserve_topology=True)
        geom = json.loads(json.dumps(mapping(simple)), parse_float=lambda s: round(float(s), 5))
        features.append({"type": "Feature", "properties": {"ward": w["ward"]}, "geometry": geom})

    nrcp, bites, locs = nrcp_summary(), dog_bites(), localities(facilities)

    def write_csv(name, data):
        keys = list(dict.fromkeys(k for r in data for k in r))
        with open(PROC / name, "w", newline="", encoding="utf-8") as fh:
            wr = csv.DictWriter(fh, fieldnames=keys)
            wr.writeheader()
            wr.writerows(data)

    write_csv("chennai_facilities_merged.csv", facilities)
    write_csv("chennai_ward_access.csv", rows)
    write_csv("tamil_nadu_dog_bites.csv", bites)

    def dump(name, obj):
        (OUT / name).write_text(json.dumps(obj, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")

    dump("facilities.json", facilities)
    dump("wards.geojson", {"type": "FeatureCollection", "features": features})
    dump("wards.json", rows)
    dump("localities.json", locs)
    dump("meta.json", {
        "generated": TODAY,
        "facilities": {"total": len(facilities), "byCat": dict(Counter(f["cat"] for f in facilities)),
                        "dropped": dict(dropped), "osmDuplicatesOfGcc": dup_removed, "gccSameBuildingMerged": merged, "outsideWards": outside},
        "osm": {"timestamp": osm_ts, "raw": 1084, "greaterChennaiRaw": len(greater_chennai_features(set()))},
        "gcc": {"source": "Greater Chennai Corporation open data (data.gov.in) — KML", "byKind": dict(Counter(f["kind"] for f in raw_gcc)), "records": len(raw_gcc), "afterMerge": len(gcc)},
        "wards": {"count": len(rows), "source": "DataMeet Municipal_Spatial_Data — Chennai/Wards.geojson (Transparent Chennai), CC BY-SA 2.5 IN"},
        "population": {"source": "WorldPop API v2 (Global2, 100 m, modelled estimate)", "year": POP_YEAR,
                        "wardsWithValue": sum(1 for r in rows if r["population"]), "total": sum(r["population"] or 0 for r in rows),
                        "userPolygonTotal": 7093991.5, "userPolygonAreaKm2": 1823.25},
        "nrcp": nrcp,
        "arv": {"official": len(arv_official), "total": arv_n,
                "source": "TN State Action Plan for Rabies Elimination (Health & FW Dept, Oct 2024) + news (Sep 2025)"},
        "dogBites": bites,
    })
    print("gcc merged", merged)
    print("facilities", len(facilities), dict(Counter(f["cat"] for f in facilities)), "dropped", dict(dropped), "dupes", dup_removed, "outside wards", outside)
    print("wards", len(rows), "with population", sum(1 for r in rows if r["population"]), "localities", len(locs))
    print("nrcp", nrcp)
    print("bites", len(bites))


if __name__ == "__main__":
    main()
