# Publishing MapFactbook to GitHub Pages

The site is a static export (`output: "export"`) served from the **project page**
`https://akgularda.github.io/econmap/`. Because it lives under the `/econmap` subpath, every
asset URL must be prefixed with `/econmap` — that is what `.env.production` does.

## One-time setup (repo owner, GitHub web UI)

1. **Settings → Pages → Build and deployment → Source = `GitHub Actions`.**
   (`.github/workflows/deploy.yml` uses `upload-pages-artifact` + `deploy-pages@v4`, which require this.)
2. Confirm the default branch is `main`.

## Every release (local build → release asset → Action deploys)

```bash
# 1. .env.production must exist with NEXT_PUBLIC_BASE_PATH=/econmap (committed).
#    Verify:
cat .env.production            # -> NEXT_PUBLIC_BASE_PATH=/econmap

# 2. Build the static export (Next loads .env.production automatically for `next build`).
npm run build

# 3. Prune dead globe geojson (→ PMTiles), cap oversized files, gate the size budget.
npm run deploy:assemble

# 4. Validate the data (must print "Overall: PASS").
npm run audit:data

# 5. Sanity-check the basePath landed (asset URLs must include /econmap):
grep -o '/econmap/_next/[^"]*' out/index.html | head -1   # non-empty = good

# 6. Package out/ and cut a release; the Action deploys it.
tar -czf econmap-site.tar.gz -C out .
gh release create site-$(date +%Y%m%d) econmap-site.tar.gz --notes "Static export $(date +%F)"
#    Then run the deploy workflow against that release tag (Actions tab → Run workflow),
#    or `gh workflow run deploy.yml`.
```

## Why basePath, not assetPrefix

`next.config.ts` sets `basePath` only (no `assetPrefix`). `basePath` already prefixes `/_next/*`
chunks **and** the runtime asset fetches (`data/*.json`, `*.geojson`, `pmtiles://`) via the
`assetUrl()` helper. Setting a non-empty `assetPrefix` made Next 16's static export OOM during the
multi-thousand-page export, so it is intentionally omitted — do not "fix" it by adding one.

## Serving locally for a smoke test

A `basePath=/econmap` build expects to be served under `/econmap/`. To preview the exact production
bytes:

```bash
npx serve out -l 3000        # then open http://localhost:3000/econmap/
```

For a quick local check at the root instead, build without the prefix: `NEXT_PUBLIC_BASE_PATH= npm run build`.

## Coverage / SPA fallback note

Only the top `CITY_PRERENDER_LIMIT` cities (by population, see `src/lib/city-prerender.ts`) get a
pre-rendered HTML shell. Every other registry city is still reachable: its `/city/<slug>` deep link
loads `404.html` (which carries the full app JS), and `not-found.tsx` resolves the slug client-side
from the Range-addressable dossier bundle. So "more coverage" = raising the threshold/limit in that
one module; no per-city HTML explosion.
