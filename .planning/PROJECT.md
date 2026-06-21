# MapFactbook (econmap)

## What This Is

MapFactbook is a premium, dark-by-default **economic-intelligence web app** built around an interactive globe and a worldwide **city/country OSINT atlas**. It is a statically-exported Next.js site (App Router) deployed to GitHub Pages, presenting source-backed economic indicators, rankings, comparisons, forecasts, and a ~189k-city data system to analyst-minded users.

## Core Value

The interactive map + **trustworthy, source-attributed economic/city intelligence** that an analyst can navigate quickly. If everything else fails, the map must load and let a user find a place and read credible facts about it.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ Static-export Next.js shell with home/command-center, country/city/compare/rankings/indicators/datasets/regions/corridors/reports/story-mode routes — pre-existing
- ✓ Source-backed data pipeline + audit harness (provenance, geospatial sanity, size budget) — pre-existing
- ✓ App renders on a fresh clone without generated data (graceful degradation) — Phase 0
- ✓ One-command bootstrap for required bulk sources (`download-bulk-sources.mjs`) — Phase 0
- ✓ **REQ-01/02** Search-first, sectioned left menu with honest coverage-pending states — v1.0 Phase 1
- ✓ **REQ-03/04** Static export + client/map runtime optimized (dead-dep removal, top-N pre-render, code-splitting) — v1.0 Phase 2
- ✓ **REQ-05/06** Minor cities degrade gracefully; raw coverage expanded via scoped pipeline (191,845 / 7,310) — v1.0 Phase 3
- ✓ **TILE-01/02** Globe layers served from a 1.2 MB range-addressable PMTiles archive (replaces 272 MB geojson tree) — v1.1 Phase 4

## Current Milestone: v1.1 — Deferred follow-up

**Goal:** Close the items deferred at the end of v1.0 — pack globe vector tiles (PMTiles) and expand
city-intel coverage — while dropping the unworkable Brotli idea.

**Target features:**
- Globe PMTiles packing (Phase 4) — **done 2026-06-21**
- Full city enrichment coverage (Phase 5) — **executed 2026-06-21**: 9,235 cities / 119,020 entities / 5 sources / 9 globe layers; `audit:data` 5/5. Residual gap is portal-only manual data (OECD/WPI/GHSL/Aqueduct/Carbon Monitor/GLEIF).

### Validated (v1.1)

- ✓ **COVER-01** One-command enrichment downloader (`download-enrichment-sources.mjs`) — AUTO sources pulled
- ✓ **COVER-02** Coverage expanded: 7,310 → **9,235 cities**, 19,042 → **119,020 entities**, 3 → **5 sources** (WRI power + ROR universities resolved; Ookla connectivity + WHO air quality enrichment). Economy via Eurostat staged (needs OECD crosswalk — manual)
- ✓ **COVER-03** New fields source-backed; `audit:data` 5/5 PASS; gaps stay explicit `not_covered_yet`

### Out of Scope

- News feeds / headlines / current-events widgets — explicitly excluded by product vision (`citydata.md`)
- Fabricated / inferred / interpolated city facts — data policy is high-confidence-only; unknowns stay explicit (`null`/`not_covered_yet`)
- Server-rendered runtime / dynamic backend — the app is a static export; no request-time data
- Brotli dossier shards — browser `DecompressionStream` has no `'br'` decoder; shards already ship gzip (v1.1)

## Context

- **Stack**: Next.js (App Router, `output: "export"`) + TypeScript, Tailwind + shadcn/ui, Zustand, TanStack Query, MapLibre GL JS + PMTiles, Recharts, Framer Motion, Prisma + SQLite (scaffold only), Zod.
- **Data**: All generated data (`src/data/generated/`, `public/data/`) is gitignored and produced by `scripts/data/cities/*` + `scripts/data/globe/*` from external bulk sources. Latest audit (2026-06-17): 189,025 cities, 87,846 processed, 629.8 MB across 119,115 files.
- **The left menu** lives in `src/features/home/components/layout/tactical-sidebar.tsx`.
- **User feedback themes** (this engagement): "left menu is not even close to useful", "website is not optimized", "lots of missing data for minor cities".

## Constraints

- **Performance**: Static export must fit GitHub Pages limits (soft ~1 GB / file-count pressure) — currently 629.8 MB / 119,115 files.
- **Dependencies**: Full data regen needs external bulk datasets (GeoNames, OurAirports, UN/LOCODE required; Natural Earth/WHO/GLEIF/GHSL/OECD/Eurostat/Ookla optional) + Python enrichment. Required set is now downloaded locally.
- **Tech stack**: Must remain a static export (no runtime server); navigation/state sync is URL-based (`?city,?layers,?base,?date,?view,?q`).
- **Data integrity**: No fabrication. Every datum source-backed; gaps explicit.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Make data loaders degrade gracefully on missing artifacts | Fresh clone 500'd on absent generated data; needed to render for UI work | ✓ Good |
| Add `download-bulk-sources.mjs` bootstrap (PowerShell unzip on Win) | Pipeline only *asserted* bulk sources existed; no acquisition path | ✓ Good |
| Sequence work menu → perf → data | User's stated priority | ✓ Good |
| Pursue full pipeline for real data (background) | User chose full pipeline over sample | ✓ Good |
| Pack globe layers as PMTiles via tippecanoe/Docker | Globe geojson was the largest data category (272 MB) | ✓ Good — 272 MB → 1.2 MB |
| Drop Brotli dossier shards | Browser can't decode `br`; gzip already shipped | ✓ Good |

---
*Last updated: 2026-06-21 after v1.1 Phase 4 (globe PMTiles) + Phase 5 scaffold*
