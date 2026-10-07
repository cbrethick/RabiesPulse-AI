# RabiesPulse AI — build history and handoff notes

This file records **everything that was done, in order, and why**. Read it before changing the project, or give it to any developer or AI assistant as context.

**Owner:** Rethick CB · **Event:** Chennai Rabies Awareness Hackathon · **Built:** 7 Oct 2026

---

## 0. Quick facts (read first)

| Item | Value |
|---|---|
| Stack | React 19 + TypeScript + Vite 8 (web) · Capacitor 8 (Android) · Kotlin plugin + Google LiteRT-LM 0.18.0 (on-device AI) · Leaflet + OpenStreetMap tiles |
| App id | `com.rabiespulse.app` (`in.*` was dropped because `in` is a Kotlin keyword) |
| Routing | Hash routes (`#/care`, `#/ask`…). Works on Vercel and in the Android WebView without server rewrites. |
| Backend | **None.** Auth, reports and chat are stored on the device (localStorage / IndexedDB). |
| AI model in APK | Qwen3-0.6B int4, `android/app/src/main/assets/models/model.litertlm` + `model.json` (git-ignored, 345 MB) |
| Final APK | `release/RabiesPulse-AI-v1.0.apk` (400 MB, signed, git-ignored; publish via GitHub Releases) |
| Tests | `npm test` → 22 passing (Vitest) |
| Raw data | `../DATASET` (original, never modified) → copied into `data/raw`, `data/reference` |

---

## 1. Original brief (summary)

Build a simple, mobile-friendly app named **RabiesPulse AI** for Chennai that:
- gives step-by-step help after an animal bite
- finds nearby care with GPS and navigation
- teaches rabies awareness
- records incident reports
- shows a public-health dashboard

It also needed local login (no backend), English/Tamil/Hindi, theme and colour settings, a Vercel-hosted website and an Android APK. Later additions:
- offline AI bundled inside the APK
- live GPS
- web-searched 2026 anti-rabies clinics on the map
- user-supplied photos and logo
- an opening animation
- a nearest-place view (tested at SRM KTR)

Hard rules from the brief:
- No fake data and no invented statistics.
- Never diagnose, never give dose schedules, never tell anyone "you're safe".
- Never label a place "anti-rabies centre" without an official source.
- Location stays private; reports are not confirmed rabies cases.

---

## 2. Timeline — what was done, step by step

### Step 1 — Inspected the inputs
- `DATASET/` held:
  - an OSM Overpass export (1,084 points)
  - the NRCP anti-rabies clinic PDF
  - the Lok Sabha USQ 4870 PDF (dog bites, suspected deaths)
  - a Rajya Sabha CSV
  - a rough Chennai polygon with a WorldPop total
  - WorldPop API notes
- Later the owner added:
  - `DTAT/`: Greater Chennai Corporation KML/CSV for UPHC, UCHC, TB, maternity, pet clinics and ABC centres
  - `Municipal_Spatial_Data-master.zip`: DataMeet wards and zones
- `WEB/` held an older React prototype. The owner disliked it (too wordy, mock clinics, dose schedules), so it was **not reused**. Only the stack choice carried over.
- **Key finding:** the NRCP national list (284 clinics, 26 Mar 2026) has **0 Tamil Nadu/Chennai entries.**

### Step 2 — Data pipeline (`scripts/prepare_data.py`)
- Merged the GCC official facilities (KML) with OSM points.
  - 30 TB-centre records sit in the same buildings as UPHCs, so they were merged into one place each.
  - OSM points within 75 m of a GCC record were dropped as duplicates.
- Classified places into: `gcc` (official govt centre), `govh` (govt hospital/PHC from OSM), `hospital`, `clinic`, `vet`, `abc`.
- Ward boundaries come from DataMeet (201 polygons). For each ward the script works out the centroid, area, zone, facility counts and straight-line distances to the nearest govt facility and the nearest listed anti-rabies clinic.
- Ward population: **WorldPop API v2**, 2026, 100 m, called once and cached in `data/processed/ward_population_worldpop_2026.json`. Total 4.45 M for the 200 wards. This is modelled, not a census.
- Dog-bite stats are parsed from the Lok Sabha PDF (`pdftotext`) and the Rajya Sabha CSV. That CSV uses old Mac `\r` line endings, which broke the first parser.
- Outputs:
  - `public/data/facilities.json`, `wards.geojson`, `wards.json`, `localities.json`, `meta.json`
  - readable CSVs in `data/processed/`

### Step 3 — Web app
- Pages:
  - Login, Register, Home, Animal bite
  - Find care, Facility details
  - Awareness, Report, My reports
  - Dashboard, Settings, About
  - Ask AI (added later)
- **Auth** (`src/lib/auth.ts`):
  - PBKDF2-SHA256 with 150k iterations and a random salt; session token stored hashed
  - demo 6-digit code shown on screen (no SMS)
  - lockout after 5 wrong tries
  - tested: wrong code, mismatch, weak password, duplicate number, wrong login, refresh persistence, logout, route guard
- **Settings** (`src/lib/app.tsx`, `i18n.ts`): EN/TA/HI dictionary (about 200 keys each), light/dark/high-contrast themes, 4 accent colours, 3 text sizes, profile with emergency contact.
- **Charts and maps** follow a checked palette: single-hue blue ramp for the wards, two labelled series for the bite chart, legends, and a table view.

### Step 4 — Browser testing (Chrome, 390 px phone frame + 1180 px desktop)
Bugs found and fixed:
1. A global `img, canvas {max-width:100%}` rule distorted Leaflet tiles and markers, so `.leaflet-container` is now exempt.
2. Animated multi-level zooms froze in a background tab, so programmatic map moves use `animate:false`.
3. The Ask page crashed in new Chrome because `scrollIntoView()` now returns a Promise and an arrow-function effect returned it. Effects now use braces.
4. The Rajya Sabha CSV line endings (see Step 2).

### Step 5 — Searching for current (2026) anti-rabies clinics
- Downloaded the **Tamil Nadu State Action Plan for Dog-Mediated Rabies Elimination by 2030** (Oct 2024, hosted on the NRCP site). Its "List of Anti-Rabies Clinic" has these Chennai and nearby entries:
  - Madras Medical College (Rajiv Gandhi GGH)
  - Stanley
  - Kilpauk
  - Omandurar Govt Estate medical college
  - Chengalpattu Medical College
- The same plan says ARV is on the Essential Drug List, which requires it in all govt facilities, including PHCs.
- News (MedBound Times, 18 Sep 2025, citing TNIE/TOI): some Chennai UPHCs redirect bite patients; Govt Peripheral Hospital, Periyar Nagar gives ARV. That hospital is labelled "news", not official.
- All of these are stored in `data/raw/arv_centres_chennai.csv`, each row with a source URL and date. Only these places get the ✓ badge.
- Checked whether the vaccine is "free": the state plan does not say so, so the app makes no such claim.

### Step 6 — Owner feedback rounds (UI)
- **Map points invisible** → fixed (Step 4 bugs).
- **"Find the nearest location and navigate"** → added **Best nearby**:
  - nearest hospital, nearest ✓ clinic, nearest govt facility, each with Navigate
  - tapping a map pin opens a card
  - the map auto-fits to you plus the 5 nearest places
  - "Find care" from the bite screen opens the GPS prompt
- **Live GPS** → `watchPosition` in the app provider, with Stop/Change. It only starts after the user taps Allow.
- **Photos:**
  - `bite-bg.jpg` is a full-screen background on Home and Login
  - `bite-street-dog.jpg` is on the Bite questions screen
  - `wash-wound.jpg` is on the "Do this now" screen
  - the Awareness page shows the full photo, uncropped
- **No empty space** → tighter padding; bottom padding only where the sticky 108 bar exists; full-width last card in odd grids. Home fits on one phone screen.
- **Logo** (`design/logo-original.png`):
  - black corners made transparent with a flood fill
  - generates `public/logo.png`, favicons and all Android launcher icon sizes (legacy, round, adaptive) plus the splash images
- **Opening animation** (in `index.html`, so it runs before the JS loads): logo pops in, heartbeat line draws, name fades in, then it zooms into the app. About 1.6 s; shortened when reduce-motion is on.

### Step 7 — Android (Capacitor) + on-device AI
- `npx cap add android`
- Kotlin 2.4.20 Gradle plugin (LiteRT-LM is built with Kotlin 2.4); Java 21
- `abiFilters arm64-v8a, x86_64`; `noCompress 'litertlm'`; location permissions
- **`LocalAiPlugin.kt`:**
  - checks the CPU type (ABI), RAM (about 3× model size + 1 GB) and free space
  - copies the bundled model to app-private storage once
  - loads the `Engine` on the CPU backend, on a background coroutine
  - streams tokens to JavaScript as events (`aiToken`, `aiDone`, `aiError`, `aiStatus`) and supports cancel
  - thinking mode off
- Release signing key generated locally: `android/keystore/` and `keystore.properties`, both git-ignored. **Back them up.**
- **Model choice:** Gemma 3 1B (the original target) is gated on Hugging Face and needs the owner to accept its licence. So **Qwen3-0.6B int4** (Apache-2.0, not gated, 345 MB, SHA-256 verified) is bundled for now. `scripts/bundle_model.sh gemma` swaps in Gemma later.

### Step 8 — Offline answer bank (owner request: "reply to any text by keywords")
- `src/lib/intents.ts`: 40 topics with keywords in English, Tamil, Hindi, Tanglish and Hinglish, and answers in all 3 languages.
  - Topics include dog/cat/monkey/rat/bat/cattle bites, scratch, lick, bleeding, face bites, children, pregnancy, washing, home remedies, stitches/tetanus, where to get vaccine, cost, doses, missed dose, pet/stray dogs, rabid signs, symptoms, cure, incubation, pet vaccination, ABC, reporting, myths, prevention, statistics, 108, app help, greetings and a fallback.
- `src/lib/kb.ts`: sourced knowledge chunks.
- **Chat flow:**
  1. The answer is matched in the question's language (detected from Tamil or Devanagari script).
  2. If the AI is ready and the language is English, or the model is Gemma: the model streams a reply grounded on the checked answers, and the checked answer appears underneath.
  3. Otherwise the checked answer is shown instantly.
  - Action buttons on every answer: Find care, Call 108, Report.

### Step 9 — Emulator testing (Android 14 arm64, 3 GB, **airplane mode**, no Wi-Fi/data)
- Test method: the debug build has WebView debugging on, and a small CDP script (`node cdp.mjs`) drives the app from the Mac.
- Results:
  - Install → register → Ask AI: model copied and loaded in **18 s**; English answer correct in **37 s**.
  - The Tamil answer from the 0.6B model was garbled, which led to the "TA/HI use the checked bank" rule.
  - Live GPS: the fix updates, and the list re-sorts after moving (Central → Adyar).
  - The chat input bar was squashed by the 108-bar CSS → fixed.
  - The release APK clean-installs and launches offline with no crash.
- **Not yet tested on a physical phone.**

### Step 10 — Greater Chennai coverage (owner at SRM KTR)
- The original OSM export covered only the city limits, so nothing near Kattankulathur was in the data (nearest result was 18.9 km).
- `scripts/download_osm.py` downloads the box 12.6–13.4 N, 79.85–80.40 E from Overpass in cached tiles; tiles that time out are split into four.
  - 1,936 points, 856 new
  - total facilities now **2,027**
- Added Chengalpattu MCH as an official ✓ clinic.
- At SRM KTR (live GPS in the APK):
  - nearest hospital: **SRM Global Hospitals, 426 m**
  - nearest ✓ clinic: **Chengalpattu MCH, 18 km**
  - nearest govt facility: **Sub Health Centre, 1.9 km**
- Bug found: the specialist filter `ent\b` matched "Govern**ment**" and hid all OSM govt hospitals from Best nearby. Fixed with word boundaries.
- A "medical college" govt rule would have wrongly marked SRM (a private college) as government, so that rule was removed.

---

## 3. File map

```
src/
  main.tsx            app start; restores session; hides the opening animation
  App.tsx             hash router + login guard
  styles.css          all styles (CSS variables for themes)
  lib/
    app.tsx           settings, user, profile, live GPS (watchPosition), router helpers
    auth.ts           PBKDF2 auth, sessions, lockout
    i18n.ts           EN/TA/HI UI text
    geo.ts            haversine, Google Maps URLs, tel: links, GPS helpers
    data.ts           types + JSON loader
    reports.ts        IndexedDB reports + photo shrink
    content.ts        awareness cards, myths, sources (EN/TA/HI)
    kb.ts             sourced knowledge chunks + retrieval
    intents.ts        40-topic answer bank (EN/TA/HI) + keyword matcher
    ai.ts             bridge to the native LocalAi plugin + prompt builder
  components/         Topbar, MapView (Leaflet), LocationBar (GPS/search), FacilityCard, ui helpers
  pages/              Auth, Home, Bite, Care, Place, Learn, Report, MyReports, Dashboard, Settings, About, Ask
scripts/
  prepare_data.py     builds public/data from data/raw (+ WorldPop cache)
  download_osm.py     Greater Chennai OSM download (tiled, cached)
  bundle_model.sh     puts Qwen or Gemma into the Android assets (SHA-256 checked)
android/app/src/main/java/com/rabiespulse/app/
  MainActivity.java   registers the plugin
  LocalAiPlugin.kt    on-device AI (LiteRT-LM)
data/raw, data/reference, data/processed   datasets (sources in REPORT.md)
public/               logo, icons, photos, data JSON
docs/screenshots      web + APK screenshots
tests/core.test.ts    22 unit tests
```

---

## 4. How to continue (common tasks)

| Task | How |
|---|---|
| Run the web app | `npm install && npm run dev` |
| Rebuild data | `python3 scripts/prepare_data.py --offline` (needs `pip install shapely certifi` and `brew install poppler`) |
| Add a verified anti-rabies clinic | add a row to `data/raw/arv_centres_chennai.csv` with the facility id from `public/data/facilities.json`, status `official` or `news`, source URL and date, then rebuild data |
| Add a chat topic | add an entry to `INTENTS` in `src/lib/intents.ts` (keywords + EN/TA/HI answer), then add a test |
| Swap to Gemma 3 1B | accept the licence on Hugging Face → put `gemma3-1b-it-int4.litertlm` in `../DATASET/model/` → `scripts/bundle_model.sh gemma` → rebuild the APK (about 640 MB) |
| Build the APK | `npm run build && npx cap sync android && cd android && ./gradlew assembleRelease` |
| Deploy the web | Vercel: import the GitHub repo (Vite, `npm run build`, `dist`) or run `npx vercel deploy --prod` |
| Publish the APK | GitHub → Releases → tag `v1.0` → upload `RabiesPulse-AI-v1.0.apk` (the README link expects this name) |

---

## 5. Known limitations / next ideas
- Not yet tested on a real phone. Next: install, enable airplane mode, ask the AI, test Navigate and Call.
- The Vercel deploy needs the owner's login. The README has the steps.
- Tamil/Hindi text needs a native-speaker review. The 0.6B model can't write Tamil, so use Gemma for an AI that answers in TA/HI.
- Data still missing (asked for, not yet supplied):
  - an official TN/GCC anti-rabies centre list with coordinates
  - zone-level bite counts
  - dog-vaccination counts
- Photos: confirm the usage rights. The wound-washing photo shows a red-cross emblem, which is protected.
- A Google Play release would need Play Asset Delivery for the model, because the base APK limit is 200 MB.
