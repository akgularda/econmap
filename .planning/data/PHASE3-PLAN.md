# Phase 3 — City data coverage: plan

## Reality

- Full pipeline (`npm run data:cities` → `run-pipeline.ts`) processes 189,025 cities, peaks ~14 GB, emits 629.8 MB / 119,115 files, and runs Python enrichment (geopandas/pyarrow/pandas) mid-way.
- Python is 3.14 (bleeding edge) with **no data libs installed**; geopandas/pyarrow likely have no wheels → the Python enrichment steps are a hard blocker right now.
- Required bulk sources (GeoNames allCountries 1.78 GB, alternateNames 776 MB, OurAirports, UN/LOCODE) are **downloaded** via `scripts/data/cities/download-bulk-sources.mjs`, so `assertRequiredBulkSourcesExist()` passes.

## Strategy: scoped re-run (real data, no Python)

`scripts/data/cities/rerun-scoped.ts [minPopulation]` is the right tool:

1. Ingests the **full** registry (all 189k cities → every city searchable + a globe point).
2. Scopes the expensive per-city entity JOIN to `population >= minPop` (full dossiers for the larger set).
3. **Skips** connectivity/environment/economic Python enrichment (unaffected by core data; avoids the geopandas/pyarrow blocker).
4. Writes `slug-meta.json` (11 MB slim lookup) to keep the static export from OOM-ing.

This gives the app **real, browsable city data** offline from the downloaded bulk sources, and inherently produces the "minor cities" gap story: cities below the threshold have identity (name/coords/population) but `coverage-pending` deeper fields.

## Steps

1. **Generate real data** (background, after Phase 1 to avoid RAM contention with the menu agent's test runs): stop dev server → `npx tsx scripts/data/cities/rerun-scoped.ts 50000` → restart dev. Validate artifacts + `npm run audit:data`.
2. **Gap-UX / coverage logic** (code): ensure minor cities (registry-only) render a coherent page with explicit `covered / partial / not_covered_yet` states instead of blanks. Reuse the coverage-state badges introduced in the Phase 1 menu redesign.
3. **Expand coverage**: lower `minPop` / run additional scoped passes as disk/time allow; record processed-city delta vs the 87,846 baseline.
4. **Python enrichment (stretch)**: attempt `pip install pandas pyarrow geopandas` on 3.14; if wheels unavailable, document as a known gap (enrichment fields stay `not_covered_yet`) — do NOT fabricate.

## Guardrails

- No fabrication (project non-negotiable). Unknowns stay explicit.
- `npm run audit:data` must pass (provenance, geospatial, size budget) after generation.
- Watch the static-export size budget — scoped run is far under the full 630 MB.
