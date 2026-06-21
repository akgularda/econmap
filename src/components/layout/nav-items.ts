import {
  BarChart3,
  BookOpen,
  Building2,
  Crosshair,
  Database,
  GitCompare,
  Globe2,
  LayoutDashboard,
  LineChart,
  Map,
  Network,
  Route,
  FileText,
  type LucideIcon,
} from "lucide-react";

export type NavItemDef = {
  href: string;
  label: string;
  icon: LucideIcon;
  description?: string;
};

/**
 * The canonical product navigation. Single source of truth shared by the home
 * "tactical command rail" (`TacticalSidebar`) and the inner `PageFrame` pill nav
 * so the two navigation surfaces stay in lockstep. Previously each surface owned
 * its own array and the home rail linked to none of these routes.
 */
export const WORKSPACE_NAV: NavItemDef[] = [
  { href: "/", label: "Map", icon: Map, description: "City-first OSINT atlas" },
  { href: "/osint", label: "OSINT", icon: Crosshair, description: "Search-first city intelligence lookup" },
  { href: "/compare", label: "Compare", icon: GitCompare, description: "City & country comparison" },
  { href: "/rankings", label: "Rankings", icon: BarChart3, description: "Evidence-backed ranking slices" },
  { href: "/indicators", label: "Indicators", icon: LineChart, description: "Indicator library" },
  { href: "/corridors", label: "Corridors", icon: Route, description: "Strategic trade corridors" },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Saved OSINT watchlists" },
  { href: "/reports", label: "Reports", icon: FileText, description: "Analyst report outputs" },
  { href: "/story-mode", label: "Story mode", icon: BookOpen, description: "Curated narratives" },
];

/**
 * Secondary / de-orphaned destinations. These are real routes the app owns that
 * were unreachable from the landing page (`/compare/blocs`, `/regions`,
 * `/datasets`). Surfaced as a muted secondary row.
 */
export const SECONDARY_NAV: NavItemDef[] = [
  { href: "/compare/blocs", label: "Blocs", icon: Network, description: "Geopolitical bloc aggregation" },
  { href: "/regions", label: "Regions", icon: Globe2, description: "Subnational region profiles" },
  { href: "/datasets", label: "Datasets", icon: Database, description: "Dataset catalog" },
];

/**
 * Entity directories ("Browse") — the app's destinations as data. Cities is the
 * search-first default scope.
 */
export const BROWSE_NAV: NavItemDef[] = [
  { href: "/osint", label: "Cities", icon: Building2, description: "Search-first city intelligence lookup" },
  { href: "/compare/blocs", label: "Countries", icon: Globe2, description: "Country factbooks" },
  { href: "/regions", label: "Regions", icon: Map, description: "Region (ADM1) profiles" },
];
