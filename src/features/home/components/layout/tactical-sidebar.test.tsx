import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  TacticalSidebar,
  type TacticalSidebarProductLink,
} from "@/features/home/components/layout/tactical-sidebar";
import type { MapLayerFamily } from "@/features/home/lib/analyst-sidebar-model";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const EMPTY_FAMILIES: MapLayerFamily[] = [
  { id: "borders-labels", title: "Borders & Labels", pendingSourceLabel: "Natural Earth", rows: [] },
  { id: "transport", title: "Transport", pendingSourceLabel: "OurAirports", rows: [] },
  { id: "utilities", title: "Utilities", pendingSourceLabel: "WRI Global Power Plant Database", rows: [] },
  { id: "connectivity", title: "Connectivity", pendingSourceLabel: "Ookla", rows: [] },
  { id: "environment", title: "Environment", pendingSourceLabel: "WHO Air Quality", rows: [] },
  { id: "economy-institutions", title: "Economy / Institutions", pendingSourceLabel: "ROR", rows: [] },
];

const NO_PRODUCT_LINKS: TacticalSidebarProductLink[] = [];

function renderFreshClone() {
  return render(
    <TacticalSidebar
      activeBaseImageryLayerId="night-lights"
      activeLayerIdsValue=""
      analystSections={[]}
      sections={EMPTY_FAMILIES}
      baseImageryOptions={[]}
      imageryDateOptions={[]}
      savedViewOptions={[]}
      productLinks={NO_PRODUCT_LINKS}
      datasetWorkspaceSummary={{
        href: "/datasets",
        label: "Dataset explorer",
        meta: "inspect source workspaces and parser status",
      }}
      featuredCities={[]}
      recentCities={[]}
      searchQuery=""
      searchResults={[]}
      selectedCityIntel={{
        kind: "selection-prompt",
        title: "Select a city",
        body: "Search for a city or click a visible boundary on the map.",
        sourceLabels: ["GeoNames"],
      }}
      selectedViewId="global-ops"
      selectedViewLabel="Global Ops"
      watchlists={[]}
    />,
  );
}

describe("TacticalSidebar (tactical command rail v2)", () => {
  it("keeps the mission-console smoke attribute", () => {
    renderFreshClone();
    expect(screen.getByTestId("tactical-command-rail")).toHaveAttribute("data-layout", "mission-console");
  });

  it("exposes every product destination as a real link", () => {
    renderFreshClone();
    const rail = screen.getByTestId("tactical-command-rail");
    const expectedHrefs = [
      "/",
      "/compare",
      "/rankings",
      "/indicators",
      "/corridors",
      "/dashboard",
      "/reports",
      "/story-mode",
      "/compare/blocs",
      "/regions",
      "/datasets",
    ];
    const hrefs = Array.from(rail.querySelectorAll("a")).map((anchor) => anchor.getAttribute("href"));
    for (const href of expectedHrefs) {
      expect(hrefs).toContain(href);
    }
  });

  it("renders the v2 section order: Workspaces -> Browse -> Map layers -> City brief -> Saved & recent", () => {
    renderFreshClone();
    const orderedLabels = [
      screen.getByText(/^workspaces$/i),
      screen.getByText(/^browse$/i),
      screen.getByText(/^map layers$/i),
      screen.getByText(/^city brief$/i),
      screen.getByText(/^saved & recent$/i),
    ];

    for (let index = 0; index < orderedLabels.length - 1; index += 1) {
      expect(
        orderedLabels[index].compareDocumentPosition(orderedLabels[index + 1]) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
  });

  it("renders honest coverage-pending placeholders for empty layer families on a fresh clone", () => {
    renderFreshClone();
    const pendingBadges = screen.getAllByText(/^coverage pending$/i);
    expect(pendingBadges.length).toBeGreaterThan(0);
    // Real source labels are shown alongside the pending state.
    expect(screen.getByText(/^Natural Earth$/)).toBeInTheDocument();
    expect(screen.getByText(/^WHO Air Quality$/)).toBeInTheDocument();
  });

  it("renders intentional empty states (not apology cards) for saved & recent", () => {
    renderFreshClone();
    expect(screen.getByText(/no saved cities yet/i)).toBeInTheDocument();
    expect(screen.getByText(/no recent cities/i)).toBeInTheDocument();
  });

  it("offers a search field and a command-palette affordance", () => {
    renderFreshClone();
    expect(screen.getByPlaceholderText(/search cities, coordinates, aliases/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open command palette/i })).toBeInTheDocument();
  });

  it("renders a city brief with a Save action and dossier link when a city is selected", () => {
    render(
      <TacticalSidebar
        activeBaseImageryLayerId="night-lights"
        activeLayerIdsValue="airports"
        analystSections={[]}
        sections={EMPTY_FAMILIES}
        baseImageryOptions={[]}
        imageryDateOptions={[]}
        savedViewOptions={[]}
        datasetWorkspaceSummary={{ href: "/datasets", label: "Dataset explorer", meta: "inspect" }}
        featuredCities={[]}
        recentCities={[]}
        searchQuery=""
        searchResults={[]}
        selectedCityIntel={{
          kind: "selected-city",
          slug: "geo-745044-istanbul",
          cityName: "Istanbul",
          cityMeta: "Istanbul / TUR",
          summary: "Istanbul command workspace",
          workspaceHref: "/city/geo-745044-istanbul",
          clearHref: "/",
          coverageBadges: ["economic"],
          sourceLabels: ["GeoNames", "OurAirports"],
          metricRows: [{ label: "Population", value: "15.7M persons", sourceLabel: "GeoNames" }],
          infrastructureRows: [{ label: "Airports", value: "2" }],
          entityRows: [],
        }}
        selectedViewId="global-ops"
        selectedViewLabel="Global Ops"
        watchlists={[]}
      />,
    );

    const briefSection = screen.getByText(/^city brief$/i).closest("section") as HTMLElement;
    expect(within(briefSection).getByRole("link", { name: /open full city dossier/i })).toBeInTheDocument();
    expect(within(briefSection).getByRole("button", { name: /save city/i })).toBeInTheDocument();
  });
});
