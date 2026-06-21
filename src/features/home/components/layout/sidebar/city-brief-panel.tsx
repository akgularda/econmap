"use client";

import Link from "next/link";
import { Building2, MapPin, Star } from "lucide-react";

import { CityBriefSection } from "@/features/home/components/layout/city-brief-section";
import { EmptyState } from "@/features/home/components/layout/sidebar/empty-state";
import { useWatchlistStore } from "@/store/watchlist-store";

export type CityBriefMetricRow = {
  label: string;
  sourceLabel?: string;
  value: string;
};

export type CityBriefInfrastructureRow = {
  label: string;
  value: string;
};

export type CityBriefEntityRow = {
  entityName: string;
  entityTypeLabel: string;
  exactSite: boolean;
  presenceLabel: string;
};

export type CityBriefIntel =
  | {
      kind: "selected-city";
      slug?: string;
      cityName: string;
      cityMeta: string;
      clearHref: string;
      coverageBadges: string[];
      entityRows: CityBriefEntityRow[];
      infrastructureRows: CityBriefInfrastructureRow[];
      metricRows: CityBriefMetricRow[];
      sourceLabels: string[];
      summary?: string;
      workspaceHref: string;
    }
  | {
      kind: "selection-prompt";
      title: string;
      body: string;
      sourceLabels: string[];
    };

type CityBriefPanelProps = {
  intel: CityBriefIntel;
  /** Number of analyst rows that are mapped / documented / gaps for the badges. */
  mappedCount: number;
  documentedCount: number;
  gapCount: number;
  /** Coverage is absent on a fresh clone — render the pending variant. */
  coveragePending?: boolean;
  onBrowseCities?: () => void;
};

/**
 * The substantive selected-city OSINT brief, demoted from a hero. Reuses the v1
 * city-intel content (header, coverage badges, dossier link, Snapshot /
 * Infrastructure sections, entity cues) and adds a Save star bound to the
 * watchlist store. The duplicate "Visible source labels" cloud is removed.
 */
export function CityBriefPanel({
  intel,
  mappedCount,
  documentedCount,
  gapCount,
  coveragePending = false,
  onBrowseCities,
}: CityBriefPanelProps) {
  const savedItems = useWatchlistStore((state) => state.items);
  const toggleSaved = useWatchlistStore((state) => state.toggle);

  if (intel.kind === "selection-prompt") {
    if (coveragePending) {
      return (
        <EmptyState
          icon={Building2}
          headline="No city intelligence published yet"
          subtext="This build ships without generated city data. Generate map data to populate briefs."
          pending
          action={{ kind: "link", href: "/datasets", label: "Generate map data" }}
        />
      );
    }

    return (
      <EmptyState
        icon={MapPin}
        headline={intel.title}
        subtext={intel.body}
        action={
          onBrowseCities
            ? { kind: "button", onClick: onBrowseCities, label: "Browse cities" }
            : { kind: "link", href: "/datasets", label: "Browse cities" }
        }
      />
    );
  }

  const saved = intel.slug ? savedItems.includes(intel.slug) : false;

  return (
    <div className="space-y-3 rounded-lg border border-[#272c29] bg-[#0f1112] px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold leading-none text-white">{intel.cityName}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-slate-500">{intel.cityMeta}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {intel.slug ? (
            <button
              type="button"
              onClick={() => toggleSaved(intel.slug as string)}
              aria-pressed={saved}
              aria-label={saved ? "Unsave city" : "Save city"}
              className={`tactical-chip px-2 py-1 text-[10px] ${saved ? "tactical-chip-active" : ""}`}
            >
              <Star aria-hidden className={`size-3.5 ${saved ? "fill-current" : ""}`} />
            </button>
          ) : null}
          <Link href={intel.clearHref} className="tactical-chip px-2 py-1 text-[10px]">
            Clear
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className="tactical-chip tactical-chip-active px-2 py-1 text-[10px]">{mappedCount} mapped</span>
        <span className="tactical-chip px-2 py-1 text-[10px]">{documentedCount} documented</span>
        <span className="tactical-chip px-2 py-1 text-[10px]">{gapCount} gaps</span>
        {intel.coverageBadges.map((badge) => (
          <span key={`coverage-${badge}`} className="tactical-chip tactical-chip-active px-2 py-1 text-[10px]">
            {badge}
          </span>
        ))}
      </div>

      {intel.summary ? (
        <p className="text-[12px] leading-5 text-slate-300">{intel.summary}</p>
      ) : null}

      <div className="flex items-center gap-2">
        <Link
          href={intel.workspaceHref}
          className="tactical-chip tactical-chip-active flex-1 justify-center px-3 py-2 text-[11px]"
        >
          Open full city dossier
        </Link>
        <span className="tactical-chip px-2 py-1 text-[9px]">{intel.sourceLabels.length} sources</span>
      </div>

      <CityBriefSection rows={intel.metricRows} title="Snapshot" />
      <CityBriefSection rows={intel.infrastructureRows} title="Infrastructure" />

      {intel.entityRows.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Entity cues</p>
          <div className="space-y-1.5">
            {intel.entityRows.map((entity) => (
              <div
                key={`${entity.entityTypeLabel}-${entity.entityName}`}
                className="border border-[#272c29] bg-[#121515] px-2.5 py-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-semibold text-white">{entity.entityName}</p>
                    <p className="mt-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                      {entity.entityTypeLabel} / {entity.presenceLabel}
                    </p>
                  </div>
                  <span className="tactical-chip px-1.5 py-0.5 text-[9px]">
                    {entity.exactSite ? "exact" : "city"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
