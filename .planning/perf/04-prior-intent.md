# Prior Performance Intent & Targets (Extracted)

Sources:
- `docs/plans/2026-03-21-mapfactbook-performance.md`
- `docs/goals/scale-shrink-audit-goal.md`
- `README.md`
- `next.config.ts`

## 1. Two distinct perf efforts

### A. Homepage/map responsiveness plan (2026-03-21)
Goal: make homepage + map interactions feel responsive on a normal laptop without breaking the
city-first OSINT workflow or stripping source-backed behavior. Architecture stays server-driven but
stops serializing oversized selection artifacts to the client and stops rebuilding the whole map on
same-route state changes. Six tasks:
1. Lock bottlenecks into tests (page, tactical-map-2d, command-center-data).
2. Shrink homepage boot payload — replace full `cityFootprintCatalog` prop with a minimal
   selection-asset contract; lightweight featured-city artifact loader; avoid touching the large
   search index on blank homepage path.
3. Stop remounting the map on city selection / layer toggles — MapLibre mounted once per visit;
   split map creation from prop updates.
4. Boot-first, lighter layer loading — load GeoJSON from static asset URLs, use boot assets on
   initial activation, promote to heavier full assets only when zoom/city focus warrants.
5. Keep generated artifacts aligned — emit lightweight `featured-cities.json`, ship only derived
   static assets, keep raw source packs out of the browser.
6. Verify (focused Vitest + `npm run build`) and report before/after per bottleneck.

This plan reads as **planned/in-progress** (no explicit completion markers in the doc itself).

### B. Scale-shrink-audit goal (delivery re-architecture) — largely EXECUTED
Three pillars designed together: **Shrink/Deliver (gate, do first)**, **Scale**, **Audit**.
Core problem: static export `out/` was **~2.47 GB / ~470,557 files**; a phone must download only what
the current screen needs (demand-paged delivery), so adding more data does not grow first load.

## 2. Targets / budgets

**Delivery / mobile (headline budgets, CI size-budget gate enforces):**
- First load on mid-range phone **≤ 2 MB transferred, interactive ≤ 2.5 s** (Fast-3G/4G, Lighthouse
  mobile + scripted network-trace budget).
- One city dossier transfers **≤ 250 KB** compressed beyond first load.
- Pan/zoom transfers **only viewport tiles** (KBs per move), never a whole layer.
- **No single client-fetched file > 5 MB** (map layers = tiled archives, byte-range streamed).
- Total deployed file count fits host cap (< 20,000 objects originally targeted for Cloudflare;
  later host changed — see below).
- CI size-budget gate fails the build on any regression.

**Host budgets (LOCKED 2026-06-15 → GitHub Pages, pure static, no Worker):**
- ~1 GB published-site soft limit, 100 MB per-file git hard limit, 100 GB/month bandwidth.

**Scale targets:** dossier coverage 87,846 → toward all 189,025 registry cities with ≥1 real source,
without raising first-load size; add 2–3 new real source categories; **zero fabricated** data
(provenance regression test).

**Audit target:** single `npm run audit:data` emits machine-readable + human report under
`docs/audits/`, all green or with explicitly-listed sourced gaps.

## 3. What was already done (per goal doc Status / EXEC §7)

- ✅ **Pillar C audit harness** — `npm run audit:data` (size-budget + license + count-consistency +
  provenance + geospatial); `source-licenses.ts`; dated report. Baseline established.
- ✅ **Dossier bundle (A2)** — gzip, sha1-sharded, Range-addressable bundle + client; rewired loaders.
  **940 MB / 351K files → 127 MB / 6 files**; London (largest) = 48 KB Range fetch. 153/153 tests green.
- ✅ **S1 — eliminated 117 MB registry client fetch** — cityId derived from slug; `registry.json`
  removed from publish/public (also removes the only >100 MB git-limit file).
- ✅ **Search slimmed** — `build-search-index-slim.ts`: **59 MB → 2.4 MB**, single lazy file, same shape.
- ✅ **#22 globe prune + assemble-pages** — `deploy:assemble` prunes dead `current.geojson` +
  `world.geojson` (441 MB) for sharded+boot layers; runs size-budget gate on `out/`.
- ✅ **#21 country-asset cap** — caps oversized country files to top-5000 by priority
  (`usa.json` 95.3 → 1.8 MB; 134 MB freed); honest "top N of M" note, no silent truncation.

**🎯 Size goal met:** `out/` **2,467 MB → 909.9 MB** (under 1 GB Pages cap), files 470,557 → 119,168,
no file > 50 MiB, registry violation gone, `npm run audit:data` size-budget = PASS.
Deploy flow: `npm run build` → `npm run deploy:assemble` → publish `out/`.

## 4. What remains

- **#23 PMTiles** for map geometry (tippecanoe → `.pmtiles`, `pmtiles://` in MapLibre, range-streamed)
  — the single biggest *further* map win (~771 MB GeoJSON → handful of files); needs `tippecanoe`
  (Docker/WSL/CI on Windows). Optional but the headline "viewport-tiles-only" budget depends on it.
- **#24 deploy pipeline** — `.github/workflows/deploy.yml` (Release-asset → Actions assemble → Pages),
  `.gitignore`, basePath for project pages; needs the user's GitHub repo.
- **TeleGeography strip** — license audit flags it as commercial; strip those asset records at
  deploy-prep before publishing (excluded by rule; never ship).
- **Final clean build** to bake the country "top N of M" note into the export.
- **Scale (Pillar B)** — propagate USGS MRDS (wired, needs run) + full-coverage join toward all
  189K cities; add keyless sources (PeeringDB, Wikidata SPARQL, Natural Earth, Overture-as-tiles);
  OpenCelliD / Healthsites deferred pending user-supplied API keys; then re-run audit + publish
  coverage matrix.
- **Homepage responsiveness plan (A)** tasks appear still open/unverified vs. the executed delivery
  work — boot-payload shrink, single-mount map, boot-first layer loading.

## 5. next.config.ts perf-relevant notes

- `output: "export"` (static export), `trailingSlash: true`, `images.unoptimized: true`.
- `basePath` is the single source of truth (empty in dev, `/econmap` in prod via `.env.production`).
- **assetPrefix intentionally omitted** — setting it non-empty made Next 16's static-export worker
  retain per-page state and **OOM after ~73 pages** during the 12k-page export.
- `experimental.cpus` capped via `NEXT_BUILD_CPUS` to keep peak RAM in physical memory and avoid
  swap-thrash OOM during the 12k-page export.

## 6. README perf-relevant notes

- Map uses **country points + lightweight map layers**, not full world polygons (perf/scaffolding
  trade-off). Known limitation: point-based interaction instead of polygon choropleths.
- City data pipeline scales "up to every city in the world"; artifacts (JSON + GeoJSON) generated
  offline into `src/data/generated/cities` (keeps heavy work out of the browser).
- Verification: `npx vitest run`, `npm run lint`, `npm run build`.
