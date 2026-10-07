"""
Download health facilities for GREATER Chennai (incl. Tambaram, Chengalpattu, Kattankulathur,
Avadi, Poonamallee) from OpenStreetMap via Overpass, once, and cache the raw result.

Your original export (data/raw/chennai_osm_healthcare.geojson) only covers the city limits, so
e.g. SRM Medical College Hospital at Kattankulathur was missing. prepare_data.py merges both.

Run: python3 scripts/download_osm.py   -> data/raw/osm_greater_chennai_overpass.json
Overpass is free and keyless; we keep requests small (tiles) and polite (retries with backoff).
"""
import json
import ssl
import time
import urllib.parse
import urllib.request
from pathlib import Path

try:
    import certifi

    CTX = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    CTX = ssl.create_default_context()

OUT = Path(__file__).resolve().parent.parent / "data" / "raw" / "osm_greater_chennai_overpass.json"
SERVERS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter"]
S, W, N, E = 12.60, 79.85, 13.40, 80.40
STEP = 0.2  # ~22 km tiles


def query(bbox):
    b = ",".join(f"{v:.2f}" for v in bbox)
    return (
        f'[out:json][timeout:90];('
        f'nwr["amenity"~"^(hospital|clinic|doctors|veterinary)$"]({b});'
        f'nwr["healthcare"~"^(hospital|clinic|doctor|centre|veterinary)$"]({b});'
        f');out center tags;'
    )


def fetch(q):
    data = urllib.parse.urlencode({"data": q}).encode()
    last = None
    for attempt in range(4):
        url = SERVERS[attempt % len(SERVERS)]
        try:
            req = urllib.request.Request(url, data=data, headers={"User-Agent": "RabiesPulseAI/1.0 (hackathon prototype)", "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=150, context=CTX) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception as e:  # busy / timeout: back off and try the next mirror
            last = e
            time.sleep(5 * (attempt + 1))
    raise RuntimeError(f"Overpass failed: {last}")


TILES = OUT.parent / "osm_tiles"


def get_tile(bbox, depth=0):
    """Cached per tile; a tile that keeps timing out is split into 4 smaller ones."""
    TILES.mkdir(exist_ok=True)
    f = TILES / ("_".join(f"{v:.3f}" for v in bbox) + ".json")
    if f.exists():
        return json.loads(f.read_text())
    try:
        els = fetch(query(bbox)).get("elements", [])
    except RuntimeError:
        if depth >= 2:
            raise
        s, w, n, e = bbox
        ms, mw = (s + n) / 2, (w + e) / 2
        els = []
        for sub in ((s, w, ms, mw), (s, mw, ms, e), (ms, w, n, mw), (ms, mw, n, e)):
            els += get_tile(sub, depth + 1)
    f.write_text(json.dumps(els))
    return els


def main():
    elements, seen = [], set()
    lat = S
    while lat < N - 1e-9:
        lon = W
        while lon < E - 1e-9:
            bbox = (round(lat, 3), round(lon, 3), round(min(lat + STEP, N), 3), round(min(lon + STEP, E), 3))
            new = [x for x in get_tile(bbox) if (x["type"], x["id"]) not in seen]
            seen.update((x["type"], x["id"]) for x in new)
            elements += new
            print(f"tile {bbox}: +{len(new)} (total {len(elements)})", flush=True)
            lon += STEP
        lat += STEP
    OUT.write_text(json.dumps({"bbox": [S, W, N, E], "downloaded": time.strftime("%Y-%m-%d"), "elements": elements}))
    print("saved", OUT, len(elements))


if __name__ == "__main__":
    main()
