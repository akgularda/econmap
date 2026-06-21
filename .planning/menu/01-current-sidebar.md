# Audit: MapFactbook Left Menu (Tactical Sidebar)

Scope: `src/features/home/components/layout/tactical-sidebar.tsx` (the left menu) plus its
mount point in `home-stage.tsx`, the `home-shell.tsx` page composition, the peer
`tactical-action-menu.tsx`, and the *other* navigation pattern in
`src/components/layout/page-frame.tsx`. All line references below are to those files.

---

## 1. What the sidebar renders, in order

The component is a single `<aside data-testid="tactical-command-rail">`
(`tactical-sidebar.tsx:486-491`) laid out as a flex column with three zones: a fixed
header, a scrolling body (`flex-1 overflow-y-auto`), and a fixed footer.

**A. Header (fixed, non-scrolling)** — `tactical-sidebar.tsx:493-509`
1. Signal dot + eyebrow text `"Analyst rail · live"` (`:497-498`).
2. `<h1>` hardcoded title `"City-first OSINT atlas"` (`:500`).
3. `selectedViewLabel` shown as uppercase subtext (`:501`).
4. A chip on the right that prints `{visibleSections.length} sections` — a count of
   internal analyst sections, not an actionable control (`:504-506`).

**B. Scroll body** — `tactical-sidebar.tsx:511-607`

1. **"City jump" section** (`:512-560`):
   - Header row: label `"City jump"` + `selectedViewLabel` repeated again (`:513-516`).
   - A `<form action="/">` GET form (`:518-536`) with four hidden inputs that re-serialize
     current map state (`view`, `layers`, `base`, `date`; `:519-522`), a `<input name="q"
     type="search">` (`:525-531`), and a submit button labeled `"Open city brief"` (`:533`).
   - **Selected-city intel block** via `renderSelectedCityIntel` (`:538-541`, impl
     `:275-397`). Two variants:
     - `selection-prompt` (`:287-303`): title + body + optional source chips (the empty /
       "Select a city" state).
     - `selected-city` (`:305-396`): city name + meta, a `Clear` link (`:314-316`),
       a chip row of `{mapped}/{documented}/{gaps}` counts + coverage badges (`:319-333`),
       optional summary (`:335-337`), an "Open full city dossier" link + a "{n} sources"
       chip (`:339-349`), two `CityBriefSection` grids ("Snapshot" metrics, "Infrastructure"
       counts; `:351-352`), an "Entity cues" list (`:354-378`), and a "Visible source
       labels" chip cloud (`:380-394`).
   - Below the intel block: either **Search results** (max 8, `:543-547`), or a loading
     message (`:548-553`), or a **"Jump set"** fallback of `featuredCities` (max 6,
     `:554-559`).

2. **Analyst sections** (`visibleSections.map`, `:562-582`): one `<section>` per analyst
   section, each with title + description + a count chip (`:564-570`), then either rows
   rendered by `renderAnalystRow` (`:572-573`, impl `:263-273` → `AnalystRowBody`
   `:163-261`) or an empty-state card (`:574-580`). Rows show label, detail, an
   on/off chip, a state chip (mapped/documented/queued/missing), count chips, and up to 3
   source chips +N (`:188-259`).

3. **"Saved watchlists / compare sets"** (`:584-600`): label + count, then
   `renderWatchlist` cards (`:399-439`) or an empty card (`:594-598`).

4. **"Recently viewed cities"** (`:602-606` → `renderCityListSection` `:441-465`): list of
   recent-city links or an empty card.

**C. Footer (fixed)** — `tactical-sidebar.tsx:609-614`: a single `Link` to
`datasetWorkspaceSummary.href` (label + meta).

---

## 2. Props and app state read/written

Props type `TacticalSidebarProps` (`:85-104`). The component is **purely presentational /
stateless** — no `useState`, no event handlers, no client store. Inputs:

- Map/view state (read-only, echoed into the search form's hidden inputs):
  `activeBaseImageryLayerId`, `activeDate`, `activeLayerIdsValue`, `selectedViewId`,
  `selectedViewLabel` (`:86-101`; consumed `:519-522`, `:501`, `:515`).
- Content data: `analystSections`, `featuredCities`, `recentCities`, `searchResults`,
  `searchResultsLoading`, `selectedCityIntel`, `watchlists`, `datasetWorkspaceSummary`,
  `searchQuery` (`:89-103`).

**Writes:** none directly. The only state mutation path is the GET `<form action="/">`
(`:518`) — submitting reloads `/` with `q`, `view`, `layers`, `base`, `date` query params
(a full navigation, not client interaction). All other "controls" are `next/link`s
(navigation) or static `<span>` chips (no behavior).

Mounted in `home-stage.tsx:1099-1116`; props are derived there (e.g. `selectedCityIntel`
built `:534-…`, search results `:670-…`, `watchlists` merged with `savedCitiesWatchlist`
`:1113-1115`). `home-shell.tsx` is the page composition that renders `HomeStage` and
defines the only footer destination `datasetWorkspaceSummary = { href: "/datasets" }`
(`home-shell.tsx:56-60`).

---

## 3. Layout / responsive

- Mount wrapper: `home-stage.tsx:1098` —
  `absolute bottom-3 left-3 right-3 top-3 w-auto sm:right-auto sm:w-[340px] lg:w-[380px]`,
  inside a `pointer-events-none ... z-20` overlay (`:1094-1096`) with `pointer-events-auto`
  re-enabled on the rail. So the sidebar is a **floating overlay panel** over the globe,
  not a docked column.
- On mobile (`< sm`) it stretches edge-to-edge (`left-3 right-3`), effectively covering the
  whole map. At `sm` it pins to a fixed 340px, at `lg` 380px. No collapse/expand, no
  hamburger, no hide affordance — it is always on screen.
- Internal: `<aside>` is `flex h-full flex-col gap-3 ... px-3 py-3` (`:491`). Body is the
  only scroll region: `tactical-scroll min-h-0 flex-1 overflow-y-auto pr-1` (`:511`).
  Header (`:493`) and footer (`:609`) stay fixed.
- Type scale is uniformly tiny: 9–13px throughout (e.g. `text-[9px]`, `text-[10px]`,
  `text-[13px]`), uppercase tracked labels everywhere.

---

## 4. Sharp UX critique — why it is "not useful"

**4.1 It is NOT a navigation menu — and the app's real nav lives elsewhere.**
The app has eight top-level routes defined in `page-frame.tsx:5-14` (Map, Compare,
Corridors, Rankings, Indicators, Dashboard, Story mode, Reports). The left "menu" links to
**none of them.** Its only outbound destinations are: city-detail links, a "dossier"
workspace link, watchlist links, and one footer link to `/datasets` (`home-shell.tsx:57`).
A user looking at the left rail cannot reach Compare, Corridors, Rankings, Indicators,
Dashboard, Story mode, or Reports. The product's primary IA is invisible from the home
screen. This is the single biggest reason it "isn't even close to useful."

**4.2 Two unrelated nav systems, neither complete.** `page-frame.tsx` renders a pill nav
(`:41-51`) used on *other* routes; the home screen uses this sidebar instead. They share no
items, so the home view and the rest of the app feel like different products. There is no
consistent global navigation.

**4.3 Dead / decorative controls (no information scent).** Many "controls" are inert
`<span>`s styled to look interactive:
- `"on"/"off"` chip on every analyst row (`:204-214`) — looks like a toggle, does nothing.
- `mapped/documented/queued` state chip (`:215-221`) — looks like a filter, does nothing.
- Source-label chips throughout (`:238-258`, `:319-333`, `:380-394`, `:415-426`) — look
  clickable, are static text.
- Header `"{n} sections"` chip (`:504-506`) and per-section count chips (`:569`) — pure
  decoration. Users learn the whole rail is non-interactive and stop probing it.

**4.4 Redundancy.** `selectedViewLabel` is printed three times (`:501`, `:515`, and the
search header). The `{mapped}/{documented}/{gaps}` counts appear both in the selected-city
header (`:319-333`) and again per-row inside every analyst section (`:225-236`). The
"sources" count and "Visible source labels" cloud restate the same source set twice
(`:346-348` vs `:380-394`). Density is high but unique signal is low.

**4.5 Weak hierarchy / no scent for what matters.** Every section uses the same 10px
uppercase tracked label and the same bordered dark card, so "City jump" (a primary action),
"analyst sections" (reference data), "watchlists", and "recently viewed" all carry equal
visual weight. Nothing signals where to start. There are no icons, no grouping, no primary
CTA distinct from chrome. The hardcoded `<h1>` "City-first OSINT atlas" (`:500`) consumes
prime real estate with branding, not function.

**4.6 Empty-state behavior is plausible but pervasive and demoralizing.** Nearly every
block has an empty card with copy like "No source-backed rows are published for this section
yet" (`:576-578`), "No saved compare sets are published for this build yet" (`:595-597`),
"No recently viewed cities have been recorded in this browser yet" (`:603`),
"No source-backed detail published for this row yet" (`:200`), "No source label" (`:249`).
On a fresh/empty install the rail is a stack of apology cards with **no recovery action** —
none of these empty states offers a CTA, a link, or a way to add/seed data. Combined with
the inert chips, the first-run impression is a dashboard full of "nothing here yet."

**4.7 Discoverability of the core action is buried.** The search input — arguably the rail's
only genuinely useful control — sits below a header and a repeated view label, and its
submit triggers a **full GET navigation** (`:518`, `action="/"`) rather than live
client-side search. `searchResultsLoading` exists (`:548-553`) implying async, but the form
itself is a page reload, which is slow and loses scroll/map state mid-session.

**4.8 No relationship to the map it floats over.** The rail overlays the globe
(`home-stage.tsx:1094-1098`) and on mobile covers it entirely, yet offers no map controls
(no layer toggles, no view switcher, no legend) — those live in separate modals
(`home-shell.tsx:64-66`) and an `InfosPanel` (`home-stage.tsx:1119-1121`). The "tactical
actions" menu (`tactical-action-menu.tsx`) is also a separate component whose three actions
("Drop marker", "Create waypoint", "Region select", `:14`) are likewise **static spans**
(`:30-34`) — more dead controls reinforcing the pattern.

**4.9 No persistence / personalization affordance.** "Saved watchlists / compare sets"
(`:584`) and "Recently viewed" (`:602`) imply user state, but the component can't write any
(section 2): there is no save button, no remove, no reorder. Recents depend entirely on
upstream `recentCities` data. So the "personal" sections are read-only and frequently empty.

**Net:** the rail reads as a dense, branded *status readout* of internal data-coverage
bookkeeping (mapped/documented/queued source counts) rather than a *menu*. It neither
navigates the app's eight routes, nor exposes the map's own controls, nor lets the user act
on most of what it displays.
