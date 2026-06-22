/**
 * Shared OSINT entity/coverage display helpers — extracted from osint-console.tsx so the
 * console, the compare view, and the entity mini-map render entity types, coverage states,
 * and populations identically without duplicating the maps.
 */
import {
  Building2,
  Factory,
  GraduationCap,
  Plane,
  Ship,
  TrainFront,
  Truck,
  Zap,
  type LucideIcon,
} from "lucide-react";

export const ENTITY_ICON: Record<string, LucideIcon> = {
  airport: Plane,
  port: Ship,
  rail_hub: TrainFront,
  logistics_hub: Truck,
  utility: Zap,
  research: GraduationCap,
  company: Building2,
  factory: Factory,
  industrial_park: Factory,
};

export const ENTITY_LABEL: Record<string, string> = {
  airport: "Airports",
  port: "Ports",
  rail_hub: "Rail hubs",
  logistics_hub: "Logistics hubs",
  utility: "Power & utilities",
  research: "Research & universities",
  company: "Companies",
  factory: "Factories",
  industrial_park: "Industrial parks",
};

/** Hex marker colors per entity type — used by the entity mini-map's circle layer. */
export const ENTITY_COLOR: Record<string, string> = {
  airport: "#67e8f9",
  port: "#38bdf8",
  rail_hub: "#a78bfa",
  logistics_hub: "#fbbf24",
  utility: "#fb923c",
  research: "#4ade80",
  company: "#e2e8f0",
  factory: "#f87171",
  industrial_park: "#f472b6",
};

export const COVERAGE_STYLE: Record<string, { dot: string; text: string; label: string }> = {
  mapped: { dot: "bg-emerald-400", text: "text-emerald-200", label: "Covered" },
  documented: { dot: "bg-amber-400", text: "text-amber-200", label: "Partial" },
  missing: { dot: "bg-slate-500", text: "text-slate-400", label: "Not covered yet" },
};

export function entityLabel(type: string): string {
  return ENTITY_LABEL[type] ?? type;
}

export function entityIcon(type: string): LucideIcon {
  return ENTITY_ICON[type] ?? Building2;
}

export function entityColor(type: string): string {
  return ENTITY_COLOR[type] ?? "#e2e8f0";
}

export function fmtPop(pop: number | null | undefined): string {
  if (pop == null) return "pop. unknown";
  return `${pop.toLocaleString("en-US")} pop.`;
}
