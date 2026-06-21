"use client";

import { usePathname } from "next/navigation";

import { SECONDARY_NAV, WORKSPACE_NAV } from "@/components/layout/nav-items";
import { NavItem } from "@/features/home/components/layout/sidebar/nav-item";

type WorkspaceNavProps = {
  /** Override the active route (defaults to the live pathname). */
  currentPath?: string;
};

/** True when `href` is the current route. "/" only matches "/" exactly; deeper
 * routes match on prefix so `/compare/blocs` keeps `/compare` highlighted. */
function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Global product navigation: every top-level route the app owns. Source of truth
 * is the shared `WORKSPACE_NAV` / `SECONDARY_NAV` constant so the home rail and
 * `PageFrame` stay in lockstep. Active state is derived from the live pathname
 * (was hardcoded to "/", so only "Map" ever lit up).
 */
export function WorkspaceNav({ currentPath }: WorkspaceNavProps) {
  const pathname = usePathname();
  const active = currentPath ?? pathname ?? "/";

  // Exactly one item is active: the MOST SPECIFIC matching href. Prevents both "/compare" and
  // "/compare/blocs" lighting up at once on the /compare/blocs route.
  const activeHref = [...WORKSPACE_NAV, ...SECONDARY_NAV]
    .map((item) => item.href)
    .filter((href) => isActive(href, active))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-1.5">
        {WORKSPACE_NAV.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={item.href === activeHref}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {SECONDARY_NAV.map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={item.href === activeHref}
            muted
          />
        ))}
      </div>
    </div>
  );
}
