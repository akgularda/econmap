"use client";

import dynamic from "next/dynamic";

import type {
  BaseImageryCatalog,
  CityRegistryEntry,
  CitySearchIndexEntry,
  CommandCenterCityPanel,
  CommandCenterManifest,
  GlobeManifest,
} from "@/domain/types";
import { HomeStage, type SelectedCitySummary } from "@/features/home/components/home-stage";
import type { AnalystWatchlist } from "@/features/home/lib/analyst-sidebar-model";

// The 3 modals are action-gated (each renders null until its zustand flag opens) and never part of
// the home first paint, so code-split them out of the home initial chunk. ssr:false is safe — they
// render nothing server-side anyway — and required under static export for an action-gated lazy.
const LayerLegendModal = dynamic(
  () => import("@/features/home/components/modals/layer-legend-modal").then((m) => m.LayerLegendModal),
  { ssr: false },
);
const SettingsModal = dynamic(
  () => import("@/features/home/components/modals/settings-modal").then((m) => m.SettingsModal),
  { ssr: false },
);
const KeyboardShortcutsModal = dynamic(
  () =>
    import("@/features/home/components/modals/keyboard-shortcuts-modal").then(
      (m) => m.KeyboardShortcutsModal,
    ),
  { ssr: false },
);

type SelectedCityPanel = CommandCenterCityPanel | null;

export type HomeShellProps = {
  activeLayerIds: string[];
  activeBaseImageryLayerId: string;
  activeDate?: string;
  activeViewId: string;
  baseImageryCatalog: BaseImageryCatalog;
  citySelectionAssetPath: string;
  cityResults: CitySearchIndexEntry[];
  commandCenterManifest: CommandCenterManifest;
  featuredCities: CityRegistryEntry[];
  globeManifest: GlobeManifest;
  searchQuery: string;
  selectedCityPanel: SelectedCityPanel;
  selectedCitySummary?: SelectedCitySummary;
  selectedCitySlug?: string;
  watchlists?: AnalystWatchlist[];
};

export function HomeShell({
  activeLayerIds,
  activeBaseImageryLayerId,
  activeDate,
  activeViewId,
  baseImageryCatalog,
  citySelectionAssetPath,
  cityResults,
  commandCenterManifest,
  featuredCities,
  globeManifest,
  searchQuery,
  selectedCityPanel,
  selectedCitySummary,
  selectedCitySlug,
  watchlists = [],
}: HomeShellProps) {
  const activeView =
    commandCenterManifest.savedViews.find((view) => view.id === activeViewId) ??
    commandCenterManifest.savedViews.find((view) => view.id === commandCenterManifest.defaultViewId) ??
    commandCenterManifest.savedViews[0];
  const datasetWorkspaceSummary = {
    href: "/datasets",
    label: "Dataset explorer",
    meta: `${commandCenterManifest.datasetInventory.length} source workspaces`,
  };

  return (
    <main className="tactical-shell-bg min-h-screen overflow-hidden text-slate-100">
      <LayerLegendModal baseImageryCatalog={baseImageryCatalog} globeManifest={globeManifest} />
      <SettingsModal />
      <KeyboardShortcutsModal />

      <section
        data-testid="tactical-globe-stage"
        data-layout="immersive-stage"
        className="relative min-h-screen overflow-hidden"
      >
        <HomeStage
          activeLayerIds={activeLayerIds}
          activeBaseImageryLayerId={activeBaseImageryLayerId}
          activeDate={activeDate}
          baseImageryCatalog={baseImageryCatalog}
          citySelectionAssetPath={citySelectionAssetPath}
          commandCenterManifest={commandCenterManifest}
          datasetWorkspaceSummary={datasetWorkspaceSummary}
          featuredCities={featuredCities}
          globeManifest={globeManifest}
          initialCityResults={cityResults}
          initialSelectedCityPanel={selectedCityPanel}
          searchQuery={searchQuery}
          selectedCitySlug={selectedCitySlug}
          selectedCitySummary={selectedCitySummary}
          selectedViewId={activeView?.id ?? commandCenterManifest.defaultViewId}
          selectedViewLabel={activeView?.label ?? "Global Ops"}
          watchlists={watchlists}
        />
      </section>
    </main>
  );
}
