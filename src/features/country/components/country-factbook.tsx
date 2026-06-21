"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

import { MetricCard } from "@/components/data/metric-card";
import { PageFrame } from "@/components/layout/page-frame";
import { EmptyState } from "@/components/states/empty-state";
import { countryProfiles } from "@/data/mock/countries";
import { buildRiskScore } from "@/features/risk/risk-engine";
import { findSimilarEconomies } from "@/features/similarity/similarity-engine";
import {
  getForecasts,
  getHistoricalEvents,
  getRegionsForCountry,
  getTradeFlowsForCountry,
} from "@/lib/factbook";
import { CountryAssets } from "./country-assets";
import { CountryCities } from "./country-cities";

// Code-split recharts off the country route's initial chunk: the charts live behind tab state
// (Overview/Trade/Demographics) and recharts is ~150 KB. ssr:false is required under static export.
const ChartSkeleton = () => (
  <div className="h-[280px] w-full animate-pulse rounded-[2rem] border border-white/10 bg-white/[0.03]" />
);

const MetricBarChart = dynamic(
  () => import("@/components/charts/metric-bar-chart").then((m) => m.MetricBarChart),
  { ssr: false, loading: ChartSkeleton },
);
const MetricLineChart = dynamic(
  () => import("@/components/charts/metric-line-chart").then((m) => m.MetricLineChart),
  { ssr: false, loading: ChartSkeleton },
);

const tabs = [
  "Overview",
  "Economy",
  "Trade",
  "Demographics",
  "Cities",
  "Assets",
  "Labor",
  "Government Finance",
  "Monetary & Currency",
  "Energy & Sustainability",
  "Risk",
  "Methodology / Sources",
] as const;

export function CountryFactbook({ slug }: { slug: string }) {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Overview");

  const profile = countryProfiles.find((entry) => entry.country.slug === slug);
  const forecast = getForecasts(slug);
  const regions = getRegionsForCountry(slug);
  const tradeFlows = getTradeFlowsForCountry(slug);
  const events = getHistoricalEvents(slug);
  const peers = findSimilarEconomies(slug, 4);

  const growthForecast = forecast.find((entry) => entry.indicatorId === "gdp-growth");
  const risk = buildRiskScore(slug);

  const growthSeries =
    growthForecast?.scenarios[0]?.values.map((point) => ({
      year: point.year,
      forecast: point.value,
    })) ?? [];

  if (!profile) {
    return (
      <PageFrame
        eyebrow="Country factbook"
        title="Coverage unavailable"
        description="The requested country is outside the current coverage set."
      >
        <EmptyState
          title="Country not found"
          description="Try one of the showcase countries such as the United States, Germany, India, Brazil, or Turkiye."
        />
      </PageFrame>
    );
  }

  return (
    <PageFrame
      eyebrow={`${profile.country.flag} Country factbook`}
      title={profile.country.name}
      description={`${profile.country.capital} - ${profile.country.region} - Official-source-backed annual indicators with transparent derived risk and forecast layers.`}
    >
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-full border px-4 py-2 text-sm ${
              activeTab === tab
                ? "border-cyan-300/40 bg-cyan-300/10 text-cyan-100"
                : "border-white/10 bg-white/5 text-slate-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {profile.overview.map((metric) => (
          <MetricCard
            key={metric.label}
            label={metric.label}
            value={metric.value}
            unit={metric.unit}
            status={metric.status}
          />
        ))}
      </div>

      {activeTab === "Cities" ? (
        <CountryCities countryIso3={profile.country.iso3} />
      ) : null}

      {activeTab === "Assets" ? (
        <CountryAssets 
          countryIso3={profile.country.iso3} 
          center={[profile.country.longitude, profile.country.latitude]} 
        />
      ) : null}

      {activeTab === "Overview" ? (
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
          <MetricLineChart data={growthSeries} dataKey="forecast" label="Growth forecast path" />
          <div className="space-y-4 rounded-[2rem] border border-white/10 bg-slate-950/75 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Snapshot</p>
            {profile.highlights.map((highlight) => (
              <p key={highlight} className="text-sm leading-7 text-slate-300">
                {highlight}
              </p>
            ))}
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-sm font-medium text-white">Closest peers</p>
              <div className="mt-3 space-y-2">
                {peers.map((peer) => (
                  <div
                    key={peer.country.slug}
                    className="flex items-center justify-between text-sm text-slate-300"
                  >
                    <span>
                      {peer.country.flag} {peer.country.name}
                    </span>
                    <span className="text-cyan-300">{peer.score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "Trade" ? (
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          {profile.topExports.length ? (
            <MetricBarChart
              data={profile.topExports.map((entry) => ({ name: entry.name, share: entry.share }))}
              dataKey="share"
              xKey="name"
              label="Top export groups"
            />
          ) : (
            <EmptyState
              title="Trade composition pending"
              description="Bilateral partner and commodity detail will move to real-source coverage when the trade adapter is wired beyond aggregate totals."
            />
          )}
          <div className="rounded-[2rem] border border-white/10 bg-slate-950/75 p-5">
            <p className="text-sm font-medium text-white">Trade flows</p>
            <div className="mt-4 space-y-3">
              {tradeFlows.length ? (
                tradeFlows.map((flow) => (
                  <div
                    key={flow.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300"
                  >
                    <p className="font-medium text-white">
                      {flow.flowType.toUpperCase()} - {flow.partnerSlug.replaceAll("-", " ")}
                    </p>
                    <p className="mt-2">{flow.commodityGroup}</p>
                    <p className="mt-1 text-slate-400">
                      ${Math.round(flow.valueUsd / 1_000_000_000)}B - {flow.sharePercent}% share
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="Partner flow detail unavailable"
                  description="The current real-data cutover covers aggregate trade indicators first. Bilateral flows remain to be migrated to a real-source trade feed."
                />
              )}
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "Demographics" ? (
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <MetricBarChart
            data={profile.overview
              .filter((metric) => ["Population"].includes(metric.label))
              .map((metric) => ({ name: metric.label, value: metric.value ?? 0 }))}
            dataKey="value"
            xKey="name"
            label="Demographic scale"
          />
          <div className="rounded-[2rem] border border-white/10 bg-slate-950/75 p-5">
            <p className="text-sm font-medium text-white">ADM1 drill-down</p>
            <div className="mt-4 space-y-3">
              {regions.length ? (
                regions.map((region) => (
                  <div
                    key={region.slug}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <p className="font-medium text-white">{region.name}</p>
                    <p className="mt-2 text-sm text-slate-300">
                      Population {Math.round(region.population / 1_000_000)}M - GDP $
                      {Math.round(region.gdpCurrentUsd / 1_000_000_000)}B
                    </p>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No subnational coverage"
                  description="ADM1 coverage is currently limited to selected showcase countries."
                />
              )}
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === "Risk" ? (
        <div className="mt-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="rounded-[2rem] border border-white/10 bg-slate-950/75 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Composite risk</p>
            <p className="mt-4 text-5xl font-semibold text-white">{risk.score}</p>
            <p className="mt-2 text-sm text-slate-400">{risk.band.toUpperCase()} band</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {risk.dimensions.map((dimension) => (
              <div
                key={dimension.id}
                className="rounded-3xl border border-white/10 bg-slate-950/75 p-4"
              >
                <p className="text-sm font-medium text-white">{dimension.label}</p>
                <p className="mt-2 text-2xl font-semibold text-cyan-300">
                  {dimension.score.toFixed(1)}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">{dimension.narrative}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === "Methodology / Sources" ? (
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          <div className="rounded-[2rem] border border-white/10 bg-slate-950/75 p-5">
            <p className="text-sm font-medium text-white">Sources</p>
            <div className="mt-4 space-y-3">
              {profile.sourceSummary.map((source) => (
                <div
                  key={source.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <p className="font-medium text-white">{source.name}</p>
                  <p className="mt-2 text-sm text-slate-300">{source.methodology}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">
                    {source.coverage} - updated {source.updatedAt}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-slate-950/75 p-5">
            <p className="text-sm font-medium text-white">Historical timeline</p>
            <div className="mt-4 space-y-3">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <p className="font-medium text-white">
                    {event.year} - {event.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{event.summary}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </PageFrame>
  );
}
