import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// Minimal fixtures shaped like the real client returns (the component reads a small subset).
const INDEX = [
  { cityId: "geo-1", slug: "geo-1-portville", name: "Portville", aliases: [], countryIso3: "USA", admin1Name: "California", population: 900_000, isMajorCity: true },
  { cityId: "geo-2", slug: "geo-2-smalltown", name: "Smalltown", aliases: [], countryIso3: "USA", admin1Name: "Texas", population: 40_000, isMajorCity: false },
];

const PORTVILLE_ENTITIES = {
  cityId: "geo-1",
  entities: [
    { entityId: "e1", cityId: "geo-1", entityName: "Big Harbor", entityType: "port", presenceType: "port", exactSite: true, geometryMode: "exact", sources: [], lastVerifiedAt: "2026", confidenceState: "verified_exact" },
    { entityId: "e2", cityId: "geo-1", entityName: "Tech University", entityType: "research", presenceType: "research", exactSite: false, geometryMode: "city_presence", sources: [], lastVerifiedAt: "2026", confidenceState: "verified_city_presence" },
  ],
  sources: [{ id: "wri", name: "WRI Global Power Plant Database", updatedAt: "2026", coverage: "x", methodology: "y" }],
};

const PORTVILLE_COVERAGE = {
  generatedAt: "2026", cityId: "geo-1", boundaryStatus: "point_only", sourceCount: 2,
  mappedCategoryCount: 1, documentedCategoryCount: 0, missingCategoryCount: 1,
  categories: [{ id: "ports", label: "Ports", state: "mapped", count: 1, detail: "1 port mapped", sourceLabels: ["WRI Global Power Plant Database"] }],
};

vi.mock("@/lib/city-data-client", () => ({
  loadCitySearchIndex: vi.fn(async () => INDEX),
  loadCityEntities: vi.fn(async (id: string) => (id === "geo-1" ? PORTVILLE_ENTITIES : null)),
  loadCityCoverageShell: vi.fn(async (id: string) => (id === "geo-1" ? PORTVILLE_COVERAGE : null)),
}));

import { OsintConsole } from "@/features/osint/components/osint-console";

describe("OsintConsole", () => {
  it("loads the search index and shows the indexed-city count", async () => {
    render(<OsintConsole />);
    expect(await screen.findByText(/2 cities indexed/)).toBeInTheDocument();
  });

  it("filters results by query", async () => {
    render(<OsintConsole />);
    await screen.findByRole("button", { name: /Portville/ });
    fireEvent.change(screen.getByLabelText("Search cities"), { target: { value: "small" } });
    await waitFor(() => expect(screen.queryByRole("button", { name: /Portville/ })).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: /Smalltown/ })).toBeInTheDocument();
  });

  it("selecting a city renders its entities, coverage, and type-filter chips", async () => {
    render(<OsintConsole />);
    fireEvent.click(await screen.findByRole("button", { name: /Portville/ }));
    expect(await screen.findByText("Big Harbor")).toBeInTheDocument();
    expect(screen.getByText("Tech University")).toBeInTheDocument();
    expect(screen.getByText("Coverage")).toBeInTheDocument();
    // two entity types → filter chips render
    expect(screen.getByRole("button", { name: /Ports \(1\)/ })).toBeInTheDocument();
  });

  it("type-filter chip narrows the entity list to the chosen type", async () => {
    render(<OsintConsole />);
    fireEvent.click(await screen.findByRole("button", { name: /Portville/ }));
    await screen.findByText("Big Harbor");
    fireEvent.click(screen.getByRole("button", { name: /Research & universities \(1\)/ }));
    await waitFor(() => expect(screen.queryByText("Big Harbor")).not.toBeInTheDocument());
    expect(screen.getByText("Tech University")).toBeInTheDocument();
  });

  it("an identity-only city (no dossier) shows the explicit gap message, not fabricated data", async () => {
    render(<OsintConsole />);
    fireEvent.click(await screen.findByRole("button", { name: /Smalltown/ }));
    expect(await screen.findByText(/Identity-only city/)).toBeInTheDocument();
  });
});
