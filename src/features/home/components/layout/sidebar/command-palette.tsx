"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search } from "lucide-react";

import { BROWSE_NAV, SECONDARY_NAV, WORKSPACE_NAV } from "@/components/layout/nav-items";

export type CommandPaletteCity = {
  href: string;
  name: string;
  meta: string;
};

type CommandEntry = {
  id: string;
  label: string;
  hint: string;
  href: string;
  /** Right-aligned group badge: "Workspace" | "Browse" | "City". */
  kind: string;
};

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  cities: CommandPaletteCity[];
};

/**
 * Self-contained command palette: portal overlay, role="dialog", Esc to close,
 * roving focus over a filtered destination list (every Workspace / Browse route
 * plus city search results). No external dependency — only React + lucide.
 *
 * The dialog body is a separate component mounted only while `open`, so its
 * `query` / `activeIndex` state resets cleanly on each open without resetting
 * state from inside an effect.
 */
export function CommandPalette({ open, onClose, cities }: CommandPaletteProps) {
  // Esc closes from anywhere while open.
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(<CommandPaletteDialog onClose={onClose} cities={cities} />, document.body);
}

function CommandPaletteDialog({
  onClose,
  cities,
}: {
  onClose: () => void;
  cities: CommandPaletteCity[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const allEntries = useMemo<CommandEntry[]>(() => {
    const toNav =
      (kind: string) =>
      (item: { href: string; label: string; description?: string }): CommandEntry => ({
        id: `nav:${item.href}:${item.label}`,
        label: item.label,
        hint: item.description ?? item.href,
        href: item.href,
        kind,
      });
    // Grouped by kind (Workspace → Browse → City) so the badge column reads as sections.
    const navEntries: CommandEntry[] = [
      ...WORKSPACE_NAV.map(toNav("Workspace")),
      ...SECONDARY_NAV.map(toNav("Workspace")),
      ...BROWSE_NAV.map(toNav("Browse")),
    ];
    // De-dupe nav by href so a route reachable from two menus (e.g. /osint, in both Workspace
    // and Browse) isn't listed twice; the first (Workspace) wins.
    const seenHrefs = new Set<string>();
    const dedupedNav = navEntries.filter((entry) =>
      seenHrefs.has(entry.href) ? false : (seenHrefs.add(entry.href), true),
    );
    const cityEntries: CommandEntry[] = cities.slice(0, 12).map((city, index) => ({
      id: `city:${city.href}:${index}`,
      label: city.name,
      hint: city.meta,
      href: city.href,
      kind: "City",
    }));
    return [...dedupedNav, ...cityEntries];
  }, [cities]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return allEntries;
    }
    return allEntries.filter(
      (entry) =>
        entry.label.toLowerCase().includes(normalized) || entry.hint.toLowerCase().includes(normalized),
    );
  }, [allEntries, query]);

  // Clamp selection to the current result count (no setState-in-effect needed).
  const selectedIndex = Math.min(activeIndex, Math.max(filtered.length - 1, 0));

  // Focus the input once on open.
  useEffect(() => {
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, []);

  const activate = (entry: CommandEntry | undefined) => {
    if (!entry) {
      return;
    }
    onClose();
    router.push(entry.href);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex(Math.min(selectedIndex + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex(Math.max(selectedIndex - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      activate(filtered[selectedIndex]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center bg-black/60 px-4 pt-[12vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(event) => event.stopPropagation()}
        className="tactical-panel w-full max-w-lg overflow-hidden rounded-xl border border-[#31362f] shadow-[0_40px_120px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-center gap-2 border-b border-[#232825] px-3 py-2.5">
          <Search aria-hidden className="size-4 shrink-0 text-slate-500" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Search destinations and cities"
            aria-label="Search destinations and cities"
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
          />
          <kbd className="rounded border border-[#3a4037] bg-[#121515] px-1.5 py-0.5 text-[9px] text-slate-500">
            esc
          </kbd>
        </div>
        <ul className="tactical-scroll max-h-[50vh] overflow-y-auto py-1.5">
          {filtered.length > 0 ? (
            filtered.map((entry, index) => (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => activate(entry)}
                  onMouseEnter={() => setActiveIndex(index)}
                  aria-current={index === selectedIndex ? "true" : undefined}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left transition ${
                    index === selectedIndex ? "bg-[#23291f]/90" : "hover:bg-[#181c19]"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-white">{entry.label}</span>
                    <span className="block truncate text-[10px] uppercase tracking-[0.14em] text-slate-500">
                      {entry.hint}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="rounded border border-[#3a4037] bg-[#121515] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-slate-500">
                      {entry.kind}
                    </span>
                    {index === selectedIndex ? (
                      <CornerDownLeft aria-hidden className="size-3.5 text-slate-500" />
                    ) : null}
                  </span>
                </button>
              </li>
            ))
          ) : (
            <li className="px-3 py-4 text-center text-[12px] text-slate-500">No matches.</li>
          )}
        </ul>
        <div className="flex items-center gap-3 border-t border-[#232825] px-3 py-2 text-[10px] text-slate-500">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-[#3a4037] px-1">↑</kbd>
            <kbd className="rounded border border-[#3a4037] px-1">↓</kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-[#3a4037] px-1">↵</kbd> open
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-[#3a4037] px-1">esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
