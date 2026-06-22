/**
 * Client-side export of a city OSINT brief — Markdown or JSON, downloaded via a Blob (no backend,
 * static-export safe). Serializers are pure so they can be unit-tested without a DOM.
 */
import type { CitySearchIndexEntry } from "@/lib/city-data-client";
import type { CityDossier } from "@/features/osint/lib/use-city-dossier";
import { entityLabel } from "@/features/osint/lib/entity-display";

export type CityBrief = {
  city: CitySearchIndexEntry;
  dossier: Pick<CityDossier, "entities" | "sources" | "coverage">;
};

export function cityBriefToJson(brief: CityBrief): string {
  const { city, dossier } = brief;
  return JSON.stringify(
    {
      exportedFrom: "MapFactbook OSINT",
      note: "Every datum is source-backed; gaps are explicit.",
      city: {
        id: city.cityId,
        name: city.name,
        admin1: city.admin1Name ?? null,
        country: city.countryIso3,
        population: city.population ?? null,
        slug: city.slug,
      },
      coverage:
        dossier.coverage?.categories.map((c) => ({ id: c.id, label: c.label, state: c.state, count: c.count })) ?? [],
      entities: dossier.entities.map((e) => ({
        id: e.entityId,
        name: e.entityName,
        type: e.entityType,
        exactSite: e.exactSite,
        latitude: e.latitude ?? null,
        longitude: e.longitude ?? null,
      })),
      sources: dossier.sources.map((s) => ({ id: s.id, name: s.name, url: s.url ?? null })),
    },
    null,
    2,
  );
}

export function cityBriefToMarkdown(brief: CityBrief): string {
  const { city, dossier } = brief;
  const lines: string[] = [`# ${city.name} — OSINT brief`, ""];
  lines.push(`- **Location:** ${[city.admin1Name, city.countryIso3].filter(Boolean).join(", ")}`);
  if (city.population != null) lines.push(`- **Population:** ${city.population.toLocaleString("en-US")}`);
  lines.push("");

  if (dossier.coverage?.categories.length) {
    lines.push("## Coverage");
    for (const c of dossier.coverage.categories) {
      lines.push(`- ${c.label}: **${c.state}**${c.count ? ` (${c.count})` : ""}`);
    }
    lines.push("");
  }

  if (dossier.entities.length) {
    lines.push(`## Entities (${dossier.entities.length})`, "");
    const byType = new Map<string, typeof dossier.entities>();
    for (const e of dossier.entities) {
      const arr = byType.get(e.entityType) ?? [];
      arr.push(e);
      byType.set(e.entityType, arr);
    }
    for (const [type, items] of byType) {
      lines.push(`### ${entityLabel(type)} (${items.length})`);
      for (const e of items) lines.push(`- ${e.entityName}${e.exactSite ? " _(exact site)_" : ""}`);
      lines.push("");
    }
  }

  if (dossier.sources.length) {
    lines.push("## Sources");
    for (const s of dossier.sources) lines.push(`- ${s.name}${s.url ? ` — ${s.url}` : ""}`);
    lines.push("");
  }

  lines.push("---", "_Exported from MapFactbook OSINT — every datum is source-backed; gaps stay explicit._");
  return lines.join("\n");
}

/** Trigger a client-side file download of `text`. No-op outside the browser. */
export function downloadText(filename: string, text: string, mime: string): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Filesystem-safe base filename for a city's brief, e.g. "osint-portville-geo-1". */
export function briefFilename(city: CitySearchIndexEntry): string {
  const slug = city.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `osint-${slug || "city"}-${city.cityId}`;
}
