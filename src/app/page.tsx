import { HomeShell } from "@/features/home/components/home-shell";
import { resolveHomeView } from "@/features/home/lib/analyst-sidebar-model";
import {
  loadBaseImageryCatalog,
  loadCityFootprintCatalog,
  loadCityFootprintSelection,
  loadFeaturedCommandCenterCities,
  loadCommandCenterManifest,
  loadGlobeManifest,
} from "@/lib/command-center-home-data";
import { loadLegacyOsintSurfaceModel } from "@/lib/command-center-data";

function buildSelectedCitySummary({
  featuredCities,
  selectableCities,
  selectedCitySlug,
}: {
  featuredCities: Awaited<ReturnType<typeof loadFeaturedCommandCenterCities>>;
  selectableCities: Awaited<ReturnType<typeof loadCityFootprintCatalog>>["cities"];
  selectedCitySlug?: string;
}) {
  if (!selectedCitySlug) {
    return undefined;
  }

  const featuredCity = featuredCities.find((city) => city.slug === selectedCitySlug);
  if (featuredCity) {
    return {
      admin1Code: featuredCity.admin1Code,
      admin1Name: featuredCity.admin1Name,
      cityId: featuredCity.cityId,
      countryIso2: featuredCity.countryIso2,
      countryIso3: featuredCity.countryIso3,
      latitude: featuredCity.latitude,
      longitude: featuredCity.longitude,
      name: featuredCity.name,
      population: featuredCity.population,
      populationSource: featuredCity.populationSource,
      registrySource: featuredCity.registrySource,
      slug: featuredCity.slug,
      sourceLabel: featuredCity.populationSource ?? featuredCity.registrySource,
    };
  }

  const selectableCity = selectableCities.find((city) => city.slug === selectedCitySlug);
  if (!selectableCity || selectableCity.latitude === undefined || selectableCity.longitude === undefined) {
    return undefined;
  }

  return {
    cityId: selectableCity.cityId,
    countryIso3: selectableCity.countryIso3,
    latitude: selectableCity.latitude,
    longitude: selectableCity.longitude,
    name: selectableCity.name,
    population: selectableCity.population,
    slug: selectableCity.slug,
    sourceLabel: selectableCity.sourceLabel,
  };
}

function buildAnalystWatchlists({
  featuredCities,
  legacySurfaceModel,
}: {
  featuredCities: Awaited<ReturnType<typeof loadFeaturedCommandCenterCities>>;
  legacySurfaceModel: Awaited<ReturnType<typeof loadLegacyOsintSurfaceModel>>;
}) {
  return legacySurfaceModel.watchlists.map((watchlist) => {
    const cityLabels = watchlist.citySlugs
      .map((slug) =>
        legacySurfaceModel.selectedCities.find((city) => city.slug === slug)?.name ??
        featuredCities.find((city) => city.slug === slug)?.name,
      )
      .filter((value): value is string => Boolean(value))
      .slice(0, 3);

    return {
      id: watchlist.id,
      label: watchlist.label,
      description: watchlist.description,
      cityCount: watchlist.citySlugs.length,
      cityLabels,
      href: watchlist.citySlugs[0] ? `/?city=${watchlist.citySlugs[0]}` : undefined,
      sourceLabels: watchlist.sourceLabels,
    };
  });
}

// Static export (`output: "export"`) provides no request-time searchParams, so the
// home page renders the default analyst surface (featured city + default imagery).
// Deep-link params (?city, ?layers, ?base, ?date, ?view, ?q) are a client concern
// and are not read at build time.
export default async function Home() {
  const searchQuery = "";
  const selectedCitySlug: string | undefined = undefined;
  const requestedViewId: string | undefined = undefined;
  const requestedLayerIds: string[] = [];
  const requestedBaseImageryLayerId: string | undefined = undefined;
  const requestedDate: string | undefined = undefined;
  const isBlankHomepageSearch = true;

  const [
    commandCenterManifest,
    globeManifest,
    baseImageryCatalog,
    cityFootprintCatalog,
    cityFootprintSelection,
    featuredCities,
    legacySurfaceModel,
  ] = await Promise.all([
    loadCommandCenterManifest(),
    loadGlobeManifest(),
    loadBaseImageryCatalog(),
    loadCityFootprintCatalog(),
    loadCityFootprintSelection(),
    loadFeaturedCommandCenterCities(),
    loadLegacyOsintSurfaceModel(),
  ]);
  const resolvedView = resolveHomeView({
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
    featuredCitySlug: featuredCities[0]?.slug,
  });
  const resolvedSelectedCitySlug = resolvedView.selectedCitySlug;
  const selectedCitySummary = buildSelectedCitySummary({
    featuredCities,
    selectableCities: cityFootprintCatalog.cities,
    selectedCitySlug: resolvedSelectedCitySlug,
  });

  return (
    <HomeShell
      activeLayerIds={resolvedView.activeLayerIds}
      activeBaseImageryLayerId={resolvedView.activeBaseImageryLayerId}
      activeDate={resolvedView.activeDate}
      activeViewId={resolvedView.activeViewId}
      cityResults={[]}
      commandCenterManifest={commandCenterManifest}
      globeManifest={globeManifest}
      baseImageryCatalog={baseImageryCatalog}
      citySelectionAssetPath={cityFootprintSelection.selectionAssetPath}
      featuredCities={featuredCities}
      searchQuery={searchQuery}
      selectedCityPanel={null}
      selectedCitySummary={selectedCitySummary}
      selectedCitySlug={resolvedSelectedCitySlug}
      watchlists={buildAnalystWatchlists({ featuredCities, legacySurfaceModel })}
    />
  );
}
