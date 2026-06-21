# Map / Globe + Runtime Performance Audit

Scope: `src/features/home/components/**` (MapLibre 2D map), `src/lib/city-data-client.ts`,
`src/lib/dossier-bundle-client.ts`, `src/lib/command-center-client.ts`, search/rankings/city pages,
`next.config.ts`. Static export (`output: "export"`) on GitHub Pages — all data is fetched client-side
from `public/data/**`.

The codebase is generally well-architected for a static map app. The PMTiles vector pipeline and the
Range-addressable dossier bundle are good. The real runtime cost is concentrated in a few large
client-side JSON fetches/parses and some React re-render churn around the map.

---

## What is already good (do not regress)

- **Operational layers use ONE consolidated PMTiles vector source** (`globe-layers`), not per-region
  geojson. `syncActiveOperationalLayers` adds each circle layer lazily on first activation and then
  just toggles `visibility`. MapLibre fetches only visible tiles. (`tactical-map-2d.tsx:520-575`)
- **Dossier reads are deduped**: `dossier-bundle-client.ts` fetches a small `index.json` once, then a
  single HTTP Range request per city, with an in-flight `Map` that collapses the 4 concurrent
  workspace/entities/sources/coverage loaders into one fetch. Replaces 4 file fetches + the 117MB
  registry with 1 byte-range fetch. (`dossier-bundle-client.ts:37-65`, `city-data-client.ts:44-69`)
- **maplibre-gl and pmtiles are dynamically imported** inside `defaultMountMap`, so they are not in the
  first-paint bundle. (`tactical-map-2d.tsx:418-420`)
- **Cesium is referenced in config but not mounted** — the home surface is MapLibre 2D only
  (`cesium-globe-surface` only appears in a test asserting it is NOT rendered). The Cesium webpack/env
  wiring + `vendor/cesium` copy is dead weight on the home path; verify nothing ships it.

---

## Top runtime issues (ranked) + concrete fixes

### 1. Search re-fetches and re-parses the 62MB `search-index.json` on the client — uncached
`home-stage.tsx:813-862`: when a search query has no server-provided results, the effect does
`fetch("/data/cities/search-index.json") → res.json()` (full ~62MB parse), filters client-side, slices
to 20. This runs again for the next query because nothing caches the parsed array, and it blocks the
main thread on a 62MB `JSON.parse`. `searchCities()`/`generateSearchIndex()` in
`city-data-client.ts:103-139` and `loadCityRegistry` (`:71-76`, "50MB+", actually 117MB) have the same
shape.

Fixes (in priority order):
- **Do not ship a 62MB search index to the browser.** Pre-build a compact prefix/trie or
  minisearch/FlexSearch index, or shard by first letter, so a query loads KBs not 62MB.
- At minimum **cache the fetched+parsed array** (module-level promise like `getIndex()` in
  dossier-bundle-client, or a TanStack `useQuery` — the `QueryClient` already exists in
  `app-providers.tsx` but is unused on these paths). One parse per session instead of per keystroke-batch.
- Move parse + filter into a Web Worker so the 62MB `JSON.parse` never blocks paint/input.
- `loadCityRegistry()` (117MB) is still called by `searchCities`/`generateSearchIndex`; ensure no
  client path reaches it (the home path already avoids it via the dossier; audit `searchCities`).

### 2. Two large reference geojson sources block the map's first render
`tactical-map-2d.tsx:56-57, 314-319` load `natural-earth-countries.geojson` and
`natural-earth-admin1.geojson` as `type:"geojson"` sources baked into the initial style, plus the
`city-selection-source` geojson on `load` (`:595-598`). These are full-resolution geojson parsed on the
main thread before the basemap is usable; admin1 in particular is large.

Fixes:
- Fold countries/admin1 into the existing `layers.pmtiles` (or a second PMTiles) as vector source-layers
  — same approach already used for operational layers — so only visible tiles load. Eliminates the
  largest synchronous geojson parses on the map path.
- If keeping geojson short-term: simplify with `tippecanoe`/`mapshaper` to a low-zoom geometry, and
  defer the admin1 layer until after first idle (`map.once('idle')`) rather than including it in the
  initial style.

### 3. Map controller `update()` fires on nearly every parent re-render
`tactical-map-2d.tsx:900-916`: the update effect depends on `featuredCities`, `activeLayerIds`,
`baseImageryCatalog`, `globeManifest`, `selectedCity`, etc. In `home-stage.tsx:1080-1087` `featuredCities`
is rebuilt with `.map(...)` on every render (new array identity), and `buildMountArgs` is recreated each
render. So `controller.update()` → `syncBaseImagery/syncSelectionStyling/syncActiveOperationalLayers/...`
runs on every state change (search typing, recent-city writes, watchlist store updates), each doing
`getLayer`/`setPaintProperty`/`queryRenderedFeatures` work.

Fixes:
- Memoize the `featuredCities` prop array (`useMemo`) and the per-mount args so identities are stable.
- Gate `update()` on actual value changes (the code already diffs base-imagery key and focused city; do
  the same for layer ids via a joined-string compare) — cheap guard, avoids redundant MapLibre calls.

### 4. `mousemove` handler runs `queryRenderedFeatures` on every pointer move
`tactical-map-2d.tsx:713-749`: every `mousemove` calls `queryRenderedFeatures` against
`city-selection-hit` and updates a geojson hover source. On a dense selection layer this is a per-frame
hit-test that can drop frames during pan.

Fix: throttle/rAF-debounce the hover hit-test, or use MapLibre `mouseenter`/`mouseleave` on the
`city-selection-hit` layer + `feature-state` for hover styling instead of resetting a geojson source.

### 5. City page does a serial fetch waterfall before render
`city-page-client.tsx:26-66`: `await findCityBySlug(slug)` (1 dossier Range fetch) → then a `Promise.all`
of `loadCommandCenterCityPanelClient` (which calls `findCityBySlug` again — deduped — plus 4 dossier
sub-loaders, all deduped) + the command-center manifest. Net is ~1 dossier fetch + 1 manifest fetch, but
they are sequenced: nothing starts until the first city lookup resolves.

Fix: kick off `loadCommandCenterManifestClient()` in parallel with the first `findCityBySlug` (the
manifest does not depend on the city). Small win, removes one serial RTT on the dossier page. Consider
moving these into TanStack `useQuery` for caching across navigations (back/forward re-fetches today).

---

## Image handling

- `next.config.ts:14` sets `images: { unoptimized: true }`. This is **required** for `output:"export"`
  (the Next image optimizer needs a server) and is correct here — flag is expected, not a bug. The cost
  is that any `<img>`/`next/image` ships at full source resolution with no responsive `srcset`; ensure
  raster basemap tiles and any city imagery are pre-sized at build time. No large base64/inline data
  URIs were found in the components audited.
- Base imagery is a raster tile source built on demand (`buildBaseImagerySource`,
  `tactical-map-2d.tsx:265-295`) and only added when `status==="published"` — good, it does not block the
  vector map.

## TanStack Query

- `QueryClient` is created in `app-providers.tsx` with sane defaults (`staleTime 60s`, `gcTime 5m`) but
  **none of the data clients use it** — every loader is a raw `fetch`. The two heaviest client fetches
  (62MB search index, per-city dossier on city pages) get no cross-render/cross-navigation caching from
  it. Wiring search + city/dossier loads through `useQuery` (issues 1 and 5) is the highest-leverage use
  of the already-installed provider.

## Virtualization

- Sidebar search results are `.slice(0, 8)` and featured `.slice(0, 6)` (`tactical-sidebar.tsx:546,557`),
  rankings is server-rendered and bounded to featured cities (`rankings-page.tsx`), so there is **no
  unbounded list rendered to the DOM** on the audited paths — virtualization is not needed there. (No
  react-window/react-virtual dependency is present.) The bottleneck is the data fetch/parse upstream of
  the slice, not DOM node count.

---

## Suggested order of work
1. Replace the 62MB client search index with a compact index (or shard + worker + cache) — issue 1.
2. Move countries/admin1 reference geometry into PMTiles vector tiles — issue 2.
3. Memoize map props + guard `update()`; throttle hover hit-test — issues 3 & 4.
4. Parallelize/cache city-page loads via TanStack Query — issue 5.
5. Confirm Cesium vendor assets/bundle are not shipped on the home route.
