"use client";

import Link from "next/link";
import { Database, Keyboard, PanelLeftClose } from "lucide-react";

type SidebarHeaderProps = {
  viewLabel: string;
  onCollapse: () => void;
};

/** Header: brand wordmark + live signal + a single collapse control. No `<h1>` hero. */
export function SidebarHeader({ viewLabel, onCollapse }: SidebarHeaderProps) {
  return (
    <div className="border-b border-[#232825] pb-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="signal-dot" />
            <p className="eyebrow">Command rail · live</p>
          </div>
          <p className="mt-1.5 text-[12px] font-bold uppercase tracking-[0.18em] text-slate-200">
            MapFactbook
          </p>
          <p className="mt-1 truncate text-[11px] uppercase tracking-[0.2em] text-slate-500">{viewLabel}</p>
        </div>
        <button
          type="button"
          onClick={onCollapse}
          aria-label="Collapse command rail"
          className="tactical-chip shrink-0 px-2 py-1.5 text-[10px]"
        >
          <PanelLeftClose aria-hidden className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

type SidebarFooterProps = {
  datasetWorkspaceSummary: { href: string; label: string; meta: string };
  onOpenShortcuts: () => void;
};

/** Footer: Dataset explorer link + keyboard-shortcuts trigger. */
export function SidebarFooter({ datasetWorkspaceSummary, onOpenShortcuts }: SidebarFooterProps) {
  return (
    <div className="space-y-1.5 border-t border-[#232825] pt-3">
      <Link
        href={datasetWorkspaceSummary.href}
        className="flex items-center gap-2 rounded-lg border border-[#272c29] bg-[#0f1112] px-2.5 py-2 transition hover:border-[#3b4334]"
      >
        <Database aria-hidden className="size-4 shrink-0 text-[#a7b47f]" />
        <span className="min-w-0">
          <span className="block text-[10px] uppercase tracking-[0.24em] text-slate-500">
            {datasetWorkspaceSummary.label}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-slate-300">{datasetWorkspaceSummary.meta}</span>
        </span>
      </Link>
      <button
        type="button"
        onClick={onOpenShortcuts}
        className="flex w-full items-center gap-2 rounded-lg border border-[#272c29] bg-[#0f1112] px-2.5 py-2 text-[11px] text-slate-400 transition hover:border-[#3b4334]"
      >
        <Keyboard aria-hidden className="size-4 shrink-0" />
        Keyboard shortcuts
        <kbd className="ml-auto rounded border border-[#3a4037] bg-[#121515] px-1.5 py-0.5 text-[9px] text-slate-500">
          ⌘/
        </kbd>
      </button>
    </div>
  );
}
