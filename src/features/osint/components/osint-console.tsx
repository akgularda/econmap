"use client";

/**
 * Standalone OSINT tool (/osint): a search-first city-intelligence console.
 *
 * Reuses the EXISTING client data surface — the slim search index + the Range-addressable
 * dossier bundle (loadCityEntities / loadCityCoverageShell) — so it adds zero new data
 * pipeline. Pick a city, read its source-backed entities (airports/ports/power/universities/…)
 * with provenance + explicit coverage states, then deep-link into the full /city/<slug> dossier.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Crosshair,
  ExternalLink,
  Factory,
  GraduationCap,
  MapPin,
  Plane,
  Search,
  Ship,
  TrainFront,
  Truck,
  Zap,
  type LucideIcon,
} from "lucide-react";

import {
  loadCityCoverageShell,
  loadCityEntities,
  loadCitySearchIndex,
  type CityCoverageShell,
  type CitySearchIndexEntry,
} from "@/lib/city-data-client";

type Entity = NonNullable<Awaited<ReturnType<typeof loadCityEntities>>>["entities"][number];
type Sources = NonNullable<Awaited<ReturnType<typeof loadCityEntities>>>["sources"];

/** Search entry with its lowercased haystack precomputed once (not per keystroke). */
type Prepared = { e: CitySearchIndexEntry; name: string; hay: string };

const ENTITY_ICON: Record<string, LucideIcon> = {
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

const ENTITY_LABEL: Record<string, string> = {
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

const COVERAGE_STYLE: Record<string, { dot: string; text: string; label: string }> = {
  mapped: { dot: "bg-emerald-400", text: "text-emerald-200", label: "Covered" },
  documented: { dot: "bg-amber-400", text: "text-amber-200", label: "Partial" },
  missing: { dot: "bg-slate-500", text: "text-slate-400", label: "Not covered yet" },
};

function fmtPop(pop: number | null | undefined): string {
  if (pop == null) return "pop. unknown";
  return `${pop.toLocaleString("en-US")} pop.`;
}

function rank(p: Prepared, q: string): number {
  if (p.name === q) return 0;
  if (p.name.startsWith(q)) return 1;
  if (p.name.includes(q)) return 2;
  return 3; // matched on alias / country / admin only
}

export function OsintConsole() {
  const [index, setIndex] = useState<Prepared[] | null>(null);
  const [indexFailed, setIndexFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<CitySearchIndexEntry | null>(null);
  const [entities, setEntities] = useState<Entity[] | null>(null);
  const [sources, setSources] = useState<Sources>([]);
  const [coverage, setCoverage] = useState<CityCoverageShell | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [hasDossier, setHasDossier] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Monotonic token: only the latest selection is allowed to write detail state, so an
  // out-of-order dossier resolution can't render one city's data under another's header.
  const latestReq = useRef(0);

  // Load the slim search index once; precompute lowercased haystacks for cheap filtering.
  useEffect(() => {
    let cancelled = false;
    loadCitySearchIndex()
      .then((idx) => {
        if (cancelled) return;
        if (idx.length === 0) {
          setIndexFailed(true);
          setIndex([]);
          return;
        }
        setIndex(
          idx.map((e) => ({
            e,
            name: e.name.toLowerCase(),
            hay: [e.name, e.countryIso3, e.admin1Name ?? "", ...e.aliases].join(" ").toLowerCase(),
          })),
        );
      })
      .catch(() => {
        if (!cancelled) {
          setIndexFailed(true);
          setIndex([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // "/" focuses the search box (consistent with the home command rail).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    if (!index) return [];
    const q = query.trim().toLowerCase();
    const pool = q ? index.filter((p) => p.hay.includes(q)) : index;
    return [...pool]
      .sort((a, b) => {
        if (q) {
          const r = rank(a, q) - rank(b, q);
          if (r !== 0) return r;
        }
        if (a.e.isMajorCity !== b.e.isMajorCity) return a.e.isMajorCity ? -1 : 1;
        return (b.e.population ?? 0) - (a.e.population ?? 0);
      })
      .slice(0, 50);
  }, [index, query]);

  function selectCity(entry: CitySearchIndexEntry) {
    const reqId = ++latestReq.current;
    setSelected(entry);
    setDetailLoading(true);
    setEntities(null);
    setCoverage(null);
    setSources([]);
    setHasDossier(null);

    Promise.all([loadCityEntities(entry.cityId), loadCityCoverageShell(entry.cityId)])
      .then(([ent, cov]) => {
        if (reqId !== latestReq.current) return; // a newer selection superseded this one
        setEntities(ent?.entities ?? []);
        setSources(ent?.sources ?? []);
        setCoverage(cov);
        setHasDossier(Boolean(ent || cov));
        setDetailLoading(false);
      })
      .catch(() => {
        if (reqId !== latestReq.current) return;
        setEntities([]);
        setSources([]);
        setCoverage(null);
        setHasDossier(false);
        setDetailLoading(false);
      });
  }

  const grouped = useMemo(() => {
    const map = new Map<string, Entity[]>();
    for (const e of entities ?? []) {
      const arr = map.get(e.entityType) ?? [];
      arr.push(e);
      map.set(e.entityType, arr);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [entities]);

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
      <nav className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 bg-slate-950/80 px-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm font-medium text-slate-300 transition-colors hover:text-white">
            {"<- Map"}
          </Link>
          <span className="text-sm text-slate-600">/</span>
          <span className="flex items-center gap-2 text-sm font-semibold text-white">
            <Crosshair aria-hidden className="size-4 text-cyan-300" />
            OSINT
          </span>
        </div>
        <span className="hidden text-xs text-slate-500 sm:block">
          {index ? `${index.length.toLocaleString("en-US")} cities indexed` : "loading index…"}
        </span>
      </nav>
      <h1 className="sr-only">OSINT city intelligence console</h1>

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[minmax(320px,420px)_1fr]">
        {/* Search column */}
        <aside aria-label="City search" className="flex min-h-0 flex-col border-r border-white/10 bg-slate-950">
          <div className="border-b border-white/10 p-3">
            <div className="relative">
              <Search aria-hidden className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search any city, country, region…"
                aria-label="Search cities"
                autoFocus
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-12 text-sm text-white placeholder:text-slate-500 outline-none focus:border-cyan-300/40 focus:ring-2 focus:ring-cyan-300/30"
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400">
                /
              </kbd>
            </div>
          </div>
          <ul
            aria-label={results.length ? `Search results, ${results.length} cities` : "Search results"}
            className="min-h-0 flex-1 overflow-y-auto p-2"
          >
            {!index ? (
              <li className="px-3 py-6 text-center text-sm text-slate-500">Loading city index…</li>
            ) : indexFailed ? (
              <li className="px-3 py-6 text-center text-sm text-slate-500">
                The city index is empty or could not be loaded.
              </li>
            ) : results.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-slate-500">No cities match “{query}”.</li>
            ) : (
              results.map((p) => {
                const c = p.e;
                const isSel = selected?.cityId === c.cityId;
                return (
                  <li key={c.cityId}>
                    <button
                      type="button"
                      onClick={() => selectCity(c)}
                      aria-current={isSel ? "true" : undefined}
                      className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition-colors ${
                        isSel ? "bg-cyan-300/10 text-white" : "text-slate-300 hover:bg-white/5"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{c.name}</span>
                        <span className="block truncate text-xs text-slate-500">
                          {[c.admin1Name, c.countryIso3].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <span className="shrink-0 text-[11px] text-slate-500">{fmtPop(c.population)}</span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </aside>

        {/* Detail column */}
        <section
          aria-label={selected ? `${selected.name} intelligence brief` : "City detail"}
          aria-live="polite"
          aria-busy={detailLoading}
          className="min-h-0 overflow-y-auto"
        >
          {!selected ? (
            <EmptyState />
          ) : (
            <div className="mx-auto max-w-4xl space-y-5 p-5 sm:p-8">
              <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-2xl font-semibold text-white">
                    <MapPin aria-hidden className="size-5 text-cyan-300" />
                    {selected.name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    {[selected.admin1Name, selected.countryIso3].filter(Boolean).join(" · ")} · {fmtPop(selected.population)}
                  </p>
                </div>
                <Link
                  href={`/city/${selected.slug}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-xs font-medium text-cyan-50 transition-colors hover:bg-cyan-300/20"
                >
                  Full dossier <ExternalLink aria-hidden className="size-3.5" />
                </Link>
              </header>

              {detailLoading ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-400">
                  Loading dossier…
                </div>
              ) : hasDossier === false ? (
                <div className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-6 text-sm text-amber-100">
                  <span className="font-medium">Identity-only city.</span> This city is in the registry but has no
                  source-backed dossier yet — only its name, location, and population are known. Coverage stays an
                  explicit gap rather than a fabricated value.
                </div>
              ) : (
                <>
                  {coverage ? <CoveragePanel coverage={coverage} /> : null}
                  <EntitiesPanel grouped={grouped} total={entities?.length ?? 0} />
                  {sources.length > 0 ? <SourcesPanel sources={sources} /> : null}
                </>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <Crosshair aria-hidden className="size-10 text-slate-700" />
      <p className="mt-4 max-w-md text-sm text-slate-400">
        Search for a city to pull its source-backed intelligence brief — infrastructure, power, research anchors,
        and connectivity, with explicit coverage states and provenance.
      </p>
      <p className="mt-2 text-xs text-slate-600">Press <kbd className="rounded border border-white/15 px-1">/</kbd> to search.</p>
    </div>
  );
}

function CoveragePanel({ coverage }: { coverage: CityCoverageShell }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.92))] p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Coverage</h3>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {coverage.categories.map((cat) => {
          const style = COVERAGE_STYLE[cat.state] ?? COVERAGE_STYLE.missing;
          return (
            <div key={cat.id} className="flex items-start gap-2.5 rounded-xl border border-white/5 bg-white/[0.03] p-3">
              <span className={`mt-1.5 size-2 shrink-0 rounded-full ${style.dot}`} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{cat.label}</span>
                  <span className={`text-[11px] ${style.text}`}>{style.label}</span>
                </div>
                <p className="mt-0.5 truncate text-xs text-slate-500" title={cat.detail}>
                  {cat.detail}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EntitiesPanel({ grouped, total }: { grouped: [string, Entity[]][]; total: number }) {
  if (total === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-400">
        No source-backed entities resolved for this city yet.
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.92))] p-5">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Entities</h3>
        <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-0.5 text-xs text-cyan-50">
          {total.toLocaleString("en-US")} source-backed
        </span>
      </div>
      <div className="mt-4 space-y-5">
        {grouped.map(([type, items]) => {
          const Icon = ENTITY_ICON[type] ?? Building2;
          return (
            <div key={type}>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                <Icon aria-hidden className="size-4 text-slate-500" />
                {ENTITY_LABEL[type] ?? type} <span className="text-slate-600">({items.length})</span>
              </div>
              <ul className="mt-2 space-y-1.5">
                {items.slice(0, 8).map((e) => {
                  const sub = e.importanceReason ?? e.operator ?? null;
                  return (
                    <li
                      key={e.entityId}
                      className="flex items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-white">{e.entityName}</span>
                        {sub ? (
                          <span className="block truncate text-xs text-slate-500" title={sub}>
                            {sub}
                          </span>
                        ) : null}
                      </span>
                      {e.exactSite ? (
                        <span className="shrink-0 rounded border border-emerald-300/20 bg-emerald-300/10 px-1.5 py-0.5 text-[10px] text-emerald-200">
                          exact
                        </span>
                      ) : (
                        <span className="shrink-0 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-400">
                          city
                        </span>
                      )}
                    </li>
                  );
                })}
                {items.length > 8 ? (
                  <li className="px-3 text-xs text-slate-500">+{items.length - 8} more in the full dossier</li>
                ) : null}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SourcesPanel({ sources }: { sources: Sources }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Sources</h3>
      <ul className="mt-3 flex flex-wrap gap-2">
        {sources.map((s) => {
          const chip = (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300">
              {s.name}
            </span>
          );
          return (
            <li key={s.id}>
              {s.url ? (
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:opacity-80">
                  {chip}
                </a>
              ) : (
                chip
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
