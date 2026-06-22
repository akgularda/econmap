import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HomeShell } from "@/features/home/components/home-shell";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/",
}));

const citySelectionAssetPath = "/data/globe/reference/city-footprints/selectable.geojson";

describe("HomeShell", () => {
  it("renders the command-center shell from shipped data", () => {
    render(
      <HomeShell
        activeLayerIds={["cities", "airports"]}
        activeViewId="global-ops"
        cityResults={[
          {
            cityId: "geo-1",
            slug: "andorra-la-vella",
            name: "Andorra la Vella",
            aliases: ["Andorra"],
            countryIso3: "AND",
            admin1Name: "Andorra la Vella",
            population: 22615,
            isMajorCity: false,
          },
        ]}
        featuredCities={[
          {
            cityId: "geo-745044",
            slug: "geo-745044-istanbul",
            name: "Istanbul",
            aliases: [],
            admin1Name: "Istanbul",
            countryIso3: "TUR",
            countryIso2: "TR",
            countrySlug: "turkey",
            population: 15701602,
            isMajorCity: true,
            latitude: 41.0082,
            longitude: 28.9784,
            boundaryStatus: "point_only",
            populationSource: "GeoNames",
            registrySource: "GeoNames",
            recordStatus: "active",
          },
          {
            cityId: "geo-323786",
            slug: "geo-323786-ankara",
            name: "Ankara",
            aliases: [],
            admin1Name: "Ankara",
            countryIso3: "TUR",
            countryIso2: "TR",
            countrySlug: "turkey",
            population: 3517182,
            isMajorCity: true,
            latitude: 39.9334,
            longitude: 32.8597,
            boundaryStatus: "point_only",
            populationSource: "GeoNames",
            registrySource: "GeoNames",
            recordStatus: "active",
          },
          {
            cityId: "geo-3169070",
            slug: "geo-3169070-rome",
            name: "Rome",
            aliases: [],
            admin1Name: "Lazio",
            countryIso3: "ITA",
            countryIso2: "IT",
            countrySlug: "italy",
            population: 2318895,
            isMajorCity: true,
            latitude: 41.8919,
            longitude: 12.5113,
            boundaryStatus: "point_only",
            populationSource: "GeoNames",
            registrySource: "GeoNames",
            recordStatus: "active",
          },
          {
            cityId: "geo-2988507",
            slug: "geo-2988507-paris",
            name: "Paris",
            aliases: [],
            admin1Name: "Ile-de-France",
            countryIso3: "FRA",
            countryIso2: "FR",
            countrySlug: "france",
            population: 2138551,
            isMajorCity: true,
            latitude: 48.8534,
            longitude: 2.3488,
            boundaryStatus: "point_only",
            populationSource: "GeoNames",
            registrySource: "GeoNames",
            recordStatus: "active",
          },
        ]}
        commandCenterManifest={{
          generatedAt: "2026-03-15T00:00:00.000Z",
          defaultViewId: "global-ops",
          globalIntelligence: [
            {
              id: "published-city-backbone",
              title: "Published City Backbone",
              body: "1 of 1 cities have published intelligence bundles.",
              coverageState: "verified_exact",
              sourceLabels: ["GeoNames"],
            },
          ],
          opsTimeline: [
            {
              id: "offline-build",
              label: "Offline build published",
              timestamp: "2026-03-15T00:00:00.000Z",
              detail: "1 city record and 2 layers shipped",
              sourceLabels: ["GeoNames"],
            },
          ],
          savedViews: [
            {
              id: "global-ops",
              label: "Global Ops",
              activeLayerIds: ["cities", "airports"],
              sourceLabels: ["GeoNames", "OurAirports"],
            },
          ],
          sourceSummary: [
            {
              label: "GeoNames",
              value: "1 city bundle",
              sources: [
                {
                  id: "geonames",
                  name: "GeoNames",
                  updatedAt: "2026-03-15T00:00:00.000Z",
                  coverage: "accepted_dataset_rows",
                  methodology: "Published from accepted dataset rows during offline build",
                },
              ],
            },
          ],
          datasetInventory: [
            {
              id: "geonames",
              label: "GeoNames",
              status: "published_to_website",
              sourceLabels: ["GeoNames"],
              detail: "189025 city bundles are surfaced on the website via city bundles and the cities globe layer.",
              websiteSurfaces: ["city bundles", "globe layer"],
            },
            {
              id: "ookla",
              label: "Ookla",
              status: "published_to_website",
              sourceLabels: ["Ookla"],
              detail: "Connectivity evidence is published to the website from accepted source rows.",
              websiteSurfaces: ["dataset workspace", "city brief"],
              workspacePath: "/datasets/ookla",
            },
            {
              id: "wri-global-power-plant-database",
              label: "WRI Global Power Plant Database",
              status: "processed_with_data",
              sourceLabels: ["WRI Global Power Plant Database"],
              detail: "Processed local index contains 34936 accepted rows, but no live globe layer is published yet.",
              websiteSurfaces: [],
            },
            {
              id: "who-air-quality",
              label: "WHO Air Quality",
              status: "downloaded_local_source",
              sourceLabels: ["WHO Air Quality"],
              detail: "Downloaded local source is present on disk and catalogued in this build. A dedicated website surface is not included.",
              websiteSurfaces: [],
            },
          ],
          tacticalLayerCatalog: [],
        }}
        globeManifest={{
          generatedAt: "2026-03-15T00:00:00.000Z",
          baseImageryCatalogPath: "/data/globe/base-imagery/catalog.json",
          layers: [
            {
              id: "cities",
              label: "Cities",
              family: "Political / Admin",
              sourceLabels: ["GeoNames"],
              tier: "boot",
              supportsTime: false,
              supportsCityFocus: true,
              assetPath: "/data/globe/layers/cities/vectors/current.geojson",
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
              id: "utilities",
              label: "Utilities",
              family: "Economic / Infrastructure",
              sourceLabels: ["WRI Global Power Plant Database"],
              tier: "interactive",
              supportsTime: false,
              supportsCityFocus: true,
              assetPath: "/data/globe/layers/utilities/vectors/current.geojson",
            },
          ],
        }}
        baseImageryCatalog={{
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
              assetPathTemplate: "/data/globe/base-imagery/true-color/{date}/{z}/{x}/{y}.jpg",
              defaultOpacity: 1,
            },
            {
              id: "night-lights",
              label: "Night Lights",
              family: "Satellite",
              status: "published",
              availableDates: ["2016-01-01"],
              minZoom: 0,
              maxZoom: 3,
              attribution: ["NASA Black Marble"],
              assetPathTemplate: "/data/globe/base-imagery/night-lights/{date}/{z}/{x}/{y}.png",
              defaultOpacity: 1,
            },
          ],
        }}
        citySelectionAssetPath={citySelectionAssetPath}
        activeBaseImageryLayerId="true-color"
        activeDate="2026-03-15"
        searchQuery=""
        selectedCityPanel={{
          coverageShell: null,
          city: {
            cityId: "geo-745044",
            slug: "geo-745044-istanbul",
            name: "Istanbul",
            aliases: [],
            countryIso2: "TR",
            countryIso3: "TUR",
            countrySlug: "turkey",
            admin1Name: "Istanbul",
            admin1Code: "34",
            latitude: 41.0082,
            longitude: 28.9784,
            boundaryStatus: "point_only",
            population: 15701602,
            populationSource: "GeoNames",
            registrySource: "GeoNames",
            recordStatus: "active",
            isMajorCity: true,
          },
          workspace: {
            city: {
              cityId: "geo-745044",
              slug: "geo-745044-istanbul",
              name: "Istanbul",
              aliases: [],
              countryIso2: "TR",
              countryIso3: "TUR",
              countrySlug: "turkey",
              admin1Name: "Istanbul",
              admin1Code: "34",
              latitude: 41.0082,
              longitude: 28.9784,
              boundaryStatus: "point_only",
              population: 15701602,
              populationSource: "GeoNames",
              registrySource: "GeoNames",
              recordStatus: "active",
              isMajorCity: true,
            },
            summary: "Istanbul source-backed command workspace",
            roleTags: [],
            coverage: {
              economicFactbook: "verified_exact",
              investorIntel: "verified_city_presence",
              urbanIntel: "not_covered_yet",
            },
            economicFactbook: [
              {
                indicatorId: "population",
                value: 15701602,
                unit: "persons",
                status: "actual",
                source: {
                  id: "geonames",
                  name: "GeoNames",
                  updatedAt: "2026-03-15",
                  coverage: "global",
                  methodology: "Canonical city registry record",
                  url: "https://www.geonames.org/",
                },
              },
              {
                indicatorId: "gdp-current-ppp",
                value: 801599000000,
                unit: "USD PPP",
                year: 2023,
                status: "actual",
                source: {
                  id: "oecd-fua-economy",
                  name: "OECD FUA Economy",
                  updatedAt: "2026-03-20",
                  coverage: "oecd_fua",
                  methodology: "Latest OECD FUA GDP PPP observation matched to a city selection surface.",
                  url: "https://www.oecd.org/",
                },
              },
            ],
            investorIntel: [],
            urbanIntel: [],
            economicIntel: [
              {
                indicatorId: "population",
                value: 15701602,
                unit: "persons",
                status: "actual",
                source: {
                  id: "geonames",
                  name: "GeoNames",
                  updatedAt: "2026-03-15",
                  coverage: "global",
                  methodology: "Canonical city registry record",
                  url: "https://www.geonames.org/",
                },
              },
              {
                indicatorId: "gdp-current-ppp",
                value: 801599000000,
                unit: "USD PPP",
                year: 2023,
                status: "actual",
                source: {
                  id: "oecd-fua-economy",
                  name: "OECD FUA Economy",
                  updatedAt: "2026-03-20",
                  coverage: "oecd_fua",
                  methodology: "Latest OECD FUA GDP PPP observation matched to a city selection surface.",
                  url: "https://www.oecd.org/",
                },
              },
            ],
            transportIntel: [
              {
                indicatorId: "ports",
                value: 2,
                unit: "sites",
                status: "actual",
                source: {
                  id: "world-port-index",
                  name: "World Port Index",
                  updatedAt: "2026-03-15",
                  coverage: "global",
                  methodology: "Port registry joined to city evidence bundles.",
                  url: "https://msi.nga.mil/Publications/WPI",
                },
              },
            ],
            utilitiesIntel: [
              {
                indicatorId: "utilities",
                value: 8,
                unit: "sites",
                status: "actual",
                source: {
                  id: "wri-power-plants",
                  name: "WRI Global Power Plant Database",
                  updatedAt: "2026-03-15",
                  coverage: "global",
                  methodology: "Accepted power assets linked to city evidence bundles.",
                  url: "https://datasets.wri.org/dataset/globalpowerplantdatabase",
                },
              },
            ],
            telecomIntel: [
              {
                indicatorId: "telecom",
                value: 152,
                unit: "Mbps",
                status: "actual",
                source: {
                  id: "ookla",
                  name: "Ookla",
                  updatedAt: "2026-03-15",
                  coverage: "city_sample",
                  methodology: "Fixed broadband city performance observation.",
                  url: "https://www.ookla.com/",
                },
              },
            ],
            environmentIntel: [
              {
                indicatorId: "environment",
                value: 18,
                unit: "ug/m3",
                status: "actual",
                source: {
                  id: "who-air-quality",
                  name: "WHO Air Quality",
                  updatedAt: "2026-03-15",
                  coverage: "city_sample",
                  methodology: "Ambient air quality observation matched to city evidence bundles.",
                  url: "https://www.who.int/data/gho/data/themes/air-pollution",
                },
              },
            ],
            organizationIntel: [
              {
                indicatorId: "organizations",
                value: 142,
                unit: "sites",
                status: "actual",
                source: {
                  id: "ror",
                  name: "ROR",
                  updatedAt: "2026-03-15",
                  coverage: "city_presence",
                  methodology: "Research organizations linked to city evidence bundles.",
                  url: "https://ror.org/",
                },
              },
            ],
            coverageBoundaryType: "admin_selection_surface",
            sourceCoverageSummary: [
              {
                label: "Boundary surface",
                value: "admin_selection_surface",
                sources: [
                  {
                    id: "natural-earth-admin1",
                    name: "Natural Earth Admin1",
                    updatedAt: "2026-03-20",
                    coverage: "admin_selection_surface",
                    methodology: "Visible administrative polygons used for selection and rendering.",
                    url: "https://www.naturalearthdata.com/",
                  },
                ],
              },
            ],
            entityCounts: { airport: 48, utility: 8, port: 2, research: 142 },
            entityHighlights: [
              {
                entityId: "airport-ist",
                cityId: "geo-745044",
                entityName: "Istanbul Airport",
                entityType: "airport",
                entitySubtype: "large_airport",
                presenceType: "airport",
                exactSite: true,
                geometryMode: "exact",
                latitude: 41.2753,
                longitude: 28.7519,
                status: "active",
                sources: [
                  {
                    id: "ourairports",
                    name: "OurAirports",
                    updatedAt: "2026-03-15",
                    coverage: "global",
                    methodology: "Airport registry",
                    url: "https://ourairports.com/data/",
                  },
                ],
                lastVerifiedAt: "2026-03-15T00:00:00.000Z",
                confidenceState: "verified_exact",
              },
            ],
            mapLayerSummary: { availableLayers: ["cities", "airports"] },
            sources: [
              {
                id: "geonames",
                name: "GeoNames",
                updatedAt: "2026-03-15T00:00:00.000Z",
                coverage: "global",
                methodology: "Canonical city registry record",
                coverageState: "verified_exact",
              },
              {
                id: "ourairports",
                name: "OurAirports",
                updatedAt: "2026-03-15",
                coverage: "global",
                methodology: "Airport registry",
              },
              {
                id: "oecd-fua-economy",
                name: "OECD FUA Economy",
                updatedAt: "2026-03-20",
                coverage: "oecd_fua",
                methodology: "Latest OECD FUA GDP PPP observation matched to a city selection surface.",
              },
            ],
          },
          entities: {
            entities: [
              {
                entityId: "airport-ist",
                cityId: "geo-745044",
                entityName: "Istanbul Airport",
                entityType: "airport",
                entitySubtype: "large_airport",
                presenceType: "airport",
                exactSite: true,
                geometryMode: "exact",
                latitude: 41.2753,
                longitude: 28.7519,
                status: "active",
                sources: [
                  {
                    id: "ourairports",
                    name: "OurAirports",
                    updatedAt: "2026-03-15",
                    coverage: "global",
                    methodology: "Airport registry",
                    url: "https://ourairports.com/data/",
                  },
                ],
                lastVerifiedAt: "2026-03-15T00:00:00.000Z",
                confidenceState: "verified_exact",
              },
            ],
            sources: [],
          },
          sources: {
            cityId: "geo-745044",
            sources: [
              {
                id: "geonames",
                name: "GeoNames",
                updatedAt: "2026-03-15T00:00:00.000Z",
                coverage: "global",
                methodology: "Canonical city registry record",
                coverageState: "verified_exact",
              },
              {
                id: "ourairports",
                name: "OurAirports",
                updatedAt: "2026-03-15",
                coverage: "global",
                methodology: "Airport registry",
              },
              {
                id: "oecd-fua-economy",
                name: "OECD FUA Economy",
                updatedAt: "2026-03-20",
                coverage: "oecd_fua",
                methodology: "Latest OECD FUA GDP PPP observation matched to a city selection surface.",
              },
            ],
          },
        }}
      />,
    );

    expect(screen.getByTestId("tactical-command-rail")).toHaveAttribute("data-geometry", "hard-edge");
    expect(screen.getByTestId("tactical-command-rail")).toHaveAttribute("data-density", "operator-console");
    expect(screen.getByTestId("tactical-command-rail")).toHaveAttribute("data-layout", "mission-console");
    expect(screen.getByTestId("tactical-globe-stage")).toHaveAttribute("data-layout", "immersive-stage");
    expect(screen.getByTestId("tactical-stage-overlay")).toHaveClass("pointer-events-none");
    expect(screen.getByTestId("tactical-2d-surface")).toBeInTheDocument();
    expect(screen.getByTestId("infos-panel")).toBeInTheDocument();
    expect(screen.queryByTestId("cesium-globe-surface")).not.toBeInTheDocument();
    // v2 command rail: brand wordmark replaces the old <h1> hero.
    expect(screen.queryByText(/^city-first osint atlas$/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/^global ops$/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/^focus cities$/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^3d earth$/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/^orbital surface$/i)).not.toBeInTheDocument();
    // v2 IA: the rail now exposes product navigation + a coherent map-layers group.
    expect(screen.getByText(/^workspaces$/i)).toBeInTheDocument();
    expect(screen.getByText(/^browse$/i)).toBeInTheDocument();
    expect(screen.getByText(/^map layers$/i)).toBeInTheDocument();
    expect(screen.getByText(/^city brief$/i)).toBeInTheDocument();
    expect(screen.getByText(/^saved & recent$/i)).toBeInTheDocument();
    // Every product destination is reachable from the home rail (was unreachable in v1).
    expect(screen.getByRole("link", { name: /^compare$/i })).toHaveAttribute("href", "/compare");
    expect(screen.getByRole("link", { name: /^rankings$/i })).toHaveAttribute("href", "/rankings");
    expect(screen.getByRole("link", { name: /^dashboard$/i })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByText(/^infos$/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^gdp$/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/^not covered$/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/801\.6b usd ppp/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^population$/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^airports$/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^ports$/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^utilities$/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^organizations$/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/^dataset explorer$/i)).toBeInTheDocument();
    expect(screen.queryByTestId("tactical-control-cluster")).not.toBeInTheDocument();
    expect(screen.queryByText(/^timeline$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/toggle timeline/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/reset camera/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^open full city dossier$/i })).toBeInTheDocument();
    // Real ON/OFF layer toggles for published layers.
    expect(screen.getAllByText(/^on$/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^off$/i).length).toBeGreaterThan(0);
  });

  it("falls back to published counts instead of dead placeholders when GDP is unavailable", () => {
    render(
      <HomeShell
        activeLayerIds={["cities"]}
        activeViewId="global-ops"
        cityResults={[]}
        featuredCities={[
          {
            cityId: "geo-323786",
            slug: "geo-323786-ankara",
            name: "Ankara",
            aliases: [],
            admin1Name: "Ankara",
            countryIso3: "TUR",
            countryIso2: "TR",
            countrySlug: "turkiye",
            population: 3517182,
            isMajorCity: true,
            latitude: 39.9334,
            longitude: 32.8597,
            boundaryStatus: "point_only",
            populationSource: "GeoNames",
            registrySource: "GeoNames",
            recordStatus: "active",
          },
        ]}
        commandCenterManifest={{
          generatedAt: "2026-03-15T00:00:00.000Z",
          defaultViewId: "global-ops",
          globalIntelligence: [],
          opsTimeline: [],
          savedViews: [{ id: "global-ops", label: "Global Ops", activeLayerIds: ["cities"], sourceLabels: ["GeoNames"] }],
          sourceSummary: [],
          datasetInventory: [],
          tacticalLayerCatalog: [],
        }}
        globeManifest={{
          generatedAt: "2026-03-15T00:00:00.000Z",
          layers: [
            {
              id: "cities",
              label: "Cities",
              family: "Political / Admin",
              sourceLabels: ["GeoNames"],
              tier: "boot",
              supportsTime: false,
              supportsCityFocus: true,
              assetPath: "/data/globe/layers/cities/vectors/current.geojson",
            },
          ],
        }}
        baseImageryCatalog={{
          generatedAt: "2026-03-15T00:00:00.000Z",
          defaultLayerId: "night-lights",
          layers: [
            {
              id: "night-lights",
              label: "Night Lights",
              family: "Satellite",
              status: "published",
              availableDates: ["2016-01-01"],
              minZoom: 0,
              maxZoom: 3,
              attribution: ["NASA Black Marble"],
              assetPathTemplate: "/data/globe/base-imagery/night-lights/{date}/{z}/{x}/{y}.png",
              defaultOpacity: 1,
            },
          ],
        }}
        citySelectionAssetPath={citySelectionAssetPath}
        activeBaseImageryLayerId="night-lights"
        searchQuery=""
        selectedCityPanel={{
          coverageShell: null,
          city: {
            cityId: "geo-323786",
            slug: "geo-323786-ankara",
            name: "Ankara",
            aliases: [],
            countryIso2: "TR",
            countryIso3: "TUR",
            countrySlug: "turkiye",
            admin1Name: "Ankara",
            admin1Code: "06",
            latitude: 39.9334,
            longitude: 32.8597,
            boundaryStatus: "point_only",
            population: 3517182,
            populationSource: "GeoNames",
            registrySource: "GeoNames",
            recordStatus: "active",
            isMajorCity: true,
          },
          workspace: {
            city: {
              cityId: "geo-323786",
              slug: "geo-323786-ankara",
              name: "Ankara",
              aliases: [],
              countryIso2: "TR",
              countryIso3: "TUR",
              countrySlug: "turkiye",
              admin1Name: "Ankara",
              admin1Code: "06",
              latitude: 39.9334,
              longitude: 32.8597,
              boundaryStatus: "point_only",
              population: 3517182,
              populationSource: "GeoNames",
              registrySource: "GeoNames",
              recordStatus: "active",
              isMajorCity: true,
            },
            summary: "Ankara source-backed command workspace",
            roleTags: [],
            coverage: {
              economicFactbook: "partial_coverage",
              investorIntel: "verified_city_presence",
              urbanIntel: "verified_city_presence",
            },
            economicFactbook: [
              {
                indicatorId: "population",
                value: 3517182,
                unit: "persons",
                status: "actual",
                source: {
                  id: "geonames",
                  name: "GeoNames",
                  updatedAt: "2026-03-20",
                  coverage: "global",
                  methodology: "Canonical city registry record",
                  url: "https://www.geonames.org/",
                },
              },
            ],
            investorIntel: [],
            urbanIntel: [],
            economicIntel: [],
            transportIntel: [],
            utilitiesIntel: [],
            telecomIntel: [],
            environmentIntel: [],
            organizationIntel: [],
            coverageBoundaryType: "admin_selection_surface",
            sourceCoverageSummary: [],
            entityCounts: { airport: 16, utility: 8, port: 0, research: 11 },
            entityHighlights: [],
            mapLayerSummary: { availableLayers: ["cities"] },
            sources: [
              {
                id: "geonames",
                name: "GeoNames",
                updatedAt: "2026-03-20T00:00:00.000Z",
                coverage: "global",
                methodology: "Canonical city registry record",
              },
            ],
          },
          entities: { entities: [], sources: [] },
          sources: { cityId: "geo-323786", sources: [] },
        }}
      />,
    );

    expect(screen.getByTestId("infos-panel")).toBeInTheDocument();
    expect(screen.queryByText(/^not covered$/i)).not.toBeInTheDocument();
    expect(screen.getAllByText(/^16$/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^8$/i).length).toBeGreaterThan(0);
  });

  it("renders GDP from the canonical city brief sections when legacy buckets are empty", () => {
    render(
      <HomeShell
        activeLayerIds={["cities"]}
        activeViewId="global-ops"
        cityResults={[]}
        featuredCities={[
          {
            cityId: "geo-745044",
            slug: "geo-745044-istanbul",
            name: "Istanbul",
            aliases: [],
            admin1Name: "Istanbul",
            countryIso3: "TUR",
            countryIso2: "TR",
            countrySlug: "turkiye",
            population: 15701602,
            isMajorCity: true,
            latitude: 41.0082,
            longitude: 28.9784,
            boundaryStatus: "point_only",
            populationSource: "GeoNames",
            registrySource: "GeoNames",
            recordStatus: "active",
          },
        ]}
        commandCenterManifest={{
          generatedAt: "2026-03-15T00:00:00.000Z",
          defaultViewId: "global-ops",
          globalIntelligence: [],
          opsTimeline: [],
          savedViews: [{ id: "global-ops", label: "Global Ops", activeLayerIds: ["cities"], sourceLabels: ["GeoNames"] }],
          sourceSummary: [],
          datasetInventory: [],
          tacticalLayerCatalog: [],
        }}
        globeManifest={{
          generatedAt: "2026-03-15T00:00:00.000Z",
          layers: [
            {
              id: "cities",
              label: "Cities",
              family: "Political / Admin",
              sourceLabels: ["GeoNames"],
              tier: "boot",
              supportsTime: false,
              supportsCityFocus: true,
              assetPath: "/data/globe/layers/cities/vectors/current.geojson",
            },
          ],
        }}
        baseImageryCatalog={{
          generatedAt: "2026-03-15T00:00:00.000Z",
          defaultLayerId: "night-lights",
          layers: [
            {
              id: "night-lights",
              label: "Night Lights",
              family: "Satellite",
              status: "published",
              availableDates: ["2016-01-01"],
              minZoom: 0,
              maxZoom: 3,
              attribution: ["NASA Black Marble"],
              assetPathTemplate: "/data/globe/base-imagery/night-lights/{date}/{z}/{x}/{y}.png",
              defaultOpacity: 1,
            },
          ],
        }}
        citySelectionAssetPath={citySelectionAssetPath}
        activeBaseImageryLayerId="night-lights"
        searchQuery=""
        selectedCityPanel={{
          coverageShell: null,
          city: {
            cityId: "geo-745044",
            slug: "geo-745044-istanbul",
            name: "Istanbul",
            aliases: [],
            countryIso2: "TR",
            countryIso3: "TUR",
            countrySlug: "turkiye",
            admin1Name: "Istanbul",
            admin1Code: "34",
            latitude: 41.0082,
            longitude: 28.9784,
            boundaryStatus: "point_only",
            population: 15701602,
            populationSource: "GeoNames",
            registrySource: "GeoNames",
            recordStatus: "active",
            isMajorCity: true,
          },
          workspace: {
            city: {
              cityId: "geo-745044",
              slug: "geo-745044-istanbul",
              name: "Istanbul",
              aliases: [],
              countryIso2: "TR",
              countryIso3: "TUR",
              countrySlug: "turkiye",
              admin1Name: "Istanbul",
              admin1Code: "34",
              latitude: 41.0082,
              longitude: 28.9784,
              boundaryStatus: "point_only",
              population: 15701602,
              populationSource: "GeoNames",
              registrySource: "GeoNames",
              recordStatus: "active",
              isMajorCity: true,
            },
            summary: "Istanbul source-backed command workspace",
            roleTags: [],
            coverage: {
              economicFactbook: "verified_exact",
              investorIntel: "verified_city_presence",
              urbanIntel: "partial_coverage",
            },
            economicFactbook: [],
            investorIntel: [],
            urbanIntel: [],
            economicIntel: [
              {
                indicatorId: "gdp-current-ppp",
                value: 801599000000,
                unit: "USD PPP",
                year: 2023,
                status: "actual",
                source: {
                  id: "oecd-fua-economy",
                  name: "OECD FUA Economy",
                  updatedAt: "2026-03-20",
                  coverage: "oecd_fua",
                  methodology: "Latest OECD FUA GDP PPP observation matched to a city selection surface.",
                  url: "https://www.oecd.org/",
                },
              },
            ],
            transportIntel: [],
            utilitiesIntel: [],
            telecomIntel: [],
            environmentIntel: [],
            organizationIntel: [],
            coverageBoundaryType: "admin_selection_surface",
            sourceCoverageSummary: [
              {
                label: "Boundary surface",
                value: "admin_selection_surface",
                sources: [
                  {
                    id: "natural-earth-admin1",
                    name: "Natural Earth Admin1",
                    updatedAt: "2026-03-20",
                    coverage: "admin_selection_surface",
                    methodology: "Visible administrative polygons used for selection and rendering.",
                    url: "https://www.naturalearthdata.com/",
                  },
                ],
              },
            ],
            entityCounts: {},
            entityHighlights: [],
            mapLayerSummary: { availableLayers: ["cities"] },
            sources: [
              {
                id: "geonames",
                name: "GeoNames",
                updatedAt: "2026-03-20T00:00:00.000Z",
                coverage: "global",
                methodology: "Canonical city registry record",
              },
            ],
          } as any,
          entities: { entities: [], sources: [] },
          sources: { cityId: "geo-745044", sources: [] },
        }}
      />,
    );

    expect(screen.getAllByText(/^gdp$/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/801\.6b usd ppp/i).length).toBeGreaterThan(0);
  });

  it("renders saved watchlists and recently viewed cities in the analyst rail", async () => {
    window.localStorage.setItem(
      "command-center.recent-cities",
      JSON.stringify([
        {
          cityId: "geo-323786",
          slug: "geo-323786-ankara",
          name: "Ankara",
          admin1Name: "Ankara",
          admin1Code: "06",
          countryIso2: "TR",
          countryIso3: "TUR",
          latitude: 39.9334,
          longitude: 32.8597,
          population: 3517182,
          populationSource: "GeoNames",
          registrySource: "GeoNames",
        },
      ]),
    );

    render(
      <HomeShell
        activeLayerIds={["airports", "transit-feeds"]}
        activeViewId="global-ops"
        cityResults={[]}
        featuredCities={[
          {
            cityId: "geo-745044",
            slug: "geo-745044-istanbul",
            name: "Istanbul",
            aliases: [],
            admin1Name: "Istanbul",
            countryIso3: "TUR",
            countryIso2: "TR",
            countrySlug: "turkiye",
            population: 15701602,
            isMajorCity: true,
            latitude: 41.0082,
            longitude: 28.9784,
            boundaryStatus: "point_only",
            populationSource: "GeoNames",
            registrySource: "GeoNames",
            recordStatus: "active",
          },
          {
            cityId: "geo-323786",
            slug: "geo-323786-ankara",
            name: "Ankara",
            aliases: [],
            admin1Name: "Ankara",
            countryIso3: "TUR",
            countryIso2: "TR",
            countrySlug: "turkiye",
            population: 3517182,
            isMajorCity: true,
            latitude: 39.9334,
            longitude: 32.8597,
            boundaryStatus: "point_only",
            populationSource: "GeoNames",
            registrySource: "GeoNames",
            recordStatus: "active",
          },
        ]}
        commandCenterManifest={{
          generatedAt: "2026-03-25T00:00:00.000Z",
          defaultViewId: "global-ops",
          globalIntelligence: [],
          opsTimeline: [],
          savedViews: [
            {
              id: "global-ops",
              label: "Global Ops",
              activeLayerIds: ["airports", "transit-feeds"],
              sourceLabels: ["OurAirports", "Mobility Database"],
            },
          ],
          sourceSummary: [],
          datasetInventory: [
            {
              id: "ourairports",
              label: "OurAirports",
              status: "published_to_website",
              sourceLabels: ["OurAirports"],
              detail: "Published to website.",
              websiteSurfaces: ["dataset workspace", "globe layer"],
              workspacePath: "/datasets/ourairports",
            },
            {
              id: "mobility-database",
              label: "Mobility Database",
              status: "published_to_website",
              sourceLabels: ["Mobility Database"],
              detail: "Published to website.",
              websiteSurfaces: ["dataset workspace", "globe layer"],
              workspacePath: "/datasets/mobility-database",
            },
          ],
          tacticalLayerCatalog: [],
        }}
        globeManifest={{
          generatedAt: "2026-03-25T00:00:00.000Z",
          baseImageryCatalogPath: "/data/globe/base-imagery/catalog.json",
          layers: [
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
            {
              id: "transit-feeds",
              label: "Transit Feeds",
              family: "Transport",
              sourceLabels: ["Mobility Database"],
              tier: "interactive",
              supportsTime: false,
              supportsCityFocus: true,
              assetPath: "/data/globe/layers/transit-feeds/vectors/current.geojson",
            },
            {
              id: "research",
              label: "Research Anchors",
              family: "Economic / Infrastructure",
              sourceLabels: ["ROR"],
              tier: "interactive",
              supportsTime: false,
              supportsCityFocus: true,
              assetPath: "/data/globe/layers/research/vectors/current.geojson",
            },
          ],
        }}
        baseImageryCatalog={{
          generatedAt: "2026-03-25T00:00:00.000Z",
          defaultLayerId: "night-lights",
          layers: [
            {
              id: "night-lights",
              label: "Night Lights",
              family: "Satellite",
              status: "published",
              availableDates: ["2016-01-01"],
              minZoom: 0,
              maxZoom: 3,
              attribution: ["NASA Black Marble"],
              assetPathTemplate: "/data/globe/base-imagery/night-lights/{date}/{z}/{x}/{y}.png",
              defaultOpacity: 1,
            },
          ],
        }}
        citySelectionAssetPath={citySelectionAssetPath}
        activeBaseImageryLayerId="night-lights"
        searchQuery=""
        selectedCityPanel={{
          coverageShell: null,
          city: {
            cityId: "geo-745044",
            slug: "geo-745044-istanbul",
            name: "Istanbul",
            aliases: [],
            countryIso2: "TR",
            countryIso3: "TUR",
            countrySlug: "turkiye",
            admin1Name: "Istanbul",
            admin1Code: "34",
            latitude: 41.0082,
            longitude: 28.9784,
            boundaryStatus: "point_only",
            population: 15701602,
            populationSource: "GeoNames",
            registrySource: "GeoNames",
            recordStatus: "active",
            isMajorCity: true,
          },
          workspace: {
            city: {
              cityId: "geo-745044",
              slug: "geo-745044-istanbul",
              name: "Istanbul",
              aliases: [],
              countryIso2: "TR",
              countryIso3: "TUR",
              countrySlug: "turkiye",
              admin1Name: "Istanbul",
              admin1Code: "34",
              latitude: 41.0082,
              longitude: 28.9784,
              boundaryStatus: "point_only",
              population: 15701602,
              populationSource: "GeoNames",
              registrySource: "GeoNames",
              recordStatus: "active",
              isMajorCity: true,
            },
            summary: "Istanbul source-backed command workspace",
            roleTags: [],
            coverage: {
              economicFactbook: "verified_exact",
              investorIntel: "verified_city_presence",
              urbanIntel: "verified_city_presence",
            },
            economicFactbook: [
              {
                indicatorId: "population",
                value: 15701602,
                unit: "persons",
                status: "actual",
                source: {
                  id: "geonames",
                  name: "GeoNames",
                  updatedAt: "2026-03-25",
                  coverage: "global",
                  methodology: "Canonical city registry record",
                },
              },
            ],
            investorIntel: [
              {
                indicatorId: "transit-feeds",
                value: 27,
                unit: "feeds",
                year: 2026,
                status: "actual",
                source: {
                  id: "mobility-database",
                  name: "Mobility Database",
                  updatedAt: "2026-03-25",
                  coverage: "selected_city_match",
                  methodology: "Active GTFS feeds matched to the selected city.",
                },
              },
            ],
            urbanIntel: [],
            economicIntel: [
              {
                indicatorId: "population",
                value: 15701602,
                unit: "persons",
                status: "actual",
                source: {
                  id: "geonames",
                  name: "GeoNames",
                  updatedAt: "2026-03-25",
                  coverage: "global",
                  methodology: "Canonical city registry record",
                },
              },
            ],
            transportIntel: [
              {
                indicatorId: "airports",
                value: 2,
                unit: "sites",
                year: 2026,
                status: "actual",
                source: {
                  id: "ourairports",
                  name: "OurAirports",
                  updatedAt: "2026-03-25",
                  coverage: "global",
                  methodology: "Airport registry",
                },
              },
              {
                indicatorId: "transit-feeds",
                value: 27,
                unit: "feeds",
                year: 2026,
                status: "actual",
                source: {
                  id: "mobility-database",
                  name: "Mobility Database",
                  updatedAt: "2026-03-25",
                  coverage: "selected_city_match",
                  methodology: "Active GTFS feeds matched to the selected city.",
                },
              },
            ],
            utilitiesIntel: [],
            telecomIntel: [],
            environmentIntel: [],
            organizationIntel: [
              {
                indicatorId: "organizations",
                value: 12,
                unit: "sites",
                year: 2026,
                status: "actual",
                source: {
                  id: "ror",
                  name: "ROR",
                  updatedAt: "2026-03-25",
                  coverage: "city_presence",
                  methodology: "Research organizations linked to city evidence bundles.",
                },
              },
            ],
            coverageBoundaryType: "admin_selection_surface",
            sourceCoverageSummary: [
              {
                label: "GeoNames",
                value: "verified_exact",
                sources: [
                  {
                    id: "geonames",
                    name: "GeoNames",
                    updatedAt: "2026-03-25",
                    coverage: "global",
                    methodology: "Canonical city registry record",
                  },
                ],
              },
            ],
            entityCounts: { airport: 2, research: 12 },
            entityHighlights: [],
            mapLayerSummary: { availableLayers: ["airports", "transit-feeds", "research"] },
            sources: [
              {
                id: "geonames",
                name: "GeoNames",
                updatedAt: "2026-03-25",
                coverage: "global",
                methodology: "Canonical city registry record",
              },
              {
                id: "ourairports",
                name: "OurAirports",
                updatedAt: "2026-03-25",
                coverage: "global",
                methodology: "Airport registry",
              },
              {
                id: "mobility-database",
                name: "Mobility Database",
                updatedAt: "2026-03-25",
                coverage: "selected_city_match",
                methodology: "Active GTFS feeds matched to the selected city.",
              },
            ],
          },
          entities: { entities: [], sources: [] },
          sources: { cityId: "geo-745044", sources: [] },
        }}
        watchlists={[
          {
            id: "osint-compare-set",
            label: "OSINT compare set",
            description: "Shared city-first compare basket for transport, telecom, and institutional evidence.",
            cityCount: 2,
            cityLabels: ["Istanbul", "Ankara"],
            sourceLabels: ["OurAirports", "Mobility Database", "ROR"],
          },
        ]}
      />,
    );

    expect(await screen.findByText(/^saved & recent$/i)).toBeInTheDocument();
    expect(screen.getByText(/^osint compare set$/i)).toBeInTheDocument();
    expect(screen.getByText(/^recently viewed$/i)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /^ankara/i }).length).toBeGreaterThan(0);
  });
});
