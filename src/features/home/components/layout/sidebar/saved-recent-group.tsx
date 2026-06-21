"use client";

import Link from "next/link";
import { Clock, Star } from "lucide-react";

import { EmptyState } from "@/features/home/components/layout/sidebar/empty-state";
import { hrefFor } from "@/features/home/lib/analyst-sidebar-model";
import { useWatchlistStore } from "@/store/watchlist-store";

export type SavedRecentCityRow = {
  href: string;
  meta: string;
  name: string;
  populationLabel: string;
  selected: boolean;
  slug?: string;
};

export type SavedRecentCompareSet = {
  cityCount: number;
  cityLabels: string[];
  description: string;
  href?: string;
  id: string;
  label: string;
};

type SavedRecentGroupProps = {
  /** Resolves a saved slug to a display name (from recent cities / registry). */
  nameForSlug: (slug: string) => string;
  compareSets: SavedRecentCompareSet[];
  recentCities: SavedRecentCityRow[];
};

function CityRow({
  href,
  name,
  meta,
  populationLabel,
  onUnsave,
}: {
  href: string;
  name: string;
  meta: string;
  populationLabel: string;
  onUnsave?: () => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Link
        href={href}
        className="block min-w-0 flex-1 rounded-lg border border-[#272c29] bg-[#0f1112] px-2.5 py-2 transition hover:border-[#3b4334]"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-white">{name}</p>
            <p className="mt-0.5 truncate text-[10px] uppercase tracking-[0.14em] text-slate-500">{meta}</p>
          </div>
          <span className="shrink-0 text-[10px] uppercase tracking-[0.16em] text-slate-400">
            {populationLabel}
          </span>
        </div>
      </Link>
      {onUnsave ? (
        <button
          type="button"
          onClick={onUnsave}
          aria-label={`Unsave ${name}`}
          className="tactical-chip tactical-chip-active shrink-0 px-1.5 py-1.5 text-[10px]"
        >
          <Star aria-hidden className="size-3.5 fill-current" />
        </button>
      ) : null}
    </div>
  );
}

/** Saved cities (watchlist store), compare sets, and recently viewed cities. */
export function SavedRecentGroup({ nameForSlug, compareSets, recentCities }: SavedRecentGroupProps) {
  const savedSlugs = useWatchlistStore((state) => state.items);
  const toggleSaved = useWatchlistStore((state) => state.toggle);

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Saved cities</p>
        {savedSlugs.length > 0 ? (
          <div className="space-y-1.5">
            {savedSlugs.map((slug) => (
              <CityRow
                key={slug}
                href={hrefFor({ selectedCitySlug: slug, activeLayerIds: [] })}
                name={nameForSlug(slug)}
                meta="Saved in this browser"
                populationLabel="saved"
                onUnsave={() => toggleSaved(slug)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Star}
            headline="No saved cities yet"
            subtext="Star a city to pin it here."
          />
        )}
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Saved compare sets</p>
        {compareSets.length > 0 ? (
          <div className="space-y-1.5">
            {compareSets.map((set) => {
              const content = (
                <div className="rounded-lg border border-[#272c29] bg-[#0f1112] px-2.5 py-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-white">{set.label}</p>
                      <p className="mt-0.5 text-[11px] leading-4 text-slate-400">{set.description}</p>
                    </div>
                    <span className="tactical-chip shrink-0 px-2 py-1 text-[9px]">{set.cityCount} cities</span>
                  </div>
                  {set.cityLabels.length > 0 ? (
                    <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-slate-500">
                      {set.cityLabels.join(" / ")}
                    </p>
                  ) : null}
                </div>
              );
              return set.href ? (
                <Link key={set.id} href={set.href} className="block">
                  {content}
                </Link>
              ) : (
                <div key={set.id}>{content}</div>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={Star}
            headline="No saved compare sets"
            subtext="Build a compare basket to reuse it here."
            action={{ kind: "link", href: "/compare", label: "Open Compare" }}
          />
        )}
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Recently viewed</p>
        {recentCities.length > 0 ? (
          <div className="space-y-1.5">
            {recentCities.map((city) => (
              <CityRow
                key={city.href}
                href={city.href}
                name={city.name}
                meta={city.meta}
                populationLabel={city.populationLabel}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Clock}
            headline="No recent cities"
            subtext="Cities you open will appear here."
          />
        )}
      </div>
    </div>
  );
}
