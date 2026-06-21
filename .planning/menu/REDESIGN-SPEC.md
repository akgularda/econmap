# Left Menu Redesign Spec — Tactical Command Rail v2

Status: authoritative implementation spec. Supersedes the v1 layout of
`src/features/home/components/layout/tactical-sidebar.tsx`. This is an **evolution** of that
component (same mount, same `data-testid="tactical-command-rail"`, same dark tactical theme,
same Tailwind v4 + lucide-react stack), **not** a rewrite of the app.

---

## 0. Goals and non-negotiables

1. **Search-first.** The first interactive element below the header is a search field that
   doubles as the entry point to a command palette (Cmd/Ctrl-K). Everything else is reachable
   from there.
2. **Expose ALL destinations.** The rail must surface every top-level destination the app
   owns: Map (home), Cities, Countries, Compare (+ Blocs), Rankings, Indicators, Datasets,
   Regions, Corridors, Reports, Story mode, Dashboard. Today the rail links to **none** of the
   eight `PageFrame` routes (see `01-current-sidebar.md` §4.1). v2 fixes the disjoint-nav
   problem identified in `02-ia-inventory.md`.
3. **Coherent map-layer / imagery control group.** A single "Map layers" group owning: active
   layer toggles (by family), base imagery picker, imagery date, saved views, plus shortcuts to
   the existing Legend and Settings modals. No more inert "on/off" decoration.
4. **Honest empty / coverage-pending states.** Generated data is ABSENT on a fresh clone.
   Every data-driven block must render an intentional, branded placeholder with a recovery
   action — never a stack of apology cards (`01-current-sidebar.md` §4.6).
5. **Keyboard / command-palette friendly.** Cmd/Ctrl-K opens the palette; `/` focuses search;
   arrow + enter navigate results; every nav item is a real link or button.
6. **Analyst-grade hierarchy.** Three weight tiers (primary actions, navigation, reference),
   icons per section, one collapse control, no triple-printed view label.
7. **Reuse existing state** (`04-state-contract.md`). Drive home view state through the
   **`hrefFor` URL vocabulary** (`?city/?q/?layers/?base/?date/?view`). Use
   `useTacticalGlobeStore` for modal/collapse/opacity/marker UI state and `useWatchlistStore`
   for saved cities. Do **not** introduce a new store or blend in the `url-state.ts`
   `?metric/?year/...` vocabulary.

---

## 1. Diagnosis recap (why v1 is "not even close to useful")

- The rail is a status readout of internal coverage bookkeeping, not a menu. It links to zero
  of the eight product routes; the real nav lives in `page-frame.tsx` and is unreachable from
  `/`.
- Inert decoration: `on/off` chips, `mapped/documented/queued` chips, and source chips all look
  interactive but do nothing — users learn the whole rail is dead.
- Redundancy: `selectedViewLabel` printed 3x; coverage counts duplicated header + per row;
  sources listed twice.
- Flat hierarchy: every block uses the same 10px uppercase label + bordered card, so a primary
  action and reference data carry equal weight. A hardcoded `<h1>` "City-first OSINT atlas"
  eats prime space.
- Empty states are pervasive and offer no recovery action; on a fresh clone the rail is a wall
  of "nothing here yet."
- The only real control (search) triggers a full GET page reload via `<form action="/">`.

---

## 2. Information architecture (sections and nav items)

The rail is organized into ordered groups. Group headers are collapsible (chevron). The order
balances the test-backed Recovery spec (`03-design-intent.md`) with the new requirement to
expose all destinations.

1. **Header** — brand mark + live signal + collapse control (no `<h1>` hero).
2. **Search / Command** — search input + "Press ⌘K" affordance. Opens the command palette.
3. **Workspaces** (global product navigation — the eight routes + the orphans):
   - Map · Compare · Rankings · Indicators · Corridors · Dashboard · Reports · Story mode
   - secondary row: Blocs · Regions · Datasets
4. **Browse** (the entity directories — the app's "destinations" as data):
   - Cities · Countries · Regions
5. **Map layers** (the coherent imagery/layer control group):
   - Active layers (toggles grouped by family: Borders & Labels, Transport, Utilities,
     Connectivity, Environment, Economy / Institutions)
   - Base imagery (picker) · Imagery date (when base supports it)
   - Saved views (switcher)
   - utility buttons: Layer legend · Map settings
6. **City brief** (the substantive selected-city OSINT brief — kept, demoted from hero, with an
   honest selection-prompt when nothing is selected).
7. **Saved & recent**:
   - Saved cities (watchlist) · Saved compare sets · Recently viewed
8. **Footer** — Dataset explorer link + keyboard-shortcuts trigger.

> Test contract note: the existing `tactical-sidebar.test.tsx` asserts the v1 analyst-section
> order ("City jump", "Dossier Sections", … "Recently viewed cities") and asserts that the
> literal strings `layers` / `active layers` do NOT appear. v2 changes the IA, so **that test
> must be updated as part of this work** (see checklist step 9). The Map-layers group label is
> "Map layers" (the forbidden-string assertions were written to keep v1 layer-first; they are
> obsolete under v2). Keep the `data-layout="mission-console"` attribute so the smoke assertion
> survives.

---

## 3. Component tree

All new components live under
`src/features/home/components/layout/sidebar/` (new folder) to keep `tactical-sidebar.tsx` thin
as a composition root.

```
TacticalSidebar (tactical-sidebar.tsx)          // composition root, "use client"
├─ SidebarHeader                                 // brand, signal dot, collapse button
│   └─ CollapseToggle                            // binds isSidebarCollapsed
├─ SidebarSearch                                 // search input + ⌘K hint
│   └─ (opens) CommandPalette                    // overlay, portal — new
├─ SidebarSection (reusable shell: icon,title,count,collapsible,empty)
│   ├─ WorkspaceNav            (section: Workspaces)   // 8 routes + Blocs/Regions/Datasets
│   ├─ BrowseNav               (section: Browse)       // Cities/Countries/Regions
│   ├─ MapLayersGroup          (section: Map layers)
│   │   ├─ LayerFamilyList        // grouped layer toggle rows (Link hrefFor)
│   │   │   └─ LayerToggleRow      // name, source, purpose, status, ON/OFF (real Link)
│   │   ├─ BaseImageryPicker       // base layer Links (hrefFor base)
│   │   ├─ ImageryDatePicker        // date Links (only if availableDates)
│   │   ├─ SavedViewSwitcher        // view Links (hrefFor view)
│   │   └─ MapToolButtons           // Legend / Settings (useTacticalGlobeStore)
│   ├─ CityBriefPanel           (section: City brief)  // = renderSelectedCityIntel, refactored
│   ├─ SavedCitiesList          (section: Saved & recent)  // useWatchlistStore
│   ├─ CompareSetsList          (section: Saved & recent)
│   └─ RecentCitiesList         (section: Saved & recent)
└─ SidebarFooter                                 // Dataset explorer + Shortcuts (⌘/) trigger
```

Reused as-is: `CityBriefSection` (`city-brief-section.tsx`). Shared primitives extracted:
`SidebarSection`, `NavItem`, `EmptyState`, `SectionCount`.

---

## 4. Section-by-section layout

### 4.1 SidebarHeader
- Row: `signal-dot` + eyebrow "Command rail · live" (left), `CollapseToggle` chevron (right).
- Replace the hardcoded `<h1>` hero with a compact wordmark line (12px) + the
  `selectedViewLabel` printed **once** as a muted subline. No repeated view labels elsewhere.
- Collapsed state: rail shrinks to an icon strip (≈56px) showing section icons only; clicking an
  icon expands and scrolls to that section.

### 4.2 SidebarSearch (search-first)
- A single `<input type="search">` with a leading lucide `Search` icon and a trailing `⌘K`
  kbd chip.
- Behavior: typing filters the in-rail results; focus is grabbed by `/`. Pressing `Enter`
  navigates to the top result via `hrefFor({ searchQuery, ...currentState })` (preserve layers/
  base/date/view). Pressing `⌘K`/`Ctrl-K` opens the full `CommandPalette`.
- Keep a graceful `<form action="/">` fallback (with the existing hidden `view/layers/base/date`
  inputs) so search still works without JS / during static export, but the primary path is
  client-side and does NOT full-reload (see §6 client-reader note).

### 4.3 WorkspaceNav (exposes all destinations)
- Compact 2-column grid of `NavItem`s (icon + label), one per route. Source of truth is a new
  `WORKSPACE_NAV` constant co-located with — and shared by — `page-frame.tsx` so the home rail
  and inner pages stay in lockstep (fixes the two-disjoint-nav-worlds problem).
- Items: Map `/`, Compare `/compare`, Rankings `/rankings`, Indicators `/indicators`,
  Corridors `/corridors`, Dashboard `/dashboard`, Reports `/reports`, Story mode `/story-mode`.
- Secondary muted row (de-orphaning): Blocs `/compare/blocs`, Regions `/regions`,
  Datasets `/datasets`.
- The current route (always `/` on home) gets an `aria-current="page"` active style.

### 4.4 BrowseNav
- Three `NavItem`s: Cities (opens palette scoped to cities, or `/datasets` city index),
  Countries, Regions. These are the entity directories. Cities is the search-first default
  scope.

### 4.5 MapLayersGroup (coherent control group)
- **LayerFamilyList**: subgroups by family — Borders & Labels, Transport, Utilities,
  Connectivity, Environment, Economy / Institutions (the Recovery families). Each
  `LayerToggleRow` shows: layer name, short purpose line, source label, status badge, and a real
  ON/OFF toggle implemented as a `<Link href={hrefFor({ activeLayerIds: nextIds, ...rest })}>`
  where `nextIds` adds/removes `row.layerIds` (pattern already in
  `buildAnalystSidebarSections` ~lines 834-845). `active = row.layerIds.some(id => activeLayerIds.includes(id))`.
- A family with no live layer shows ONE honest placeholder row: real source label +
  `coverage-pending` status, no deep-link into a dataset workspace.
- **BaseImageryPicker**: rows from `baseImageryCatalog.layers` (exclude `true-color`), each a
  `<Link href={hrefFor({ activeBaseImageryLayerId: id, ...rest })}>`; active = `=== activeBaseImageryLayerId`.
- **ImageryDatePicker**: render only when the active base layer is `status==="published"` and has
  `availableDates`; rows `<Link href={hrefFor({ activeDate, ...rest })}>`.
- **SavedViewSwitcher**: `commandCenterManifest.savedViews` → `<Link href={hrefFor({ activeViewId, ...rest })}>`.
- **MapToolButtons**: "Layer legend" → `useTacticalGlobeStore.setLegendOpen(true)`,
  "Map settings" → `setSettingsOpen(true)`. These are buttons, not links.

### 4.6 CityBriefPanel
- Exact reuse of v1 `renderSelectedCityIntel` content (city header, coverage badges, dossier
  link, Snapshot/Infrastructure `CityBriefSection`s, entity cues), extracted into its own file.
- Remove the duplicate "Visible source labels" cloud (sources already shown inline + count).
- Add a **Save** star button bound to `useWatchlistStore.toggle(slug)` so the brief is actionable.
- Empty/selection-prompt: a single intentional card "No city selected — pick a city on the map or
  search" with a primary "Browse cities" action (opens palette). On a fresh clone with no
  featured cities, show the coverage-pending variant (see §5).

### 4.7 Saved & recent
- **SavedCitiesList**: reads `useWatchlistStore((s) => s.items)`, resolved to names via the
  existing recent-cities/registry resolution; each row links via `hrefFor({ selectedCitySlug })`
  and has an unstar button (`toggle(slug)`).
- **CompareSetsList**: the existing `watchlists` prop (read-only seed) rendered as compact rows.
- **RecentCitiesList**: from `localStorage["command-center.recent-cities"]` (already wired in
  `home-stage.tsx`). Empty = honest placeholder, not an apology.

### 4.8 SidebarFooter
- Dataset explorer `<Link href={datasetWorkspaceSummary.href}>` (kept).
- "Keyboard shortcuts (⌘/)" button → `setShortcutsOpen(true)`.

---

## 5. States the menu must handle (explicit)

Every data-driven block resolves to exactly one of: **loaded**, **empty (intentional)**,
**coverage-pending**, **loading**, **error**. A shared `EmptyState` component renders an icon,
a one-line headline, a one-line subtext, and an optional CTA.

- **Fresh clone, no generated data**: `featuredCities=[]`, `analystSections` rows empty,
  `recentCities=[]`, `watchlists=[]`. The rail must still look intentional:
  - WorkspaceNav and BrowseNav are **static** (route links) → always present, fully usable.
  - MapLayersGroup shows family placeholders with `coverage-pending` status + the real source
    label, plus a CTA "Generate map data" linking to `/datasets`.
  - CityBriefPanel shows the selection-prompt with a "Browse cities" CTA.
  - Saved/Recent show honest one-liners: "No saved cities yet — star a city to pin it here."
- **Coverage-pending** (data file exists but a surface is unpublished): status badge
  `coverage-pending` (amber, distinct from `missing` gray), real source label shown, NO inert
  deep-link.
- **Loading** (`searchResultsLoading`): skeleton rows in the search results region, not a prose
  sentence.
- **Error** (search/index resolution throws): a compact inline error card with a "Retry"
  button (re-run the client search); never a blank section.

A `data-state` attribute (`loaded|empty|pending|loading|error`) is set on each `SidebarSection`
for testability and styling.

---

## 6. State bindings (per `04-state-contract.md`)

| Control | Binds to | Mechanism |
|---|---|---|
| Search submit / palette nav | URL `?q`, `?city` | `<Link>` / `router`-free nav via `hrefFor({ searchQuery / selectedCitySlug, ...current })` |
| Workspace / Browse nav | route URLs | plain `<Link href>` (`/compare`, `/rankings`, …) |
| Layer toggle ON/OFF | URL `?layers` | `<Link href={hrefFor({ activeLayerIds: nextIds, ...rest })}>` |
| Base imagery | URL `?base` | `<Link href={hrefFor({ activeBaseImageryLayerId, ...rest })}>` |
| Imagery date | URL `?date` | `<Link href={hrefFor({ activeDate, ...rest })}>` |
| Saved view | URL `?view` | `<Link href={hrefFor({ activeViewId, ...rest })}>` |
| Collapse rail | `useTacticalGlobeStore.isSidebarCollapsed` | `setSidebarCollapsed(bool)` |
| Legend / Settings / Shortcuts | `useTacticalGlobeStore.is*Open` | `set*Open(true)` |
| Save / unsave city | `useWatchlistStore.items` | `toggle(slug)` |
| Recent cities | `localStorage["command-center.recent-cities"]` | existing read path in home-stage |

**Open contract decision (resolve in implementation):** v1 search and toggles cause a full GET
navigation. To make them feel instant without a reload, add a client `location.search` reader
(a small `useHomeViewParams()` hook) so the home page can re-derive view state on the client and
`history.pushState` the new querystring instead of full-reloading. This is the one justified new
piece of plumbing; it does NOT add a store — it reads/writes the same `hrefFor` URL vocabulary.
If we defer it, keep `<Link>`-based navigation (still correct, just a reload), so the spec is
shippable either way. Do not migrate layers/base/date into the store as a parallel source of
truth.

---

## 7. Visual hierarchy / theme

- Three tiers: **primary** (search field, active nav item, "Open dossier" CTA — accent
  `#9cab7a` border + filled chip), **navigation** (`NavItem` 13px, icon + label, hover border
  lift), **reference** (layer rows / counts — 11px muted). Stop styling reference chips as if
  interactive.
- Icons: lucide-react per section header and per `NavItem` (already a dependency). e.g.
  `Search`, `Map`, `Layers`, `GitCompare`, `BarChart3`, `LineChart`, `Route`, `LayoutDashboard`,
  `FileText`, `BookOpen`, `Building2`, `Globe2`, `Database`, `Star`.
- Keep existing tactical utility classes from `src/app/globals.css` (`tactical-chip`,
  `tactical-input`, `tactical-panel`, `tactical-scroll`, `signal-dot`, `eyebrow`). Add a couple
  of small classes there if needed (`coverage-pending` badge color, `nav-item` active).
- Status badge palette: `mapped` (sage), `documented` (sky), `coverage-pending` (amber),
  `missing` (gray). Defined once in a `getStatusBadge()` helper, reused everywhere.

---

## 8. Key interactions

- ⌘K / Ctrl-K opens the command palette overlay (portal, `role="dialog"`, focus-trapped, Esc to
  close); fuzzy list of every Workspace/Browse destination + city search results.
- `/` focuses the inline search field from anywhere on the home stage.
- Arrow up/down move selection in search results / palette; Enter activates; Esc clears/closes.
- Section headers toggle collapse (chevron), persisted in component state (and the rail-level
  collapse via `isSidebarCollapsed`).
- Layer toggle, base/date/view picks all preserve the rest of the current view state in their
  href (never drop the user's other selections).
- Star toggles save/unsave instantly (optimistic, persisted by `useWatchlistStore`).

---

## 9. Component manifest (new files)

| Component | File | Purpose |
|---|---|---|
| TacticalSidebar (root) | `src/features/home/components/layout/tactical-sidebar.tsx` | Thin composition root wiring sections; keeps `data-testid`/`data-layout`. |
| SidebarSection | `src/features/home/components/layout/sidebar/sidebar-section.tsx` | Reusable collapsible section shell (icon, title, count, empty/pending states, `data-state`). |
| NavItem | `src/features/home/components/layout/sidebar/nav-item.tsx` | Icon + label link with active state. |
| EmptyState | `src/features/home/components/layout/sidebar/empty-state.tsx` | Intentional empty/pending/error card with optional CTA. |
| WorkspaceNav | `src/features/home/components/layout/sidebar/workspace-nav.tsx` | Grid of the 8 routes + Blocs/Regions/Datasets. |
| BrowseNav | `src/features/home/components/layout/sidebar/browse-nav.tsx` | Cities / Countries / Regions directory links. |
| MapLayersGroup | `src/features/home/components/layout/sidebar/map-layers-group.tsx` | Layer families, base imagery, date, saved views, legend/settings buttons. |
| LayerToggleRow | `src/features/home/components/layout/sidebar/layer-toggle-row.tsx` | Single layer row with real ON/OFF Link + status. |
| CityBriefPanel | `src/features/home/components/layout/sidebar/city-brief-panel.tsx` | Extracted selected-city intel + Save action. |
| SavedRecentGroup | `src/features/home/components/layout/sidebar/saved-recent-group.tsx` | Saved cities (store), compare sets, recents. |
| CommandPalette | `src/features/home/components/layout/sidebar/command-palette.tsx` | ⌘K overlay over all destinations + city search. |
| SidebarHeader / Footer | `src/features/home/components/layout/sidebar/sidebar-chrome.tsx` | Header (brand+collapse) and footer (datasets+shortcuts). |
| WORKSPACE_NAV constant | `src/components/layout/nav-items.ts` | Single source of nav routes shared by sidebar + `page-frame.tsx`. |
| useHomeViewParams (optional) | `src/features/home/lib/use-home-view-params.ts` | Client reader/writer for `?q/?city/?layers/?base/?date/?view` (no-reload nav). |

---

## 10. Ordered implementation checklist (exact file paths)

1. **Extract shared nav constant.** Create `src/components/layout/nav-items.ts` exporting
   `WORKSPACE_NAV` (the 8 routes) + `SECONDARY_NAV` (Blocs/Regions/Datasets). Refactor
   `src/components/layout/page-frame.tsx` to import `WORKSPACE_NAV` instead of its local `nav`.
2. **Build primitives.** Create `src/features/home/components/layout/sidebar/sidebar-section.tsx`,
   `nav-item.tsx`, `empty-state.tsx`, and a `status-badge.ts` helper (or co-locate in
   `sidebar-section.tsx`). Reuse `tactical-*` classes from `src/app/globals.css`; add a
   `coverage-pending` badge color + `nav-item` active style to that CSS file.
3. **WorkspaceNav + BrowseNav.** Create `sidebar/workspace-nav.tsx` and `sidebar/browse-nav.tsx`
   using `NavItem` + lucide icons. Pure presentational, no new props from `home-stage`.
4. **MapLayersGroup.** Create `sidebar/map-layers-group.tsx` and `sidebar/layer-toggle-row.tsx`.
   Move the layer-family rows out of the v1 "analyst sections" into this group. Wire toggles with
   the `hrefFor` add/remove pattern from
   `src/features/home/lib/analyst-sidebar-model.ts` (~834-845). Add base-imagery / date / saved-
   view pickers reading the props already passed to `TacticalSidebar`
   (`activeBaseImageryLayerId`, `activeDate`, `selectedViewId`) — thread `baseImageryCatalog`
   and `savedViews` from `home-stage.tsx` if not already present.
5. **CityBriefPanel.** Create `sidebar/city-brief-panel.tsx`, move `renderSelectedCityIntel` there,
   drop the duplicate source cloud, add the Save star bound to `useWatchlistStore`.
6. **SavedRecentGroup.** Create `sidebar/saved-recent-group.tsx`; read
   `useWatchlistStore((s)=>s.items)`, render compare-set `watchlists` prop and recent cities.
7. **Chrome.** Create `sidebar/sidebar-chrome.tsx` (header with `CollapseToggle` →
   `useTacticalGlobeStore.setSidebarCollapsed`; footer with Dataset explorer + shortcuts button).
8. **CommandPalette.** Create `sidebar/command-palette.tsx` — portal overlay, ⌘K/`/` listeners,
   fuzzy list over `WORKSPACE_NAV` + `SECONDARY_NAV` + city search results. (If a dependency is
   acceptable, add `cmdk`; otherwise implement with a filtered list + roving focus — no new
   dependency is required.)
9. **Recompose root.** Rewrite `src/features/home/components/layout/tactical-sidebar.tsx` to
   compose the new sections in the §2 order, keeping
   `data-testid="tactical-command-rail"` and `data-layout="mission-console"`.
10. **Collapsed/responsive.** Add the collapsed icon-strip variant driven by
    `isSidebarCollapsed`; verify the mobile (`< sm`) full-width behavior at
    `src/features/home/components/home-stage.tsx:1098` still works and add a hide affordance.
11. **Optional no-reload nav.** Add `src/features/home/lib/use-home-view-params.ts` and consume it
    in `home-stage.tsx` to re-derive view state from `location.search` and `history.pushState` on
    nav, so search/toggles don't full-reload. Defer-safe.
12. **Update tests.** Rewrite
    `src/features/home/components/layout/tactical-sidebar.test.tsx` to assert the new IA order
    (Search → Workspaces → Browse → Map layers → City brief → Saved & recent), the presence of
    all destination links (`/compare`, `/rankings`, `/indicators`, `/corridors`, `/dashboard`,
    `/reports`, `/story-mode`, `/compare/blocs`, `/regions`, `/datasets`), and the
    coverage-pending empty states on a no-data render. Keep the `data-layout` smoke assertion.
    Update `src/features/home/components/home-shell.test.tsx` and the verify script
    `scripts/verify/homepage-city-first-check.ts` if they assert the old section labels.
13. **Verify.** Run the home test suite and the city-first verify script; manually load `/` with
    no `?` params (fresh-clone simulation) to confirm the rail looks intentional.

---

## 11. Files to edit / create (summary)

Edit:
- `src/features/home/components/layout/tactical-sidebar.tsx`
- `src/components/layout/page-frame.tsx`
- `src/features/home/components/home-stage.tsx`
- `src/app/globals.css`
- `src/features/home/components/layout/tactical-sidebar.test.tsx`
- `src/features/home/components/home-shell.test.tsx` (if it asserts old labels)
- `scripts/verify/homepage-city-first-check.ts` (if it asserts old labels)

Create:
- `src/components/layout/nav-items.ts`
- `src/features/home/components/layout/sidebar/sidebar-section.tsx`
- `src/features/home/components/layout/sidebar/nav-item.tsx`
- `src/features/home/components/layout/sidebar/empty-state.tsx`
- `src/features/home/components/layout/sidebar/workspace-nav.tsx`
- `src/features/home/components/layout/sidebar/browse-nav.tsx`
- `src/features/home/components/layout/sidebar/map-layers-group.tsx`
- `src/features/home/components/layout/sidebar/layer-toggle-row.tsx`
- `src/features/home/components/layout/sidebar/city-brief-panel.tsx`
- `src/features/home/components/layout/sidebar/saved-recent-group.tsx`
- `src/features/home/components/layout/sidebar/sidebar-chrome.tsx`
- `src/features/home/components/layout/sidebar/command-palette.tsx`
- `src/features/home/lib/use-home-view-params.ts` (optional, no-reload nav)

---

## 12. Risks

- The existing `tactical-sidebar.test.tsx` hard-asserts the v1 section order AND that `layers`/
  `active layers` strings are absent — v2 will break it intentionally; the test must be rewritten
  in lockstep (step 12) or CI fails.
- Static export (`output: "export"`) means `page.tsx` hardcodes deep-link params to undefined at
  build; the no-reload client reader (step 11) is the only way to get instant updates. If
  deferred, search/toggles keep full-reloading (acceptable but not ideal).
- "shadcn stack" is referenced in the brief but **not installed** (no `src/components/ui/`, no
  Radix, no cmdk — only lucide-react + Tailwind v4). The palette must be self-built or `cmdk`
  added as a dependency; do not assume shadcn primitives exist.
- Layer-family data currently comes bundled inside `analystSections`; splitting layers (Map
  layers group) from coverage rows (City brief) requires `home-stage.tsx` to pass layer rows and
  coverage rows separately, or the sidebar to partition them — keep the partition logic in the
  model lib, not the component.
- Threading `baseImageryCatalog` / `savedViews` into the sidebar adds props to `TacticalSidebar`;
  confirm they're available in `home-stage.tsx` (they're in `HomeShellProps`).
