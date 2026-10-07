"""
SIMULATED / DEMO DATA generator for the officer dashboard.

No ward- or month-level bite, vaccination or dog-vaccination data exists in the
supplied sources, so this script makes a clearly labelled synthetic dataset.
Nothing here is an observation. Official statistics are never changed.

Run:  python3 scripts/simulate_data.py        (standard library only)

Real inputs (read, not altered):
  public/data/wards.json  ward ids, population (WorldPop, modelled), centroids,
                          distance to the nearest listed anti-rabies clinic
  public/data/meta.json   official Tamil Nadu dog-bite totals (reference only)

How the synthetic values are made (fixed seed, so every run gives the same file):
  1. Each ward gets a "dog pressure" value from a smooth random surface, so
     neighbouring wards look alike and hotspots form clusters.
  2. Expected monthly bites = population x BASE_RATE x pressure x season x trend
     x short local flare-ups. Counts are Poisson draws.
     - BASE_RATE is an ASSUMED demonstration parameter, not an estimate for Chennai.
     - trend uses the official Tamil Nadu 2023->2024 change as its yearly slope.
     - check: the simulated yearly total must stay below the official state total.
  3. Animal type and age group are multinomial splits with assumed shares.
  4. Vaccine-course completion falls with the REAL distance to a listed clinic.
  5. Dog vaccination coverage is lower where dog pressure is high, and steps up
     in wards that get a simulated vaccination campaign.

Outputs:
  public/data/sim.json                         compact file used by the dashboard
  data/simulated/ward_month_SIMULATED.csv      one row per ward and month
"""
import csv
import json
import math
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "data"
CSV_DIR = ROOT / "data" / "simulated"

SEED = 20261007
MONTHS = 24
LAST_MONTH = (2026, 9)  # last full month before the build date
BASE_RATE = 0.00035  # ASSUMED bites per resident per month (demo parameter)
ANIMALS = ["dog", "cat", "monkey", "other"]
ANIMAL_SHARE = [0.80, 0.11, 0.04, 0.05]  # assumed
AGES = ["0-14", "15-59", "60+"]
AGE_SHARE = [0.32, 0.55, 0.13]  # assumed


def month_list():
    y, m = LAST_MONTH
    out = []
    for _ in range(MONTHS):
        out.append(f"{y}-{m:02d}")
        m -= 1
        if m == 0:
            y, m = y - 1, 12
    return out[::-1]


def poisson(rng, lam):
    if lam <= 0:
        return 0
    if lam > 30:
        return max(0, round(rng.gauss(lam, math.sqrt(lam))))
    limit, k, p = math.exp(-lam), 0, 1.0
    while True:
        p *= rng.random()
        if p <= limit:
            return k
        k += 1


def multinomial(rng, n, shares):
    out = [0] * len(shares)
    for _ in range(n):
        r, acc = rng.random(), 0.0
        for i, s in enumerate(shares):
            acc += s
            if r < acc or i == len(shares) - 1:
                out[i] += 1
                break
    return out


def binomial(rng, n, p):
    return sum(1 for _ in range(n) if rng.random() < p)


def jitter(rng, shares, amount):
    v = [max(0.01, s * (1 + rng.uniform(-amount, amount))) for s in shares]
    t = sum(v)
    return [x / t for x in v]


def km(a, b):
    return math.hypot((a["lat"] - b["lat"]) * 111.0, (a["lon"] - b["lon"]) * 108.0)


def main():
    rng = random.Random(SEED)
    wards = json.loads((OUT / "wards.json").read_text())
    meta = json.loads((OUT / "meta.json").read_text())
    months = month_list()

    official = {b["year"]: b["value"] for b in meta["dogBites"] if b["metric"] == "dog_bite_cases"}
    yearly_growth = official["2024"] / official["2023"] - 1  # official state-level change

    # 1. smooth dog-pressure surface: a few bumps centred on randomly chosen wards
    bumps = [(rng.choice(wards), rng.uniform(0.5, 1.5), rng.uniform(2.0, 4.5)) for _ in range(7)]
    pressure = {}
    for w in wards:
        v = 0.55 + sum(h * math.exp(-(km(w, c) ** 2) / (2 * r * r)) for c, h, r in bumps)
        pressure[w["ward"]] = min(2.6, v * rng.uniform(0.85, 1.15))

    # short local flare-ups: a centre ward, its neighbours, a start month and a length
    flares = []
    for _ in range(9):
        c = rng.choice(wards)
        flares.append((c, rng.uniform(1.5, 3.0), rng.randrange(2, MONTHS - 1), rng.choice([2, 3, 4]), rng.uniform(1.6, 2.6)))

    # simulated dog-vaccination campaigns: ward -> (month index, gain in points)
    campaigns = {}
    for w in rng.sample(wards, 45):
        campaigns[w["ward"]] = (rng.randrange(4, MONTHS - 2), rng.uniform(8, 20))

    rows, sim_wards = [], {}
    for w in wards:
        wid, pop = w["ward"], w["population"] or 0
        p = pressure[wid]
        animal_share = jitter(rng, ANIMAL_SHARE, 0.25)
        age_share = jitter(rng, AGE_SHARE, 0.15)
        arv_km = w["nearestArvKm"] if w["nearestArvKm"] is not None else 10.0
        base_completion = max(0.45, min(0.95, 0.94 - 0.022 * arv_km + rng.uniform(-0.06, 0.06)))
        vax0 = max(12.0, min(82.0, 80 - 19 * p + rng.uniform(-9, 9) + (6 if w["vet"] or w["abc"] else 0)))
        rec = {k: [] for k in ["cases", *ANIMALS, "a0", "a1", "a2", "completed", "dogVax"]}
        for i, ym in enumerate(months):
            season = 1 + 0.18 * math.sin(2 * math.pi * (int(ym[5:]) - 3) / 12)  # assumed mild seasonality
            trend = (1 + yearly_growth) ** (i / 12)
            flare = 1.0
            for c, radius, start, length, boost in flares:
                if start <= i < start + length and km(w, c) <= radius:
                    flare = max(flare, boost)
            cases = poisson(rng, pop * BASE_RATE * p * season * trend * flare)
            by_animal = multinomial(rng, cases, animal_share)
            by_age = multinomial(rng, cases, age_share)
            completion = max(0.35, min(0.98, base_completion + rng.uniform(-0.05, 0.05)))
            completed = binomial(rng, cases, completion)
            vax = vax0 + 0.12 * i + rng.uniform(-1.2, 1.2)
            if wid in campaigns and i >= campaigns[wid][0]:
                vax += campaigns[wid][1]
            vax = round(max(8.0, min(92.0, vax)), 1)
            rec["cases"].append(cases)
            for a, n in zip(ANIMALS, by_animal):
                rec[a].append(n)
            for a, n in zip(["a0", "a1", "a2"], by_age):
                rec[a].append(n)
            rec["completed"].append(completed)
            rec["dogVax"].append(vax)
            rows.append([wid, w["zoneName"], ym, cases, *by_animal, *by_age, completed, vax, w["nearestArvKm"], "SIMULATED"])
        sim_wards[wid] = rec

    # constraint check against the official state totals (reference only)
    last12 = sum(sum(r["cases"][-12:]) for r in sim_wards.values())
    assert last12 < official["2024"], "simulated city total must stay below the official state total"

    sim = {
        "simulated": True,
        "label": "SIMULATED DATA — for demonstration only. Not real observations.",
        "seed": SEED,
        "months": months,
        "animals": ANIMALS,
        "ages": AGES,
        "assumptions": {
            "baseRatePerResidentPerMonth": BASE_RATE,
            "yearlyTrend": round(yearly_growth, 4),
            "yearlyTrendSource": "Official Tamil Nadu change 2023 to 2024 (Lok Sabha USQ 4870)",
            "check": f"Simulated 12-month total {last12} is below the official 2024 Tamil Nadu total {official['2024']}",
            "realInputs": ["ward boundaries", "ward population (WorldPop, modelled)", "distance to the nearest listed anti-rabies clinic"],
        },
        "wards": sim_wards,
    }
    (OUT / "sim.json").write_text(json.dumps(sim, separators=(",", ":")), encoding="utf-8")

    CSV_DIR.mkdir(parents=True, exist_ok=True)
    with (CSV_DIR / "ward_month_SIMULATED.csv").open("w", newline="", encoding="utf-8") as f:
        wr = csv.writer(f)
        wr.writerow(["ward", "zone", "month", "bite_cases_SIM", "dog_SIM", "cat_SIM", "monkey_SIM", "other_SIM", "age_0_14_SIM", "age_15_59_SIM", "age_60plus_SIM", "course_completed_SIM", "dog_vaccination_pct_SIM", "nearest_arv_km_REAL", "data_type"])
        wr.writerows(rows)
    print(f"wards={len(wards)} months={MONTHS} rows={len(rows)} last12_total={last12} trend={yearly_growth:.3f}")


if __name__ == "__main__":
    main()
