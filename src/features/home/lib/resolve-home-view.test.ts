import { describe, expect, it } from "vitest";

import { resolveHomeView } from "@/features/home/lib/analyst-sidebar-model";
import type { BaseImageryCatalog, CommandCenterManifest, GlobeManifest } from "@/domain/types";

const globeManifest = {
  generatedAt: "2026-03-15T00:00:00.000Z",
  layers: [
    {
      id: "ports",
      label: "Ports",
      family: "Transport",
      sourceLabels: ["World Port Index"],
      tier: "interactive",
      supportsTime: false,
      supportsCityFocus: true,
      assetPath: "/data/globe/layers/ports/vectors/current.geojson",
    },
    {
      id: "airports",
      label: "Airports",
      family: "Transport",
      sourceLabels: ["OurAirports"],
      tier: "interactive",
      supportsTime: false,
      supportsCityFocus: true,
      assetPath: "/data/globe/layers/airports/vectors/current.geojson",
    },
  ],
} as unknown as GlobeManifest;

const baseImageryCatalog = {
  generatedAt: "2026-03-15T00:00:00.000Z",
  defaultLayerId: "true-color",
  layers: [
    {
      id: "true-color",
      label: "True Color",
      family: "Base Maps",
      status: "published",
      availableDates: ["2026-03-15"],
      minZoom: 0,
      maxZoom: 8,
      attribution: ["NASA GIBS"],
      assetPathTemplate: "/x/{z}/{x}/{y}.jpg",
      defaultOpacity: 1,
    },
    {
      id: "night-lights",
      label: "Night Lights",
      family: "Satellite",
      status: "published",
      availableDates: ["2016-01-01", "2016-02-01"],
      minZoom: 0,
      maxZoom: 3,
      attribution: ["NASA Black Marble"],
      assetPathTemplate: "/y/{z}/{x}/{y}.png",
      defaultOpacity: 1,
    },
  ],
} as unknown as BaseImageryCatalog;

const commandCenterManifest = {
  generatedAt: "2026-03-15T00:00:00.000Z",
  defaultViewId: "global-ops",
  globalIntelligence: [],
  opsTimeline: [],
  savedViews: [
    { id: "global-ops", label: "Global Ops", activeLayerIds: ["ports"], sourceLabels: [] },
    { id: "maritime", label: "Maritime", activeLayerIds: ["ports"], sourceLabels: [] },
  ],
  sourceSummary: [],
  datasetInventory: [],
  tacticalLayerCatalog: [],
} as unknown as CommandCenterManifest;

const base = {
  globeManifest,
  baseImageryCatalog,
  commandCenterManifest,
  featuredCitySlug: "geo-1-istanbul",
};

describe("resolveHomeView", () => {
  it("applies homepage defaults for a blank view", () => {
    const view = resolveHomeView({
      requestedLayerIds: [],
      searchQuery: "",
      isBlankHomepageSearch: true,
      ...base,
    });
    expect(view.activeLayerIds).toEqual(["ports"]);
    expect(view.activeBaseImageryLayerId).toBe("night-lights");
    expect(view.activeDate).toBe("2016-01-01");
    expect(view.activeViewId).toBe("global-ops");
    expect(view.activeViewLabel).toBe("Global Ops");
    // Blank homepage preselects the featured city.
    expect(view.selectedCitySlug).toBe("geo-1-istanbul");
  });

  it("honors requested layers / base / date / view from params", () => {
    const view = resolveHomeView({
      requestedLayerIds: ["airports", "not-a-layer"],
      requestedBaseImageryLayerId: "night-lights",
      requestedDate: "2016-02-01",
      requestedViewId: "maritime",
      selectedCitySlug: "geo-2-ankara",
      searchQuery: "ank",
      isBlankHomepageSearch: false,
      ...base,
    });
    // Unpublished layer ids are filtered out.
    expect(view.activeLayerIds).toEqual(["airports"]);
    expect(view.activeBaseImageryLayerId).toBe("night-lights");
    expect(view.activeDate).toBe("2016-02-01");
    expect(view.activeViewId).toBe("maritime");
    expect(view.selectedCitySlug).toBe("geo-2-ankara");
    expect(view.searchQuery).toBe("ank");
  });

  it("does not preselect a city when params exist but no city is chosen", () => {
    const view = resolveHomeView({
      requestedLayerIds: ["airports"],
      searchQuery: "",
      isBlankHomepageSearch: false,
      ...base,
    });
    expect(view.selectedCitySlug).toBeUndefined();
  });
});
