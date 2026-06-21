# Static-Export Size Audit — EconMap (`output: "export"`)

**Baseline (docs/audits/2026-06-17-data-audit.json, size-budget):** **629.8 MB across 119,115 files.**
Status in that report: `pass` (under the ~1 GB GitHub Pages soft cap), `largestFileMB: 0` (the
largest-file probe is not populated in this run — see Caveats).

> Note: `out/` and `public/data/` are **not materialized** in this checkout (source-only — `public/`
> holds 6 static assets, no `data/`). All size/file figures below are reconstructed from the audit
> JSON + the documented reduction history in `docs/goals/scale-shrink-audit-goal.md` (§7·EXEC) and
> from reading the generator/deploy scripts. They are directionally exact but should be re-measured
> against a fresh `npm run build && npm run deploy:assemble`.

---

## How the export is generated (the fan-out machine)

The export size is driven by **two independent fan-outs**: pre-rendered HTML pages, and per-entity
data artifacts fetched client-side.

### 1. Pre-rendered HTML pages (`generateStaticParams`)
| Route | Source of params | Count emitted | Notes |
|---|---|---|---|
| `city/[slug]` | `loadCitySlugMeta()` filtered `p >= 50000` | **~12,010** | The dominant page fan-out. Each page is a near-identical loading shell that client-fetches its dossier by Range. |
| `country/[slug]` | `countries` (normalized) | ~190–250 | tiny |
| `regions/[slug]` | `subnationalUnits` | **12** | trivial |
| `datasets/[datasetId]` | command-center `datasetInventory` | **~31** (DATASET_INVENTORY_SEEDS) | trivial |
| static singletons | — | ~12 (`compare`, `corridors`, `rankings`, `datasets`, `indicators`, `reports`, `story-mode`, `dashboard`, `/`, …) | trivial |

**Takeaway:** of the page routes, **only `city/[slug]` matters** — ~12,010 pages. With Next's
`output:"export"` each page directory ships ~9 files (`index.html` + per-page `_next` data/chunks +
`.txt`/RSC payload + `trailingSlash` dir), which is the historical **`city/` = ~108K files / 324 MB**
line. The population threshold (`POPULATION_THRESHOLD = 50000`) is the single knob controlling this
count; it is duplicated in `build-search-index-slim.ts` (search index is scoped to the same set).

### 2. Per-entity DATA artifacts (client-fetched, not pages)
- **`generate-artifacts.ts`** historically wrote **4 JSON files per city** (`workspaces/`,
  `entities/`, `sources/`, `coverage/`) — only for cities with resolved source data (`if (resolved)`),
  i.e. ~88K cities → **~351K files / ~940 MB–1.1 GB**. This is the original blob.
- **`build-dossier-bundle.ts`** now **packs all 4×N per-city files into 4 gzip shards**
  (`shard-<i>.dossierbin`) + `index.json` + `trim-manifest.json`, Range-addressable. Reported result:
  **940 MB / 351K files → ~127 MB / 6 files.** Client fetches one byte-range (~1.5 KB) per opened city.
- **`build-search-index-slim.ts`**: drops URL/Wikidata-Q-ID aliases + scopes to navigable cities →
  **59 MB → 2.4 MB**, single lazy-loaded file.
- **`copy-to-public.ts`**: no longer ships `registry.json` (was 117 MB) or the raw per-type dirs;
  rebuilds the slim search index + dossier bundle instead.

### 3. Globe geometry (`generate-globe-artifacts.ts` + `assemble-pages.ts`)
- The globe script emits, **per vector layer** (~13 LAYER_SEEDS): `vectors/current.geojson` (full),
  `vectors/boot.geojson` (decimated preview), and **`shards/{world,nw,ne,sw,se}.geojson`** (5 quadrant
  copies) + `meta.json`/`snapshots/summary.json`. That is a **large duplication**: `world.geojson`
  duplicates `current.geojson`, and the 4 quadrants re-store every feature again. Plus base-imagery
  raster tiles (`base-imagery/<layer>/<date>/{z}/{x}/{y}.jpg`) copied verbatim — historically the
  **`data/globe/` = 771 MB / 7,317 files** line.
- **`assemble-pages.ts`** is the deploy gate. If a `layers.pmtiles` archive exists it **deletes the
  entire `out/data/globe/layers/` geojson tree** (every layer's current/boot/shard files) and keeps the
  single PMTiles archive. Otherwise it falls back to pruning only the dead `current.geojson` +
  `shards/world.geojson` of sharded+boot layers. It also **caps oversized country asset files** to
  top-5000 by priority (`usa.json` 95 MB → 1.8 MB) and **strips `telegeography`** (commercial) records.

**The 629.8 MB / 119,115 figure is the POST-shrink state** (dossier bundle + slim search +
registry removed + globe pruned/PMTiles + asset cap), down from the 2,467 MB / 470,557 baseline and
the intermediate 909.9 MB. PMTiles appears to have landed between the 909.9 MB checkpoint and this
audit (it is the only documented step that takes globe geojson to near-zero).

---

## Contributor breakdown (estimated, post-shrink ≈ 629.8 MB)

These are reconstructed allocations; re-measure on a real build. Percentages are of 629.8 MB.

| Contributor | Est. size | Est. files | % of total | Why it's big |
|---|---|---|---|---|
| **City HTML shells** (`city/[slug]`, ~12,010 pages) | ~280–324 MB | **~108,000** (≈90% of all files) | **~45–50%** | ~9 files/page × 12,010; near-identical shells + per-page `_next` data/RSC payloads. This is the file-count problem. |
| **Dossier bundle** (`data/cities/dossiers/*.dossierbin`) | ~127 MB | 6 | **~20%** | All per-city dossiers, gzip-packed across 4 shards (already heavily optimized). |
| **Globe** (`data/globe/`: PMTiles archive + base-imagery rasters) | ~120–170 MB | ~5,000–7,000 | **~20–27%** | Vector layers now `layers.pmtiles`; remaining bulk is **base-imagery JPEG/PNG tile pyramids** (`{z}/{x}/{y}`) copied verbatim per date. |
| **Country/corridor assets** (`data/assets/`) | ~30–70 MB | ~260 | **~5–10%** | Even after the 5000-record cap, ~13 large country files + corridors. |
| **JS/CSS chunks + slim search index** (`_next/static`, `search-index.json` 2.4 MB) | ~15–25 MB | ~2,000 | **~3–4%** | Shared chunked bundle (Cesium/MapLibre is the heavy dep) + lazy search. |

**File-count reality:** ~90% of the **119,115 files** are the city-page shells. **Bytes** are spread
roughly evenly across HTML, dossier bundle, and globe. So the two problems are different: *file count*
= city pages; *bytes* = HTML + dossiers + globe rasters.

---

## Concrete reductions (ranked by impact)

### R1. Stop pre-rendering ~12,010 city pages — client-route them (or pre-render top-N)
- **What:** drop or sharply lower `POPULATION_THRESHOLD` so only the top-N cities (e.g. top 1,000–2,000
  for SEO/direct URLs) get static HTML; the rest resolve via the SPA map/search + a single dynamic
  client route that fetches the dossier by Range (already the loading path). The dossier bundle is
  unaffected — those cities are already reachable on the map.
- **Impact:** removes ~**90% of all files** (~96K–106K files) and ~**280–320 MB** of HTML shells.
  **~45–50% of bytes, ~80–90% of file count.** Biggest single win; also cuts build time/OOM risk
  (the next.config.ts worker/OOM comments exist *because of* this 12k-page export).
- **Cost:** lose direct-URL/SEO for non-top-N cities; rewrite `command-center-client` not needed (data
  path unchanged), but verify `notFound()`/sitemap behavior. Keep the slim search index in sync (same
  threshold constant).

### R2. Precompress everything to Brotli/gzip at build (`.html.br`, `.json.br`, dossier shards)
- **What:** add a post-build pass (or rely on Fastly/GitHub-Pages content-encoding) to ship `.br`
  alongside HTML/JSON. The dossier shards are already gzip; HTML shells and the PMTiles/JSON are not.
- **Impact:** HTML/JSON compress ~5–10×. On the *transferred* budget (the §1 goal: ≤2 MB first load)
  this is decisive; on **stored** bytes, precompressing the ~280 MB of HTML → ~30–50 MB stored if you
  ship `.br` *instead of* raw (or ~+10% if alongside). **~15–40% of stored bytes** depending on
  ship-both vs ship-br-only. Pairs with R1 (fewer, smaller shells).

### R3. Convert base-imagery raster tile pyramids → fewer/optimized tiles or PMTiles raster
- **What:** the remaining `data/globe/base-imagery/<layer>/<date>/{z}/{x}/{y}.jpg` pyramids are copied
  verbatim and are now likely the **largest byte+file contributor inside globe**. Pack each layer/date
  into a **raster PMTiles** archive (range-streamed) the same way vectors were, or cap max zoom /
  reduce shipped date windows to one.
- **Impact:** **~15–25% of bytes** and several thousand files removed. Vectors are already PMTiles; this
  finishes the job. (The vector geojson tree is already pruned by `assemble-pages.ts`.)

### R4. Shard/merge & deduplicate the dossier bundle further; verify globe shard pruning
- **What:** (a) The dossier bundle is already merged (4→1 logical, 351K→6 files). Remaining lever:
  Brotli instead of gzip-level-9 on the shards (~15–20% smaller) — pairs with R2. (b) Ensure
  `generate-globe-artifacts.ts` is not still writing the 5× quadrant + world + current duplication into
  `public/` that later has to be pruned — generate **only** what survives (boot + the archive), so the
  intermediate `public/` and git history don't carry 5 copies of every feature.
- **Impact:** **~3–5% of bytes** (dossier Brotli) + removes duplicate-shard churn (build-time + repo
  size). Low risk, already-wired pattern.

### R5. Tighten the country-asset cap & drop low-value duplicate data
- **What:** `assemble-pages.ts` caps country files to top-5000 records and strips `telegeography`. Lower
  the cap (e.g. 2000) for the largest files, and audit `data/assets/` + corridors for records already
  represented in the dossier bundle / globe layers (duplicate provenance). Confirm `largestFileMB` is
  actually measured (the audit shows `0`, suggesting the probe is stubbed — fix so the gate can catch a
  >50 MB regression).
- **Impact:** **~3–8% of bytes**; plus restores the size-budget gate's largest-file guard.

---

## Caveats / follow-ups
- **`largestFileMB: 0`** in the audit is almost certainly a non-populated probe, not a real "no large
  file." Verify `sizeBudgetCheck()` in `scripts/audit/checks.ts` actually computes it before trusting
  the gate.
- Figures here are **derived**, not measured on this checkout (no `out/`). Run
  `npm run build && npm run deploy:assemble` and re-measure `out/` per top-level dir to lock exact
  contributor shares before acting.
- R1 is the highest-leverage change and the one the `next.config.ts` OOM/worker comments are a symptom
  of: eliminating the 12k-page export removes both the file-count bloat **and** the build-time memory
  pressure simultaneously.
