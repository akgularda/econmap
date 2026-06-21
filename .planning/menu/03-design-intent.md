# MapFactbook — Original Navigation / IA Design Intent

Extracted from `docs/plans/2026-03-15-mapfactbook-command-center-design.md`,
`docs/plans/2026-03-21-mapfactbook-homepage-recovery-design.md`,
`docs/plans/2026-03-21-mapfactbook-homepage-recovery-implementation.md`, plus `mvp.md` and `premium.md`.

## Evolution of intent (three layers)

The docs describe a deliberate progression, not a single fixed vision:

1. **MVP (`mvp.md`)** — Country-centric economic intelligence platform. Map homepage, country drawer, country profile pages with tabs, compare, rankings, indicator library. IA is **product-feature navigation** (Map / Compare / Rankings / Indicators / Watchlist).
2. **Command Center (`2026-03-15`)** — A bigger reframe: homepage becomes a 3D Cesium live-earth "operational console" with **four permanent zones** (left rail / globe / right rail / bottom ops strip). IA is **operational, not page-navigational**.
3. **Homepage Recovery (`2026-03-21` design + implementation)** — A pullback from the command-center ambition toward a **compact, city-first OSINT analyst workspace** that is immediately useful and laptop-friendly. This is the **most recent and most concrete** menu spec and supersedes the heavy command-center layout for the homepage. It is the authoritative left-rail spec.

## Core "Command Center" navigation concept (2026-03-15)

The homepage is a single operational surface, **not a set of navigable pages**. Navigation is replaced by persistent rails and a globe work-surface. Four permanent zones:

- **Left Rail — Global Control Stack:** a "control rack, not a navigation sidebar." Always visible. Holds search/jump-to-place, layer family groups, per-layer toggles, opacity/intensity, source toggles, saved views, feed health/freshness/latency, and filters (transport, telecom, weather, hydrology, infrastructure, admin).
- **Center — 3D Cesium live-earth globe:** the hero and main interaction surface (not decorative).
- **Right Rail — Intelligence / Command Panel:** state-dependent. No city selected → global operational intelligence (active layers, feed/source health, detections, coverage gaps). City selected → focused **City Command Panel**.
- **Bottom — Ops Strip / timeline:** temporal/event surface (time-state, feed updates, weather windows, detections, refreshes).

Layer families intended: Base Earth, Atmosphere, Hydrology, Connectivity, Transport, Economic/Infrastructure, Political/Admin, Signals/Detection. Users compose arbitrary layer stacks; saved named views (e.g. "Telecom + Airports", "Climate + Water", "City Logistics", "Infrastructure Watch") are shortcuts, not restrictions.

**City Command Panel** modules (when a city is selected): City Header, Operational Snapshot, Asset Layer Summary, Environment/Weather/Water, Connectivity/Coverage, Transport/Access, Infrastructure/Utilities, Source Transparency, Actions. Inactive layers collapse rather than show stale content.

Non-goals: news, military jargon, sci-fi decoration, Palantir-clone, fixed single-stack behavior. Dedicated city/country workspaces still exist for deeper analysis — the homepage is the global surface.

## Authoritative concrete left-rail menu spec (2026-03-21 Recovery)

This is the explicit, ordered menu the implementation plan asserts via tests. **The left rail is the main recovery target** and reads as a strict layer-first operator console.

**Exact left-rail order (assert in tests):**

1. `Search`
2. `Active layers`
3. `Borders & Labels`
4. `Transport`
5. `Utilities`
6. `Connectivity`
7. `Environment`
8. `Economy / Institutions`
9. `City brief`
10. (bottom) one small `Dataset explorer` utility link

**Must NOT contain:** focus-city cards (`Focus cities`), product-surface navigation grids (`Product surfaces`), dataset workspace rows mixed into the layer flow, decorative explanatory copy.

**Every layer row must show:** layer name, on/off state, source label, short purpose line, status. Groups with no live layer show an honest placeholder row (real source label + non-published status) and must NOT deep-link into a dataset workspace from the main flow.

**Other surfaces:**

- **Map (center):** canonical selection surface. Selection bound only to the visible rendered `city-selection-source`. Curated meaningful cities: Istanbul, Ankara, Paris, Rome, London, Berlin, Antalya, Tbilisi. District-scale noise excluded.
- **Top-right:** only a compact `Infos` card (scannable). The top-right control/HUD cluster is removed.
- **`City brief` (in left rail):** the substantive selected-city OSINT brief — population, GDP/economy, airports, ports, utilities, telecom, environment, organizations, all with visible source labels. Reads as an OSINT starter brief, not a hero card. Prefer real fallback evidence over empty `Not covered` placeholders.

## What the analyst is meant to do

- Start from the **map or search**, not from a navigation menu.
- Selecting a visible city boundary updates the homepage **immediately**.
- Compose/toggle operational **layers** in the left rail; the rail stays usable with no city selected.
- Read the selected-city **OSINT brief** in the left rail; glance the compact `Infos` card top-right.
- Dataset workspaces remain available but **secondary** (one `Dataset explorer` link), never mixed into the operational layer flow.

Overall posture: evidence-first, source-transparent, dense-but-readable, premium operator software — not a dataset catalog, not a marketing landing page, not a full command-center mock on the homepage.

## Source labels / transparency (cross-cutting IA rule)

Every meaningful layer, metric, asset block, and city summary carries visible provenance (e.g. `Source: OECD`, `WHO`, `GHSL`, `OpenCellID`, `World Port Index`). Simulated/unpublished items are labeled as such until backed by a verified/live source.

---

### Bottom line for the menu rebuild

The single concrete, test-backed menu specification to honor is the **2026-03-21 Recovery left rail**: `Search → Active layers → Borders & Labels → Transport → Utilities → Connectivity → Environment → Economy / Institutions → City brief`, plus a bottom `Dataset explorer` link, a compact top-right `Infos` card, map-driven city selection, and the substantive City brief living in the left rail. The 2026-03-15 command-center doc supplies the broader "rails-not-pages, layer-families, right-rail city command panel, bottom ops strip" vision; the MVP doc supplies the original page-based feature set (Compare / Rankings / Indicators / Watchlist / Country pages) that still exists as secondary workspaces.
