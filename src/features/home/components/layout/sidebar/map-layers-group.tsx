"use client";

import Link from "next/link";
import { Layers, Map as MapIcon, Settings2 } from "lucide-react";

import type {
  BaseImageryOption,
  ImageryDateOption,
  MapLayerFamily,
  SavedViewOption,
} from "@/features/home/lib/analyst-sidebar-model";
import { LayerToggleRow } from "@/features/home/components/layout/sidebar/layer-toggle-row";

export type MapLayersGroupProps = {
  families: MapLayerFamily[];
  baseImageryOptions: BaseImageryOption[];
  imageryDateOptions: ImageryDateOption[];
  savedViewOptions: SavedViewOption[];
  onOpenLegend: () => void;
  onOpenSettings: () => void;
};

function PickerRow({ active, href, children }: { active: boolean; href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={`rounded-md border px-2 py-1.5 text-center text-[11px] transition ${
        active
          ? "border-[#9cab7a]/55 bg-[#242a20] text-[#e3ecca]"
          : "border-[#272c29] bg-[#0f1112] text-slate-300 hover:border-[#3b4334]"
      }`}
    >
      {children}
    </Link>
  );
}

/**
 * The coherent imagery/layer control group: layer-family toggles, base-imagery
 * picker, imagery-date picker (when supported), saved-view switcher, and the
 * Legend / Settings modal triggers.
 */
export function MapLayersGroup({
  families,
  baseImageryOptions,
  imageryDateOptions,
  savedViewOptions,
  onOpenLegend,
  onOpenSettings,
}: MapLayersGroupProps) {
  return (
    <div className="space-y-3">
      {/* Layer families */}
      <div className="space-y-2.5">
        {families.map((family) => (
          <div key={family.id} className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">{family.title}</p>
            {family.rows.length > 0 ? (
              <div className="space-y-1.5">
                {family.rows.map((row) => (
                  <LayerToggleRow key={row.id} row={row} />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-300/25 bg-amber-300/[0.04] px-2.5 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-[11px] text-slate-400">No published layer yet</span>
                  <span className="mt-0.5 block truncate text-[10px] uppercase tracking-[0.14em] text-slate-500">
                    {family.pendingSourceLabel}
                  </span>
                </span>
                <span className="tactical-chip coverage-pending shrink-0 px-1.5 py-0.5 text-[9px] tracking-[0.16em]">
                  coverage pending
                </span>
              </div>
            )}
          </div>
        ))}
        <Link
          href="/datasets"
          className="tactical-chip flex w-fit items-center gap-1.5 px-2.5 py-1 text-[10px]"
        >
          <Layers aria-hidden className="size-3" />
          Generate map data
        </Link>
      </div>

      {/* Base imagery */}
      {baseImageryOptions.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Base imagery</p>
          <div className="grid grid-cols-2 gap-1.5">
            {baseImageryOptions.map((option) => (
              <PickerRow key={option.id} active={option.active} href={option.href}>
                {option.label}
              </PickerRow>
            ))}
          </div>
        </div>
      ) : null}

      {/* Imagery date */}
      {imageryDateOptions.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Imagery date</p>
          <div className="grid grid-cols-2 gap-1.5">
            {imageryDateOptions.map((option) => (
              <PickerRow key={option.date} active={option.active} href={option.href}>
                {option.date}
              </PickerRow>
            ))}
          </div>
        </div>
      ) : null}

      {/* Saved views */}
      {savedViewOptions.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Saved views</p>
          <div className="grid grid-cols-2 gap-1.5">
            {savedViewOptions.map((option) => (
              <PickerRow key={option.id} active={option.active} href={option.href}>
                {option.label}
              </PickerRow>
            ))}
          </div>
        </div>
      ) : null}

      {/* Map tools */}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={onOpenLegend}
          className="nav-item justify-center text-[12px]"
        >
          <MapIcon aria-hidden className="size-4 shrink-0" />
          Layer legend
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          className="nav-item justify-center text-[12px]"
        >
          <Settings2 aria-hidden className="size-4 shrink-0" />
          Map settings
        </button>
      </div>
    </div>
  );
}
