# Menu State Contract (Home Experience)

How the home view actually keeps state. There are **two distinct state systems**, and the redesigned left menu must respect the split:

1. **URL query params = the source of truth for the "view"** (city, search, layers, base, date, view id). The app is a static export (`output: "export"`), so there is **no client router writing to the URL**. State is mutated by **navigating** to a new URL — either a `<Link href={hrefFor(...)}>` or a GET `<form action="/">`. Every "view" change is a full navigation, not an in-memory `set`.
2. **Zustand stores = client-only UI state and persisted personalization** (modals, marker mode, layer opacity, watchlist, persisted metric/year/mapMode prefs, recent cities). These never touch the URL.

> Caveat: `src/app/page.tsx` is a server component for static export and **hardcodes all deep-link params to `undefined`/`[]`** at build time (see the comment lines 114-125). The URL params are emitted into link/form hrefs by the rendered HTML, and on navigation the new HTML is served with those params — but the *reading* of `?city/?q/...` from `location.search` at runtime is **not currently wired** (no `useSearchParams`/`location.search` reader exists anywhere except being written). The redesigned menu that wants live param-driven updates without a full reload will need a client reader added; today the contract is "links carry params; navigation re-renders."

---

## URL-param view state (canonical, written via `hrefFor` / search form)

Writer: `hrefFor(...)` in `src/features/home/lib/analyst-sidebar-model.ts` (lines 641-665). Search box writer: GET `<form action="/">` in `src/features/home/components/layout/tactical-sidebar.tsx` (lines 518-528). Param parser for the *other* view-state shape lives in `src/lib/url-state.ts` (note: different param names — see mismatch below).

| State field | URL param | Source / writer | How the menu binds |
|---|---|---|---|
| Selected city | `?city` | `hrefFor({selectedCitySlug})`. Read into page as `selectedCitySlug`; defaults to `featuredCities[0]` when blank. | Menu city rows/search results are `<Link href={hrefFor({selectedCitySlug: slug, ...currentState})}>`. Always carry the *current* layers/base/date/view/q forward so selecting a city doesn't drop them. |
| Search query | `?q` | GET form input `name="q"` (tactical-sidebar form). Also `hrefFor({searchQuery})`. | Menu search input = uncontrolled `<input name="q" defaultValue={searchQuery}>` inside a `<form action="/">` that also emits hidden `view`/`layers`/`base`/`date`. Submitting navigates. |
| Active map layers | `?layers` (comma-joined) | `hrefFor({activeLayerIds})`. Page default = `["ports"]` when none requested; filtered against `globeManifest` layer ids. | Layer toggles are `<Link>`s computing `nextLayerIds` (add/remove the row's `layerIds`) then `hrefFor({activeLayerIds: nextLayerIds, ...rest})`. See `buildAnalystSidebarSections` lines 834-845 for the exact toggle-href pattern. `active` per row = `rowLayerIds.some(id => activeLayerIds.includes(id))`. |
| Base imagery | `?base` | `hrefFor({activeBaseImageryLayerId})`. Page default resolves to `night-lights`; `true-color` is excluded as selectable. | Base-imagery picker rows = `<Link href={hrefFor({activeBaseImageryLayerId: id, ...rest})}>`. Available ids from `baseImageryCatalog.layers`. |
| Imagery date | `?date` | `hrefFor({activeDate})`. Page validates `date` against the active base layer's `availableDates`, else first available. | Date selector = links carrying `activeDate`; only valid for `status==="published"` base layers. |
| Saved view id | `?view` | `hrefFor({activeViewId})`. Resolved against `commandCenterManifest.savedViews`, fallback `defaultViewId`. | View switcher rows = links with `activeViewId`. Also emitted as hidden `view` field in the search form. |

**Param-name mismatch to flag:** `src/lib/url-state.ts` (`serializeViewState`/`parseViewState`) speaks a *different* vocabulary — `?metric`, `?year`, `?region`, `?bloc`, `?mapMode` — and is **not** what the home links use. The home links use `?city/?q/?layers/?base/?date/?view` via `hrefFor`. The two are not reconciled in code. The redesigned menu must use the **`hrefFor` set**, not `url-state.ts`, for home view state. (`url-state.ts` appears to belong to an older/other choropleth surface tied to `useUiStore`.)

---

## Zustand store state

### `useTacticalGlobeStore` — `src/store/tactical-globe-store.ts` (NOT persisted, client-only)
Selectors are `useTacticalGlobeStore((s) => s.field)`.

| Field | Setter | Menu binding |
|---|---|---|
| `isLegendOpen` | `setLegendOpen(bool)` | Menu "Layer legend" button → `setLegendOpen(true)`. Read by `LayerLegendModal`. |
| `isSettingsOpen` | `setSettingsOpen(bool)` | Menu "Settings" button → `setSettingsOpen(true)`. Read by `SettingsModal`. |
| `isShortcutsOpen` | `setShortcutsOpen(bool)` | Read by `KeyboardShortcutsModal`. |
| `isSidebarCollapsed` | `setSidebarCollapsed(bool)` | **This is the menu's own open/collapse state.** A redesigned collapse/expand control binds here. |
| `activeLayerIds` | `toggleLayer(id)` | In-store mirror of layers, but **the home view drives layers via `?layers` URL, not this**. Avoid dual-sourcing: pick one. If the menu goes client-side reactive (no reload), migrate to this + a URL sync; otherwise keep using `hrefFor`. |
| `activeBaseImageryLayerId` | `setActiveBaseImageryLayerId(id)` | Same dual-source caveat as layers (URL `?base` is canonical today). Default `"night-lights"`. |
| `activeDate` | `setActiveDate(date?)` | Same caveat (URL `?date` canonical today). |
| `layerOpacityById` | `setLayerOpacity(id, n)` | Per-layer opacity sliders in the menu bind here (no URL equivalent). |
| `markerMode` | `setMarkerMode(mode)` | `"none"\|"marker"\|"waypoint"\|"polygon"\|"rectangle"` — drawing-tool toggle group. |
| `selectedPoint` | `setSelectedPoint(point\|null)` | Map-click coordinate readout; menu can clear it. |

> Note both a singleton hook (`useTacticalGlobeStore`) and a factory (`createTacticalGlobeStore`) are exported. The home modals/controls use the **singleton**. Used today by `top-control-cluster.tsx`, `settings-modal.tsx`, `layer-legend-modal.tsx`, `keyboard-shortcuts-modal.tsx`, `tactical-map-2d.tsx`.

### `useUiStore` — `src/store/ui-store.ts` (PERSISTED: `localStorage["mapfactbook-ui-storage"]`)
Persists only `{metric, year, mapMode, explorationMode}` (`partialize`). Other fields are in-memory.

| Field | Setter | Menu binding |
|---|---|---|
| `metric` (default `"gdp-current-usd"`) | `setMetric` | Metric/indicator picker (choropleth surface). Persisted. |
| `year` (default `latestYear`) | `setYear` | Year/time selector. Persisted. |
| `mapMode` (default `"choropleth"`) | `setMapMode` | Map render mode (`choropleth`/`bubble`/…). Persisted. |
| `region` | `setRegion` | Region filter. Not persisted. |
| `bloc` | `setBloc` | Economic-bloc filter. Not persisted. |
| `selectedCountrySlug` | `setSelectedCountrySlug` | Selected **country** (vs. the home's `?city`). Not persisted. |
| `selectedCitySlug` | `setSelectedCitySlug` | City selection mirror. Not persisted. Distinct from `?city` URL flow. |
| `search` | `setSearch` | Search string mirror. Not persisted. |
| `explorationMode` (`"country"\|"city"`) | `setExplorationMode` | Country-vs-city mode toggle. Persisted. |

> `useUiStore` is the natural backing for filter/metric/year/region/bloc menu controls and pairs conceptually with `url-state.ts`'s `?metric/?year/?region/?bloc/?mapMode`. **It is a separate surface from the tactical home `hrefFor` flow.** Confirm which surface the redesigned menu targets before binding; do not blend the two param vocabularies.

### `useWatchlistStore` — `src/store/watchlist-store.ts` (PERSISTED: `localStorage["mapfactbook-watchlist"]`)

| Field | Setter | Menu binding |
|---|---|---|
| `items: string[]` (city slugs) | `toggle(slug)` | Save/unsave city. Menu "Saved cities" watchlist reads `useWatchlistStore((s)=>s.items)` (see `home-stage.tsx` line 785) and renders via `buildSavedCitiesWatchlist(items, recentCities)`. Save/star buttons call `toggle(slug)`. |

---

## Adjacent non-store persistence (menu may read, not Zustand)

- **Recent cities** — `localStorage["command-center.recent-cities"]` via `readLocalStorage`/`writeLocalStorage` (`src/lib/storage.ts`). Key const `RECENT_CITY_STORAGE_KEY` in `analyst-sidebar-model.ts`. Maintained in `home-stage.tsx` (lines 775, 957-1006) with `mergeRecentCities`. The menu's "Recent" list + saved-city name resolution read this.
- **Watchlists / Dashboards / Collections** — richer CRUD localStorage layer in `src/lib/local-storage.ts` (keys `mapfactbook_watchlists`, `mapfactbook_dashboards`, `mapfactbook_collections`). This is a *separate* system from `useWatchlistStore`'s flat slug list; a redesigned watchlist/saved-views menu that needs named lists/dashboards/filters should use this API (`watchlistStorage`, `dashboardStorage`, `collectionStorage`). `Dashboard.filters` is the typed home for arbitrary saved filter sets.
- **Static watchlists** (read-only seed) come from `loadLegacyOsintSurfaceModel()` → `buildAnalystWatchlists` in `page.tsx`; each links to `/?city=<firstSlug>`.

---

## Summary table: field → source → how menu binds

| Field | Source | Menu binds by |
|---|---|---|
| selected city | URL `?city` (`hrefFor`) | `<Link>` carrying `selectedCitySlug` + current state |
| search query | URL `?q` (`hrefFor` / GET form) | `<form action="/">` with `name="q"` + hidden view/layers/base/date |
| active layers | URL `?layers` (`hrefFor`) | `<Link>` to `hrefFor({activeLayerIds: nextIds})`; `active` from membership |
| base imagery | URL `?base` (`hrefFor`) | `<Link>` to `hrefFor({activeBaseImageryLayerId})` |
| imagery date | URL `?date` (`hrefFor`) | `<Link>` to `hrefFor({activeDate})`, validated vs `availableDates` |
| saved view | URL `?view` (`hrefFor`) | `<Link>` to `hrefFor({activeViewId})` + hidden form field |
| menu collapse | `useTacticalGlobeStore.isSidebarCollapsed` | `setSidebarCollapsed(bool)` |
| legend/settings/shortcuts modals | `useTacticalGlobeStore.is*Open` | `set*Open(true/false)` |
| marker/draw mode | `useTacticalGlobeStore.markerMode` | `setMarkerMode(mode)` |
| layer opacity | `useTacticalGlobeStore.layerOpacityById` | `setLayerOpacity(id, n)` |
| picked point | `useTacticalGlobeStore.selectedPoint` | `setSelectedPoint(...)` |
| metric/year/mapMode/explorationMode | `useUiStore` (persisted) | `setMetric/Year/MapMode/ExplorationMode` |
| region/bloc/country filters | `useUiStore` (in-memory) | `setRegion/Bloc/SelectedCountrySlug` |
| saved cities (flat) | `useWatchlistStore.items` (persisted) | `toggle(slug)` |
| recent cities | `localStorage["command-center.recent-cities"]` | `readLocalStorage`/`writeLocalStorage` |
| named watchlists/dashboards/collections + saved filters | `src/lib/local-storage.ts` (persisted) | `watchlistStorage`/`dashboardStorage`/`collectionStorage` CRUD |

**Two open contract decisions for the redesign:**
1. Layers/base/date currently exist in **both** the URL (`hrefFor`, canonical for home) **and** `useTacticalGlobeStore` (unused by the home flow). Pick one source of truth; if the menu must update without full navigation, add a `location.search`/`useSearchParams` reader and a URL writer, then sync the store.
2. `?city/?q/?layers/?base/?date/?view` (`hrefFor`, tactical home) vs `?metric/?year/?region/?bloc/?mapMode` (`url-state.ts`, `useUiStore` choropleth) are **two unreconciled param vocabularies**. The redesigned menu must explicitly choose which surface it drives.
