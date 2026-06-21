/**
 * Single source of truth for which cities get a pre-rendered static HTML shell.
 *
 * Historically every city with population >= 50,000 (~12,010 cities) got its own
 * pre-rendered `/city/<slug>/` directory — ~108K files / ~280-320 MB, ~90% of the
 * static export's file count. We now pre-render only the top-N cities by population
 * for SEO / direct-URL warmth; every other (minor) city stays fully reachable via the
 * SPA fallback (public 404 boot → CityPageClient resolves ANY slug from the
 * Range-addressable dossier bundle). No data is dropped — only HTML shells.
 *
 * This module is imported by BOTH:
 *   - src/app/city/[slug]/page.tsx (generateStaticParams — the page set)
 *   - scripts/data/cities/build-search-index-slim.ts (the search set)
 * so the page-set and search-set cannot drift.
 */

/** Cities still considered "navigable" by population (search set + candidate pool). */
export const CITY_POPULATION_THRESHOLD = 30000;

/** Max number of cities to pre-render as static HTML shells, ranked by population desc. */
export const CITY_PRERENDER_LIMIT = 5000;

type SlugWithPopulation = { slug: string; population: number };

/**
 * Given (slug, population) pairs, return the slugs of the top-N most-populous cities
 * (CITY_PRERENDER_LIMIT) in descending population order. Pure + deterministic so the
 * page route and the build script select the identical set. Returns [] for empty input
 * (no data on a fresh clone → generateStaticParams returns [] without crashing).
 */
export function selectPrerenderSlugs(
  entries: SlugWithPopulation[],
  limit: number = CITY_PRERENDER_LIMIT,
): string[] {
  return [...entries]
    .filter((entry) => Number.isFinite(entry.population) && entry.population >= 0)
    // Descending population; tie-break on slug for stable, deterministic ordering.
    .sort((left, right) => right.population - left.population || left.slug.localeCompare(right.slug))
    .slice(0, limit)
    .map((entry) => entry.slug);
}
