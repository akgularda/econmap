"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";

export type SidebarSectionState = "loaded" | "empty" | "pending" | "loading" | "error";

type SidebarSectionProps = {
  id: string;
  title: string;
  icon: LucideIcon;
  count?: number;
  state?: SidebarSectionState;
  defaultOpen?: boolean;
  description?: string;
  children: ReactNode;
};

/**
 * Reusable collapsible section shell: icon, title, count, collapse chevron, and a
 * `data-state` attribute (loaded | empty | pending | loading | error) for
 * testability and styling. Collapse is persisted in component state.
 */
export function SidebarSection({
  id,
  title,
  icon: Icon,
  count,
  state = "loaded",
  defaultOpen = true,
  description,
  children,
}: SidebarSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      data-section={id}
      data-state={state}
      className="space-y-2 border-b border-[#232825] pb-3"
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Icon aria-hidden className="size-3.5 shrink-0 text-[#a7b47f]" />
          <span className="truncate text-[10px] font-semibold uppercase tracking-[0.26em] text-[#a7b47f]">
            {title}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1.5">
          {typeof count === "number" ? (
            <span className="text-[10px] uppercase tracking-[0.18em] text-slate-600">{count}</span>
          ) : null}
          <ChevronDown
            aria-hidden
            className={`size-3.5 text-slate-500 transition-transform ${open ? "" : "-rotate-90"}`}
          />
        </span>
      </button>
      {description ? (
        <p className="text-[11px] leading-4 text-slate-500">{description}</p>
      ) : null}
      {open ? <div className="space-y-2">{children}</div> : null}
    </section>
  );
}
