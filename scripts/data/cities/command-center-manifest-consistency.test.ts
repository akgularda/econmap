// @vitest-environment node
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";

import { cityManifestSchema } from "@/domain/city-schemas";

/**
 * P1.4 single-source-of-truth guard (drive-safe: reads only the 3 small shipped artifacts, no
 * 189K-file scans). Locks every user-facing count in the command-center manifest + the
 * registry-summary to its derivation from the city manifest (see generate-globe-artifacts.ts).
 * If a future regen makes any command-center string or the registry-summary disagree with the
 * city manifest, the matching assertion fails — the counts can no longer drift apart silently.
 */
const GEN = path.join(process.cwd(), "src", "data", "generated");
const CITY = cityManifestSchema.parse(
  JSON.parse(fs.readFileSync(path.join(GEN, "cities", "manifest.json"), "utf-8")),
);
const CC = JSON.parse(
  fs.readFileSync(path.join(GEN, "command-center", "manifest.json"), "utf-8"),
) as {
  globalIntelligence: Array<{ id: string; body: string; coverageState: string }>;
  opsTimeline: Array<{ id: string; detail: string }>;
  sourceSummary: Array<{ label: string; value: string }>;
  datasetInventory: Array<{ id: string; detail: string }>;
};
const RS = JSON.parse(
  fs.readFileSync(path.join(GEN, "command-center", "registry-summary.json"), "utf-8"),
) as { totalCities: number; countriesCovered: number };

describe("command-center manifest counts trace to the city manifest", () => {
  it("published-city-backbone body + coverage state derive from processed/total city counts", () => {
    const backbone = CC.globalIntelligence.find((i) => i.id === "published-city-backbone");
    expect(backbone).toBeDefined();
    expect(backbone!.body).toBe(
      `${CITY.processedCityCount} of ${CITY.totalCityCount} cities have published intelligence bundles.`,
    );
    expect(backbone!.coverageState).toBe(
      CITY.processedCityCount === CITY.totalCityCount ? "verified_exact" : "partial_coverage",
    );
  });

  it("opsTimeline offline-build detail leads with the total city count", () => {
    const offline = CC.opsTimeline.find((e) => e.id === "offline-build");
    expect(offline).toBeDefined();
    expect(offline!.detail.startsWith(`${CITY.totalCityCount} city records`)).toBe(true);
  });

  it("sourceSummary reconciles exactly with the manifest sourceCounts", () => {
    for (const entry of CC.sourceSummary) {
      expect(CITY.sourceCounts).toHaveProperty(entry.label);
      expect(entry.value).toBe(`${CITY.sourceCounts[entry.label]} city bundles`);
    }
    // The summary covers every source-count key (no orphaned or missing source).
    expect(new Set(CC.sourceSummary.map((s) => s.label))).toEqual(
      new Set(Object.keys(CITY.sourceCounts)),
    );
  });

  it("datasetInventory per-source bundle counts match the manifest (comma-formatted)", () => {
    // Maps each published, source-backed dataset to its manifest sourceCounts label.
    // NOTE: research-organizations-registry → "ROR" is single-keyed in sourceCounts today; the
    // generator sums getSourceMatchLabels, so this stays correct only while no separate
    // "Research Organization Registry" source-count key exists. If one is ever added, switch this
    // entry to sum over the seed's match-label set.
    const datasetToLabel: Record<string, string> = {
      geonames: "GeoNames",
      ourairports: "OurAirports",
      "un-locode": "UN/LOCODE",
      "world-port-index": "World Port Index",
      "wri-global-power-plant-database": "WRI Global Power Plant Database",
      "research-organizations-registry": "ROR",
    };
    for (const [datasetId, label] of Object.entries(datasetToLabel)) {
      const dataset = CC.datasetInventory.find((d) => d.id === datasetId);
      expect(dataset, `missing datasetInventory entry: ${datasetId}`).toBeDefined();
      if (Object.prototype.hasOwnProperty.call(CITY.sourceCounts, label)) {
        // Source IS present in this build → its detail must carry the exact comma-formatted count.
        const expected = `${CITY.sourceCounts[label].toLocaleString("en-US")} city bundles`;
        expect(dataset!.detail).toContain(expected);
      } else {
        // Source is ABSENT in this build (e.g. World Port Index when the WPI pack wasn't acquired).
        // Keep the gap VISIBLE, don't hide it: the generator must not fabricate a bundle count and
        // must say the local pack is "not registered" — assert exactly that, so a future regen that
        // silently fakes a count (or drops the honesty note) fails here.
        expect(dataset!.detail).not.toMatch(/[\d,]+ city bundles/);
        expect(dataset!.detail.toLowerCase()).toContain("not registered");
      }
    }
  });

  it("registry-summary agrees with the city manifest (no independent recount)", () => {
    expect(RS.totalCities).toBe(CITY.totalCityCount);
    expect(RS.countriesCovered).toBe(Object.keys(CITY.countryCounts).length);
  });

  it("exposes a non-empty dataset inventory for the home meta count", () => {
    expect(CC.datasetInventory.length).toBeGreaterThan(0);
  });
});
