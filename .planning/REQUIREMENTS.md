# Requirements: MapFactbook (econmap)

**Core Value:** The interactive map + trustworthy, source-attributed economic/city intelligence an analyst can navigate quickly.

## Validated (v1.0 — shipped 2026-06-20)

- ✓ **REQ-01** Search-first, sectioned left menu exposing all destinations — Phase 1
- ✓ **REQ-02** Intentional empty/coverage-pending menu states — Phase 1
- ✓ **REQ-03** Static export size + file count reduced (dead-dep removal, top-N pre-render, SPA fallback) — Phase 2
- ✓ **REQ-04** Client bundle + map runtime perf improved (code-splitting, memoization, throttling) — Phase 2
- ✓ **REQ-05** Minor cities degrade gracefully with explicit coverage states — Phase 3
- ✓ **REQ-06** Raw city coverage expanded via the scoped pipeline (191,845 registry / 7,310 dossiers) — Phase 3

## v1.1 Requirements (defined 2026-06-21)

### Map tiles

- [x] **TILE-01**: Globe operational layers serve from a single range-addressable PMTiles archive instead of whole-geojson shards — Phase 4 ✓
- [x] **TILE-02**: Deploy ships only the archive, pruning the redundant per-layer geojson tree — Phase 4 ✓ (`assemble-pages.ts`)

### Coverage expansion

- [x] **COVER-01**: A one-command downloader acquires the enrichment raw sources reproducibly (auto where a direct URL exists; clear manual instructions otherwise) — Phase 5 ✓ (`download-enrichment-sources.mjs`; AUTO sources pulled)
- [x] **COVER-02**: enrichment generated over the registry, increasing coverage vs. the 7,310 baseline — Phase 5 ✓ **9,235 cities / 119,020 entities / 5 sources** (was 7,310 / 19,042 / 3). Connectivity 570 (Ookla), Environment 248 (WHO), Assets WRI+ROR resolved. Economy (Eurostat) staged — needs OECD crosswalk (manual).
- [x] **COVER-03**: New fields are source-backed and `audit:data` passes; unmatched cities stay explicit `not_covered_yet` — Phase 5 ✓ (audit:data 5/5 PASS, 0 unsourced)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Brotli dossier shards | Browser `DecompressionStream` has no `'br'` decoder; shards already ship gzip. Client-side Brotli is unworkable. |
| Fabricated/interpolated city facts | Data policy is high-confidence-only; unknowns stay `null` / `not_covered_yet`. |
| Global city-level sector mix, rents, cost, congestion, utility reliability, factory/SEZ rosters | No trustworthy global open bulk source (`citydata-bulk-source-matrix.md`). |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TILE-01 | Phase 4 | Complete |
| TILE-02 | Phase 4 | Complete |
| COVER-01 | Phase 5 | Complete |
| COVER-02 | Phase 5 | Complete (9,235 cities / 119,020 entities / 5 sources; Economy needs OECD crosswalk — manual) |
| COVER-03 | Phase 5 | Complete (audit 5/5 PASS) |

---
*v1.1 requirements defined 2026-06-21. v1.0 requirements (REQ-01..06) validated 2026-06-20.*
