import { BROWSE_NAV } from "@/components/layout/nav-items";
import { NavItem } from "@/features/home/components/layout/sidebar/nav-item";

type BrowseNavProps = {
  /** Opens the command palette scoped to a directory (Cities is the default scope). */
  onBrowse?: () => void;
};

/** Entity directories: Cities / Countries / Regions — the app's destinations as data. */
export function BrowseNav({ onBrowse }: BrowseNavProps) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {BROWSE_NAV.map((item) =>
        onBrowse && item.label === "Cities" ? (
          <button
            key={item.href}
            type="button"
            onClick={onBrowse}
            className="nav-item text-[12px]"
          >
            <item.icon aria-hidden className="size-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </button>
        ) : (
          <NavItem key={item.href} href={item.href} label={item.label} icon={item.icon} muted />
        ),
      )}
    </div>
  );
}
