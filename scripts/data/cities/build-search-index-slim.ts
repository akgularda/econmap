import fs from "node:fs";
import path from "node:path";

import { CITY_POPULATION_THRESHOLD } from "../../../src/lib/city-prerender";

/**
 * Slim the 59 MB search index for mobile. The search box surfaces the navigable cities (population
 * >= threshold). Only the top-N of those get a pre-rendered /city/<slug> page (see
 * src/lib/city-prerender.ts CITY_PRERENDER_LIMIT); the rest still resolve client-side via the SPA
 * 404 fallback + dossier bundle, so they stay searchable AND deep-linkable. Dropping the
 * URL/Wikidata-Q-ID aliases (which add no search value) and scoping to the navigable set takes the
 * index from ~59 MB → ~2.4 MB, a single file lazily loaded on first search, with full
 * name/alias/country/admin substring matching preserved (same shape, so no client change).
 *
 * The population threshold is imported from src/lib/city-prerender.ts — the SAME module page.tsx
 * imports — so the page set and search set cannot drift.
 *
 * Run: npx tsx scripts/data/cities/build-search-index-slim.ts
 */
const SRC = path.join(process.cwd(), "src", "data", "generated", "cities", "search-index.json");
const OUT = path.join(process.cwd(), "public", "data", "cities", "search-index.json");
const POPULATION_THRESHOLD = CITY_POPULATION_THRESHOLD; // shared with src/app/city/[slug]/page.tsx

type Entry = {
  cityId: string;
  slug: string;
  name: string;
  aliases?: string[];
  countryIso3: string;
  admin1Name?: string;
  population?: number | null;
  isMajorCity?: boolean;
};

function isNoiseAlias(a: string): boolean {
  return /^https?:/i.test(a) || /^q\d+$/i.test(a);
}

function main() {
  const all: Entry[] = JSON.parse(fs.readFileSync(SRC, "utf-8"));
  const slim = all
    .filter((e) => (e.population ?? 0) >= POPULATION_THRESHOLD)
    .map((e) => ({
      cityId: e.cityId,
      slug: e.slug,
      name: e.name,
      aliases: (e.aliases ?? []).filter((a) => !isNoiseAlias(a)).slice(0, 3),
      countryIso3: e.countryIso3,
      admin1Name: e.admin1Name,
      population: e.population,
      isMajorCity: e.isMajorCity ?? false,
    }));

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(slim));
  const mb = (fs.statSync(OUT).size / 1048576).toFixed(1);
  console.log(`Slim search index: ${all.length} → ${slim.length} navigable cities (pop >= ${POPULATION_THRESHOLD}), ${mb} MB.`);
}

main();
