import { describe, expect, it } from "vitest";

import {
  CITY_POPULATION_THRESHOLD,
  CITY_PRERENDER_LIMIT,
  selectPrerenderSlugs,
} from "@/lib/city-prerender";

describe("selectPrerenderSlugs", () => {
  it("returns [] for an empty registry without crashing (fresh clone, no data)", () => {
    expect(selectPrerenderSlugs([])).toEqual([]);
  });

  it("selects the top-N cities by population in descending order", () => {
    const slugs = selectPrerenderSlugs(
      [
        { slug: "geo-1-small", population: 60000 },
        { slug: "geo-2-big", population: 9_000_000 },
        { slug: "geo-3-mid", population: 500_000 },
      ],
      2,
    );
    expect(slugs).toEqual(["geo-2-big", "geo-3-mid"]);
  });

  it("breaks population ties deterministically by slug", () => {
    const slugs = selectPrerenderSlugs(
      [
        { slug: "geo-b", population: 100 },
        { slug: "geo-a", population: 100 },
      ],
      2,
    );
    expect(slugs).toEqual(["geo-a", "geo-b"]);
  });

  it("drops entries with non-finite population", () => {
    const slugs = selectPrerenderSlugs(
      [
        { slug: "geo-nan", population: Number.NaN },
        { slug: "geo-real", population: 1000 },
      ],
      10,
    );
    expect(slugs).toEqual(["geo-real"]);
  });

  it("caps at CITY_PRERENDER_LIMIT by default", () => {
    const entries = Array.from({ length: CITY_PRERENDER_LIMIT + 50 }, (_, i) => ({
      slug: `geo-${i}`,
      population: i,
    }));
    expect(selectPrerenderSlugs(entries)).toHaveLength(CITY_PRERENDER_LIMIT);
  });

  it("exposes a stable population threshold shared with the search-index build", () => {
    expect(CITY_POPULATION_THRESHOLD).toBe(30000);
  });
});
