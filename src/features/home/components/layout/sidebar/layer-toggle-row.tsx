import Link from "next/link";

import type { MapLayerToggleRow } from "@/features/home/lib/analyst-sidebar-model";
import { getStatusBadge } from "@/features/home/components/layout/sidebar/status-badge";

/**
 * A single layer row rendered as a real ON/OFF toggle. The href adds/removes the
 * row's layer ids from `?layers` via `hrefFor`, preserving the rest of the view
 * state — so toggling never drops the user's other selections.
 */
export function LayerToggleRow({ row }: { row: MapLayerToggleRow }) {
  const badge = getStatusBadge(row.state === "coverage-pending" ? "coverage-pending" : "mapped");
  const visibleSources = row.sourceLabels.slice(0, 2);

  return (
    <Link
      href={row.href}
      aria-pressed={row.active}
      className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 transition ${
        row.active
          ? "border-[#8f9c6e]/55 bg-[#1a1f1b]"
          : "border-[#272c29] bg-[#0f1112] hover:border-[#3b4334]"
      }`}
    >
      <span className="min-w-0">
        <span className="block truncate text-[12px] font-semibold text-white">{row.label}</span>
        {visibleSources.length > 0 ? (
          <span className="mt-0.5 block truncate text-[10px] uppercase tracking-[0.14em] text-slate-500">
            {visibleSources.join(" · ")}
          </span>
        ) : null}
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        <span className={`tactical-chip ${badge.className} px-1.5 py-0.5 text-[9px] tracking-[0.16em]`}>
          {badge.label}
        </span>
        <span
          className={`tactical-chip px-1.5 py-0.5 text-[9px] tracking-[0.18em] ${
            row.active
              ? "border-[#9cab7a]/45 bg-[#242a20] text-[#d7dfc1]"
              : "border-[#3a4037] bg-[#121515] text-slate-400"
          }`}
        >
          {row.active ? "on" : "off"}
        </span>
      </span>
    </Link>
  );
}
