import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type NavItemProps = {
  href: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
  muted?: boolean;
};

/** Icon + label link with an active (`aria-current="page"`) accent state. */
export function NavItem({ href, label, icon: Icon, active = false, muted = false }: NavItemProps) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`nav-item ${muted ? "text-[12px]" : "text-[13px]"}`}
    >
      <Icon aria-hidden className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}
