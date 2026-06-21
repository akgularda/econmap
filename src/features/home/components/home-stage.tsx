"use client";

import { startTransition, useEffect, useMemo, useState } from "react";

import type {
  BaseImageryCatalog,
  CityRegistryEntry,
  CitySearchIndexEntry,
  CommandCenterCityPanel,
  CommandCenterManifest,
  CommandCenterCityWorkspace,
  GlobeManifest,
} from "@/domain/types";
import { TacticalMap2D, type TacticalFocusCity } from "@/features/home/components/tactical-map-2d";
import { assetUrl } from "@/lib/asset-url";
import {
  TacticalSidebar,
  type TacticalSidebarEntityRow,
  type TacticalSidebarInfrastructureRow,
  type TacticalSidebarMetricRow,
  type TacticalSidebarSearchResult,
  type TacticalSidebarSelectedCityIntel,
} from "@/features/home/components/layout/tactical-sidebar";
import { InfosPanel, type InfosPanelProps } from "@/features/home/components/layout/infos-panel";
import {
  buildAnalystSidebarSections,
  buildBaseImageryOptions,
  buildCommandCenterCityAnalystNavigation,
  buildImageryDateOptions,
  buildMapLayerFamilies,
  buildSavedCitiesWatchlist,
  buildSavedViewOptions,
  hrefFor,
  mergeRecentCities,
  resolveHomeView,
  RECENT_CITY_STORAGE_KEY,
  type AnalystWatchlist,
  type RecentCityEntry,
} from "@/features/home/lib/analyst-sidebar-model";
import { useHomeViewParams, type HomeViewParams } from "@/features/home/lib/use-home-view-params";
import { loadDossier } from "@/lib/dossier-bundle-client";
import { readLocalStorage, writeLocalStorage } from "@/lib/storage";
import { useWatchlistStore } from "@/store/watchlist-store";

type SelectedCityPanel = CommandCenterCityPanel | null;

export type SelectedCitySummary = {
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

type HomeStageProps = {
  activeLayerIds: string[];
  activeBaseImageryLayerId: string;
  activeDate?: string;
  baseImageryCatalog: BaseImageryCatalog;
  citySelectionAssetPath: string;
  commandCenterManifest: CommandCenterManifest;
  datasetWorkspaceSummary: {
    href: string;
    label: string;
    meta: string;
  };
  featuredCities: CityRegistryEntry[];
  globeManifest: GlobeManifest;
  initialCityResults: CitySearchIndexEntry[];
  initialSelectedCityPanel: SelectedCityPanel;
  searchQuery: string;
  selectedCitySlug?: string;
  selectedCitySummary?: SelectedCitySummary;
  selectedViewId: string;
  selectedViewLabel: string;
  watchlists: AnalystWatchlist[];
};

const compactNumber = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

// Cache the fetched+parsed search index in a module-level promise (mirrors getIndex() in
// dossier-bundle-client.ts) so the JSON parse happens ONCE per session instead of on every
// query batch that misses server-provided results. The AbortController only cancels the per-query
// React state update, never this shared fetch — so a cancelled query still warms the cache.
let searchIndexPromise: Promise<CitySearchIndexEntry[]> | null = null;

function getClientSearchIndex(): Promise<CitySearchIndexEntry[]> {
  if (!searchIndexPromise) {
    searchIndexPromise = fetch(assetUrl(`/data/cities/search-index.json`))
      .then((response) => (response.ok ? (response.json() as Promise<CitySearchIndexEntry[]>) : []))
      .catch(() => {
        // Don't poison the cache on a transient failure — allow a later query to retry.
        searchIndexPromise = null;
        return [];
      });
  }
  return searchIndexPromise;
}

const COVERAGE_BADGE_LABELS = {
  economicFactbook: "economic",
  investorIntel: "investor",
  urbanIntel: "urban",
} as const;

const VISIBLE_COVERAGE_STATES = new Set(["verified_exact", "verified_city_presence", "partial_coverage"]);

const ENTITY_COUNT_LABELS: Partial<Record<keyof NonNullable<CommandCenterCityWorkspace["entityCounts"]>, string>> = {
  airport: "Airports",
  company: "Companies",
  factory: "Factories",
  industrial_park: "Industrial parks",
  logistics_hub: "Logistics hubs",
  port: "Ports",
  rail_hub: "Rail hubs",
  research: "Organizations",
  utility: "Utilities",
};

const ENTITY_TYPE_LABELS: Record<string, string> = {
  airport: "Airport",
  company: "Company",
  factory: "Factory",
  industrial_park: "Industrial Park",
  logistics_hub: "Logistics Hub",
  port: "Port",
  rail_hub: "Rail Hub",
  research: "Research",
  utility: "Utility",
};

const PRESENCE_LABELS: Record<string, string> = {
  airport: "Airport",
  distribution: "Distribution",
  headquarters: "Headquarters",
  industrial_park: "Industrial Park",
  logistics_hub: "Logistics Hub",
  manufacturing: "Manufacturing",
  office: "Office",
  plant: "Plant",
  port: "Port",
  power_asset: "Power Asset",
  rail_hub: "Rail Terminal",
  regional_hq: "Regional HQ",
  research: "Research",
  warehouse: "Warehouse",
};

const CITY_INTEL_ENTITY_TYPE_PRIORITY: Record<string, number> = {
  utility: 0,
  port: 1,
  research: 2,
  rail_hub: 3,
  logistics_hub: 4,
  industrial_park: 5,
  factory: 6,
  company: 7,
  airport: 8,
};

const CITY_INTEL_AIRPORT_SUBTYPE_PRIORITY: Record<string, number> = {
  large_airport: 0,
  medium_airport: 1,
  seaplane_base: 2,
  small_airport: 3,
  heliport: 4,
};

export type CityIntelEntity = {
  entityId: string;
  entityName: string;
  entitySubtype?: string;
  entityType: string;
  exactSite: boolean;
  presenceType: string;
};

function formatMetricValue(value: number | null, unit: string) {
  if (value === null) {
    return "n/a";
  }

  const compactValue =
    Math.abs(value) >= 1_000_000_000
      ? `${(value / 1_000_000_000).toFixed(1)}B`
      : Math.abs(value) >= 1_000_000
        ? `${(value / 1_000_000).toFixed(1)}M`
        : Math.abs(value) >= 1_000
          ? `${(value / 1_000).toFixed(1)}K`
          : value.toLocaleString("en-US");

  return `${compactValue} ${unit}`.trim();
}

function countryCodeToFlagEmoji(countryIso2?: string) {
  if (!countryIso2 || countryIso2.length !== 2) {
    return String.fromCodePoint(0x1f3f3);
  }

  return countryIso2
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

function getAdminBadgeLabel(admin1Name?: string | null, admin1Code?: string | null) {
  if (admin1Code) {
    return admin1Code.toUpperCase();
  }

  if (!admin1Name) {
    return "ADM";
  }

  const parts = admin1Name
    .split(/[\s/-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase());

  return parts.join("") || "ADM";
}

function formatIndicatorLabel(indicatorId: string) {
  if (indicatorId === "population") {
    return "Population";
  }

  if (/(^|-)gdp($|-)|gross-domestic|economic-output/i.test(indicatorId)) {
    return "GDP";
  }

  if (indicatorId === "telecom") {
    return "Telecom";
  }

  if (indicatorId === "environment") {
    return "Environment";
  }

  if (indicatorId === "organizations") {
    return "Organizations";
  }

  if (indicatorId === "ports") {
    return "Ports";
  }

  if (indicatorId === "utilities") {
    return "Utilities";
  }

  return indicatorId
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getCanonicalCityBriefMetrics(workspace: CommandCenterCityWorkspace | null) {
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

function getPrioritizedCityBriefMetrics(workspace: CommandCenterCityWorkspace | null) {
  const canonicalMetrics = getCanonicalCityBriefMetrics(workspace);

  if (canonicalMetrics.length === 0) {
    return [];
  }

  const priorityMatchers = [
    (indicatorId: string) => indicatorId === "population",
    (indicatorId: string) => /(^|-)gdp($|-)|gross-domestic|economic-output/i.test(indicatorId),
    (indicatorId: string) => indicatorId === "telecom",
    (indicatorId: string) => indicatorId === "environment",
    (indicatorId: string) => indicatorId === "organizations",
  ];

  const prioritizedMetrics: typeof canonicalMetrics = [];
  const usedIndexes = new Set<number>();

  priorityMatchers.forEach((matchesPriority) => {
    const matchingMetricIndex = canonicalMetrics.findIndex(
      (metric, index) => !usedIndexes.has(index) && matchesPriority(metric.indicatorId),
    );

    if (matchingMetricIndex === -1) {
      return;
    }

    prioritizedMetrics.push(canonicalMetrics[matchingMetricIndex]);
    usedIndexes.add(matchingMetricIndex);
  });

  canonicalMetrics.forEach((metric, index) => {
    if (!usedIndexes.has(index)) {
      prioritizedMetrics.push(metric);
    }
  });

  return prioritizedMetrics;
}

function sortCityIntelEntities<T extends CityIntelEntity>(entities: T[]) {
  return [...entities].sort((left, right) => {
    const typePriority =
      (CITY_INTEL_ENTITY_TYPE_PRIORITY[left.entityType] ?? Number.MAX_SAFE_INTEGER) -
      (CITY_INTEL_ENTITY_TYPE_PRIORITY[right.entityType] ?? Number.MAX_SAFE_INTEGER);

    if (typePriority !== 0) {
      return typePriority;
    }

    if (left.entityType === "airport" && right.entityType === "airport") {
      const subtypePriority =
        (CITY_INTEL_AIRPORT_SUBTYPE_PRIORITY[left.entitySubtype ?? ""] ?? Number.MAX_SAFE_INTEGER) -
        (CITY_INTEL_AIRPORT_SUBTYPE_PRIORITY[right.entitySubtype ?? ""] ?? Number.MAX_SAFE_INTEGER);

      if (subtypePriority !== 0) {
        return subtypePriority;
      }
    }

    if (left.exactSite !== right.exactSite) {
      return left.exactSite ? -1 : 1;
    }

    return left.entityName.localeCompare(right.entityName);
  });
}

export function pickCityIntelEntityRows<T extends CityIntelEntity>(entities: T[], limit = 4) {
  const prioritized = sortCityIntelEntities(entities);
  const picked: T[] = [];
  const usedEntityTypes = new Set<string>();
  const pickedEntityIds = new Set<string>();

  for (const entity of prioritized) {
    if (usedEntityTypes.has(entity.entityType)) {
      continue;
    }

    picked.push(entity);
    usedEntityTypes.add(entity.entityType);
    pickedEntityIds.add(entity.entityId);

    if (picked.length >= limit) {
      return picked;
    }
  }

  for (const entity of prioritized) {
    if (pickedEntityIds.has(entity.entityId)) {
      continue;
    }

    picked.push(entity);
    pickedEntityIds.add(entity.entityId);

    if (picked.length >= limit) {
      break;
    }
  }

  return picked;
}

function toSelectedCitySummary(
  city: CityRegistryEntry | SelectedCitySummary | undefined,
): SelectedCitySummary | undefined {
  if (!city) {
    return undefined;
  }

  return {
    admin1Code: city.admin1Code,
    admin1Name: city.admin1Name,
    cityId: city.cityId,
    countryIso2: city.countryIso2,
    countryIso3: city.countryIso3,
    latitude: city.latitude,
    longitude: city.longitude,
    name: city.name,
    population: city.population,
    populationSource: city.populationSource,
    registrySource: city.registrySource,
    slug: city.slug,
    sourceLabel: "sourceLabel" in city ? city.sourceLabel : undefined,
  };
}

function getSelectedCityFocus(
  selectedCityPanel: SelectedCityPanel,
  selectedCitySummary?: SelectedCitySummary,
): TacticalFocusCity | undefined {
  const city = selectedCityPanel?.city ?? selectedCitySummary;
  if (!city) {
    return undefined;
  }

  return {
    cityId: city.cityId,
    latitude: city.latitude,
    longitude: city.longitude,
    name: city.name,
    slug: city.slug,
  };
}

function findGdpMetric(selectedCityPanel: SelectedCityPanel) {
  if (!selectedCityPanel?.workspace) {
    return null;
  }

  const candidateMetrics = getCanonicalCityBriefMetrics(selectedCityPanel.workspace);

  const gdpMetrics = candidateMetrics.filter((metric) =>
    /(^|-)gdp($|-)|gross-domestic|economic-output/i.test(metric.indicatorId),
  );

  return gdpMetrics.sort((left, right) => {
    if (left.status !== right.status) {
      return left.status === "actual" ? -1 : 1;
    }

    return (right.year ?? 0) - (left.year ?? 0);
  })[0] ?? null;
}

function getVisibleSourceLabels(
  selectedCityPanel: SelectedCityPanel,
  selectedCitySummary?: SelectedCitySummary,
) {
  const workspaceSourceLabels = selectedCityPanel?.workspace?.sources?.map((source) => source.name) ?? [];
  const sourceCoverageLabels =
    selectedCityPanel?.workspace?.sourceCoverageSummary?.flatMap((item) =>
      item.sources.map((source) => source.name),
    ) ?? [];
  const selectedSourceLabels = selectedCityPanel?.sources?.sources?.map((source) => source.name) ?? [];
  const citySourceLabels = [
    selectedCitySummary?.sourceLabel,
    selectedCitySummary?.populationSource,
    selectedCitySummary?.registrySource,
  ].filter((sourceLabel): sourceLabel is string => Boolean(sourceLabel));

  return Array.from(
    new Set([...workspaceSourceLabels, ...sourceCoverageLabels, ...selectedSourceLabels, ...citySourceLabels]),
  ).slice(0, 8);
}

function buildInfosMetrics({
  city,
  gdpMetric,
  workspace,
}: {
  city?: SelectedCitySummary;
  gdpMetric: ReturnType<typeof findGdpMetric>;
  workspace: CommandCenterCityWorkspace | null;
}): InfosPanelProps["metrics"] {
  const metrics: InfosPanelProps["metrics"] = [];

  if (city?.population) {
    metrics.push({
      label: "Population",
      value: formatMetricValue(city.population, "persons"),
    });
  }

  if (gdpMetric?.value !== null && gdpMetric?.value !== undefined) {
    metrics.push({
      label: gdpMetric.status === "estimate" ? "GDP est." : "GDP",
      value: formatMetricValue(gdpMetric.value, gdpMetric.unit),
    });
  }

  const entityCountMetrics: Array<{ key: string; label: string }> = [
    { key: "airport", label: "Airports" },
    { key: "utility", label: "Utilities" },
    { key: "port", label: "Ports" },
    { key: "research", label: "Research" },
    { key: "logistics_hub", label: "Logistics" },
    { key: "rail_hub", label: "Rail hubs" },
  ];

  for (const metric of entityCountMetrics) {
    if (metrics.length >= 4) {
      break;
    }

    metrics.push({
      label: metric.label,
      value: (workspace?.entityCounts?.[metric.key] ?? 0).toLocaleString("en-US"),
    });
  }

  while (metrics.length < 4) {
    metrics.push({
      label: metrics.length === 0 ? "Sources" : "Signals",
      value:
        metrics.length === 0
          ? (workspace?.sources?.length ?? 0).toLocaleString("en-US")
          : (workspace?.entityHighlights?.length ?? 0).toLocaleString("en-US"),
    });
  }

  return metrics.slice(0, 4);
}

function getSelectedCityIntel({
  activeBaseImageryLayerId,
  activeDate,
  activeLayerIds,
  activeViewId,
  searchQuery,
  selectedCityPanel,
  selectedCitySummary,
  selectedCityLoading,
}: {
  activeBaseImageryLayerId: string;
  activeDate?: string;
  activeLayerIds: string[];
  activeViewId: string;
  searchQuery: string;
  selectedCityPanel: SelectedCityPanel;
  selectedCitySummary?: SelectedCitySummary;
  selectedCityLoading: boolean;
}): TacticalSidebarSelectedCityIntel {
  if (!selectedCityPanel) {
    if (selectedCityLoading) {
      return {
        kind: "selection-prompt",
        title: selectedCitySummary ? `Loading ${selectedCitySummary.name}` : "Loading city brief",
        body: "Fetching the source-backed city OSINT brief and visible source labels for the selected city.",
        sourceLabels: getVisibleSourceLabels(null, selectedCitySummary),
      };
    }

    if (selectedCitySummary) {
      return {
        kind: "selection-prompt",
        title: `${selectedCitySummary.name} brief unavailable`,
        body:
          "This city does not have a published source-backed brief in the current build. Try another selectable city or open the full workspace when available.",
        sourceLabels: getVisibleSourceLabels(null, selectedCitySummary),
      };
    }

    return {
      kind: "selection-prompt",
      title: "Select a city",
      body:
        "Search for a city or click a visible city boundary on the map to load its source-backed OSINT brief.",
      sourceLabels: ["GeoNames", "OurAirports", "World Port Index", "WRI Power Plants"],
    };
  }

  const workspace = selectedCityPanel.workspace;
  const metricRows: TacticalSidebarMetricRow[] = getPrioritizedCityBriefMetrics(workspace)
    .slice(0, 8)
    .map((metric) => ({
      label: formatIndicatorLabel(metric.indicatorId),
      sourceLabel: metric.source.name,
      value: formatMetricValue(metric.value, metric.unit),
    }));

  const infrastructureRows: TacticalSidebarInfrastructureRow[] = Object.entries(
    workspace?.entityCounts ?? {},
  )
    .filter(([, value]) => value > 0)
    .slice(0, 8)
    .map(([key, value]) => ({
      label: ENTITY_COUNT_LABELS[key as keyof typeof ENTITY_COUNT_LABELS] ?? key.replace(/_/g, " "),
      value: value.toLocaleString("en-US"),
    }));

  const entityRows: TacticalSidebarEntityRow[] = pickCityIntelEntityRows(
    (selectedCityPanel.entities?.entities ?? workspace?.entityHighlights ?? []) as CityIntelEntity[],
    4,
  ).map((entity) => ({
    entityName: entity.entityName,
    entityTypeLabel: ENTITY_TYPE_LABELS[entity.entityType] ?? entity.entityType,
    exactSite: entity.exactSite,
    presenceLabel: PRESENCE_LABELS[entity.presenceType] ?? entity.presenceType,
  }));

  const coverageBadges = workspace
    ? (Object.entries(workspace.coverage) as Array<[keyof typeof COVERAGE_BADGE_LABELS, string]>)
        .filter(([, coverageState]) => VISIBLE_COVERAGE_STATES.has(coverageState))
        .map(([coverageKey]) => COVERAGE_BADGE_LABELS[coverageKey])
    : [];
  const resolvedSelectedCitySummary = toSelectedCitySummary(selectedCityPanel.city);
  const sourceLabels = getVisibleSourceLabels(selectedCityPanel, resolvedSelectedCitySummary);

  return {
    kind: "selected-city",
    cityMeta: `${selectedCityPanel.city.admin1Name ?? "Admin region not labeled"} / ${selectedCityPanel.city.countryIso3}`,
    cityName: selectedCityPanel.city.name,
    clearHref: hrefFor({
      searchQuery,
      activeViewId,
      activeLayerIds,
      activeBaseImageryLayerId,
      activeDate,
    }),
    coverageBadges,
    entityRows,
    infrastructureRows,
    metricRows,
    slug: selectedCityPanel.city.slug,
    sourceLabels,
    summary: workspace?.summary,
    workspaceHref: `/city/${selectedCityPanel.city.slug}`,
  };
}

function getInfosPanel({
  featuredCities,
  selectedCityPanel,
  selectedCitySummary,
}: {
  featuredCities: CityRegistryEntry[];
  selectedCityPanel: SelectedCityPanel;
  selectedCitySummary?: SelectedCitySummary;
}): InfosPanelProps {
  const city =
    toSelectedCitySummary(selectedCityPanel?.city) ??
    selectedCitySummary ??
    toSelectedCitySummary(featuredCities[0]);
  const workspace = selectedCityPanel?.workspace ?? null;
  const gdpMetric = findGdpMetric(selectedCityPanel);
  const sourceLabels = getVisibleSourceLabels(selectedCityPanel, city);

  return {
    adminBadge: getAdminBadgeLabel(city?.admin1Name, city?.admin1Code),
    cityMeta: `${city?.admin1Name ?? "Admin region not labeled"} / ${city?.countryIso3 ?? "UNK"}`,
    cityName: city?.name ?? "No city selected",
    flagEmoji: countryCodeToFlagEmoji(city?.countryIso2),
    metrics: buildInfosMetrics({
      city,
      gdpMetric,
      workspace,
    }),
    sourceLabels,
    summary: workspace?.summary,
  };
}

function buildSearchResults({
  activeBaseImageryLayerId,
  activeDate,
  activeLayerIds,
  activeViewId,
  cityResults,
  searchQuery,
  selectedCitySlug,
}: {
  activeBaseImageryLayerId: string;
  activeDate?: string;
  activeLayerIds: string[];
  activeViewId: string;
  cityResults: CitySearchIndexEntry[];
  searchQuery: string;
  selectedCitySlug?: string;
}): TacticalSidebarSearchResult[] {
  return cityResults.map((city) => ({
    href: hrefFor({
      searchQuery,
      selectedCitySlug: city.slug,
      activeViewId,
      activeLayerIds,
      activeBaseImageryLayerId,
      activeDate,
    }),
    meta: `${city.admin1Name ?? "Admin region not labeled"} / ${city.countryIso3}`,
    name: city.name,
    populationLabel: city.population ? compactNumber.format(city.population) : "n/a",
    selected: city.slug === selectedCitySlug,
    slug: city.slug,
  }));
}

function buildFeaturedCityResults({
  activeBaseImageryLayerId,
  activeDate,
  activeLayerIds,
  activeViewId,
  featuredCities,
  searchQuery,
  selectedCitySlug,
}: {
  activeBaseImageryLayerId: string;
  activeDate?: string;
  activeLayerIds: string[];
  activeViewId: string;
  featuredCities: CityRegistryEntry[];
  searchQuery: string;
  selectedCitySlug?: string;
}) {
  return featuredCities.map((city) => ({
    href: hrefFor({
      searchQuery,
      selectedCitySlug: city.slug,
      activeViewId,
      activeLayerIds,
      activeBaseImageryLayerId,
      activeDate,
    }),
    meta: `${city.admin1Name ?? "Admin region not labeled"} / ${city.countryIso3}`,
    name: city.name,
    populationLabel: city.population ? compactNumber.format(city.population) : "n/a",
    selected: city.slug === selectedCitySlug,
    slug: city.slug,
  }));
}

function buildRecentCityResults({
  activeBaseImageryLayerId,
  activeDate,
  activeLayerIds,
  activeViewId,
  recentCities,
  searchQuery,
  selectedCitySlug,
}: {
  activeBaseImageryLayerId: string;
  activeDate?: string;
  activeLayerIds: string[];
  activeViewId: string;
  recentCities: RecentCityEntry[];
  searchQuery: string;
  selectedCitySlug?: string;
}) {
  return recentCities.map((city) => ({
    href: hrefFor({
      searchQuery,
      selectedCitySlug: city.slug,
      activeViewId,
      activeLayerIds,
      activeBaseImageryLayerId,
      activeDate,
    }),
    meta: `${city.admin1Name ?? "Admin region not labeled"} / ${city.countryIso3}`,
    name: city.name,
    populationLabel: city.population ? compactNumber.format(city.population) : "n/a",
    selected: city.slug === selectedCitySlug,
    slug: city.slug,
  }));
}

export function HomeStage({
  baseImageryCatalog,
  citySelectionAssetPath,
  commandCenterManifest,
  datasetWorkspaceSummary,
  featuredCities,
  globeManifest,
  initialCityResults,
  initialSelectedCityPanel,
  selectedCitySummary,
  watchlists,
}: HomeStageProps) {
  // No-reload nav: read the live `?q/?city/?layers/?base/?date/?view` params and
  // re-derive the canonical home view client-side. The static export always serves
  // the blank homepage URL (`/`), so the hydration seed is the blank request — the
  // featured-city + default-layer resolution below reproduces the server's surface,
  // and the real deep-link params are adopted from `location.search` on the client.
  const hydrationSeed: HomeViewParams = useMemo(
    () => ({
      searchQuery: "",
      selectedCitySlug: undefined,
      requestedViewId: undefined,
      requestedLayerIds: [],
      requestedBaseImageryLayerId: undefined,
      requestedDate: undefined,
      isBlankHomepageSearch: true,
    }),
    [],
  );
  const { params: viewParams, navigate } = useHomeViewParams(hydrationSeed);
  const resolvedView = resolveHomeView({
    requestedLayerIds: viewParams.requestedLayerIds,
    requestedBaseImageryLayerId: viewParams.requestedBaseImageryLayerId,
    requestedDate: viewParams.requestedDate,
    requestedViewId: viewParams.requestedViewId,
    selectedCitySlug: viewParams.selectedCitySlug,
    searchQuery: viewParams.searchQuery,
    isBlankHomepageSearch: viewParams.isBlankHomepageSearch,
    globeManifest,
    baseImageryCatalog,
    commandCenterManifest,
    featuredCitySlug: featuredCities[0]?.slug,
  });
  const activeLayerIds = resolvedView.activeLayerIds;
  const activeBaseImageryLayerId = resolvedView.activeBaseImageryLayerId;
  const activeDate = resolvedView.activeDate;
  const selectedViewId = resolvedView.activeViewId;
  const selectedViewLabel = resolvedView.activeViewLabel;
  const selectedCitySlug = resolvedView.selectedCitySlug;
  const searchQuery = resolvedView.searchQuery;

  const normalizedSearchQuery = searchQuery.trim();
  const [cityResults, setCityResults] = useState(initialCityResults);
  const [selectedCityPanel, setSelectedCityPanel] = useState<SelectedCityPanel>(initialSelectedCityPanel);
  const [recentCityEntries, setRecentCityEntries] = useState<RecentCityEntry[]>(() =>
    readLocalStorage(RECENT_CITY_STORAGE_KEY, []),
  );
  const [searchResultsLoading, setSearchResultsLoading] = useState(
    normalizedSearchQuery.length > 0 && initialCityResults.length === 0,
  );
  const [selectedCityLoading, setSelectedCityLoading] = useState(
    Boolean(selectedCitySlug) &&
      (!initialSelectedCityPanel || initialSelectedCityPanel.city.slug !== selectedCitySlug),
  );
  const savedCitySlugs = useWatchlistStore((state) => state.items);
  const savedCitiesWatchlist = buildSavedCitiesWatchlist(savedCitySlugs, recentCityEntries);

  useEffect(() => {
    if (!normalizedSearchQuery) {
      startTransition(() => {
        setCityResults(initialCityResults);
        setSearchResultsLoading(false);
      });
      return;
    }

    if (initialCityResults.length > 0) {
      startTransition(() => {
        setCityResults(initialCityResults);
        setSearchResultsLoading(false);
      });
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    startTransition(() => {
      setCityResults([]);
      setSearchResultsLoading(true);
    });

    // One fetch + one JSON.parse per session (cached module-level), then filter the in-memory array.
    void getClientSearchIndex()
      .then((allEntries) => {
        // Client-side filter matching the server-side search logic
        const normalizedQuery = normalizedSearchQuery.toLowerCase();
        return allEntries
          .filter((entry) => {
            const nameMatch = entry.name.toLowerCase().includes(normalizedQuery);
            const aliasMatch = entry.aliases?.some((alias: string) =>
              alias.toLowerCase().includes(normalizedQuery),
            );
            const countryMatch = entry.countryIso3.toLowerCase().includes(normalizedQuery);
            const adminMatch = entry.admin1Name?.toLowerCase().includes(normalizedQuery);
            return nameMatch || aliasMatch || countryMatch || adminMatch;
          })
          .slice(0, 20);
      })
      .then((nextResults) => {
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setCityResults(nextResults);
        });
      })
      .catch((error) => {
        if (cancelled || (error instanceof DOMException && error.name === "AbortError")) {
          return;
        }

        startTransition(() => {
          setCityResults([]);
        });
      })
      .finally(() => {
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setSearchResultsLoading(false);
        });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [initialCityResults, normalizedSearchQuery]);

  useEffect(() => {
    if (!selectedCitySlug) {
      startTransition(() => {
        setSelectedCityPanel(initialSelectedCityPanel);
        setSelectedCityLoading(false);
      });
      return;
    }

    if (initialSelectedCityPanel?.city.slug === selectedCitySlug) {
      startTransition(() => {
        setSelectedCityPanel(initialSelectedCityPanel);
        setSelectedCityLoading(false);
      });
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    const params = new URLSearchParams({ slug: selectedCitySlug });

    if (selectedCitySummary?.cityId) {
      params.set("cityId", selectedCitySummary.cityId);
    }

    startTransition(() => {
      setSelectedCityPanel(null);
      setSelectedCityLoading(true);
    });

    // Registry-free: derive the cityId (geo-NNNN) from the summary or the slug, then read the
    // workspace from the shared dossier bundle (one Range fetch) instead of a per-city file.
    const dossierCityId =
      selectedCitySummary?.cityId ?? selectedCitySlug.match(/^(geo-\d+)-/)?.[1] ?? selectedCitySlug;

    void loadDossier(dossierCityId)
      .then((d) => (d?.w ?? null) as SelectedCityPanel | null)
      .then((nextPanel) => {
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setSelectedCityPanel(nextPanel);
        });
      })
      .catch((error) => {
        if (cancelled || (error instanceof DOMException && error.name === "AbortError")) {
          return;
        }

        startTransition(() => {
          setSelectedCityPanel(null);
        });
      })
      .finally(() => {
        if (cancelled) {
          return;
        }

        startTransition(() => {
          setSelectedCityLoading(false);
        });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [initialSelectedCityPanel, selectedCitySlug, selectedCitySummary?.cityId]);

  const resolvedSelectedCitySummary =
    toSelectedCitySummary(selectedCityPanel?.city) ?? selectedCitySummary;
  const recentCityAdmin1Code = resolvedSelectedCitySummary?.admin1Code;
  const recentCityAdmin1Name = resolvedSelectedCitySummary?.admin1Name;
  const recentCityId = resolvedSelectedCitySummary?.cityId;
  const recentCityCountryIso2 = resolvedSelectedCitySummary?.countryIso2;
  const recentCityCountryIso3 = resolvedSelectedCitySummary?.countryIso3;
  const recentCityLatitude = resolvedSelectedCitySummary?.latitude;
  const recentCityLongitude = resolvedSelectedCitySummary?.longitude;
  const recentCityName = resolvedSelectedCitySummary?.name;
  const recentCityPopulation = resolvedSelectedCitySummary?.population;
  const recentCityPopulationSource = resolvedSelectedCitySummary?.populationSource;
  const recentCityRegistrySource = resolvedSelectedCitySummary?.registrySource;
  const recentCitySlug = resolvedSelectedCitySummary?.slug;
  const recentCitySourceLabel = resolvedSelectedCitySummary?.sourceLabel;

  useEffect(() => {
    if (
      !recentCityId ||
      !recentCityName ||
      !recentCitySlug ||
      !recentCityCountryIso3 ||
      recentCityLatitude === undefined ||
      recentCityLongitude === undefined
    ) {
      return;
    }

    const nextRecentCity = {
      admin1Code: recentCityAdmin1Code,
      admin1Name: recentCityAdmin1Name,
      cityId: recentCityId,
      countryIso2: recentCityCountryIso2,
      countryIso3: recentCityCountryIso3,
      latitude: recentCityLatitude,
      longitude: recentCityLongitude,
      name: recentCityName,
      population: recentCityPopulation,
      populationSource: recentCityPopulationSource,
      registrySource: recentCityRegistrySource,
      slug: recentCitySlug,
      sourceLabel: recentCitySourceLabel,
    };

    startTransition(() => {
      setRecentCityEntries((current) => {
        const nextEntries = mergeRecentCities(current, nextRecentCity);
        writeLocalStorage(RECENT_CITY_STORAGE_KEY, nextEntries);
        return nextEntries;
      });
    });
  }, [
    recentCityAdmin1Code,
    recentCityAdmin1Name,
    recentCityCountryIso2,
    recentCityCountryIso3,
    recentCityId,
    recentCityLatitude,
    recentCityLongitude,
    recentCityName,
    recentCityPopulation,
    recentCityPopulationSource,
    recentCityRegistrySource,
    recentCitySlug,
    recentCitySourceLabel,
  ]);

  const selectedCityFocus = getSelectedCityFocus(selectedCityPanel, resolvedSelectedCitySummary);
  const searchResults = buildSearchResults({
    activeBaseImageryLayerId,
    activeDate,
    activeLayerIds,
    activeViewId: selectedViewId,
    cityResults,
    searchQuery,
    selectedCitySlug,
  });
  const featuredCityResults = buildFeaturedCityResults({
    activeBaseImageryLayerId,
    activeDate,
    activeLayerIds,
    activeViewId: selectedViewId,
    featuredCities,
    searchQuery,
    selectedCitySlug,
  });
  const recentCityResults = buildRecentCityResults({
    activeBaseImageryLayerId,
    activeDate,
    activeLayerIds,
    activeViewId: selectedViewId,
    recentCities: recentCityEntries,
    searchQuery,
    selectedCitySlug,
  });
  const analystNavigation = buildCommandCenterCityAnalystNavigation({
    panel: selectedCityPanel,
    commandCenterManifest,
  });
  const analystSections = buildAnalystSidebarSections({
    activeBaseImageryLayerId,
    activeDate,
    activeLayerIds,
    activeViewId: selectedViewId,
    commandCenterManifest,
    globeManifest,
    navigation: analystNavigation,
    searchQuery,
    selectedCitySlug,
  });
  const mapLayerFamilies = buildMapLayerFamilies({
    globeManifest,
    activeLayerIds,
    activeViewId: selectedViewId,
    activeBaseImageryLayerId,
    activeDate,
    searchQuery,
    selectedCitySlug,
  });
  const baseImageryOptions = buildBaseImageryOptions({
    baseImageryLayers: baseImageryCatalog.layers,
    activeBaseImageryLayerId,
    activeLayerIds,
    activeViewId: selectedViewId,
    activeDate,
    searchQuery,
    selectedCitySlug,
  });
  const activeBaseImageryLayer = baseImageryCatalog.layers.find(
    (layer) => layer.id === activeBaseImageryLayerId,
  );
  const imageryDateOptions =
    activeBaseImageryLayer && activeBaseImageryLayer.status === "published"
      ? buildImageryDateOptions({
          availableDates: activeBaseImageryLayer.availableDates,
          activeDate,
          activeBaseImageryLayerId,
          activeLayerIds,
          activeViewId: selectedViewId,
          searchQuery,
          selectedCitySlug,
        })
      : [];
  const savedViewOptions = buildSavedViewOptions({
    savedViews: commandCenterManifest.savedViews,
    activeViewId: selectedViewId,
    activeLayerIds,
    activeBaseImageryLayerId,
    activeDate,
    searchQuery,
    selectedCitySlug,
  });
  const selectedCityIntel = getSelectedCityIntel({
    activeBaseImageryLayerId,
    activeDate,
    activeLayerIds,
    activeViewId: selectedViewId,
    searchQuery,
    selectedCityPanel,
    selectedCitySummary: resolvedSelectedCitySummary,
    selectedCityLoading,
  });
  const infosPanel = getInfosPanel({
    featuredCities,
    selectedCityPanel,
    selectedCitySummary: resolvedSelectedCitySummary,
  });

  // Stabilize the map's featuredCities prop identity so TacticalMap2D's update() effect doesn't
  // re-run (and re-sync MapLibre layers/camera) on every unrelated re-render (search typing,
  // recent-city writes, watchlist store updates). Rebuilt only when the underlying cities change.
  const mapFeaturedCities = useMemo(
    () =>
      featuredCities.map((city) => ({
        cityId: city.cityId,
        latitude: city.latitude,
        longitude: city.longitude,
        name: city.name,
        slug: city.slug,
        countryIso3: city.countryIso3,
      })),
    [featuredCities],
  );

  // Intercept home-relative deep links (search / layer / base / date / view
  // toggles produced by hrefFor) so they update via history.pushState instead of
  // a full GET reload. Route links (/compare, /city/..., etc.) and modified
  // clicks fall through to normal navigation.
  const handleRailClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    if (event.button !== 0) {
      return;
    }
    const anchor = (event.target as HTMLElement).closest("a");
    if (!anchor || anchor.target === "_blank") {
      return;
    }
    const href = anchor.getAttribute("href");
    if (!href) {
      return;
    }
    const [pathname] = href.split("?");
    const normalizedPath = pathname.replace(/\/+$/, "") || "/";
    if (normalizedPath !== "/") {
      return;
    }
    event.preventDefault();
    navigate(href);
  };

  // Intercept the inline city-search form (GET `/?q=...`) so search is instant.
  const handleRailSubmit = (event: React.FormEvent<HTMLDivElement>) => {
    const form = event.target as HTMLFormElement;
    if (form.tagName !== "FORM") {
      return;
    }
    const action = form.getAttribute("action") ?? "/";
    if (action.replace(/\/+$/, "") !== "") {
      return;
    }
    event.preventDefault();
    const formData = new FormData(form);
    const params = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string" && value) {
        params.set(key, value);
      }
    }
    const query = params.toString();
    navigate(query ? `/?${query}` : "/");
  };

  return (
    <>
      <div className="absolute inset-0">
        <TacticalMap2D
          activeLayerIds={activeLayerIds}
          activeBaseImageryLayerId={activeBaseImageryLayerId}
          activeDate={activeDate}
          activeViewId={selectedViewId}
          baseImageryCatalog={baseImageryCatalog}
          citySelectionAssetPath={citySelectionAssetPath}
          className="min-h-screen border-0 bg-transparent shadow-none"
          globeManifest={globeManifest}
          searchQuery={searchQuery}
          featuredCities={mapFeaturedCities}
          selectedCity={selectedCityFocus}
          selectedCitySlug={selectedCitySlug}
          surfaceClassName="min-h-screen"
        />
      </div>

      <div
        data-testid="tactical-stage-overlay"
        className="pointer-events-none relative z-20 min-h-screen p-3 lg:p-4"
      >
        <div
          onClickCapture={handleRailClick}
          onSubmitCapture={handleRailSubmit}
          className="pointer-events-auto absolute bottom-3 left-3 right-3 top-3 w-auto sm:right-auto sm:w-[340px] lg:w-[380px]"
        >
          <TacticalSidebar
            activeLayerIdsValue={activeLayerIds.join(",")}
            activeBaseImageryLayerId={activeBaseImageryLayerId}
            activeDate={activeDate}
            analystSections={analystSections}
            sections={mapLayerFamilies}
            productLinks={[]}
            baseImageryOptions={baseImageryOptions}
            imageryDateOptions={imageryDateOptions}
            savedViewOptions={savedViewOptions}
            datasetWorkspaceSummary={datasetWorkspaceSummary}
            featuredCities={featuredCityResults}
            recentCities={recentCityResults}
            searchQuery={searchQuery}
            searchResults={searchResults}
            searchResultsLoading={searchResultsLoading}
            selectedCityIntel={selectedCityIntel}
            selectedViewId={selectedViewId}
            selectedViewLabel={selectedViewLabel}
            watchlists={
              savedCitiesWatchlist ? [savedCitiesWatchlist, ...watchlists] : watchlists
            }
          />
        </div>

        <div className="pointer-events-auto absolute right-3 top-3">
          <InfosPanel {...infosPanel} />
        </div>
      </div>
    </>
  );
}
