import { commandCenterCityAnalystNavigationSchema } from "@/domain/command-center-schemas";
import type {
  BaseImageryCatalog,
  CommandCenterAnalystRow,
  CommandCenterCityPanel,
  CommandCenterCityWorkspace,
  CommandCenterManifest,
  GlobeManifest,
} from "@/domain/types";

export type AnalystSidebarRowModel = {
  active?: boolean;
  detail?: string;
  href?: string;
  id: string;
  label: string;
  sourceLabels: string[];
  state: "mapped" | "documented" | "queued" | "missing";
  mappedCount: number;
  documentedCount: number;
  queuedDatasetCount: number;
};

export type AnalystSidebarSectionModel = {
  description: string;
  id: string;
  rows: AnalystSidebarRowModel[];
  title: string;
};

export type AnalystWatchlist = {
  cityCount: number;
  cityLabels: string[];
  description: string;
  href?: string;
  id: string;
  label: string;
  sourceLabels: string[];
};

export type RecentCityEntry = {
  admin1Code?: string;
  admin1Name?: string;
  cityId: string;
  countryIso2?: string;
  countryIso3: string;
  latitude: number;
  longitude: number;
  name: string;
  population?: number | null;
  populationSource?: string;
  registrySource?: string;
  slug: string;
  sourceLabel?: string;
};

export const RECENT_CITY_STORAGE_KEY = "command-center.recent-cities";

type CommandCenterAnalystSectionKey =
  | "infrastructureCategories"
  | "institutionsPublicServices"
  | "telecomConnectivity"
  | "utilitiesEnergy"
  | "logisticsTransport"
  | "environmentHazards";

type CommandCenterAnalystCategoryDefinition = {
  datasetIds?: string[];
  detail: string;
  entityTypes?: string[];
  id: string;
  label: string;
  layerIds?: string[];
  metricIds?: string[];
  metricPatterns?: RegExp[];
  section: CommandCenterAnalystSectionKey;
};

const ANALYST_CATEGORY_DEFINITIONS: CommandCenterAnalystCategoryDefinition[] = [
  {
    id: "city-boundaries",
    label: "City Boundaries",
    section: "infrastructureCategories",
    detail: "City boundary and selection-surface coverage queued from Overture Divisions.",
    datasetIds: ["overture-divisions"],
    metricPatterns: [/boundary/i, /division/i, /footprint/i],
  },
  {
    id: "civic-places-foundation",
    label: "Civic Places Foundation",
    section: "infrastructureCategories",
    detail: "Global civic and facility POI foundation queued from Overture Places.",
    datasetIds: ["overture-places"],
    metricPatterns: [/place/i, /facility/i, /amenity/i],
  },
  {
    id: "building-footprints",
    label: "Building Footprints",
    section: "infrastructureCategories",
    detail: "Built-environment footprint coverage queued from Overture Buildings.",
    datasetIds: ["overture-buildings"],
    metricPatterns: [/building/i, /footprint/i],
  },
  {
    id: "transport-network-foundation",
    label: "Transport Network Foundation",
    section: "infrastructureCategories",
    detail: "Global transport network base coverage queued from Overture Transportation and OpenStreetMap extracts.",
    datasetIds: ["overture-transportation", "geofabrik-openstreetmap"],
    metricPatterns: [/transport/i, /network/i, /road/i, /rail/i],
  },
  {
    id: "airports",
    label: "Airports",
    section: "logisticsTransport",
    detail: "Exact-site aviation assets and airport-linked city evidence.",
    datasetIds: ["ourairports"],
    entityTypes: ["airport"],
    layerIds: ["airports"],
    metricIds: ["airports"],
  },
  {
    id: "ports",
    label: "Ports",
    section: "logisticsTransport",
    detail: "Port facilities, maritime terminals, and port-linked city evidence.",
    datasetIds: ["world-port-index", "un-locode"],
    entityTypes: ["port"],
    layerIds: ["ports"],
    metricIds: ["ports"],
  },
  {
    id: "rail-hubs",
    label: "Rail Hubs",
    section: "logisticsTransport",
    detail: "Rail terminals and rail-linked city evidence.",
    datasetIds: ["un-locode"],
    entityTypes: ["rail_hub"],
    layerIds: ["rail-hubs"],
  },
  {
    id: "logistics-hubs",
    label: "Logistics Hubs",
    section: "logisticsTransport",
    detail: "Freight, distribution, and logistics node evidence.",
    datasetIds: ["un-locode"],
    entityTypes: ["logistics_hub"],
    layerIds: ["logistics-hubs"],
  },
  {
    id: "transit-feeds",
    label: "Transit Feeds",
    section: "logisticsTransport",
    detail: "GTFS/public-transit feed evidence for city transport operations.",
    datasetIds: ["mobility-database"],
    layerIds: ["transit-feeds"],
    metricIds: ["transit-feeds", "official-transit-feeds", "transit-providers"],
    metricPatterns: [/gtfs/i, /transit/i],
  },
  {
    id: "roads",
    label: "Roads",
    section: "logisticsTransport",
    detail: "Road network geometry and classified road evidence queued from Overture Transportation and OpenStreetMap extracts.",
    datasetIds: ["overture-transportation", "geofabrik-openstreetmap"],
    metricPatterns: [/road/i, /highway/i],
  },
  {
    id: "bridges",
    label: "Bridges",
    section: "logisticsTransport",
    detail: "Bridge structure evidence queued from Overture Transportation and OpenStreetMap extracts.",
    datasetIds: ["overture-transportation", "geofabrik-openstreetmap"],
    metricPatterns: [/bridge/i],
  },
  {
    id: "tunnels",
    label: "Tunnels",
    section: "logisticsTransport",
    detail: "Tunnel structure evidence queued from Overture Transportation and OpenStreetMap extracts.",
    datasetIds: ["overture-transportation", "geofabrik-openstreetmap"],
    metricPatterns: [/tunnel/i],
  },
  {
    id: "industrial-zones",
    label: "Industrial Zones",
    section: "logisticsTransport",
    detail: "Industrial land-use and manufacturing zone evidence queued from OpenStreetMap extracts.",
    datasetIds: ["geofabrik-openstreetmap"],
    metricPatterns: [/industrial/i, /factory/i],
  },
  {
    id: "special-economic-zones",
    label: "Special Economic Zones",
    section: "logisticsTransport",
    detail: "Special economic zone coverage queued from World Bank SEZ and OpenStreetMap sources.",
    datasetIds: ["world-bank-sez", "geofabrik-openstreetmap"],
    metricPatterns: [/special-economic-zone/i, /sez/i, /free-zone/i],
  },
  {
    id: "warehouses",
    label: "Warehouses",
    section: "logisticsTransport",
    detail: "Warehouse and storage facility evidence queued from Overture Buildings and OpenStreetMap extracts.",
    datasetIds: ["overture-buildings", "geofabrik-openstreetmap"],
    metricPatterns: [/warehouse/i, /storage/i],
  },
  {
    id: "fixed-broadband",
    label: "Fixed Broadband",
    section: "telecomConnectivity",
    detail: "Fixed broadband quality and city-scale fixed network evidence.",
    datasetIds: ["ookla"],
    layerIds: ["connectivity-fixed"],
    metricPatterns: [/fixed-download/i, /fixed-upload/i, /fixed-latency/i],
  },
  {
    id: "mobile-broadband",
    label: "Mobile Broadband",
    section: "telecomConnectivity",
    detail: "Mobile broadband quality and city-scale mobile network evidence.",
    datasetIds: ["ookla"],
    layerIds: ["connectivity-mobile"],
    metricPatterns: [/mobile-download/i, /mobile-upload/i, /mobile-latency/i],
  },
  {
    id: "ixps",
    label: "IXPs",
    section: "telecomConnectivity",
    detail: "Internet exchange and interconnection facility coverage queued from PeeringDB.",
    datasetIds: ["peeringdb"],
    metricPatterns: [/ixp/i, /internet-exchange/i, /peering/i],
  },
  {
    id: "fiber-backbone",
    label: "Fiber / Backbone",
    section: "telecomConnectivity",
    detail: "Backbone, fibre-route, and telecom infrastructure coverage queued from OpenStreetMap and OpenInfraMap.",
    datasetIds: ["geofabrik-openstreetmap", "openinframap"],
    metricPatterns: [/fiber/i, /fibre/i, /backbone/i, /telecom/i],
  },
  {
    id: "power-plants-utilities",
    label: "Power Plants & Utilities",
    section: "utilitiesEnergy",
    detail: "Power generation and utility asset evidence linked to the city.",
    datasetIds: ["wri-global-power-plant-database"],
    entityTypes: ["utility"],
    layerIds: ["utilities"],
    metricIds: ["utilities"],
    metricPatterns: [/utilit/i, /power/i, /generation/i, /plant/i],
  },
  {
    id: "substations",
    label: "Substations",
    section: "utilitiesEnergy",
    detail: "Substation coverage queued from OpenInfraMap and OpenStreetMap infrastructure sources.",
    datasetIds: ["openinframap", "geofabrik-openstreetmap"],
    metricPatterns: [/substation/i],
  },
  {
    id: "transmission",
    label: "Transmission",
    section: "utilitiesEnergy",
    detail: "Transmission-line and grid-corridor coverage queued from OpenInfraMap and OpenStreetMap infrastructure sources.",
    datasetIds: ["openinframap", "geofabrik-openstreetmap"],
    metricPatterns: [/transmission/i, /power-line/i, /grid/i],
  },
  {
    id: "research-anchors",
    label: "Research Anchors",
    section: "institutionsPublicServices",
    detail: "Research institutes, universities, and R&D anchor evidence.",
    datasetIds: ["research-organizations-registry"],
    entityTypes: ["research"],
    layerIds: ["research"],
    metricIds: ["organizations"],
    metricPatterns: [/research/i, /organization/i, /university/i],
  },
  {
    id: "company-presence",
    label: "Company Presence",
    section: "institutionsPublicServices",
    detail: "Legal-entity and business presence observed for the selected city.",
    datasetIds: ["gleif"],
    metricIds: ["company-presence"],
    metricPatterns: [/company-presence/i],
  },
  {
    id: "labour-market",
    label: "Labour Market",
    section: "institutionsPublicServices",
    detail: "Observed labour-force and employment coverage for the city surface.",
    datasetIds: ["eurostat", "oecd"],
    metricIds: ["employment", "labour-force", "unemployment"],
    metricPatterns: [/employment/i, /labou?r/i, /unemployment/i],
  },
  {
    id: "air-quality",
    label: "Air Quality",
    section: "environmentHazards",
    detail: "Ambient air quality observations linked to the city surface.",
    datasetIds: ["who-air-quality"],
    layerIds: ["air-quality"],
    metricIds: ["pm25", "pm10", "no2"],
  },
  {
    id: "water-stress",
    label: "Water Stress",
    section: "environmentHazards",
    detail: "Water stress and hydrology risk linked to the city surface.",
    datasetIds: ["aqueduct"],
    layerIds: ["water-stress"],
    metricIds: ["water-stress"],
  },
  {
    id: "carbon-emissions",
    label: "Carbon Emissions",
    section: "environmentHazards",
    detail: "City-scale emissions observations sourced from Carbon Monitor.",
    datasetIds: ["carbon-monitor"],
    metricIds: ["co2-emissions-ktco2-per-day"],
    metricPatterns: [/co2/i, /emission/i, /carbon/i],
  },
  {
    id: "hospitals-clinics",
    label: "Hospitals & Clinics",
    section: "institutionsPublicServices",
    detail: "Hospital and clinic facility coverage queued from Healthsites, Overture Places, and OpenStreetMap sources.",
    datasetIds: ["healthsites", "overture-places", "geofabrik-openstreetmap"],
    metricPatterns: [/hospital/i, /clinic/i, /health/i],
  },
  {
    id: "schools",
    label: "Schools",
    section: "institutionsPublicServices",
    detail: "School facility coverage queued from Overture Places and OpenStreetMap extracts.",
    datasetIds: ["overture-places", "geofabrik-openstreetmap"],
    metricPatterns: [/school/i, /education/i],
  },
  {
    id: "police",
    label: "Police",
    section: "institutionsPublicServices",
    detail: "Police facility coverage queued from Overture Places and OpenStreetMap extracts.",
    datasetIds: ["overture-places", "geofabrik-openstreetmap"],
    metricPatterns: [/police/i],
  },
  {
    id: "fire",
    label: "Fire",
    section: "institutionsPublicServices",
    detail: "Fire station coverage queued from Overture Places and OpenStreetMap extracts.",
    datasetIds: ["overture-places", "geofabrik-openstreetmap"],
    metricPatterns: [/fire/i],
  },
  {
    id: "government-facilities",
    label: "Government Facilities",
    section: "institutionsPublicServices",
    detail: "Government facility coverage queued from Overture Places and OpenStreetMap extracts.",
    datasetIds: ["overture-places", "geofabrik-openstreetmap"],
    metricPatterns: [/government/i, /civic/i, /municipal/i, /ministry/i],
  },
  {
    id: "military-public-data",
    label: "Military Public Data",
    section: "institutionsPublicServices",
    detail: "Publicly mapped military, base, and defense-facility coverage queued from OpenStreetMap extracts.",
    datasetIds: ["geofabrik-openstreetmap"],
    // /base/i removed: it false-matched unrelated indicator ids (e.g. "base station", "database");
    // queued state still derives from the dataset inventory.
    metricPatterns: [/military/i, /defen[cs]e/i, /barracks/i],
  },
];

const ANALYST_SECTION_METADATA = [
  {
    id: "dossier-sections",
    key: "dossierSections",
    title: "Dossier Sections",
    description: "City dossier jump points and section readiness.",
  },
  {
    id: "infrastructure-categories",
    key: "infrastructureCategories",
    title: "Infrastructure Categories",
    description: "High-level map coverage across infrastructure domains.",
  },
  {
    id: "institutions-public-services",
    key: "institutionsPublicServices",
    title: "Institutions / Public Services",
    description: "Research, civic, and public-service evidence coverage.",
  },
  {
    id: "telecom-connectivity",
    key: "telecomConnectivity",
    title: "Telecom / Connectivity",
    description: "Published telecom surfaces and city connectivity observations.",
  },
  {
    id: "utilities-energy",
    key: "utilitiesEnergy",
    title: "Utilities / Energy",
    description: "Power, grid, and utility asset coverage.",
  },
  {
    id: "logistics-transport",
    key: "logisticsTransport",
    title: "Logistics / Transport",
    description: "Air, port, rail, logistics, and transit coverage.",
  },
  {
    id: "environment-hazards",
    key: "environmentHazards",
    title: "Environment / Hazards",
    description: "Air, water, and environmental risk evidence.",
  },
  {
    id: "source-coverage-data-quality",
    key: "sourceCoverageDataQuality",
    title: "Source Coverage / Data Quality",
    description: "Coverage states and direct source lineage for this city.",
  },
  {
    id: "missing-coverage",
    key: "missingCoverage",
    title: "Missing Coverage / Gaps",
    description: "Explicitly tracked missing or queued evidence coverage.",
  },
] as const;

const ROW_LAYER_IDS: Record<string, string[]> = Object.fromEntries(
  ANALYST_CATEGORY_DEFINITIONS.map((definition) => [definition.id, definition.layerIds ?? []]),
);

const ROW_DATASET_IDS: Record<string, string[]> = Object.fromEntries(
  ANALYST_CATEGORY_DEFINITIONS.map((definition) => [definition.id, definition.datasetIds ?? []]),
);

function uniqueStrings(values: Array<string | undefined>) {
  return Array.from(new Set(values.filter(Boolean))) as string[];
}

function matchesMetricPattern(indicatorId: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(indicatorId));
}

function getWorkspaceAnalystMetrics(workspace: CommandCenterCityWorkspace | null) {
  if (!workspace) {
    return [];
  }

  const canonicalMetrics = [
    ...(workspace.economicIntel ?? []),
    ...(workspace.transportIntel ?? []),
    ...(workspace.utilitiesIntel ?? []),
    ...(workspace.telecomIntel ?? []),
    ...(workspace.environmentIntel ?? []),
    ...(workspace.organizationIntel ?? []),
  ];

  if (canonicalMetrics.length > 0) {
    return canonicalMetrics;
  }

  return [
    ...(workspace.economicFactbook ?? []),
    ...(workspace.investorIntel ?? []),
    ...(workspace.urbanIntel ?? []),
  ];
}

function matchesAnalystMetricDefinition(
  indicatorId: string,
  definition: CommandCenterAnalystCategoryDefinition,
) {
  if (definition.metricIds?.includes(indicatorId)) {
    return true;
  }

  if (definition.metricPatterns?.length) {
    return matchesMetricPattern(indicatorId, definition.metricPatterns);
  }

  return false;
}

function collectAnalystMetricMatches(
  workspace: CommandCenterCityWorkspace | null,
  definition: CommandCenterAnalystCategoryDefinition,
) {
  return getWorkspaceAnalystMetrics(workspace).filter((metric) =>
    matchesAnalystMetricDefinition(metric.indicatorId, definition),
  );
}

function collectAnalystEntityMatches(
  panel: CommandCenterCityPanel | null,
  workspace: CommandCenterCityWorkspace | null,
  definition: CommandCenterAnalystCategoryDefinition,
) {
  if (!definition.entityTypes?.length) {
    return [];
  }

  const entityTypeSet = new Set(definition.entityTypes);
  const entities = panel?.entities?.entities ?? workspace?.entityHighlights ?? [];
  return entities.filter((entity) => entityTypeSet.has(entity.entityType));
}

function countMappedEvidence(
  workspace: CommandCenterCityWorkspace | null,
  definition: CommandCenterAnalystCategoryDefinition,
) {
  if (!workspace) {
    return 0;
  }

  if (definition.entityTypes?.length) {
    return definition.entityTypes.reduce(
      (total, entityType) => total + (workspace.entityCounts[entityType] ?? 0),
      0,
    );
  }

  if (definition.layerIds?.length) {
    const availableLayers = new Set(workspace.mapLayerSummary.availableLayers);
    return definition.layerIds.filter((layerId) => availableLayers.has(layerId)).length;
  }

  return 0;
}

function countQueuedDatasets(
  commandCenterManifest: CommandCenterManifest,
  definition: CommandCenterAnalystCategoryDefinition,
) {
  if (!definition.datasetIds?.length) {
    return 0;
  }

  const datasetIdSet = new Set(definition.datasetIds);
  return commandCenterManifest.datasetInventory.filter(
    (dataset) => datasetIdSet.has(dataset.id) && dataset.status !== "published_to_website",
  ).length;
}

function buildAnalystRow({
  commandCenterManifest,
  definition,
  panel,
  workspace,
}: {
  commandCenterManifest: CommandCenterManifest;
  definition: CommandCenterAnalystCategoryDefinition;
  panel: CommandCenterCityPanel | null;
  workspace: CommandCenterCityWorkspace | null;
}): CommandCenterAnalystRow {
  const metricMatches = collectAnalystMetricMatches(workspace, definition);
  const entityMatches = collectAnalystEntityMatches(panel, workspace, definition);
  const mappedCount = countMappedEvidence(workspace, definition);
  const documentedCount = metricMatches.length;
  const queuedDatasetCount = countQueuedDatasets(commandCenterManifest, definition);
  const queuedDatasets = commandCenterManifest.datasetInventory.filter((dataset) =>
    definition.datasetIds?.includes(dataset.id) && dataset.status !== "published_to_website",
  );
  const sourceLabels = uniqueStrings([
    ...metricMatches.map((metric) => metric.source.name),
    ...entityMatches.flatMap((entity) => entity.sources.map((source) => source.name)),
    ...queuedDatasets.flatMap((dataset) => dataset.sourceLabels),
  ]);
  const state =
    mappedCount > 0
      ? "mapped"
      : documentedCount > 0
        ? "documented"
        : queuedDatasetCount > 0
          ? "queued"
          : "missing";

  return {
    id: definition.id,
    label: definition.label,
    state,
    mappedCount,
    documentedCount,
    queuedDatasetCount,
    sourceLabels,
    detail: definition.detail,
  };
}

function buildAnalystSection(id: string, label: string, rows: CommandCenterAnalystRow[]) {
  return { id, label, rows };
}

function summarizeAnalystSection(
  id: string,
  label: string,
  rows: CommandCenterAnalystRow[],
): CommandCenterAnalystRow {
  const mappedRows = rows.filter((row) => row.state === "mapped");
  const documentedRows = rows.filter((row) => row.state === "documented");
  const queuedRows = rows.filter((row) => row.state === "queued");
  const state =
    mappedRows.length > 0
      ? "mapped"
      : documentedRows.length > 0
        ? "documented"
        : queuedRows.length > 0
          ? "queued"
          : "missing";

  return {
    id,
    label,
    state,
    mappedCount: mappedRows.length,
    documentedCount: documentedRows.length,
    queuedDatasetCount: queuedRows.length,
    sourceLabels: uniqueStrings(rows.flatMap((row) => row.sourceLabels)),
  };
}

function getDatasetWorkspaceHref(commandCenterManifest: CommandCenterManifest, rowId: string) {
  const datasetIds = ROW_DATASET_IDS[rowId] ?? [];
  for (const datasetId of datasetIds) {
    const match = commandCenterManifest.datasetInventory.find(
      (dataset) => dataset.id === datasetId && dataset.workspacePath,
    );

    if (match?.workspacePath) {
      return match.workspacePath;
    }
  }

  return undefined;
}

export function hrefFor({
  searchQuery,
  selectedCitySlug,
  activeViewId,
  activeLayerIds,
  activeBaseImageryLayerId,
  activeDate,
}: {
  searchQuery?: string;
  selectedCitySlug?: string;
  activeViewId?: string;
  activeLayerIds: string[];
  activeBaseImageryLayerId?: string;
  activeDate?: string;
}) {
  const params = new URLSearchParams();
  if (searchQuery) params.set("q", searchQuery);
  if (selectedCitySlug) params.set("city", selectedCitySlug);
  if (activeViewId) params.set("view", activeViewId);
  if (activeLayerIds.length > 0) params.set("layers", activeLayerIds.join(","));
  if (activeBaseImageryLayerId) params.set("base", activeBaseImageryLayerId);
  if (activeDate) params.set("date", activeDate);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export function buildCommandCenterCityAnalystNavigation({
  panel,
  commandCenterManifest,
}: {
  panel: CommandCenterCityPanel | null;
  commandCenterManifest: CommandCenterManifest;
}) {
  const workspace = panel?.workspace ?? null;
  const rowsBySection = {
    infrastructureCategories: [] as ReturnType<typeof buildAnalystRow>[],
    institutionsPublicServices: [] as ReturnType<typeof buildAnalystRow>[],
    telecomConnectivity: [] as ReturnType<typeof buildAnalystRow>[],
    utilitiesEnergy: [] as ReturnType<typeof buildAnalystRow>[],
    logisticsTransport: [] as ReturnType<typeof buildAnalystRow>[],
    environmentHazards: [] as ReturnType<typeof buildAnalystRow>[],
  };

  for (const definition of ANALYST_CATEGORY_DEFINITIONS) {
    rowsBySection[definition.section].push(
      buildAnalystRow({
        commandCenterManifest,
        definition,
        panel,
        workspace,
      }),
    );
  }

  const sourceCoverageRows = (workspace?.sourceCoverageSummary ?? []).map((summary) => ({
    id: `coverage:${summary.label}`,
    label: summary.label,
    state: "documented" as const,
    mappedCount: 0,
    documentedCount: summary.sources.length || 1,
    queuedDatasetCount: 0,
    sourceLabels: uniqueStrings(summary.sources.map((source) => source.name)),
    detail: summary.value,
  }));

  const missingCoverageRows = Object.values(rowsBySection)
    .flat()
    .filter((row) => row.state === "queued" || row.state === "missing");

  const institutionsPublicServices = buildAnalystSection(
    "institutions-public-services",
    "Institutions & Public Services",
    rowsBySection.institutionsPublicServices,
  );
  const telecomConnectivity = buildAnalystSection(
    "telecom-connectivity",
    "Telecom & Connectivity",
    rowsBySection.telecomConnectivity,
  );
  const utilitiesEnergy = buildAnalystSection(
    "utilities-energy",
    "Utilities & Energy",
    rowsBySection.utilitiesEnergy,
  );
  const logisticsTransport = buildAnalystSection(
    "logistics-transport",
    "Logistics & Transport",
    rowsBySection.logisticsTransport,
  );
  const environmentHazards = buildAnalystSection(
    "environment-hazards",
    "Environment & Hazards",
    rowsBySection.environmentHazards,
  );
  const sourceCoverageDataQuality = buildAnalystSection(
    "source-coverage-data-quality",
    "Source Coverage & Data Quality",
    sourceCoverageRows,
  );
  const missingCoverage = buildAnalystSection(
    "missing-coverage",
    "Missing Coverage & Gaps",
    missingCoverageRows,
  );

  return commandCenterCityAnalystNavigationSchema.parse({
    dossierSections: buildAnalystSection("dossier-sections", "Dossier Sections", [
      summarizeAnalystSection("economic-factbook", "Economic Factbook", [
        {
          id: "economic-factbook-metrics",
          label: "Economic Factbook Metrics",
          detail: "Observed city-scale economic, labour, and population metrics.",
          state:
            (workspace?.economicIntel.length ?? 0) > 0 || (workspace?.economicFactbook.length ?? 0) > 0
              ? "documented"
              : "missing",
          mappedCount: 0,
          documentedCount: (workspace?.economicIntel.length ?? 0) || (workspace?.economicFactbook.length ?? 0),
          queuedDatasetCount: 0,
          sourceLabels: uniqueStrings(
            [
              ...(workspace?.economicIntel ?? []),
              ...(workspace?.economicFactbook ?? []),
            ].map((metric) => metric.source.name),
          ),
        },
      ]),
      summarizeAnalystSection("logistics-transport", "Logistics & Transport", logisticsTransport.rows),
      summarizeAnalystSection("utilities-energy", "Utilities & Energy", utilitiesEnergy.rows),
      summarizeAnalystSection("telecom-connectivity", "Telecom & Connectivity", telecomConnectivity.rows),
      summarizeAnalystSection("environment-hazards", "Environment & Hazards", environmentHazards.rows),
      summarizeAnalystSection(
        "institutions-public-services",
        "Institutions & Public Services",
        institutionsPublicServices.rows,
      ),
      summarizeAnalystSection(
        "source-coverage-data-quality",
        "Source Coverage & Data Quality",
        sourceCoverageDataQuality.rows,
      ),
      summarizeAnalystSection("missing-coverage-gaps", "Missing Coverage & Gaps", missingCoverage.rows),
    ]),
    infrastructureCategories: buildAnalystSection(
      "infrastructure-categories",
      "Infrastructure Categories",
      // Show this section's OWN foundation rows (boundaries, civic places, buildings, transport
      // network) rather than re-summarizing the logistics/telecom/utilities/environment sections
      // that already appear verbatim below — no more double-presented evidence.
      rowsBySection.infrastructureCategories,
    ),
    institutionsPublicServices,
    telecomConnectivity,
    utilitiesEnergy,
    logisticsTransport,
    environmentHazards,
    sourceCoverageDataQuality,
    missingCoverage,
  });
}

export function buildAnalystSidebarSections({
  activeBaseImageryLayerId,
  activeDate,
  activeLayerIds,
  activeViewId,
  commandCenterManifest,
  globeManifest,
  navigation,
  searchQuery,
  selectedCitySlug,
}: {
  activeBaseImageryLayerId: string;
  activeDate?: string;
  activeLayerIds: string[];
  activeViewId: string;
  commandCenterManifest: CommandCenterManifest;
  globeManifest: GlobeManifest;
  navigation: ReturnType<typeof buildCommandCenterCityAnalystNavigation>;
  searchQuery: string;
  selectedCitySlug?: string;
}) {
  const publishedLayerIds = new Set(globeManifest.layers.map((layer) => layer.id));

  return ANALYST_SECTION_METADATA.map((sectionMetadata) => {
    const sourceSection = navigation[sectionMetadata.key];
    const rows: AnalystSidebarRowModel[] = sourceSection.rows.map((row) => {
      const rowLayerIds = (ROW_LAYER_IDS[row.id] ?? []).filter((layerId) => publishedLayerIds.has(layerId));
      const active = rowLayerIds.length > 0 ? rowLayerIds.some((layerId) => activeLayerIds.includes(layerId)) : undefined;
      let href: string | undefined;

      if (sectionMetadata.id === "dossier-sections" && selectedCitySlug) {
        href = `/city/${selectedCitySlug}#${row.id}`;
      } else if (rowLayerIds.length > 0 && row.state !== "queued") {
        const nextLayerIds = active
          ? activeLayerIds.filter((layerId) => !rowLayerIds.includes(layerId))
          : Array.from(new Set([...activeLayerIds, ...rowLayerIds]));
        href = hrefFor({
          searchQuery,
          selectedCitySlug,
          activeViewId,
          activeLayerIds: nextLayerIds,
          activeBaseImageryLayerId,
          activeDate,
        });
      } else if (row.state === "queued") {
        href = getDatasetWorkspaceHref(commandCenterManifest, row.id);
      } else if (selectedCitySlug) {
        if (sectionMetadata.id === "source-coverage-data-quality") {
          href = `/city/${selectedCitySlug}#source-coverage-data-quality`;
        } else if (sectionMetadata.id === "missing-coverage") {
          href = `/city/${selectedCitySlug}#missing-coverage-gaps`;
        } else if (row.state === "documented") {
          href = `/city/${selectedCitySlug}`;
        }
      }

      return {
        ...row,
        active,
        href,
      };
    });

    return {
      description: sectionMetadata.description,
      id: sectionMetadata.id,
      rows,
      title: sectionMetadata.title,
    };
  });
}

export function mergeRecentCities(
  current: RecentCityEntry[],
  nextCity?: RecentCityEntry,
  limit = 6,
) {
  if (!nextCity) {
    return current.slice(0, limit);
  }

  return [
    nextCity,
    ...current.filter((city) => city.cityId !== nextCity.cityId && city.slug !== nextCity.slug),
  ].slice(0, limit);
}

/**
 * Builds a user-authored "Saved cities" watchlist from the persisted watchlist store, resolving
 * city names from the recent-cities cache where available. Returns null when nothing is saved, so
 * the sidebar only shows it once the user has saved at least one city.
 */
export function buildSavedCitiesWatchlist(
  savedCitySlugs: string[],
  recentCities: RecentCityEntry[],
): AnalystWatchlist | null {
  if (savedCitySlugs.length === 0) return null;
  const nameForSlug = (slug: string) =>
    recentCities.find((city) => city.slug === slug)?.name ?? slug;
  return {
    id: "saved-cities",
    label: "Saved cities",
    description: "Cities you have saved in this browser.",
    cityCount: savedCitySlugs.length,
    cityLabels: savedCitySlugs.slice(0, 6).map(nameForSlug),
    href: savedCitySlugs[0]
      ? hrefFor({ selectedCitySlug: savedCitySlugs[0], activeLayerIds: [] })
      : undefined,
    sourceLabels: ["Your watchlist"],
  };
}

// ---- Map layers group (v2 tactical command rail) ----

export type MapLayerToggleRow = {
  id: string;
  label: string;
  /** Layer ids this row controls (usually one). */
  layerIds: string[];
  active: boolean;
  href: string;
  sourceLabels: string[];
  state: "mapped" | "coverage-pending";
};

export type MapLayerFamily = {
  id: string;
  title: string;
  rows: MapLayerToggleRow[];
  /** Source label used for the honest coverage-pending placeholder when empty. */
  pendingSourceLabel: string;
};

export type BaseImageryOption = {
  id: string;
  label: string;
  family: string;
  active: boolean;
  href: string;
  status: string;
};

export type ImageryDateOption = {
  date: string;
  active: boolean;
  href: string;
};

export type SavedViewOption = {
  id: string;
  label: string;
  active: boolean;
  href: string;
  sourceLabels: string[];
};

/**
 * Display families for the Map layers group. The published globe-layer `family`
 * vocabulary is mapped onto these six analyst families so the rail always shows a
 * coherent, complete control group — even when a family has no published layer
 * (in which case an honest coverage-pending placeholder is rendered).
 */
const MAP_LAYER_FAMILIES: { id: string; title: string; pendingSourceLabel: string; families: string[] }[] = [
  {
    id: "borders-labels",
    title: "Borders & Labels",
    pendingSourceLabel: "Natural Earth",
    families: ["Political / Admin", "Base Earth"],
  },
  { id: "transport", title: "Transport", pendingSourceLabel: "OurAirports", families: ["Transport"] },
  {
    id: "utilities",
    title: "Utilities",
    pendingSourceLabel: "WRI Global Power Plant Database",
    families: ["Economic / Infrastructure"],
  },
  { id: "connectivity", title: "Connectivity", pendingSourceLabel: "Ookla", families: ["Connectivity"] },
  {
    id: "environment",
    title: "Environment",
    pendingSourceLabel: "WHO Air Quality",
    families: ["Atmosphere", "Hydrology", "Environmental"],
  },
  {
    id: "economy-institutions",
    title: "Economy / Institutions",
    pendingSourceLabel: "ROR",
    families: ["Signals / Detection"],
  },
];

/**
 * Partitions the published globe layers into the six Map-layers families, turning
 * each layer into a real ON/OFF toggle row whose href adds or removes the layer id
 * from `?layers` (the same add/remove pattern used by `buildAnalystSidebarSections`).
 */
export function buildMapLayerFamilies({
  globeManifest,
  activeLayerIds,
  activeViewId,
  activeBaseImageryLayerId,
  activeDate,
  searchQuery,
  selectedCitySlug,
}: {
  globeManifest: GlobeManifest;
  activeLayerIds: string[];
  activeViewId: string;
  activeBaseImageryLayerId: string;
  activeDate?: string;
  searchQuery: string;
  selectedCitySlug?: string;
}): MapLayerFamily[] {
  const familyForLayer = (layerFamily: string) => {
    const match = MAP_LAYER_FAMILIES.find((entry) => entry.families.includes(layerFamily));
    return match?.id ?? "economy-institutions";
  };

  const rowsByFamily = new Map<string, MapLayerToggleRow[]>();
  for (const layer of globeManifest.layers) {
    const familyId = familyForLayer(layer.family);
    const active = activeLayerIds.includes(layer.id);
    const nextLayerIds = active
      ? activeLayerIds.filter((id) => id !== layer.id)
      : Array.from(new Set([...activeLayerIds, layer.id]));
    const row: MapLayerToggleRow = {
      id: layer.id,
      label: layer.label,
      layerIds: [layer.id],
      active,
      href: hrefFor({
        searchQuery,
        selectedCitySlug,
        activeViewId,
        activeLayerIds: nextLayerIds,
        activeBaseImageryLayerId,
        activeDate,
      }),
      sourceLabels: layer.sourceLabels,
      state: "mapped",
    };
    const existing = rowsByFamily.get(familyId);
    if (existing) {
      existing.push(row);
    } else {
      rowsByFamily.set(familyId, [row]);
    }
  }

  return MAP_LAYER_FAMILIES.map((entry) => ({
    id: entry.id,
    title: entry.title,
    pendingSourceLabel: entry.pendingSourceLabel,
    rows: rowsByFamily.get(entry.id) ?? [],
  }));
}

/**
 * Base imagery picker options. `true-color` is excluded from the selectable set
 * (it is never offered as a base on the home surface).
 */
export function buildBaseImageryOptions({
  baseImageryLayers,
  activeBaseImageryLayerId,
  activeLayerIds,
  activeViewId,
  activeDate,
  searchQuery,
  selectedCitySlug,
}: {
  baseImageryLayers: { id: string; label: string; family: string; status: string }[];
  activeBaseImageryLayerId: string;
  activeLayerIds: string[];
  activeViewId: string;
  activeDate?: string;
  searchQuery: string;
  selectedCitySlug?: string;
}): BaseImageryOption[] {
  return baseImageryLayers
    .filter((layer) => layer.id !== "true-color")
    .map((layer) => ({
      id: layer.id,
      label: layer.label,
      family: layer.family,
      status: layer.status,
      active: layer.id === activeBaseImageryLayerId,
      href: hrefFor({
        searchQuery,
        selectedCitySlug,
        activeViewId,
        activeLayerIds,
        activeBaseImageryLayerId: layer.id,
        activeDate,
      }),
    }));
}

/**
 * Imagery date options for the active base layer — only meaningful when that base
 * layer is published and exposes available dates.
 */
export function buildImageryDateOptions({
  availableDates,
  activeDate,
  activeBaseImageryLayerId,
  activeLayerIds,
  activeViewId,
  searchQuery,
  selectedCitySlug,
}: {
  availableDates: string[];
  activeDate?: string;
  activeBaseImageryLayerId: string;
  activeLayerIds: string[];
  activeViewId: string;
  searchQuery: string;
  selectedCitySlug?: string;
}): ImageryDateOption[] {
  return availableDates.map((date) => ({
    date,
    active: date === activeDate,
    href: hrefFor({
      searchQuery,
      selectedCitySlug,
      activeViewId,
      activeLayerIds,
      activeBaseImageryLayerId,
      activeDate: date,
    }),
  }));
}

/** Saved-view switcher options from the command-center manifest. */
export function buildSavedViewOptions({
  savedViews,
  activeViewId,
  activeLayerIds,
  activeBaseImageryLayerId,
  activeDate,
  searchQuery,
  selectedCitySlug,
}: {
  savedViews: { id: string; label: string; sourceLabels: string[] }[];
  activeViewId: string;
  activeLayerIds: string[];
  activeBaseImageryLayerId: string;
  activeDate?: string;
  searchQuery: string;
  selectedCitySlug?: string;
}): SavedViewOption[] {
  return savedViews.map((view) => ({
    id: view.id,
    label: view.label,
    sourceLabels: view.sourceLabels,
    active: view.id === activeViewId,
    href: hrefFor({
      searchQuery,
      selectedCitySlug,
      activeViewId: view.id,
      activeLayerIds,
      activeBaseImageryLayerId,
      activeDate,
    }),
  }));
}

// ---- Home view resolution (shared by static page + client no-reload reader) ----

const EXCLUDED_BASE_IMAGERY_LAYER_IDS = new Set(["true-color"]);
const DEFAULT_HOMEPAGE_LAYER_IDS = ["ports"];

export type ResolvedHomeView = {
  activeLayerIds: string[];
  activeBaseImageryLayerId: string;
  activeDate?: string;
  activeViewId: string;
  activeViewLabel: string;
  selectedCitySlug?: string;
  searchQuery: string;
};

/**
 * Resolves the canonical home view (layers / base / date / view) from requested
 * URL params against the manifests, applying the same defaults the static page
 * uses. Keeping this in the model lib means the server page and the client
 * no-reload reader produce identical state for the same params.
 */
export function resolveHomeView({
  requestedLayerIds,
  requestedBaseImageryLayerId,
  requestedDate,
  requestedViewId,
  selectedCitySlug,
  searchQuery,
  isBlankHomepageSearch,
  globeManifest,
  baseImageryCatalog,
  commandCenterManifest,
  featuredCitySlug,
}: {
  requestedLayerIds: string[];
  requestedBaseImageryLayerId?: string;
  requestedDate?: string;
  requestedViewId?: string;
  selectedCitySlug?: string;
  searchQuery: string;
  isBlankHomepageSearch: boolean;
  globeManifest: GlobeManifest;
  baseImageryCatalog: BaseImageryCatalog;
  commandCenterManifest: CommandCenterManifest;
  featuredCitySlug?: string;
}): ResolvedHomeView {
  const activeView =
    commandCenterManifest.savedViews.find((view) => view.id === requestedViewId) ??
    commandCenterManifest.savedViews.find((view) => view.id === commandCenterManifest.defaultViewId) ??
    commandCenterManifest.savedViews[0];

  const availableLayerIds = new Set(globeManifest.layers.map((layer) => layer.id));
  const activeLayerIds =
    requestedLayerIds.length > 0
      ? requestedLayerIds.filter((layerId) => availableLayerIds.has(layerId))
      : DEFAULT_HOMEPAGE_LAYER_IDS;

  const availableBaseImageryLayerIds = new Set(baseImageryCatalog.layers.map((layer) => layer.id));
  const defaultBaseImageryLayerId = availableBaseImageryLayerIds.has("night-lights")
    ? "night-lights"
    : baseImageryCatalog.defaultLayerId && availableBaseImageryLayerIds.has(baseImageryCatalog.defaultLayerId)
      ? baseImageryCatalog.defaultLayerId
      : undefined;
  const isSelectable = (layerId?: string) =>
    Boolean(layerId) && !EXCLUDED_BASE_IMAGERY_LAYER_IDS.has(layerId as string);
  const activeBaseImageryLayer =
    (requestedBaseImageryLayerId &&
    isSelectable(requestedBaseImageryLayerId) &&
    availableBaseImageryLayerIds.has(requestedBaseImageryLayerId)
      ? baseImageryCatalog.layers.find((layer) => layer.id === requestedBaseImageryLayerId)
      : undefined) ??
    (defaultBaseImageryLayerId
      ? baseImageryCatalog.layers.find((layer) => layer.id === defaultBaseImageryLayerId)
      : undefined) ??
    baseImageryCatalog.layers[0];

  const activeDate =
    activeBaseImageryLayer?.status === "published"
      ? activeBaseImageryLayer.availableDates.includes(requestedDate ?? "")
        ? requestedDate
        : activeBaseImageryLayer.availableDates[0]
      : undefined;

  const resolvedSelectedCitySlug =
    selectedCitySlug ?? (isBlankHomepageSearch ? featuredCitySlug : undefined);

  return {
    activeLayerIds,
    activeBaseImageryLayerId:
      activeBaseImageryLayer?.id ?? defaultBaseImageryLayerId ?? baseImageryCatalog.defaultLayerId,
    activeDate,
    activeViewId: activeView?.id ?? commandCenterManifest.defaultViewId,
    activeViewLabel: activeView?.label ?? "Global Ops",
    selectedCitySlug: resolvedSelectedCitySlug,
    searchQuery,
  };
}
