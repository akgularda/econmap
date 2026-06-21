"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { PageFrame } from "@/components/layout/page-frame";
import {
  fetchCorridorIndex,
  fetchCorridorDetail,
  CorridorIndexEntry,
  CorridorDetail,
} from "@/lib/asset-client";
import { LoadingState } from "@/components/states/loading-state";

// Code-split maplibre-gl (+ its CSS, ~250 KB) off the corridors route's initial chunk.
// ssr:false is required under static export.
const AssetMap = dynamic(
  () => import("@/components/charts/asset-map").then((m) => m.AssetMap),
  { ssr: false, loading: () => <LoadingState label="Loading corridor map..." /> },
);

const numberFormat = new Intl.NumberFormat("en-US");

export function CorridorsPage() {
  const [index, setIndex] = useState<CorridorIndexEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CorridorDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetchCorridorIndex().then((data) => {
      setIndex(data);
      setActiveId(data[0]?.id ?? null);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    setDetailLoading(true);
    fetchCorridorDetail(activeId).then((data) => {
      if (cancelled) return;
      setDetail(data);
      setDetailLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  if (loading) return <LoadingState label="Mapping strategic corridors..." />;

  const active = index.find((c) => c.id === activeId) ?? null;
  if (!active) return <PageFrame eyebrow="Corridors" title="No Data" description=""><div /></PageFrame>;

  const center: [number, number] = [
    (active.bbox.minLon + active.bbox.maxLon) / 2,
    (active.bbox.minLat + active.bbox.maxLat) / 2,
  ];
  const capped = active.renderedAssetCount < active.totalAssetCount;

  return (
    <PageFrame
      eyebrow="Corridors"
      title="Strategic Chokepoints"
      description="Monitor global infrastructure clustered around critical maritime and trade corridors."
    >
      <div className="mb-6 flex flex-wrap gap-2">
        {index.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveId(c.id)}
            className={`rounded-full border px-4 py-2 text-sm transition ${
              active.id === c.id
                ? "border-[var(--signal)]/45 bg-[var(--signal)]/10 text-cyan-100"
                : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
        <div className="space-y-6">
          <section className="tactical-panel rounded-[2rem] p-6">
            <h2 className="text-xl font-semibold text-white">{active.name}</h2>
            <p className="mt-2 text-sm text-slate-400">{active.description}</p>

            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <span className="text-sm text-slate-400">Total Tracked Assets</span>
                <span className="metric-value text-xl text-white">
                  {numberFormat.format(active.totalAssetCount)}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <span className="text-sm text-slate-400">Critical Priority</span>
                <span className="metric-value text-xl text-[var(--signal)]">
                  {numberFormat.format(active.criticalCount)}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <span className="text-sm text-slate-400">Energy Infrastructure</span>
                <span className="metric-value text-xl text-yellow-400">
                  {numberFormat.format(active.energyCount)}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <span className="text-sm text-slate-400">Ports &amp; Transit</span>
                <span className="metric-value text-xl text-blue-400">
                  {numberFormat.format(active.transportCount)}
                </span>
              </div>
            </div>

            {capped ? (
              <p className="mt-5 text-[11px] leading-5 text-amber-300/80">
                Map shows the top {numberFormat.format(active.renderedAssetCount)} of{" "}
                {numberFormat.format(active.totalAssetCount)} assets by priority. Stat counts above
                reflect the full tracked set.
              </p>
            ) : null}
          </section>
        </div>

        <div className="relative h-[600px] w-full overflow-hidden rounded-[2rem] border border-white/10">
          {detailLoading || !detail ? (
            <LoadingState label="Loading corridor assets..." />
          ) : (
            <AssetMap key={detail.id} assets={detail.assets} center={center} />
          )}
        </div>
      </div>
    </PageFrame>
  );
}
