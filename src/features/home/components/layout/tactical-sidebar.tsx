"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bookmark, Building2, Compass, Layers, Search } from "lucide-react";

import type { CommandCenterAnalystRowState } from "@/domain/types";
import { SidebarSection } from "@/features/home/components/layout/sidebar/sidebar-section";
import { SidebarHeader, SidebarFooter } from "@/features/home/components/layout/sidebar/sidebar-chrome";
import { WorkspaceNav } from "@/features/home/components/layout/sidebar/workspace-nav";
import { BrowseNav } from "@/features/home/components/layout/sidebar/browse-nav";
import { MapLayersGroup } from "@/features/home/components/layout/sidebar/map-layers-group";
import {
  CityBriefPanel,
  type CityBriefIntel,
} from "@/features/home/components/layout/sidebar/city-brief-panel";
import {
  SavedRecentGroup,
  type SavedRecentCityRow,
  type SavedRecentCompareSet,
} from "@/features/home/components/layout/sidebar/saved-recent-group";
import {
  CommandPalette,
  type CommandPaletteCity,
} from "@/features/home/components/layout/sidebar/command-palette";
import type {
  BaseImageryOption,
  ImageryDateOption,
  MapLayerFamily,
  SavedViewOption,
} from "@/features/home/lib/analyst-sidebar-model";
import { useTacticalGlobeStore } from "@/store/tactical-globe-store";

export type TacticalSidebarSearchResult = {
  href: string;
  meta: string;
  name: string;
  populationLabel: string;
  selected: boolean;
  slug?: string;
};

export type TacticalSidebarAnalystRow = {
  active?: boolean;
  detail?: string;
  href?: string;
  id: string;
  label: string;
  sourceLabels: string[];
  state: CommandCenterAnalystRowState;
  mappedCount: number;
  documentedCount: number;
  queuedDatasetCount: number;
};

export type TacticalSidebarAnalystSection = {
  description: string;
  id: string;
  rows: TacticalSidebarAnalystRow[];
  title: string;
};

export type TacticalSidebarMetricRow = {
  label: string;
  sourceLabel?: string;
  value: string;
};

export type TacticalSidebarInfrastructureRow = {
  label: string;
  value: string;
};

export type TacticalSidebarEntityRow = {
  entityName: string;
  entityTypeLabel: string;
  exactSite: boolean;
  presenceLabel: string;
};

export type TacticalSidebarWatchlist = {
  cityCount: number;
  cityLabels: string[];
  description: string;
  href?: string;
  id: string;
  label: string;
  sourceLabels: string[];
};

export type TacticalSidebarSelectedCityIntel =
  | {
      cityMeta: string;
      cityName: string;
      clearHref: string;
      coverageBadges: string[];
      entityRows: TacticalSidebarEntityRow[];
      infrastructureRows: TacticalSidebarInfrastructureRow[];
      kind: "selected-city";
      metricRows: TacticalSidebarMetricRow[];
      slug?: string;
      sourceLabels: string[];
      summary?: string;
      workspaceHref: string;
    }
  | {
      body: string;
      kind: "selection-prompt";
      sourceLabels: string[];
      title: string;
    };

export type TacticalSidebarProductLink = {
  href: string;
  label: string;
};

type TacticalSidebarProps = {
  activeBaseImageryLayerId: string;
  activeDate?: string;
  activeLayerIdsValue: string;
  /** Layer-coverage analyst rows (used only to derive city-brief counts). */
  analystSections?: TacticalSidebarAnalystSection[];
  /** Map-layers families with real ON/OFF toggle hrefs. */
  sections?: MapLayerFamily[];
  baseImageryOptions?: BaseImageryOption[];
  imageryDateOptions?: ImageryDateOption[];
  savedViewOptions?: SavedViewOption[];
  datasetWorkspaceSummary: {
    href: string;
    label: string;
    meta: string;
  };
  featuredCities: TacticalSidebarSearchResult[];
  /** Dynamic product links (reserved; static routes render from the shared nav). */
  productLinks?: TacticalSidebarProductLink[];
  recentCities: TacticalSidebarSearchResult[];
  searchQuery: string;
  searchResults: TacticalSidebarSearchResult[];
  searchResultsLoading?: boolean;
  selectedCityIntel: TacticalSidebarSelectedCityIntel;
  selectedViewId: string;
  selectedViewLabel: string;
  watchlists: TacticalSidebarWatchlist[];
};

function toBriefIntel(intel: TacticalSidebarSelectedCityIntel): CityBriefIntel {
  if (intel.kind === "selection-prompt") {
    return { kind: "selection-prompt", title: intel.title, body: intel.body, sourceLabels: intel.sourceLabels };
  }
  return {
    kind: "selected-city",
    slug: intel.slug,
    cityName: intel.cityName,
    cityMeta: intel.cityMeta,
    clearHref: intel.clearHref,
    coverageBadges: intel.coverageBadges,
    entityRows: intel.entityRows,
    infrastructureRows: intel.infrastructureRows,
    metricRows: intel.metricRows,
    sourceLabels: intel.sourceLabels,
    summary: intel.summary,
    workspaceHref: intel.workspaceHref,
  };
}

export function TacticalSidebar({
  activeLayerIdsValue,
  activeBaseImageryLayerId,
  activeDate,
  analystSections = [],
  sections = [],
  baseImageryOptions = [],
  imageryDateOptions = [],
  savedViewOptions = [],
  datasetWorkspaceSummary,
  featuredCities,
  recentCities,
  searchQuery,
  searchResults,
  searchResultsLoading = false,
  selectedCityIntel,
  selectedViewId,
  selectedViewLabel,
  watchlists,
}: TacticalSidebarProps) {
  const isSidebarCollapsed = useTacticalGlobeStore((state) => state.isSidebarCollapsed);
  const setSidebarCollapsed = useTacticalGlobeStore((state) => state.setSidebarCollapsed);
  const setLegendOpen = useTacticalGlobeStore((state) => state.setLegendOpen);
  const setSettingsOpen = useTacticalGlobeStore((state) => state.setSettingsOpen);
  const setShortcutsOpen = useTacticalGlobeStore((state) => state.setShortcutsOpen);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(searchQuery);

  // ⌘K / Ctrl-K opens the palette; "/" focuses the inline search field.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      } else if (event.key === "/" && !isTyping) {
        event.preventDefault();
        const input = document.getElementById("tactical-rail-search") as HTMLInputElement | null;
        input?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const analystRows = useMemo(
    () => analystSections.flatMap((section) => section.rows),
    [analystSections],
  );
  const mappedCount = analystRows.filter((row) => row.state === "mapped").length;
  const documentedCount = analystRows.filter((row) => row.state === "documented").length;
  const gapCount = analystRows.filter((row) => row.state === "queued" || row.state === "missing").length;

  const coveragePending = featuredCities.length === 0 && analystRows.length === 0;

  const paletteCities = useMemo<CommandPaletteCity[]>(() => {
    const source = searchResults.length > 0 ? searchResults : featuredCities;
    return source.slice(0, 12).map((city) => ({ href: city.href, name: city.name, meta: city.meta }));
  }, [searchResults, featuredCities]);

  const recentRows = useMemo<SavedRecentCityRow[]>(
    () =>
      recentCities.map((city) => ({
        href: city.href,
        meta: city.meta,
        name: city.name,
        populationLabel: city.populationLabel,
        selected: city.selected,
        slug: city.slug,
      })),
    [recentCities],
  );

  const compareSets = useMemo<SavedRecentCompareSet[]>(
    () =>
      watchlists.map((watchlist) => ({
        id: watchlist.id,
        label: watchlist.label,
        description: watchlist.description,
        cityCount: watchlist.cityCount,
        cityLabels: watchlist.cityLabels,
        href: watchlist.href,
      })),
    [watchlists],
  );

  const nameForSlug = useCallback(
    (slug: string) => recentCities.find((city) => city.slug === slug)?.name ?? slug,
    [recentCities],
  );

  const openPalette = useCallback(() => setPaletteOpen(true), []);

  if (isSidebarCollapsed) {
    return (
      <aside
        data-testid="tactical-command-rail"
        data-density="operator-console"
        data-geometry="hard-edge"
        data-layout="mission-console"
        data-collapsed="true"
        className="flex h-full w-14 flex-col items-center gap-3 border border-[#31362f] bg-[#101313]/97 px-2 py-3"
      >
        <span className="signal-dot" />
        <button
          type="button"
          onClick={() => setSidebarCollapsed(false)}
          aria-label="Expand command rail"
          className="tactical-chip px-2 py-2 text-[10px]"
        >
          <Compass aria-hidden className="size-4" />
        </button>
        <button type="button" onClick={openPalette} aria-label="Open command palette" className="tactical-chip px-2 py-2">
          <Search aria-hidden className="size-4" />
        </button>
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} cities={paletteCities} />
      </aside>
    );
  }

  return (
    <aside
      data-testid="tactical-command-rail"
      data-density="operator-console"
      data-geometry="hard-edge"
      data-layout="mission-console"
      className="flex h-full flex-col gap-3 border border-[#31362f] bg-[#101313]/97 px-3 py-3 font-sans"
    >
      <SidebarHeader viewLabel={selectedViewLabel} onCollapse={() => setSidebarCollapsed(true)} />

      {/* Search-first: input doubles as the command-palette entry point. */}
      <div className="space-y-1.5">
        <form action="/" className="relative">
          <input type="hidden" name="view" value={selectedViewId} />
          <input type="hidden" name="layers" value={activeLayerIdsValue} />
          <input type="hidden" name="base" value={activeBaseImageryLayerId} />
          {activeDate ? <input type="hidden" name="date" value={activeDate} /> : null}
          <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          <input
            id="tactical-rail-search"
            name="q"
            type="search"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search cities, coordinates, aliases"
            aria-label="Search cities, coordinates, aliases"
            className="tactical-input py-2.5 pl-9 pr-12 text-sm focus:ring-2 focus:ring-cyan-300/40"
          />
          <button
            type="button"
            onClick={openPalette}
            aria-label="Open command palette"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-[#3a4037] bg-[#121515] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.16em] text-slate-500"
          >
            ⌘K
          </button>
        </form>
      </div>

      <div className="tactical-scroll min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        <SidebarSection id="workspaces" title="Workspaces" icon={Compass}>
          <WorkspaceNav />
        </SidebarSection>

        <SidebarSection id="browse" title="Browse" icon={Building2}>
          <BrowseNav onBrowse={openPalette} />
        </SidebarSection>

        <SidebarSection
          id="map-layers"
          title="Map layers"
          icon={Layers}
          state={sections.some((family) => family.rows.length > 0) ? "loaded" : "pending"}
        >
          <MapLayersGroup
            families={sections}
            baseImageryOptions={baseImageryOptions}
            imageryDateOptions={imageryDateOptions}
            savedViewOptions={savedViewOptions}
            onOpenLegend={() => setLegendOpen(true)}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        </SidebarSection>

        <SidebarSection
          id="city-brief"
          title="City brief"
          icon={Building2}
          state={
            selectedCityIntel.kind === "selected-city"
              ? "loaded"
              : coveragePending
                ? "pending"
                : "empty"
          }
        >
          <CityBriefPanel
            intel={toBriefIntel(selectedCityIntel)}
            mappedCount={mappedCount}
            documentedCount={documentedCount}
            gapCount={gapCount}
            coveragePending={coveragePending}
            onBrowseCities={openPalette}
          />
          {searchResultsLoading ? (
            <div className="space-y-1.5" aria-hidden>
              {[0, 1, 2].map((index) => (
                <div key={index} className="h-10 animate-pulse rounded-lg border border-[#272c29] bg-[#0f1112]" />
              ))}
            </div>
          ) : null}
        </SidebarSection>

        <SidebarSection
          id="saved-recent"
          title="Saved & recent"
          icon={Bookmark}
          state={watchlists.length > 0 || recentCities.length > 0 ? "loaded" : "empty"}
        >
          <SavedRecentGroup nameForSlug={nameForSlug} compareSets={compareSets} recentCities={recentRows} />
        </SidebarSection>
      </div>

      <SidebarFooter
        datasetWorkspaceSummary={datasetWorkspaceSummary}
        onOpenShortcuts={() => setShortcutsOpen(true)}
      />

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} cities={paletteCities} />
    </aside>
  );
}
