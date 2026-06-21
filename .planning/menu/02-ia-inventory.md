# EconMap (MapFactbook) — Information Architecture Inventory

App: Next.js (App Router, `output: "export"` static export). Root layout (`src/app/layout.tsx`) has NO chrome/nav — it only mounts `AppProviders`. There is no app-wide header or persistent global nav.

## Two disjoint navigation worlds

1. **Home shell (`/`)** — the map terminal. Renders `HomeShell` → `HomeStage` → `TacticalSidebar` ("Analyst rail"). The sidebar links ONLY to: cities (`/city/[slug]`, `/?city=...`), and a single footer link to the dataset workspace (`/datasets`, set in `home-shell.tsx:57`). Country drawer (on the map) links to `/country/[slug]`. The top control cluster (`top-control-cluster.tsx`) has icon buttons (camera/fullscreen/legend/settings/screenshot) — none navigate to routes. **The home shell does NOT link to compare, corridors, rankings, indicators, dashboard, story-mode, or reports.**

2. **PageFrame inner pages** — every non-home, non-detail page renders inside `PageFrame` (`src/components/layout/page-frame.tsx`), which has a pill nav with exactly these 8 links: `/` (Map), `/compare`, `/corridors`, `/rankings`, `/indicators`, `/dashboard`, `/story-mode`, `/reports`. This nav does NOT include `/datasets`, `/compare/blocs`, or any detail route. You can only enter this world by already being on one of those pages — there is no link FROM the home shell INTO any PageFrame page except indirectly.

**Net effect:** The PageFrame page-cluster is effectively unreachable from the landing page (`/`). The only home→inner crossing is the `/datasets` footer link, but `/datasets` itself does NOT use PageFrame, so it cannot reach the PageFrame nav either. The two worlds are bridged only by `/` (Map) appearing in the PageFrame nav (inner → home), never home → inner.

## No global search / command palette

There is **no command palette and no global search**. The only search affordance is the city-search `<form action="/">` inside the TacticalSidebar (`tactical-sidebar.tsx` ~line 518) — a GET form posting `?q=` to `/`. Note: the home page (`src/app/page.tsx`) hardcodes `searchQuery = ""` and explicitly does NOT read `searchParams` at build time (static export), so the search box renders but does not actually drive server-side results.

## Per-route detail

| Route | Purpose | Primary content | Reachable / how |
|---|---|---|---|
| `/` (home) | Map-first OSINT/economic terminal | 2D tactical map + globe, base imagery layers, analyst sidebar (city search, watchlists, analyst sections, selected-city intel) | Yes — root. Also reached via "Map" pill in every PageFrame page. |
| `/city/[slug]` | Full city dossier/workspace | City brief, metrics, infrastructure, entity cues, source coverage (anchors like `#economic-factbook`) | Yes — heavily linked: sidebar search results, watchlists, selected-city "Open full city dossier", and from dashboard/compare/rankings/datasets-workspace city lists. |
| `/country/[slug]` | Country factbook | Country overview, metrics, regions, cities (PageFrame-based via `country-factbook.tsx`) | Yes — via CountryDrawer on the map (`country-drawer.tsx`), from `/regions/[slug]`, and from `/compare/blocs`. NOT in PageFrame nav. |
| `/compare` | City/country intelligence comparison | Selected cities + shared OSINT spine (source labels, infra/institution counts); links to `/compare/blocs` | Yes — PageFrame nav. |
| `/compare/blocs` | Geopolitical bloc aggregation/comparison | Per-bloc asset aggregation from manifest, MetricCards, links to `/country/[slug]` | Partially — only via a link on `/compare`. NOT in PageFrame nav; orphaned from home. |
| `/corridors` | Strategic chokepoints / trade corridors | Corridor index + detail, asset map of infrastructure near maritime/trade corridors | Yes — PageFrame nav. |
| `/dashboard` | Saved OSINT watchlists | Infrastructure watchlist, selected-city cards linking to `/city/[slug]` | Yes — PageFrame nav. |
| `/datasets` | Dataset catalog | Dataset inventory grouped by pipeline status, per-surface counts, links to workspaces/`/datasets/[id]` | Yes — but ONLY via the TacticalSidebar footer link on `/`. NOT in PageFrame nav. Does not use PageFrame (uses tactical chips, "back to /"). |
| `/datasets/[datasetId]` | Single dataset workspace | Dataset detail, linked cities (`/city/[slug]`), back-link to `/datasets` and `/` | Yes — via `/datasets` catalog cards (or `workspacePath`). Two hops from home. |
| `/indicators` | Indicator library | Indicator definitions grouped by category (unit, source, latest year, coverage notes) | Yes — PageFrame nav. |
| `/rankings` | Evidence-backed ranking slices | Selected cities ranked by infra+institution score, links to `/city/[slug]` | Yes — PageFrame nav. |
| `/regions/[slug]` | Region (ADM1) profile | Subnational metrics (population, GDP, labor, etc.), link back to `/country/[slug]` | Orphaned — no inbound link found in src (not in PageFrame nav, not linked from country/home). Reachable only by direct URL. |
| `/reports` | Analyst report outputs | Watchlist-based report cards (selected cities + source labels) | Yes — PageFrame nav. |
| `/story-mode` | Curated economic narratives | 4 static story cards (no data binding) | Yes — PageFrame nav. |

## Orphan / weak-link summary
- **`/regions/[slug]` — fully orphaned** (no inbound `Link` anywhere in `src`).
- **`/compare/blocs` — weakly linked** (only from `/compare`; not in nav).
- **`/datasets` & `/datasets/[datasetId]` — reachable only from the home sidebar footer**, not from the PageFrame nav cluster.
- **Entire PageFrame nav cluster** (compare/corridors/rankings/indicators/dashboard/story-mode/reports) is **unreachable from the landing page `/`** — no link exists from the home shell into it. It is a closed loop you can only enter by deep-linking.
