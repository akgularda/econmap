# EconMap Performance Optimization Plan

Owner: Performance lead
Date: 2026-06-20
Sources synthesized: `.planning/perf/01-export-size.md`, `02-bundle.md`, `03-map-runtime.md`, `04-prior-intent.md`
Grounded against: `next.config.ts`, `src/app/city/[slug]/page.tsx`, `scripts/audit/checks.ts`, `scripts/deploy/assemble-pages.ts`, `src/features/home/components/{home-stage,tactical-map-2d}.tsx`, `package.json`.

---

## Hard constraints (non-negotiable, gate every change)

1. **Stays a static export** — `output: "export"` in `next.config.ts`. No SSR, no server runtime, no image optimizer (`images.unoptimized: true` is required, not a bug).
2. **Data integrity** — no silently dropping real, source-backed data. Only restructure / compress / lazy-load / move to demand-paged tiles. Any record removed from a static page must remain reachable via the SPA map + Range-addressable dossier bundle, and "top N of M" notes must stay honest.
3. **Build must pass** — `npm run build` (`next build --webpack`) → `npm run deploy:assemble` → `npm run audit:data` size-budget gate must end green after every change. 153/153 unit tests stay green.

---

## Baseline (the number we are driving down)

From `docs/audits/2026-06-17-data-audit.json` size-budget metric, reconstructed in `01-export-size.md`:

| Metric | Value |
|---|---|
| Export size | **629.8 MB** |
| File count | **119,115** |
| Largest file | 0 (i.e. no file > 50 MiB — gate's largest-file probe is real, see Risk note) |
| Status | pass (under ~1 GB GitHub Pages soft cap) |

**Two independent problems, different root causes:**
- **File count** — ~90% of the 119,115 files (~108K) are the ~12,010 pre-rendered `city/[slug]` HTML shells (~9 files each).
- **Bytes** — spread ~evenly across city HTML shells (~280–324 MB), the dossier bundle (~127 MB, already optimized), and globe base-imagery rasters + assets (~150–240 MB).

> All contributor figures are **derived** from the audit JSON + reduction history, not measured on this checkout (`out/` and `public/data/` are not materialized here). **First action of execution is to materialize and measure** (see "Measurement protocol").

---

## Measurement protocol (how every win is proven)

Run once to establish a measured baseline, then after each change:

1. `npm run build && npm run deploy:assemble` → produces `out/`.
2. **Export size + file count + largest file:** `npm run audit:data` reads the `size-budget` check (`scripts/audit/checks.ts:92` `sizeBudgetCheck()` → `metrics.totalMB`, `metrics.fileCount`, `metrics.largestFileMB`). This is the canonical, gate-backed measurement.
3. **Per-contributor bytes/files:** `du -sh out/*` and `find out -type f | wc -l` per top-level dir (`out/city`, `out/data/cities/dossiers`, `out/data/globe`, `out/data/assets`, `out/_next`), to attribute each delta.
4. **Route bundle KB:** add `@next/bundle-analyzer` (or inspect `.next/` chunk sizes) and record First Load JS per route (`/`, `/city/[slug]`, `/country/[slug]`, `/dashboard/corridors`) before/after.
5. **Map / load runtime:** Lighthouse mobile (Fast-3G) on `/` for first-load transferred bytes + TTI; a scripted network trace for the prior locked budget (≤ 2 MB transferred, ≤ 2.5 s interactive); and a manual main-thread profile of the search path + first map render.

Record each metric in a before/after table per optimization. The size-budget gate (`SITE_CAP = 1 GB`, `FILE_HARD = 100 MB`, `FILE_WARN = 50 MiB`) is the merge gate.

---

## Prioritized optimization plan

Ranked high-impact / low-effort first. Each item names exact files, a concrete approach, and its measurement.

### O1 — Stop pre-rendering ~12K city pages; pre-render only top-N, client-route the rest
- **Area:** export-size
- **Impact:** HIGH (removes ~90% of files, ~280–320 MB of bytes; also kills the 12k-page build OOM/worker pressure)
- **Effort:** LOW–MEDIUM
- **Files:** `src/app/city/[slug]/page.tsx` (`POPULATION_THRESHOLD = 50000`, `generateStaticParams`), `scripts/data/cities/build-search-index-slim.ts` (same threshold constant — keep in sync), `src/app/city/[slug]/city-page-client.tsx` (already client-fetches dossier by Range — the data path is unchanged), sitemap generation if present.
- **Approach:** Raise the static-render set to only the top-N cities for SEO/direct URLs (e.g. top 1,000–2,000 by population/priority) by changing `generateStaticParams` to sort + slice instead of `filter(p >= 50000)`. Every other city stays fully reachable via the SPA map/search and the existing client route that Range-fetches its dossier — **no data dropped**, only HTML shells removed. Verify `notFound()` behavior for non-prerendered direct hits (it currently calls `notFound()` for unknown slugs via `loadCitySlugMeta`; with `export` a non-prerendered slug 404s statically — instead the client route must be allowed to resolve it). Two safe options: (a) keep `generateStaticParams` to top-N **and** keep the route a client shell that resolves any valid slug at runtime from the dossier index (preferred — preserves deep links), or (b) accept SEO loss for the long tail. Extract `POPULATION_THRESHOLD`/top-N into one shared constant imported by both `page.tsx` and `build-search-index-slim.ts` so the search set and page set cannot drift.
- **Measured by:** export file count (target ≈ 119,115 → ~13,000–25,000), export MB (target ≈ 629.8 → ~330–360 MB), and build peak RAM / wall time. Gate via `npm run audit:data` `fileCount`/`totalMB`.

### O2 — Delete phantom dependencies + dead components (zero-risk bundle cleanup)
- **Area:** bundle
- **Impact:** MEDIUM (removes OOM/footgun risk + shrinks graph; cleans `next.config.ts` Cesium wiring)
- **Effort:** LOW
- **Files:** `package.json` (remove `cesium`, `@deck.gl/core`, `@deck.gl/geo-layers`, `@deck.gl/layers`, `framer-motion`, `date-fns` — all zero `src` imports per `02-bundle.md`), `next.config.ts` (remove the Cesium `DefinePlugin`, `NEXT_PUBLIC_CESIUM_BASE_URL` env, and the `config.amd` webpack block at lines ~23,26–37 once Cesium is gone), `src/components/charts/radar-compare-chart.tsx` (delete — no consumers), `scripts/vendor` / `public/vendor/cesium` (remove the dead Cesium vendor copy so it stops shipping in `out/`).
- **Approach:** Confirm zero `src` imports for each dep (`grep`), remove from `package.json`, delete the Cesium config/env/webpack wiring and the `vendor/cesium` asset copy, delete the dead radar chart. Re-run build to confirm nothing transitively needed them.
- **Measured by:** `npm run build` passes; `node_modules` size drop; First Load JS unchanged-or-lower on every route via bundle-analyzer; `out/vendor/cesium` gone (file count + MB delta in `out/`).

### O3 — Defer maplibre + recharts on country/corridor routes; lazy-load home modals
- **Area:** bundle
- **Impact:** MEDIUM (country route drops ~250 KB maplibre + ~150 KB recharts from initial; home drops 3 modals)
- **Effort:** LOW–MEDIUM
- **Files:** `src/components/charts/asset-map.tsx` (top-level `import maplibregl from "maplibre-gl"` + CSS at :4–5 → runtime `await import` inside mount effect, like `tactical-map-2d.tsx:419` already does), its call sites `src/features/country/components/country-assets.tsx:9` and `src/features/dashboard/components/corridors-page.tsx:11` (or wrap in `next/dynamic(..., { ssr: false })`); `src/features/country/components/country-factbook.tsx:5-6` (convert `MetricBarChart`/`MetricLineChart` static imports to `dynamic()`); `src/features/home/components/home-shell.tsx:10-12` (convert `KeyboardShortcutsModal`, `LayerLegendModal`, `SettingsModal` to `dynamic(..., { ssr: false })`).
- **Approach:** Introduce the app's first code-split boundaries (currently **0** `next/dynamic`/`lazy` exist per audit). Mirror the proven `await import("maplibre-gl")` pattern from the tactical map so the second, eager maplibre entry point on country/corridor routes becomes deferred and consistent. Gate charts and modals behind `dynamic()` with `ssr: false` (required under static export) + a lightweight loading skeleton.
- **Measured by:** First Load JS for `/country/[slug]` and `/dashboard/corridors` (expect −250 KB maplibre, −150 KB recharts); home `/` first-load chunk excludes the 3 modals. Measured via bundle-analyzer before/after.

### O4 — Replace / cache / worker-ize the client search index load
- **Area:** map-runtime
- **Impact:** MEDIUM–HIGH (removes a large synchronous `JSON.parse` off the main thread; one parse per session)
- **Effort:** MEDIUM
- **Files:** `src/features/home/components/home-stage.tsx:813` (`fetch(assetUrl("/data/cities/search-index.json"))` + `res.json()` per query batch, uncached), `src/lib/city-data-client.ts:103-139` (`searchCities`/`generateSearchIndex`), `src/lib/dossier-bundle-client.ts:37-65` (the module-level memo pattern to copy), `scripts/data/cities/build-search-index-slim.ts` (where to add prefix-sharding / FlexSearch index if needed).
- **Approach (staged, cheap → strong):** (1) **Cache** the fetched+parsed index in a module-level promise (same `getIndex()` shape as `dossier-bundle-client`) or wire it through the already-installed but unused TanStack `QueryClient` (`app-providers.tsx`) so it parses once per session, not per keystroke-batch. (2) **Move parse+filter into a Web Worker** so the JSON parse never blocks paint/input. (3) If the shipped index is materially large after measurement, **shard by first letter or build a compact prefix/FlexSearch index** at build time in `build-search-index-slim.ts` so a query loads KBs, not the whole file. **Verify the real shipped size first** — the export/intent audits say the index was slimmed 59 MB → 2.4 MB, while the runtime audit cites 62 MB; resolve this discrepancy by measuring `out/data/cities/search-index.json` before choosing between "just cache" (if ~2.4 MB) and "re-shard" (if tens of MB).
- **Measured by:** main-thread blocking time during search (profiler, target: no long task > 50 ms from index parse after first load), repeated-query fetch count (target: 1 network + 1 parse per session), and the shipped index file size in `out/`.

### O5 — Precompress HTML/JSON to Brotli at build (and Brotli the dossier shards)
- **Area:** export-size
- **Impact:** MEDIUM (transferred bytes decisive for the ≤2 MB budget; stored bytes drop if shipping `.br` instead of raw)
- **Effort:** LOW–MEDIUM
- **Files:** `scripts/deploy/assemble-pages.ts` (add a post-build precompress pass over `out/**/*.{html,json}`), `scripts/data/cities/build-dossier-bundle.ts` (currently gzip-level-9 the shards — switch to Brotli, ~15–20% smaller; `copy-to-public.ts` consumes them).
- **Approach:** After `next build`, walk `out/` and emit `.br` (and optionally `.gz`) for HTML/JSON. Decide ship-both vs ship-br-only based on whether the GitHub Pages/host serves precompressed content-encoding (GitHub Pages does **not** honor a custom `.br` sidecar without a Worker — so on pure Pages this mainly helps if/when a CDN is added; if so, ship-both adds ~+10% stored). For the dossier shards, Brotli is unconditionally a stored-bytes win since the client already decompresses them itself. **Note the host constraint:** under pure GitHub Pages the browser-transfer win needs server content-negotiation; if absent, prioritize the dossier-Brotli sub-win (pure stored reduction) and defer HTML `.br` until a CDN exists.
- **Measured by:** stored `out/` MB (dossier dir before/after Brotli), and — where content-encoding is available — transferred first-load bytes via Lighthouse/network trace.

### O6 — Pack globe base-imagery raster pyramids into raster PMTiles (or cap zoom/date window)
- **Area:** export-size
- **Impact:** MEDIUM–HIGH (~15–25% of bytes + several thousand files removed)
- **Effort:** MEDIUM–HIGH (needs tippecanoe/raster tooling; `scripts/tools/tippecanoe/Dockerfile` exists)
- **Files:** `scripts/data/cities/generate-globe-artifacts.ts` + `scripts/data/globe/generate-pmtiles.ts` + `scripts/data/globe/download-gibs-imagery.ts` (raster source `base-imagery/<layer>/<date>/{z}/{x}/{y}.jpg` copied verbatim), `scripts/deploy/assemble-pages.ts` (the deploy gate that already deletes the vector geojson tree when `layers.pmtiles` exists — extend to prune raster pyramids once a raster archive exists), `src/features/home/components/tactical-map-2d.tsx:265-295` (`buildBaseImagerySource` — point the raster source at the PMTiles archive).
- **Approach:** Vectors are already PMTiles; finish the job for rasters. Pack each layer/date base-imagery pyramid into a **raster PMTiles** archive (range-streamed, one file per layer instead of thousands of tiles), or as a cheaper interim cap max zoom and ship a single date window. Then have `assemble-pages.ts` prune the verbatim pyramids the same way it prunes vector geojson. **No imagery dropped** — it is repacked into a range-addressable archive the map streams from.
- **Measured by:** `out/data/globe` MB and file count before/after; pan/zoom transfers only viewport tiles (network trace); largest-file stays < 50 MiB (size-budget gate).

### O7 — Fold countries/admin1 reference geojson into PMTiles vector tiles
- **Area:** map-runtime (also export-size)
- **Impact:** MEDIUM (eliminates the largest synchronous geojson parses blocking first map render)
- **Effort:** MEDIUM
- **Files:** `src/features/home/components/tactical-map-2d.tsx:56-57` (`natural-earth-countries.geojson`, `natural-earth-admin1.geojson` paths), `:314-319` (baked into initial style as `type:"geojson"`), `:595-598` (`city-selection-source`), `scripts/data/globe/generate-pmtiles.ts` / `generate-reference-layers.py` (add countries/admin1 as vector source-layers).
- **Approach:** Move the two full-resolution reference geojson files into `layers.pmtiles` (or a second PMTiles) as vector source-layers — the exact pattern already used for operational layers — so only visible tiles load and the large main-thread `JSON.parse` on map boot disappears. Interim (if PMTiles tooling not ready): simplify with `tippecanoe`/`mapshaper` to low-zoom geometry and defer the admin1 layer until `map.once('idle')` rather than the initial style.
- **Measured by:** time-to-first-interactive-map (profiler, no long geojson parse task on boot), `out/data/globe/reference` MB/file delta, and viewport-only tile fetches on pan/zoom.

### O8 — Memoize map props + guard `update()`; throttle hover hit-test
- **Area:** map-runtime
- **Impact:** MEDIUM (removes redundant MapLibre work on every parent re-render and per-pointer-move hit-tests)
- **Effort:** LOW
- **Files:** `src/features/home/components/tactical-map-2d.tsx:900-916` (the update effect over `featuredCities`/`activeLayerIds`/`baseImageryCatalog`/`globeManifest`/`selectedCity`), `:713-749` (the `mousemove` → `queryRenderedFeatures` hover handler), `src/features/home/components/home-stage.tsx:1080-1087` (`featuredCities` rebuilt with `.map(...)` each render; `buildMountArgs` recreated each render).
- **Approach:** `useMemo` the `featuredCities` array and the per-mount args so identities are stable; gate `controller.update()` on actual value changes (the code already diffs base-imagery key + focused city — add a joined-string compare for layer ids). For hover, rAF/throttle the `queryRenderedFeatures` hit-test, or switch to MapLibre `mouseenter`/`mouseleave` + `feature-state` styling instead of resetting a geojson source each move.
- **Measured by:** count of `controller.update()` / `queryRenderedFeatures` calls per interaction (instrument/profile), and frame rate during pan (target: no dropped frames from hover).

### O9 — Parallelize + cache city-page loads via TanStack Query
- **Area:** data-loading
- **Impact:** LOW–MEDIUM (removes one serial RTT on the dossier page; adds back/forward caching)
- **Effort:** LOW–MEDIUM
- **Files:** `src/app/city/[slug]/city-page-client.tsx:26-66` (serial `findCityBySlug` → `Promise.all`), `src/lib/command-center-client.ts` (`loadCommandCenterManifestClient`), `src/app/app-providers.tsx` (the existing unused `QueryClient`).
- **Approach:** Kick off `loadCommandCenterManifestClient()` in parallel with the first `findCityBySlug` (the manifest does not depend on the city), removing the serial sequencing. Wire both through `useQuery` so navigations (back/forward) hit cache instead of re-fetching. Pairs with O4 (same `QueryClient`).
- **Measured by:** city-page TTFB-to-render (one fewer serial RTT), and zero re-fetch on back/forward navigation (network trace).

### O10 — Tighten country-asset cap, dedupe assets, confirm largest-file gate
- **Area:** export-size
- **Impact:** LOW–MEDIUM (~3–8% of bytes; restores/confirms the largest-file guard)
- **Effort:** LOW
- **Files:** `scripts/deploy/assemble-pages.ts` (top-5000 country-record cap + `telegeography` strip), `scripts/audit/checks.ts:92-108` (`sizeBudgetCheck` — confirm `largestFileMB` is genuinely computed; it IS, via `walk()`'s `largest[]` sorted desc, so the audit's "stub" worry is unfounded — the `0` just means no file > 50 MiB in that run), `data/assets/` + corridors output.
- **Approach:** Lower the cap for the largest country files (e.g. 5000 → 2000) **only where records duplicate provenance already present in the dossier bundle / globe layers** — keep the honest "top N of M" note; never silently truncate unique data. Audit `data/assets/` + corridors for records already represented elsewhere and dedupe those. Add a regression assertion that `largestFileMB` is non-zero-when-expected so the gate's largest-file probe stays trusted.
- **Measured by:** `out/data/assets` MB delta, size-budget `largestFileMB` populated correctly, and a provenance/dedupe check that no unique source record was removed.

---

## Sequencing (do in this order)

1. **O1** — pre-render top-N only. Biggest single win (file count + bytes + build OOM) for low effort; everything downstream measures against a smaller export.
2. **O2** — delete phantom deps + dead Cesium wiring. Zero risk, immediate graph/footgun cleanup; unblocks clean bundle measurement.
3. **O3** — code-split maplibre/recharts/modals. Low effort, introduces the first `dynamic()` boundaries.
4. **O4** — search index cache + worker (measure real size first; re-shard only if large).
5. **O5** — Brotli the dossier shards now (pure stored win); HTML `.br` gated on CDN/content-negotiation.
6. **O8** — memoize map props + throttle hover (cheap runtime win).
7. **O7** — countries/admin1 → PMTiles (bigger map-boot win; needs tippecanoe).
8. **O6** — base-imagery → raster PMTiles (largest remaining globe byte win; heaviest tooling).
9. **O9** — parallelize/cache city-page loads.
10. **O10** — tighten asset cap + confirm largest-file gate.

---

## Measurable targets

- Export file count **119,115 → < 25,000** (driven by O1).
- Export size **629.8 MB → < 400 MB** after O1+O5+O6 (stretch < 350 MB).
- No single client-fetched file **> 5 MB**; no `out/` file **> 50 MiB** (size-budget gate).
- First load **≤ 2 MB transferred, interactive ≤ 2.5 s** on mid-range phone (Fast-3G) — prior locked budget.
- One city dossier **≤ 250 KB** compressed beyond first load (unchanged; protect it).
- `/country/[slug]` and `/dashboard/corridors` First Load JS **drops ≥ 350 KB** (maplibre + recharts deferred, O3).
- Search path: **one index fetch + one parse per session**, no main-thread long task > 50 ms from it (O4).
- `npm run build` + `deploy:assemble` + `audit:data` size-budget = **PASS** after every change.

---

## Risks / constraints to watch

- **O1 deep-link/SEO + `notFound()`:** removing static shells for long-tail cities must not 404 valid deep links — keep the client route able to resolve any valid slug from the dossier index, or accept (and document) SEO loss for the long tail. This is the only change that touches user-facing routing.
- **Search-index size discrepancy (2.4 MB vs 62 MB):** the runtime audit and the export/intent audits disagree. **Measure `out/data/cities/search-index.json` before choosing O4's depth** — "just cache" vs "re-shard + worker."
- **GitHub Pages serves no custom content-encoding without a Worker:** O5's HTML `.br` transfer win is real only behind a CDN/Worker; on pure Pages it is stored-bytes-neutral-to-negative. The dossier-Brotli sub-win is unconditional. Host budgets are LOCKED to GitHub Pages (≤1 GB site, 100 MB/file).
- **PMTiles tooling (O6, O7):** tippecanoe needs Docker/WSL/CI on Windows (`scripts/tools/tippecanoe/Dockerfile`). Schedule these after the no-tooling wins so they never block the critical path.
- **`largestFileMB: 0` is NOT a stubbed probe** (contra `01-export-size.md` caveat): `sizeBudgetCheck()` computes it from `walk()`'s sorted `largest[]`; the `0` correctly reflects no file > 50 MiB in that run. O10 only adds a regression assertion to keep it honest.
- **Data integrity gate:** O1, O6, O10 each remove or repack data representations — every one must keep the underlying source records reachable (SPA route / dossier Range / PMTiles archive) and preserve honest "top N of M" notes. Run the provenance regression test after each.
- **Build OOM:** O1 simultaneously relieves the documented 12k-page static-export OOM that forced `assetPrefix` omission + `NEXT_BUILD_CPUS` capping in `next.config.ts`; verify those workarounds can be relaxed afterward (measure peak RAM).

---

## Deferred — needs tooling (not implemented in the 2026-06-20 perf pass)

The 2026-06-20 implementation pass shipped O1 (pre-render top-N + SPA fallback), O3 (first
`next/dynamic` boundaries), O4 (cached search index), O8 (map memo + hover throttle), and O9
(parallel city-page loads). The following are explicitly deferred:

- **O5 (Brotli) — DEFERRED (would break dossier loading).** The dossier client decompresses shards
  in-browser via `new DecompressionStream("gzip")` (`src/lib/dossier-bundle-client.ts:32-35`).
  `DecompressionStream` does **not** support `'br'` in most browsers, so switching the dossier shards
  from gzip to Brotli would break in-browser dossier decompression. The HTML/JSON `.br` sub-win
  remains gated on a CDN/Worker (GitHub Pages serves no custom content-encoding). Skipped entirely to
  avoid risking dossier loads. Revisit only if the client is moved to a gzip-or-br negotiation or a
  WASM Brotli decoder is added.
- **O6 (raster base-imagery → raster PMTiles) — DEFERRED (needs tooling).** Requires tippecanoe /
  raster-packing tooling not available on this Windows box (no Docker/WSL assumed). Schedule on a
  machine/CI with the tippecanoe toolchain.
- **O7 (countries/admin1 geojson → PMTiles) — DEFERRED (needs tooling).** Same tippecanoe/PMTiles
  toolchain requirement as O6. Defer to CI/Docker. (Interim mapshaper simplification is possible but
  also not attempted in this pass.)
