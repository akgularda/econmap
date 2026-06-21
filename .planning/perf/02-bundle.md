# Client JS Bundle Audit — econmap (Next.js 16, static export)

Date: 2026-06-20
Scope: `src/**` client bundle. App uses `output: "export"` (`next.config.ts`), webpack builder.

## 1. Dependency weight inventory (`package.json`)

| Dep | Approx min+gz | Imported in `src`? | Verdict |
|-----|--------------|---------------------|---------|
| `cesium` ^1.139 | ~3–4 MB+ | **NO** (only `next.config.ts` DefinePlugin + a test) | **DEAD** — remove or it is a latent footgun |
| `@deck.gl/core` + `/geo-layers` + `/layers` ^9.2 | ~600 KB–1 MB combined | **NO** (zero `src` imports) | **DEAD** — remove |
| `maplibre-gl` ^5.7 | ~250 KB | yes — 2 sites | Heavy; one site eager (see §3) |
| `recharts` ^3.1 | ~150–200 KB | yes — 3 chart comps | Heavy; eager on country route |
| `framer-motion` ^12.5 | ~110 KB | **NO** (zero imports) | **DEAD** — remove |
| `date-fns` ^4.1 | (tree-shaken) | **NO** (zero imports) | **DEAD** — remove |
| `@tanstack/react-query` ^5.66 | ~40 KB | yes — provider + query-client | Needed; fine |
| `zod` ^3.24 | ~50 KB | yes — many `domain/*`, `lib/*` | See §4 (runs client-side) |
| `lucide-react` | per-icon | (icons) | Tree-shakeable if named imports |
| `zustand` | ~3 KB | stores | Fine |
| `pmtiles` ^4.4 | ~30 KB | with maplibre | Fine |

**Heaviest real offenders that ship today:** maplibre-gl, recharts, zod.
**Phantom weight:** cesium + 3× @deck.gl + framer-motion + date-fns are all in `dependencies` but **never imported from `src`**. If any transitive/config path pulls them they are catastrophic; at minimum they bloat `node_modules` and risk accidental inclusion.

## 2. Critical fact: no code-splitting exists anywhere

`grep` for `next/dynamic`, `dynamic(`, `React.lazy`, `lazy(` across `src/**`: **0 matches.**
Every `"use client"` subtree is statically imported and shipped eagerly. There is no Suspense/lazy boundary in the app.

## 3. "use client" components + heavy eager imports

23 `"use client"` files. The load-bearing chains:

### Home route (`src/app/page.tsx`) — highest traffic
`page.tsx` (server) → `HomeShell` → `HomeStage` (`"use client"`, `home-stage.tsx:14`) → **static** `import { TacticalMap2D }`.

- `tactical-map-2d.tsx` itself is good: maplibre is **runtime-deferred** via `await import("maplibre-gl")` (`tactical-map-2d.tsx:419`) and only imports `type` at top (`:4`). Maplibre is NOT in the initial chunk from this path.
- BUT the whole React component graph — `HomeStage`, `TacticalSidebar`, `InfosPanel`, 3 modals (`SettingsModal`, `LayerLegendModal`, `KeyboardShortcutsModal`), `CountryDrawer` — is eagerly bundled into the home client chunk. Modals especially are off-screen until opened.

### Country route — `src/features/country/components/country-factbook.tsx`
- `"use client"`, **static** imports `MetricBarChart` + `MetricLineChart` (`:5-6`), each of which does `import { ... } from "recharts"` (`metric-line-chart.tsx:4-12`, `metric-bar-chart.tsx:12`). → **recharts is eager on the country route**, even though charts are below the fold / behind tab state.

### Asset map — `src/components/charts/asset-map.tsx`
- `"use client"`, **static** `import maplibregl from "maplibre-gl"` + CSS (`:4-5`). Consumed eagerly by `country-assets.tsx:9` and `corridors-page.tsx:11`. → **a SECOND, non-deferred maplibre entry point**. The home path defers maplibre but these routes ship it eagerly. Inconsistent.

### Dead component
- `radar-compare-chart.tsx` imports recharts but `RadarCompareChart` has **zero consumers** (`grep` finds only its own definition). Dead recharts pull if anything ever tree-shakes wrong; delete it.

## 4. Import-style / tree-shaking notes

- **recharts**: imported via named imports (`CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis`) — correct style, but recharts v3 is poorly tree-shakeable; the win is *deferring* it, not narrowing it.
- **maplibre-gl**: `asset-map.tsx` uses `import maplibregl from "maplibre-gl"` (default, whole lib) eagerly — this is the problem one. `tactical-map-2d.tsx` already does it right with `await import`.
- **zod**: pulled by `domain/schemas.ts`, `city-schemas.ts`, `command-center-schemas.ts`, `asset-schemas.ts` and several `lib/*-client.ts` that run in the browser (`city-data-client.ts:6`). Zod ships to the client for runtime parsing of fetched artifacts. Acceptable but ~50 KB; if schemas are only used at build time for some artifacts, split client vs server schema modules.
- No `import *` barrel offenders found in the heavy paths.

## 5. Concrete, ranked changes

### P0 — delete phantom deps (zero risk, big graph cleanup)
1. Remove `cesium`, `@deck.gl/core`, `@deck.gl/geo-layers`, `@deck.gl/layers`, `framer-motion`, `date-fns` from `package.json` (no `src` imports). Remove the cesium `DefinePlugin`/`NEXT_PUBLIC_CESIUM_BASE_URL`/webpack `amd` block in `next.config.ts:23,26-37` if cesium is truly gone. Re-run build to confirm nothing breaks.
2. Delete `src/components/charts/radar-compare-chart.tsx` (no consumers).

### P1 — defer maplibre on country/corridor routes (`asset-map.tsx`)
- Convert `asset-map.tsx` to runtime-import maplibre like the tactical map: drop top-level `import maplibregl from "maplibre-gl"` (`:4`), do `const maplibregl = (await import("maplibre-gl")).default` inside the mount effect, and lazy-load the CSS. OR wrap the whole `AssetMap` at its call sites with `next/dynamic(..., { ssr: false, loading })`:
  - `src/features/country/components/country-assets.tsx:9`
  - `src/features/dashboard/components/corridors-page.tsx:11`

### P1 — defer recharts on country route
- In `country-factbook.tsx:5-6`, replace static chart imports with `dynamic()`:
  ```ts
  const MetricBarChart = dynamic(() => import("@/components/charts/metric-bar-chart").then(m => m.MetricBarChart), { ssr: false, loading: () => <ChartSkeleton/> });
  const MetricLineChart = dynamic(() => import("@/components/charts/metric-line-chart").then(m => m.MetricLineChart), { ssr: false });
  ```
  Pulls recharts out of the country route's initial chunk.

### P2 — lazy-load home modals
- In `home-shell.tsx:10-12`, convert `KeyboardShortcutsModal`, `LayerLegendModal`, `SettingsModal` to `dynamic(() => import(...), { ssr: false })`. They are gated behind user actions; no reason to ship in the home first-load chunk.

### P3 — split client vs build-only zod schemas
- Audit which schemas in `domain/*` are referenced from `*-client.ts`. Keep client runtime validation minimal; move build-only validation to server/script-only modules so zod's full surface isn't forced into the browser bundle.

### Verification
- Run `next build --webpack` and inspect `.next` chunk sizes (or add `@next/bundle-analyzer`) before/after. Expect: home first-load drops the 3 modals; country route drops recharts (~150 KB) and maplibre (~250 KB) from initial; phantom-dep removal shrinks `node_modules` and removes OOM/footgun risk.
