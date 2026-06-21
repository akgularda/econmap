# Phase 5 Plan — Full City Enrichment Coverage (Milestone v1.1)

**Status:** PARTIALLY EXECUTED (2026-06-21). Downloader built; the AUTO "auto part" was run.

## Executed (2026-06-21, autonomous "auto part")

- Pulled high-value AUTO sources: Ookla mobile+fixed (521 MB), WHO (4.3 MB), WRI GPPD (12 MB), ROR (304 MB
  extracted), Mobility DB. **Skipped GLEIF** (~4.5 GB; not referenced by `load-bulk-entities`).
- **Connectivity** → `generate-connectivity-artifacts.py` over Ookla → **570 cities** (fixed=570, mobile=568).
- **Environment** → fixed `generate-environment-artifacts.py` to degrade gracefully when the manual Aqueduct zip
  is absent → over WHO → **248 cities** air quality (water-stress=0).
- Validation: both generator tests pass; `audit:data` **PASS 5/5** (165.9 MB, 0 unsourced entities).

## Remaining

- **Assets (WRI/ROR):** raw data staged under `data/raw/cities/bulk/{wri,ror}`. Resolve **deferred** because
  `rerun-scoped`/`rerun-full` regenerate `public/data/globe/manifest.json` and would wipe Phase 4's PMTiles
  wiring. Safe sequence: `npx tsx scripts/data/cities/rerun-scoped.ts 0` → `npm run data:globe:pmtiles` →
  `npm run audit:data`.
- **Manual sources** (Economy = OECD/Eurostat; ports = WPI; GHSL; Aqueduct; Carbon Monitor): still required for
  full coverage — see Step 0 below.

## Goal

Expand the Connectivity / Environment / Economy "coverage pending" layer families from the
current **7,310 enriched cities** toward the full **191,845-city** registry, by acquiring the
enrichment raw sources and re-running the resolution + enrichment pipeline. Every new datum stays
source-backed; unmatched cities keep explicit `not_covered_yet` states (no fabrication).

## Why it was blocked (and still partly is)

A fresh clone has the REQUIRED identity/geo sources only (GeoNames / OurAirports / UN-LOCODE /
NaturalEarth — fetched by `download-bulk-sources.mjs`). The ENRICHMENT raw sources
(`data/raw/cities/bulk/{wri,who,ror,ookla,gleif,oecd,eurostat,ghsl,worldportindex,aqueduct,carbon-monitor}`)
are gitignored and absent. There was **no downloader** for them — that is what this phase adds.

## Step 0 — Acquire enrichment sources  ← the "go" gate (large downloads)

```
node scripts/data/cities/download-enrichment-sources.mjs        # fetch AUTO, report MANUAL
# or:  npm run data:cities:download-enrichment
```

- **AUTO (9, direct URLs HEAD-validated 2026-06-21):** WRI GPPD, ROR v2.1 (zip), GLEIF lei2/rr/repex
  (~1 GB+ each), WHO AAQ v2024, Ookla mobile+fixed parquet (2025Q4), Mobility Database.
- **MANUAL (7, portal/SDMX/gated or needs a transform — script prints instructions + target paths):**
  GHSL GHS-WUP-MTUC, OECD FUA economy/labour/boundaries, Eurostat Urban Audit (14 tables), World Port
  Index (NGA), WRI Aqueduct 4.0, Carbon Monitor Cities, USGS MRDS (rdbms-tab-all.zip needs a tab→csv
  transform into `usgs/mrds.csv`).

The OECD FUA set is what the Python enricher (`generate-city-intel-enrichment.py`, needs `geopandas`)
consumes directly — it is **MANUAL**, so OECD economy/labour CSVs + `fuas (1)/fuas.shp` +
`list_of_municipalities_in_FUAs_and_Cities.csv` must be placed before Step 2 can add OECD metrics.

## Step 1 — Resolve entities over the full registry

```
npx tsx scripts/data/cities/rerun-full.ts          # full registry + dossiers + resolveEntities (all sources)
# (rerun-scoped.ts <minPop> remains the fast path; it SKIPS Python enrichment)
```

`resolve-entities.ts` + `load-bulk-entities.ts` join the new raw sources (ROR/WPI/WRI/Ookla/…) to
registry cities, growing source-backed entity coverage beyond today's 19,042 entities / 7,310 cities.

## Step 2 — OECD/Eurostat economic enrichment (Python)

```
npm run data:cities:enrichment        # python scripts/data/cities/generate-city-intel-enrichment.py
```

Writes `src/data/generated/command-center/city-intel-enrichment.json` (GDP / productivity / labour
for FUA-matched cities). Requires the OECD MANUAL sources from Step 0.

## Step 3 — Rebuild client artifacts + publish

```
npm run data:cities:bundle           # build-dossier-bundle.ts  → Range-addressable dossier shards
npm run data:cities:search-slim      # build-search-index-slim.ts
npx tsx scripts/data/cities/copy-to-public.ts   # stage src/data/generated → public/data
```

(The scoped pipeline does not emit these client artifacts automatically — they must run separately,
matching the Phase 3 procedure.)

## Step 4 — Audit + measure

```
npm run audit:data                   # provenance (0 unsourced), geospatial sanity, size budget
```

Compare processed-city / enriched-city counts against the baseline (7,310 enriched) and confirm the
export still fits the GitHub-Pages budget (now helped by Phase 4's 272 MB → 1.2 MB globe PMTiles win).

## Success criteria

1. Enriched-city count materially increased vs. the 7,310 baseline (measured).
2. Connectivity / Environment / Economy layers show real source-backed values where data exists,
   explicit `not_covered_yet` elsewhere — no fabricated fields.
3. `audit:data` passes (0 unsourced entities, geospatial + license + size checks).

## Known residual gaps (stay explicit `null` / `not_covered_yet`)

Per `citydata-bulk-source-matrix.md`: city-level sector mix, industrial output, office/industrial
rents, cost signals, congestion/commute, utility reliability, local company operating presence, and
factory/SEZ rosters have **no trustworthy global open bulk source** — they remain intentional gaps.
