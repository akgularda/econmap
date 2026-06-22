import { describe, expect, it } from "vitest";

import { briefFilename, cityBriefToJson, cityBriefToMarkdown, type CityBrief } from "@/features/osint/lib/investigation";

const BRIEF = {
  city: {
    cityId: "geo-1",
    slug: "geo-1-portville",
    name: "Portville",
    aliases: [],
    countryIso3: "USA",
    admin1Name: "California",
    population: 900_000,
    isMajorCity: true,
  },
  dossier: {
    entities: [
      { entityId: "e1", entityName: "Big Harbor", entityType: "port", exactSite: true, latitude: 1, longitude: 2 },
    ],
    sources: [{ id: "wri", name: "WRI Global Power Plant Database", url: "https://wri.org" }],
    coverage: {
      categories: [{ id: "ports", label: "Ports", state: "mapped", count: 1 }],
    },
  },
} as unknown as CityBrief;

describe("investigation export", () => {
  it("markdown carries the city, coverage, entities (grouped), and sources", () => {
    const md = cityBriefToMarkdown(BRIEF);
    expect(md).toContain("# Portville — OSINT brief");
    expect(md).toContain("California, USA");
    expect(md).toContain("### Ports (1)");
    expect(md).toContain("Big Harbor _(exact site)_");
    expect(md).toContain("WRI Global Power Plant Database — https://wri.org");
    expect(md).toContain("source-backed");
  });

  it("json is valid and preserves city + entities + sources", () => {
    const parsed = JSON.parse(cityBriefToJson(BRIEF));
    expect(parsed.city.name).toBe("Portville");
    expect(parsed.entities).toHaveLength(1);
    expect(parsed.entities[0]).toMatchObject({ name: "Big Harbor", type: "port", exactSite: true });
    expect(parsed.sources[0].name).toBe("WRI Global Power Plant Database");
  });

  it("briefFilename is filesystem-safe", () => {
    expect(briefFilename(BRIEF.city)).toBe("osint-portville-geo-1");
  });
});
