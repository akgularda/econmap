"use client";

/**
 * A ranking slice driven by the NEW slim enrichment index (Ookla fixed/mobile broadband + WHO
 * PM2.5), client-side so it stays out of the server rankings model. Joins city names from the
 * slim search index and lists the top cities by fixed broadband. Renders nothing if the
 * enrichment index is empty (e.g. a fresh clone), so it never shows an empty shell.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import {
  loadCitySearchIndex,
  loadEnrichmentIndex,
  type CityEnrichment,
  type CitySearchIndexEntry,
} from "@/lib/city-data-client";

export function ConnectivityRanking() {
  const [enrichment, setEnrichment] = useState<Record<string, CityEnrichment> | null>(null);
  const [index, setIndex] = useState<CitySearchIndexEntry[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadEnrichmentIndex(), loadCitySearchIndex()]).then(([e, idx]) => {
      if (cancelled) return;
      setEnrichment(e);
      setIndex(idx);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    if (!enrichment || !index) return [];
    const byId = new Map(index.map((c) => [c.cityId, c]));
    return Object.entries(enrichment)
      .filter(([, m]) => m.fixedMbps != null)
      .map(([id, m]) => ({ city: byId.get(id), m }))
      .filter((r): r is { city: CitySearchIndexEntry; m: CityEnrichment } => Boolean(r.city))
      .sort((a, b) => (b.m.fixedMbps ?? 0) - (a.m.fixedMbps ?? 0))
      .slice(0, 25);
  }, [enrichment, index]);

  // Loaded but nothing to show (fresh clone / no enrichment shipped) → render nothing.
  if (enrichment && index && rows.length === 0) return null;

  return (
    <div className="mt-6 rounded-[2rem] border border-white/10 bg-slate-950/75 p-5">
      <h2 className="text-lg font-semibold text-white">Top cities by fixed broadband</h2>
      <p className="mb-4 mt-1 text-sm leading-6 text-slate-400">
        Ranked from Ookla open-data fixed broadband (source-backed), with mobile and WHO PM2.5 where available.
      </p>
      {!enrichment || !index ? (
        <p className="text-sm text-slate-500">Loading connectivity data…</p>
      ) : (
        <table className="min-w-full text-left text-sm text-slate-300">
          <thead>
            <tr className="border-b border-white/10 text-slate-500">
              <th className="pb-3 pr-4">Rank</th>
              <th className="pb-3 pr-4">City</th>
              <th className="pb-3 pr-4 text-right">Fixed (Mbps)</th>
              <th className="pb-3 pr-4 text-right">Mobile (Mbps)</th>
              <th className="pb-3 pr-4 text-right">PM2.5</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.city.cityId} className="border-b border-white/5">
                <td className="py-3 pr-4 text-slate-400">#{i + 1}</td>
                <td className="py-3 pr-4 text-white">
                  <Link href={`/city/${r.city.slug}`} className="hover:text-cyan-200">
                    {r.city.name}
                  </Link>
                  <span className="ml-2 text-xs text-slate-500">{r.city.countryIso3}</span>
                </td>
                <td className="py-3 pr-4 text-right tabular-nums">{Math.round(r.m.fixedMbps!).toLocaleString("en-US")}</td>
                <td className="py-3 pr-4 text-right tabular-nums">
                  {r.m.mobileMbps != null ? Math.round(r.m.mobileMbps).toLocaleString("en-US") : "—"}
                </td>
                <td className="py-3 pr-4 text-right tabular-nums">{r.m.pm25 ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
