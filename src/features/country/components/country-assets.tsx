"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { AssetRecord, CountryAssetAggregation } from "@/domain/types";
import { fetchCountryAssets, fetchAssetManifest } from "@/lib/asset-client";
import { MetricCard } from "@/components/data/metric-card";
import { EmptyState } from "@/components/states/empty-state";
import { LoadingState } from "@/components/states/loading-state";

// Code-split maplibre-gl (+ its CSS, ~250 KB) off the country route's initial chunk: the asset map
// only renders inside the Assets tab. ssr:false is required under static export.
const AssetMap = dynamic(
  () => import("@/components/charts/asset-map").then((m) => m.AssetMap),
  { ssr: false, loading: () => <LoadingState label="Loading asset map..." /> },
);

export function CountryAssets({ countryIso3, center }: { countryIso3: string, center: [number, number] }) {
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [aggregation, setAggregation] = useState<CountryAssetAggregation | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    Promise.all([
      fetchCountryAssets(countryIso3),
      fetchAssetManifest()
    ]).then(([assetData, manifest]) => {
      setAssets(assetData);
      setAggregation(manifest[countryIso3.toUpperCase()] || null);
      setLoading(false);
    });
  }, [countryIso3]);

  if (loading) return <LoadingState label="Indexing infrastructure..." />;
  if (assets.length === 0) {
    return (
      <EmptyState
        title="No assets indexed"
        description="Global asset OSINT indexing is in progress for this region. Physical infrastructure and energy grids are prioritized."
      />
    );
  }

  const categories = Array.from(new Set(assets.map((a) => a.category)));
  
  const priorityScore = (priority: string | undefined) => {
    if (priority === 'critical') return 1;
    if (priority === 'high') return 2;
    if (priority === 'medium') return 3;
    if (priority === 'low') return 4;
    return 5;
  };

  const filteredAssets = (filter === "all" ? assets : assets.filter((a) => a.category === filter))
    .sort((a, b) => priorityScore(a.priority) - priorityScore(b.priority));

  const sourceMap = new Map<string, number>();
  assets.forEach(asset => {
    asset.sourceIds.forEach(id => {
      sourceMap.set(id, (sourceMap.get(id) || 0) + 1);
    });
  });

  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard 
          label="Total Assets" 
          value={aggregation?.totalAssets || assets.length} 
          unit="sites" 
          status="actual"
        />
        <MetricCard 
          label="Coverage Completeness" 
          value={aggregation ? Math.round(aggregation.completenessScore * 100) : 0} 
          unit="%" 
          status="actual"
        />
        <MetricCard 
          label="Unique Sources" 
          value={sourceMap.size} 
          unit="registries" 
          status="actual"
        />
        <MetricCard 
          label="Last Update" 
          value={aggregation ? new Date(aggregation.lastUpdatedAt).getFullYear() : 2024} 
          unit="" 
          status="actual"
        />
      </div>

      {aggregation && aggregation.totalAssets > assets.length ? (
        <p className="rounded-lg border border-amber-400/20 bg-amber-400/[0.06] px-4 py-2 text-[11px] leading-5 text-amber-300/90">
          The map, tables, and source/health panels reflect the top{" "}
          {assets.length.toLocaleString()} of {aggregation.totalAssets.toLocaleString()} tracked assets,
          ranked by priority. The Total Assets count above is the full source-backed figure.
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          <div className="h-[400px] w-full">
            <AssetMap assets={filteredAssets} center={center} />
          </div>

          <div className="flex flex-wrap gap-2 border-b border-white/10 pb-4">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 text-sm rounded-lg transition ${filter === "all" ? "bg-cyan-500/20 text-cyan-300" : "text-slate-400 hover:text-slate-200"}`}
            >
              All Assets
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-4 py-2 text-sm rounded-lg transition ${filter === cat ? "bg-cyan-500/20 text-cyan-300" : "text-slate-400 hover:text-slate-200"}`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1).replace("_", " ")}
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-4 py-3 font-medium text-slate-300">Asset Name</th>
                  <th className="px-4 py-3 font-medium text-slate-300">Type</th>
                  <th className="px-4 py-3 font-medium text-slate-300">Status</th>
                  <th className="px-4 py-3 font-medium text-slate-300 text-right">Capacity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredAssets.slice(0, 50).map((asset) => (
                  <tr key={asset.assetId} className="hover:bg-white/5 group">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white group-hover:text-cyan-300 transition">{asset.name}</div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider">{asset.assetId}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{asset.subtype}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                        asset.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-slate-500/10 text-slate-400'
                      }`}>
                        {asset.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-300 font-mono">
                      {asset.capacity ? `${asset.capacity.toLocaleString()} ${asset.capacityUnit || ''}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Source Audit</h3>
            <div className="mt-4 space-y-4">
              {Array.from(sourceMap.entries()).map(([sourceId, count]) => (
                <div key={sourceId} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-slate-300">{sourceId.toUpperCase()}</span>
                    <span className="text-slate-500">{count} records</span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-white/5 overflow-hidden">
                    <div 
                      className="h-full bg-slate-500" 
                      style={{ width: `${(count / assets.length) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Asset Health</h3>
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-slate-300">Fresh: {assets.filter(a => a.freshness === 'fresh').length}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="h-2 w-2 rounded-full bg-yellow-500" />
                <span className="text-slate-300">Stale: {assets.filter(a => a.freshness === 'stale').length}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-5">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Development Pipeline</h3>
            <div className="mt-4 space-y-3">
              <div className="flex justify-between items-center text-sm border-l-2 border-green-500 pl-3">
                <span className="text-slate-300">Active / Operational</span>
                <span className="text-white font-medium">{assets.filter(a => a.status === 'active').length}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-l-2 border-yellow-500 pl-3">
                <span className="text-slate-300">Under Construction</span>
                <span className="text-white font-medium">{assets.filter(a => a.status === 'under_construction').length}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-l-2 border-blue-500 pl-3">
                <span className="text-slate-300">Announced / Planning</span>
                <span className="text-white font-medium">{assets.filter(a => a.status === 'announced').length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
