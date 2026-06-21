import fs from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import {
  baseImageryCatalogSchema,
  cityFootprintCatalogSchema,
  cityFootprintSelectionSchema,
  commandCenterCityAnalystNavigationSchema,
  commandCenterCityWorkspaceSchema,
  commandCenterDatasetWorkspaceSchema,
  commandCenterManifestSchema,
  globeManifestSchema,
} from "@/domain/command-center-schemas";
import {
  applyCityIntelEnrichment,
  loadCityIntelEnrichmentIndex,
  loadWorldBankCountryEconomyIndex,
} from "@/lib/city-intel-enrichment";
import type {
  BaseImageryCatalog,
  CommandCenterCityAnalystNavigation,
  CityCoverageShell,
  CityFootprintCatalog,
  CityFootprintSelection,
  CommandCenterCityPanel,
  CommandCenterCityWorkspace,
  CityRegistryEntry,
  CitySearchIndexEntry,
  CityWorkspace,
  CommandCenterDatasetWorkspace,
  CommandCenterManifest,
  GlobeManifest,
} from "@/domain/types";

const COMMAND_CENTER_MANIFEST_FILE = path.join(
  process.cwd(),
  "src",
  "data",
  "generated",
  "command-center",
  "manifest.json",
);
const GLOBE_MANIFEST_FILE = path.join(process.cwd(), "public", "data", "globe", "manifest.json");
const BASE_IMAGERY_CATALOG_FILE = path.join(
  process.cwd(),
  "public",
  "data",
  "globe",
  "base-imagery",
  "catalog.json",
);
const CITY_FOOTPRINT_CATALOG_FILE = path.join(
  process.cwd(),
  "public",
  "data",
  "globe",
  "reference",
  "city-footprints",
  "catalog.json",
);
const COMMAND_CENTER_DATASETS_DIR = path.join(
  process.cwd(),
  "src",
  "data",
  "generated",
  "command-center",
  "datasets",
);
const FEATURED_CITIES_FILE = path.join(
  process.cwd(),
  "src",
  "data",
  "generated",
  "command-center",
  "featured-cities.json",
);

let cachedCommandCenterManifestPromise: Promise<CommandCenterManifest> | null = null;
let cachedGlobeManifestPromise: Promise<GlobeManifest> | null = null;
let cachedBaseImageryCatalogPromise: Promise<BaseImageryCatalog> | null = null;
let cachedCityFootprintCatalogPromise: Promise<CityFootprintCatalog> | null = null;
let cachedCityFootprintSelectionPromise: Promise<CityFootprintSelection> | null = null;
let cachedCitySearchIndexPromise: Promise<CitySearchIndexEntry[]> | null = null;
let cachedFeaturedCitiesPromise: Promise<CityRegistryEntry[]> | null = null;

const FEATURED_CITY_TARGETS = [
  { name: "Istanbul", countryIso3: "TUR" },
  { name: "Ankara", countryIso3: "TUR" },
  { name: "Rome", countryIso3: "ITA" },
  { name: "Paris", countryIso3: "FRA" },
  { name: "London", countryIso3: "GBR" },
  { name: "Berlin", countryIso3: "DEU" },
  { name: "Madrid", countryIso3: "ESP" },
  { name: "Washington", countryIso3: "USA" },
] as const;

type CommandCenterCityPanelRequest = {
  cityId?: string;
  slug?: string;
};

export type CommandCenterDatasetLayerAvailability = {
  id: string;
  label: string;
  href: string;
  surfaceType: "globe layer" | "base imagery";
  sourceLabels: string[];
};

export type CommandCenterDatasetAnalytics = {
  layerAvailability: CommandCenterDatasetLayerAvailability[];
  relatedCities: Array<
    Pick<CityRegistryEntry, "cityId" | "slug" | "name" | "admin1Name" | "countryIso3">
  >;
  coverageCountries: string[];
};

export type CommandCenterSurfaceSelectionCity = {
  cityId: string;
  slug: string;
  name: string;
  admin1Name?: string;
  countryIso3: string;
  summary?: string;
  sourceLabels: string[];
  coverageBadges: string[];
  infrastructureCount: number;
  institutionCount: number;
};

export type CommandCenterSurfaceWatchlist = {
  id: string;
  label: string;
  description: string;
  citySlugs: string[];
  sourceLabels: string[];
};

export type CommandCenterLegacySurfaceModel = {
  selectedCities: CommandCenterSurfaceSelectionCity[];
  watchlists: CommandCenterSurfaceWatchlist[];
};

const DATASET_SOURCE_ALIASES: Partial<Record<string, string[]>> = {
  aqueduct: ["WRI Aqueduct", "Aqueduct"],
  "carbon-monitor": ["Carbon Monitor"],
  eurostat: ["Eurostat", "Eurostat City Statistics"],
  geonames: ["GeoNames"],
  gleif: ["GLEIF", "GLEIF LEI"],
  ghsl: ["GHSL"],
  "jrc-global-surface-water": ["JRC Global Surface Water"],
  "mobility-database": ["Mobility Database"],
  "nasa-black-marble-night-lights": ["NASA Black Marble", "Night Lights"],
  "nasa-gibs-clouds": ["NASA GIBS", "Clouds"],
  "nasa-gibs-true-color": ["NASA GIBS", "True Color"],
  "natural-earth": ["Natural Earth"],
  "overture-buildings": ["Overture Maps", "Overture Buildings"],
  "overture-divisions": ["Overture Maps", "Overture Divisions"],
  "overture-places": ["Overture Maps", "Overture Places"],
  "overture-transportation": ["Overture Maps", "Overture Transportation"],
  oecd: ["OECD", "OECD FUA Economy", "OECD FUA Labour"],
  ookla: ["Ookla"],
  ourairports: ["OurAirports"],
  "research-organizations-registry": ["ROR", "Research Organization Registry", "Research Organizations Registry"],
  "un-locode": ["UN/LOCODE", "UN LOCODE"],
  "who-air-quality": ["WHO Air Quality"],
  "world-port-index": ["World Port Index"],
  "wri-global-power-plant-database": ["WRI Global Power Plant Database"],
};

const VISIBLE_COVERAGE_STATES = new Set([
  "verified_exact",
  "verified_city_presence",
  "partial_coverage",
]);

function uniqueStrings(values: Array<string | undefined>) {
  return Array.from(new Set(values.filter(Boolean))) as string[];
}

function shouldUseCachedArtifacts() {
  return process.env.NODE_ENV === "production";
}

function normalizeQuery(query: string) {
  return query.trim().toLowerCase();
}

function scoreSearchEntry(entry: CitySearchIndexEntry, normalizedQuery: string) {
  if (!normalizedQuery) {
    return (entry.population ?? 0) + (entry.isMajorCity ? 50000 : 0);
  }

  const aliases = entry.aliases ?? [];
  const haystacks = [entry.name, entry.admin1Name ?? "", entry.countryIso3, ...aliases].map((value) =>
    value.toLowerCase(),
  );

  // Major cities get significant boost in search ranking
  const majorCityBoost = entry.isMajorCity ? 100000 : 0;

  if (haystacks.some((value) => value === normalizedQuery)) {
    return 10_000_000 + majorCityBoost + (entry.population ?? 0);
  }

  if (haystacks.some((value) => value.startsWith(normalizedQuery))) {
    return 5_000_000 + majorCityBoost + (entry.population ?? 0);
  }

  if (haystacks.some((value) => value.includes(normalizedQuery))) {
    return 1_000_000 + majorCityBoost + (entry.population ?? 0);
  }

  return -1;
}

// Epoch marker used for empty fallbacks so the UI can tell "data not generated yet"
// apart from a real (recent) generation timestamp.
const MISSING_DATA_EPOCH = new Date(0).toISOString();

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ENOENT"
  );
}

/**
 * Read + schema-validate a generated JSON artifact, degrading to an empty-but-valid
 * surface when the file is simply absent (fresh clone before the data pipeline has
 * run). Malformed JSON / schema violations still throw.
 */
async function readGeneratedJson<S extends z.ZodTypeAny>(
  file: string,
  schema: S,
  emptyFallback: z.input<S>,
): Promise<z.output<S>> {
  try {
    const content = await fs.readFile(file, "utf-8");
    return schema.parse(JSON.parse(content)) as z.output<S>;
  } catch (error) {
    if (isMissingFileError(error)) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[command-center] generated artifact missing, using empty fallback: ${path.relative(process.cwd(), file)}`,
        );
      }
      return schema.parse(emptyFallback) as z.output<S>;
    }
    throw error;
  }
}

async function readCommandCenterManifest() {
  return readGeneratedJson(COMMAND_CENTER_MANIFEST_FILE, commandCenterManifestSchema, {
    generatedAt: MISSING_DATA_EPOCH,
    defaultViewId: "default",
    globalIntelligence: [],
    opsTimeline: [],
    savedViews: [],
    sourceSummary: [],
  });
}

async function readGlobeManifest() {
  return readGeneratedJson(GLOBE_MANIFEST_FILE, globeManifestSchema, {
    generatedAt: MISSING_DATA_EPOCH,
    layers: [],
  });
}

async function readBaseImageryCatalog() {
  return readGeneratedJson(BASE_IMAGERY_CATALOG_FILE, baseImageryCatalogSchema, {
    generatedAt: MISSING_DATA_EPOCH,
    defaultLayerId: "night-lights",
    layers: [],
  });
}

async function readCityFootprintCatalog() {
  return readGeneratedJson(CITY_FOOTPRINT_CATALOG_FILE, cityFootprintCatalogSchema, {
    generatedAt: MISSING_DATA_EPOCH,
    selectionAssetPath: "",
    cities: [],
  });
}

async function readCityFootprintSelection() {
  return readGeneratedJson(CITY_FOOTPRINT_CATALOG_FILE, cityFootprintSelectionSchema, {
    generatedAt: MISSING_DATA_EPOCH,
    selectionAssetPath: "",
  });
}

async function readDatasetWorkspace(datasetId: string) {
  const content = await fs.readFile(path.join(COMMAND_CENTER_DATASETS_DIR, `${datasetId}.json`), "utf-8");
  return commandCenterDatasetWorkspaceSchema.parse(JSON.parse(content));
}

async function readFeaturedCitiesArtifact() {
  try {
    const content = await fs.readFile(FEATURED_CITIES_FILE, "utf-8");
    return JSON.parse(content) as CityRegistryEntry[];
  } catch {
    return null;
  }
}

async function readCitySearchIndex() {
  const { loadCitySearchIndex } = await import("@/lib/city-data");
  return loadCitySearchIndex();
}

export async function loadCommandCenterManifest() {
  if (!shouldUseCachedArtifacts()) {
    return readCommandCenterManifest();
  }

  cachedCommandCenterManifestPromise ??= readCommandCenterManifest();
  return cachedCommandCenterManifestPromise;
}

export async function loadGlobeManifest() {
  if (!shouldUseCachedArtifacts()) {
    return readGlobeManifest();
  }

  cachedGlobeManifestPromise ??= readGlobeManifest();
  return cachedGlobeManifestPromise;
}

export async function loadBaseImageryCatalog() {
  if (!shouldUseCachedArtifacts()) {
    return readBaseImageryCatalog();
  }

  cachedBaseImageryCatalogPromise ??= readBaseImageryCatalog();
  return cachedBaseImageryCatalogPromise;
}

export async function loadCityFootprintCatalog() {
  if (!shouldUseCachedArtifacts()) {
    return readCityFootprintCatalog();
  }

  cachedCityFootprintCatalogPromise ??= readCityFootprintCatalog();
  return cachedCityFootprintCatalogPromise;
}

export async function loadCityFootprintSelection() {
  if (!shouldUseCachedArtifacts()) {
    return readCityFootprintSelection();
  }

  cachedCityFootprintSelectionPromise ??= readCityFootprintSelection();
  return cachedCityFootprintSelectionPromise;
}

export async function loadCommandCenterDatasetWorkspace(datasetId: string): Promise<CommandCenterDatasetWorkspace> {
  return readDatasetWorkspace(datasetId);
}

function normalizeDatasetLabel(label: string) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function getDatasetSourceVariants(workspace: CommandCenterDatasetWorkspace) {
  return new Set(
    [
      workspace.dataset.label,
      ...workspace.dataset.sourceLabels,
      ...(DATASET_SOURCE_ALIASES[workspace.dataset.id] ?? []),
    ].map(normalizeDatasetLabel),
  );
}

function hasDatasetSourceMatch(labels: string[], variants: Set<string>) {
  return labels.some((label) => variants.has(normalizeDatasetLabel(label)));
}

async function loadDatasetLayerAvailability(
  workspace: CommandCenterDatasetWorkspace,
): Promise<CommandCenterDatasetLayerAvailability[]> {
  const variants = getDatasetSourceVariants(workspace);
  const [globeManifest, baseImageryCatalog] = await Promise.all([
    loadGlobeManifest(),
    loadBaseImageryCatalog(),
  ]);

  const globeLayers = globeManifest.layers
    .filter((layer) => hasDatasetSourceMatch(layer.sourceLabels, variants))
    .map<CommandCenterDatasetLayerAvailability>((layer) => ({
      id: layer.id,
      label: layer.label,
      href: "/",
      surfaceType: "globe layer",
      sourceLabels: layer.sourceLabels,
    }));

  const baseLayers = baseImageryCatalog.layers
    .filter((layer) => hasDatasetSourceMatch(layer.attribution, variants))
    .map<CommandCenterDatasetLayerAvailability>((layer) => ({
      id: layer.id,
      label: layer.label,
      href: "/",
      surfaceType: "base imagery",
      sourceLabels: layer.attribution,
    }));

  return [...globeLayers, ...baseLayers];
}

function panelMatchesDatasetSources(
  panel: CommandCenterCityPanel,
  variants: Set<string>,
) {
  const panelSourceLabels = [
    ...(panel.workspace?.sources.map((source) => source.name) ?? []),
    ...(panel.workspace?.sourceCoverageSummary.flatMap((item) => item.sources.map((source) => source.name)) ?? []),
    ...(panel.sources?.sources.map((source) => source.name) ?? []),
    ...(panel.entities?.sources.map((source) => source.name) ?? []),
    ...(panel.entities?.entities.flatMap((entity) => entity.sources.map((source) => source.name)) ?? []),
  ];

  return hasDatasetSourceMatch(panelSourceLabels, variants);
}

async function loadDatasetRelatedCities(
  workspace: CommandCenterDatasetWorkspace,
): Promise<CommandCenterDatasetAnalytics["relatedCities"]> {
  const variants = getDatasetSourceVariants(workspace);
  const featuredCities = await loadFeaturedCommandCenterCities(8);
  const panels = await Promise.all(
    featuredCities.map((city) => loadCommandCenterCityPanel({ cityId: city.cityId, slug: city.slug })),
  );

  return panels
    .filter((panel): panel is CommandCenterCityPanel => Boolean(panel))
    .filter((panel) => panelMatchesDatasetSources(panel, variants))
    .map((panel) => ({
      cityId: panel.city.cityId,
      slug: panel.city.slug,
      name: panel.city.name,
      admin1Name: panel.city.admin1Name,
      countryIso3: panel.city.countryIso3,
    }));
}

export async function loadCommandCenterDatasetAnalytics(
  datasetId: string,
): Promise<CommandCenterDatasetAnalytics> {
  const workspace = await loadCommandCenterDatasetWorkspace(datasetId);
  const [layerAvailability, relatedCities] = await Promise.all([
    loadDatasetLayerAvailability(workspace),
    loadDatasetRelatedCities(workspace),
  ]);

  return {
    layerAvailability,
    relatedCities,
    coverageCountries: Array.from(
      new Set(relatedCities.map((city) => city.countryIso3)),
    ),
  };
}

export async function searchCommandCenterCities(query: string, limit = 12) {
  const normalizedQuery = normalizeQuery(query);
  if (!normalizedQuery) {
    return [];
  }

  if (!shouldUseCachedArtifacts()) {
    const searchIndex = await readCitySearchIndex();

    return [...searchIndex]
      .map((entry) => ({
        entry,
        score: scoreSearchEntry(entry, normalizedQuery),
      }))
      .filter(({ score }) => score >= 0)
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        return left.entry.name.localeCompare(right.entry.name);
      })
      .slice(0, limit)
      .map(({ entry }) => entry);
  }

  cachedCitySearchIndexPromise ??= readCitySearchIndex();
  const searchIndex = await cachedCitySearchIndexPromise;

  return [...searchIndex]
    .map((entry) => ({
      entry,
      score: scoreSearchEntry(entry, normalizedQuery),
    }))
    .filter(({ score }) => score >= 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.entry.name.localeCompare(right.entry.name);
    })
    .slice(0, limit)
    .map(({ entry }) => entry);
}

async function readFeaturedCommandCenterCities(limit = 8): Promise<CityRegistryEntry[]> {
  const featuredCitiesArtifact = await readFeaturedCitiesArtifact();
  if (featuredCitiesArtifact?.length) {
    return featuredCitiesArtifact.slice(0, limit);
  }

  const { loadCityWorkspace } = await import("@/lib/city-data");
  const searchIndex = shouldUseCachedArtifacts()
    ? ((cachedCitySearchIndexPromise ??= readCitySearchIndex()), await cachedCitySearchIndexPromise)
    : await readCitySearchIndex();
  const selectedEntries: CitySearchIndexEntry[] = [];
  const selectedCityIds = new Set<string>();

  for (const target of FEATURED_CITY_TARGETS) {
    const matchingEntry = searchIndex
      .filter((entry) => entry.name === target.name && entry.countryIso3 === target.countryIso3)
      .sort((left, right) => (right.population ?? 0) - (left.population ?? 0))[0];

    if (!matchingEntry || selectedCityIds.has(matchingEntry.cityId)) {
      continue;
    }

    selectedEntries.push(matchingEntry);
    selectedCityIds.add(matchingEntry.cityId);
  }

  if (selectedEntries.length < limit) {
    const fallbackEntries = searchIndex
      .filter((entry) => entry.isMajorCity && !selectedCityIds.has(entry.cityId))
      .sort((left, right) => (right.population ?? 0) - (left.population ?? 0))
      .slice(0, limit - selectedEntries.length);

    for (const entry of fallbackEntries) {
      selectedEntries.push(entry);
      selectedCityIds.add(entry.cityId);
    }
  }

  const resolvedCities = await Promise.all(
    selectedEntries.slice(0, limit).map(async (entry) => {
      const workspace = await loadCityWorkspace(entry.cityId);
      if (!workspace?.city) {
        return null;
      }

      return {
        ...workspace.city,
        isMajorCity: entry.isMajorCity ?? workspace.city.isMajorCity,
      };
    }),
  );

  return resolvedCities.filter((city): city is CityRegistryEntry => Boolean(city));
}

export async function loadFeaturedCommandCenterCities(limit = 8): Promise<CityRegistryEntry[]> {
  if (!shouldUseCachedArtifacts()) {
    return readFeaturedCommandCenterCities(limit);
  }

  cachedFeaturedCitiesPromise ??= readFeaturedCommandCenterCities(limit);
  const featuredCities = await cachedFeaturedCitiesPromise;
  return featuredCities.slice(0, limit);
}

async function resolveSelectedCity(
  request?: string | CommandCenterCityPanelRequest,
): Promise<{ city: CityRegistryEntry; workspace: CityWorkspace | null } | null> {
  if (!request) {
    return null;
  }

  const requested = typeof request === "string" ? { slug: request } : request;
  const { cityId, slug } = requested;

  if (cityId) {
    const { loadCityWorkspace } = await import("@/lib/city-data");
    const workspace = await loadCityWorkspace(cityId);
    if (workspace?.city && (!slug || workspace.city.slug === slug)) {
      return {
        city: workspace.city,
        workspace,
      };
    }
  }

  if (!slug) {
    return null;
  }

  const { findCityBySlug, loadCityWorkspace } = await import("@/lib/city-data");
  const city = await findCityBySlug(slug);
  if (!city) {
    return null;
  }

  const workspace = await loadCityWorkspace(city.cityId);
  return { city, workspace };
}

function matchesMetricPattern(indicatorId: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(indicatorId));
}

function metricKey(metric: CityWorkspace["economicFactbook"][number]) {
  return `${metric.indicatorId}:${metric.year ?? "na"}:${metric.source.id}`;
}

function partitionWorkspaceMetrics(workspace: CityWorkspace) {
  const genericMetrics = [...(workspace.investorIntel ?? []), ...(workspace.urbanIntel ?? [])];
  const transportIntel = genericMetrics.filter((metric) =>
    matchesMetricPattern(metric.indicatorId, [
      /airport/i,
      /aviation/i,
      /cargo/i,
      /freight/i,
      /logistics/i,
      /maritime/i,
      /port/i,
      /rail/i,
      /transit/i,
      /transport/i,
      /gtfs/i,
    ]),
  );
  const utilitiesIntel = genericMetrics.filter((metric) =>
    matchesMetricPattern(metric.indicatorId, [
      /electric/i,
      /energy/i,
      /generation/i,
      /grid/i,
      /power/i,
      /plant/i,
      /substation/i,
      /utilit/i,
    ]),
  );
  const telecomIntel = genericMetrics.filter((metric) =>
    matchesMetricPattern(metric.indicatorId, [
      /broadband/i,
      /connect/i,
      /coverage/i,
      /download/i,
      /fixed/i,
      /latency/i,
      /mobile/i,
      /network/i,
      /telecom/i,
      /upload/i,
    ]),
  );
  const environmentIntel = genericMetrics.filter((metric) =>
    matchesMetricPattern(metric.indicatorId, [
      /air-quality/i,
      /ambient-air/i,
      /carbon/i,
      /climate/i,
      /emission/i,
      /environment/i,
      /pm25/i,
      /pollution/i,
      /water/i,
    ]),
  );
  const organizationIntel = genericMetrics.filter((metric) =>
    matchesMetricPattern(metric.indicatorId, [
      /company/i,
      /factory/i,
      /industrial/i,
      /institution/i,
      /organization/i,
      /research/i,
      /university/i,
    ]),
  );
  const assignedMetricKeys = new Set([
    ...transportIntel,
    ...utilitiesIntel,
    ...telecomIntel,
    ...environmentIntel,
    ...organizationIntel,
  ].map(metricKey));
  const economicIntel = [
    ...(workspace.economicFactbook ?? []),
    ...genericMetrics.filter((metric) => !assignedMetricKeys.has(metricKey(metric))),
  ];

  return {
    economicIntel,
    transportIntel,
    utilitiesIntel,
    telecomIntel,
    environmentIntel,
    organizationIntel,
  };
}

function sourceCoverageValue(source: CityWorkspace["sources"][number]) {
  if (
    source.coverage === "country_to_city_proxy" ||
    /estimate/i.test(source.note ?? "") ||
    /estimate/i.test(source.methodology ?? "")
  ) {
    return "estimate";
  }

  return source.coverageState ?? source.coverage;
}

function buildSourceCoverageSummary(workspace: CityWorkspace): CommandCenterCityWorkspace["sourceCoverageSummary"] {
  const hasObservedEconomicCoverage = (workspace.economicFactbook ?? []).some(
    (metric) => metric.status === "actual" && metric.indicatorId !== "population",
  );

  return (workspace.sources ?? [])
    .filter((source) => !(hasObservedEconomicCoverage && source.coverage === "country_to_city_proxy"))
    .map((source) => ({
      label: source.name,
      value: sourceCoverageValue(source),
      sources: [source],
    }));
}

function formatCoverageKeyLabel(key: keyof CommandCenterCityWorkspace["coverage"]) {
  switch (key) {
    case "economicFactbook":
      return "Economic";
    case "investorIntel":
      return "Infrastructure";
    case "urbanIntel":
      return "Urban";
  }
}

function collectPanelSourceLabels(panel: CommandCenterCityPanel) {
  return Array.from(
    new Set(
      [
        ...(panel.workspace?.sources.map((source) => source.name) ?? []),
        ...(panel.workspace?.sourceCoverageSummary.flatMap((item) =>
          item.sources.map((source) => source.name),
        ) ?? []),
        ...(panel.sources?.sources.map((source) => source.name) ?? []),
        ...(panel.entities?.sources.map((source) => source.name) ?? []),
      ].filter(Boolean),
    ),
  );
}

function countInfrastructureAssets(workspace: CommandCenterCityWorkspace | null) {
  if (!workspace) {
    return 0;
  }

  return (workspace.entityCounts.airport ?? 0)
    + (workspace.entityCounts.port ?? 0)
    + (workspace.entityCounts.rail_hub ?? 0)
    + (workspace.entityCounts.logistics_hub ?? 0)
    + (workspace.entityCounts.utility ?? 0);
}

function countInstitutionAssets(workspace: CommandCenterCityWorkspace | null) {
  if (!workspace) {
    return 0;
  }

  return (workspace.entityCounts.research ?? 0)
    + (workspace.entityCounts.company ?? 0)
    + (workspace.entityCounts.factory ?? 0)
    + (workspace.entityCounts.industrial_park ?? 0);
}

function getWatchlistSourceLabels(globeManifest: GlobeManifest, layerIds: string[]) {
  return Array.from(
    new Set(
      globeManifest.layers
        .filter((layer) => layerIds.includes(layer.id))
        .flatMap((layer) => layer.sourceLabels),
    ),
  );
}

function normalizeCommandCenterWorkspace(
  workspace: CityWorkspace,
  coverageShell: CityCoverageShell | null,
): CommandCenterCityWorkspace {
  const {
    economicIntel,
    transportIntel,
    utilitiesIntel,
    telecomIntel,
    environmentIntel,
    organizationIntel,
  } = partitionWorkspaceMetrics(workspace);

  return commandCenterCityWorkspaceSchema.parse({
    ...workspace,
    city: {
      ...workspace.city,
      admin1Code: workspace.city.admin1Code ?? undefined,
      admin1Name: workspace.city.admin1Name ?? undefined,
      admin2Name: workspace.city.admin2Name ?? undefined,
      countryIso2: workspace.city.countryIso2 ?? undefined,
      population: workspace.city.population ?? undefined,
      populationSource: workspace.city.populationSource ?? undefined,
    },
    economicIntel,
    transportIntel,
    utilitiesIntel,
    telecomIntel,
    environmentIntel,
    organizationIntel,
    coverageBoundaryType:
      coverageShell?.boundaryStatus === "point_only" || workspace.city.boundaryStatus === "point_only"
        ? "point_only_surface"
        : "admin_selection_surface",
    sourceCoverageSummary: buildSourceCoverageSummary(workspace),
  });
}

export async function loadCommandCenterCityPanel(
  request?: string | CommandCenterCityPanelRequest,
): Promise<CommandCenterCityPanel | null> {
  const resolved = await resolveSelectedCity(request);
  if (!resolved) {
    return null;
  }

  const { city, workspace } = resolved;
  const { loadCityCoverageShell, loadCityEntities, loadCitySources } = await import("@/lib/city-data");
  const [coverageShell, entities, sources, enrichmentIndex, worldBankCountryEconomyIndex] = await Promise.all([
    loadCityCoverageShell(city.cityId),
    loadCityEntities(city.cityId),
    loadCitySources(city.cityId),
    loadCityIntelEnrichmentIndex(),
    loadWorldBankCountryEconomyIndex(),
  ]);
  const enrichedWorkspace = workspace
    ? applyCityIntelEnrichment({
        city,
        workspace,
        enrichmentEntry: enrichmentIndex.cities[city.cityId] ?? null,
        worldBankCountryEconomyIndex,
      })
    : null;

  return {
    city,
    workspace: enrichedWorkspace ? normalizeCommandCenterWorkspace(enrichedWorkspace, coverageShell) : null,
    coverageShell,
    entities,
    sources,
  };
}

export async function loadLegacyOsintSurfaceModel(): Promise<CommandCenterLegacySurfaceModel> {
  const featuredCities = await loadFeaturedCommandCenterCities(4);
  const selectedPanels = await Promise.all(
    featuredCities.map((city) => loadCommandCenterCityPanel({ cityId: city.cityId, slug: city.slug })),
  );
  const selectedCities = selectedPanels
    .filter((panel): panel is CommandCenterCityPanel => Boolean(panel?.workspace))
    .map((panel) => ({
      cityId: panel.city.cityId,
      slug: panel.city.slug,
      name: panel.city.name,
      admin1Name: panel.city.admin1Name,
      countryIso3: panel.city.countryIso3,
      summary: panel.workspace?.summary,
      sourceLabels: collectPanelSourceLabels(panel).slice(0, 6),
      coverageBadges: panel.workspace
        ? (Object.entries(panel.workspace.coverage) as Array<
            [keyof CommandCenterCityWorkspace["coverage"], string]
          >)
            .filter(([, state]) => VISIBLE_COVERAGE_STATES.has(state))
            .map(([key]) => formatCoverageKeyLabel(key))
        : [],
      infrastructureCount: countInfrastructureAssets(panel.workspace),
      institutionCount: countInstitutionAssets(panel.workspace),
    }));

  const globeManifest = await loadGlobeManifest();
  const selectedCitySlugs = selectedCities.map((city) => city.slug);
  const compareSourceLabels = Array.from(
    new Set(selectedCities.flatMap((city) => city.sourceLabels)),
  ).slice(0, 6);

  return {
    selectedCities,
    watchlists: [
      {
        id: "osint-compare-set",
        label: "OSINT compare set",
        description:
          "Shared city-first compare basket for transport, utilities, telecom, environment, and institutional evidence.",
        citySlugs: selectedCitySlugs,
        sourceLabels: compareSourceLabels,
      },
      {
        id: "infrastructure-watchlist",
        label: "Infrastructure watchlist",
        description:
          "Saved monitoring set for airports, ports, rail hubs, utilities, and telecom layers across the selected city spine.",
        citySlugs: selectedCitySlugs,
        sourceLabels: getWatchlistSourceLabels(globeManifest, [
          "airports",
          "ports",
          "rail-hubs",
          "logistics-hubs",
          "utilities",
          "connectivity-fixed",
          "connectivity-mobile",
        ]),
      },
      {
        id: "environment-watchlist",
        label: "Environment watchlist",
        description:
          "Saved monitoring set for air quality and water stress surfaces attached to the same city operating picture.",
        citySlugs: selectedCitySlugs,
        sourceLabels: getWatchlistSourceLabels(globeManifest, [
          "air-quality",
          "water-stress",
        ]),
      },
    ],
  };
}
