# Roadmap: MapFactbook (econmap)

## Overview

This engagement takes a mature-but-rough MapFactbook build and makes it genuinely usable: first fix the navigation (left menu), then optimize the heavy static export and client runtime, then close the city-data coverage gap (both graceful gap-handling and real coverage expansion). A short Phase 0 first unblocked local rendering and bulk-source acquisition so the rest of the work is possible.

## Phases

- [x] **Phase 0: Render unblock & data bootstrap** - Make the app render on a fresh clone; acquire required bulk sources
- [ ] **Phase 1: Left menu / navigation redesign** - Turn the left menu into useful, search-first, sectioned navigation
- [ ] **Phase 2: Performance & export optimization** - Shrink the 630 MB / 119k-file export; lighten client + map runtime
- [ ] **Phase 3: City data coverage** - Graceful gaps for minor cities + expand raw coverage via the pipeline

## Phase Details

### Phase 0: Render unblock & data bootstrap
**Goal**: A freshly-cloned repo runs `npm run dev` and renders; the required bulk data sources are available locally.
**Depends on**: Nothing
**Requirements**: REQ (foundational)
**Success Criteria** (what must be TRUE):
  1. `npm run dev` serves `/` with HTTP 200 even with no generated data ✓
  2. Missing generated artifacts degrade to empty-but-valid surfaces, not 500s ✓
  3. `assertRequiredBulkSourcesExist()` passes after running the bootstrap downloader ✓
**Plans**: complete

### Phase 1: Left menu / navigation redesign
**Goal**: The left menu becomes a clear, search-first, sectioned navigation surface that exposes every destination and looks intentional with or without data.
**Depends on**: Phase 0
**Requirements**: REQ-01, REQ-02
**Success Criteria** (what must be TRUE):
  1. A user can reach every route (cities, countries, compare, rankings, indicators, datasets, regions, corridors, reports, story, dashboard) from the menu
  2. The menu has a working search/command entry point
  3. With no generated data, the menu renders a deliberate coverage-pending state (no broken/empty controls)
  4. Menu state stays in sync with URL/store (selected city, layers, view)
**Plans**: TBD (driven by `.planning/menu/REDESIGN-SPEC.md`)

### Phase 2: Performance & export optimization
**Goal**: Materially reduce static-export size/file-count and improve client + map runtime performance.
**Depends on**: Phase 1
**Requirements**: REQ-03, REQ-04
**Success Criteria** (what must be TRUE):
  1. Export size and/or file count meaningfully reduced vs. the 629.8 MB / 119,115-file baseline (measured)
  2. Largest client route bundles reduced (measured via build output)
  3. Map/globe and heavy routes load via code-splitting / lazy boundaries
  4. `npm run build` still succeeds and `npm run audit:data` still passes
**Plans**: TBD

### Phase 3: City data coverage
**Goal**: Minor cities show derived/partial data with explicit coverage states instead of blanks, and raw coverage is expanded by running/extending the pipeline.
**Depends on**: Phase 2
**Requirements**: REQ-05, REQ-06
**Success Criteria** (what must be TRUE):
  1. A minor city with sparse data renders a coherent page with clear "covered / partial / not covered yet" indicators
  2. Coverage/fallback logic fills globally-available fields and labels the rest as explicit gaps
  3. The ingestion pipeline runs against the acquired bulk sources and increases processed-city count (measured vs. 87,846 baseline)
  4. `npm run audit:data` passes (provenance, geospatial, size budget)
**Plans**: TBD

## Progress

**Execution Order:** 0 → 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 0. Render unblock & data bootstrap | 1/1 | Complete | 2026-06-20 |
| 1. Left menu / navigation redesign | done | Complete | 2026-06-20 |
| 2. Performance & export optimization | done | Complete | 2026-06-20 |
| 3. City data coverage | done | Complete | 2026-06-20 |

### Outcomes (2026-06-20)

- **Phase 1**: `tactical-sidebar.tsx` rebuilt as a search-first command rail (13 new components) exposing all
  destinations, a ⌘K command palette, a coherent Map-layers group, honest coverage-pending empty states,
  and (bonus) no-reload URL nav. 58/58 home+country tests green; verified live (all routes reachable).
- **Phase 2**: removed 4 dead deps (cesium, @deck.gl×3, framer-motion, date-fns) + dead Cesium webpack wiring;
  declared the previously-phantom `fast-xml-parser`; top-N city pre-render (2,000 vs ~12,000 HTML shells) with a
  `404.html` SPA fallback so minor-city deep-links still resolve; first `next/dynamic` code-splitting; cached
  client search index; map render memoization + throttled hover; parallel city loads. Deferred (need
  tippecanoe/Docker, documented): raster/vector PMTiles packing, Brotli (browser can't decompress `br`).
- **Phase 3**: scoped pipeline (no Python needed) produced a 191,845-city registry, 7,310 full dossiers
  (19,042 source-backed entities), 12,243 searchable cities, packed into 4 Range-addressable dossier shards
  (51 MB → 10 MB). `audit:data`: 0 unsourced entities, geospatial/license/counts pass. Minor cities
  (4,933 identity-only) resolve via the SPA fallback with honest coverage states. A one-command bulk-source
  downloader (`scripts/data/cities/download-bulk-sources.mjs`) was added so the pipeline is reproducible.

---

## Milestone v1.1 — Deferred follow-up (started 2026-06-21)

Closes the items explicitly deferred at the end of v1.0. **Brotli dossier shards are dropped** (out of
scope): the browser `DecompressionStream` has no `'br'` decoder, so client-side Brotli is unworkable;
dossier shards already ship gzip-compressed.

### Phase 4: Globe vector tiles (PMTiles packing)
**Goal**: Serve globe operational layers from one range-addressable PMTiles archive instead of whole-geojson shards.
**Depends on**: Phase 2 · **Requirements**: TILE-01, TILE-02
**Success Criteria** (what must be TRUE):
  1. `layers.pmtiles` built from all tilable layers (cities excluded by design) ✓
  2. `manifest.json` wired (`pmtilesPath` + per-layer `sourceLayer`); client (`tactical-map-2d.tsx`) consumes it ✓
  3. Tiles serve over HTTP Range (verified end-to-end, no browser) ✓
  4. Deploy prunes the redundant geojson tree in favour of the archive ✓ (`assemble-pages.ts`)
**Status**: **Complete (2026-06-21)** — see Outcomes below.

### Phase 5: Full city enrichment coverage
**Goal**: Expand Connectivity/Environment/Economy coverage from 7,310 enriched cities toward the full 191,845.
**Depends on**: Phase 3 · **Requirements**: COVER-01, COVER-02, COVER-03
**Success Criteria** (what must be TRUE):
  1. One-command downloader acquires the enrichment raw sources reproducibly (auto where a direct URL exists)
  2. resolve-entities + Python enrichment run over the full registry; enriched-city count up vs. 7,310 (measured)
  3. New fields are source-backed; unmatched cities stay explicit `not_covered_yet` (no fabrication)
  4. `audit:data` passes (provenance, geospatial, size budget)
**Status**: **Executed (2026-06-21)** — all browser-free sources pulled + resolved + validated. Cities processed
7,310 → **9,235**; entities 19,042 → **119,020**; active sources 3 → **5**; globe PMTiles 4 → **9 layers**;
`audit:data` PASS 5/5. Residual gap is irreducible without manual portal data (OECD GDP+crosswalk, WPI, GHSL,
Aqueduct, Carbon Monitor, GLEIF) — staged/documented in `.planning/data/PHASE5-PLAN.md`.

### Outcomes (2026-06-21)

- **Phase 4 — DONE**: built Felt's tippecanoe via the repo `Dockerfile` (`econmap/tippecanoe`), ran
  `data:globe:pmtiles` → `public/data/globe/layers.pmtiles` (**1.2 MB**, 19,042 features, 4 source-layers:
  airports/ports/rail-hubs/logistics-hubs; cities excluded). Manifest wired; `verify-pmtiles-http.mjs` confirms
  tiles serve over HTTP Range (4/5 probes; z6 is expected overzoom above maxzoom 5). `assemble-pages.ts` already
  prunes the entire `out/data/globe/layers/` geojson tree when the archive is present — so the deploy now ships
  **1.2 MB in place of the 272 MB** globe layers tree (cities 244 MB + airports 25 MB + the rest). Client was
  pre-wired during Phase 2, so no app code change was needed.
- **Phase 5 — SCAFFOLDED then PARTIALLY EXECUTED**: added `scripts/data/cities/download-enrichment-sources.mjs`
  (`npm run data:cities:download-enrichment`) — 10 AUTO sources + 6 MANUAL portal sources it prints instructions
  for; run sequence documented in `.planning/data/PHASE5-PLAN.md`. Then (autonomous "auto part", 2026-06-21):
  - Pulled the high-value AUTO sources (Ookla mobile+fixed 521 MB, WHO, WRI 12 MB, ROR 304 MB, MobilityDB; skipped
    GLEIF — unused by `load-bulk-entities`).
  - **Connectivity:** ran `generate-connectivity-artifacts.py` over Ookla → **570 cities** (fixed=570, mobile=568).
  - **Environment:** fixed a crash (`generate-environment-artifacts.py` now degrades gracefully when the manual
    Aqueduct zip is absent, matching the carbon-monitor guard) → ran over WHO → **248 cities** air quality
    (water-stress=0, Aqueduct manual).
  - **Validation:** both generator tests pass; `audit:data` PASS (5/5 — 165.9 MB, 0 unsourced entities).
  - **Assets (WRI/ROR) RESOLVED:** ran `rerun-scoped.ts 50000` (13.8 min) → **9,235 cities** resolved (was 7,310),
    **119,020 entities** (was 19,042 — power plants + universities folded in). Repacked PMTiles → **9 globe layers**
    (added utilities/connectivity-fixed/connectivity-mobile/air-quality/research), 6.9 MB archive, HTTP-range 5/5.
  - **Economy partial:** fetched Eurostat `urb_clma` via SDMX bulk API (904K, indicators verified) + hardened the
    economic generator (graceful guards for missing OECD/GLEIF). Eurostat city-labour still needs the **OECD FUA
    municipality crosswalk** (`list_of_municipalities_in_FUAs_and_Cities.csv`, portal-only) to map codes → 0 cities
    for now; Eurostat data staged for when OECD lands.
  - **Published + validated:** `copy-to-public` packed 9,235 dossiers → 16 MB / 4 shards (0 missing); slim search
    12,243 cities. `audit:data` **PASS 5/5** (165.9 MB, 5 sources, 0 unsourced).
  - **Generator hardening (code):** added existence guards so missing manual sources degrade gracefully instead of
    crashing — `generate-environment-artifacts.py` (Aqueduct), `generate-economic-coverage-artifacts.py`
    (Eurostat, GLEIF, OECD crosswalk).
  - **Irreducible manual gap** (genuinely behind gated portals / SDMX query builders, not browser-fetchable):
    OECD GDP + FUA crosswalk, WPI ports, GHSL, Aqueduct water-stress, Carbon Monitor, GLEIF company-presence.

## Progress (v1.1)

| Phase | Status | Completed |
|-------|--------|-----------|
| 4. Globe PMTiles packing | ✓ Complete | 2026-06-21 |
| 5. Full city enrichment coverage | ✓ Executed — 9,235 cities / 119,020 entities / 5 sources / 9 globe layers; audit 5/5 (manual sources excepted) | 2026-06-21 |
