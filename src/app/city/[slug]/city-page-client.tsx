"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { CityWorkspace } from "@/features/city/components/city-workspace";
import type { CityRegistryEntry } from "@/lib/city-data-client";
import { findCityBySlug } from "@/lib/city-data-client";
import {
  loadCommandCenterCityPanelClient,
  loadCommandCenterManifestClient,
} from "@/lib/command-center-client";
import type { CommandCenterCityPanel, CommandCenterManifest } from "@/domain/types";

type CityPageClientProps = {
  slug: string;
};

export function CityPageClient({ slug }: CityPageClientProps) {
  const [city, setCity] = useState<CityRegistryEntry | null>(null);
  const [panel, setPanel] = useState<CommandCenterCityPanel | null>(null);
  const [manifest, setManifest] = useState<CommandCenterManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      // The command-center manifest does not depend on the city, so kick it off in parallel with
      // the first city lookup instead of waiting for the (Range-fetched) city to resolve first.
      // findCityBySlug + loadCommandCenterCityPanelClient share one deduped dossier Range fetch.
      const cityPromise = findCityBySlug(slug);
      const panelPromise = loadCommandCenterCityPanelClient({ slug });
      const manifestPromise = loadCommandCenterManifestClient();

      const foundCity = await cityPromise;

      if (!foundCity) {
        if (!cancelled) {
          setError("not-found");
          setLoading(false);
        }
        return;
      }

      if (!cancelled) setCity(foundCity);

      const [cityPanel, commandCenterManifest] = await Promise.all([
        panelPromise,
        manifestPromise,
      ]);

      if (!cancelled && commandCenterManifest) setManifest(commandCenterManifest);

      if (!cancelled) {
        if (cityPanel?.workspace) {
          setPanel(cityPanel);
        } else {
          setError("no-workspace");
        }
        setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="text-sm text-slate-400">Loading city dossier...</div>
      </div>
    );
  }

  if (error === "not-found") {
    return (
      <div className="flex h-screen flex-col bg-slate-950">
        <nav className="flex h-14 items-center border-b border-white/10 bg-slate-950/80 px-4 backdrop-blur">
          <Link href="/" className="text-sm font-medium text-slate-300 hover:text-white">
            {"<- Back to Map"}
          </Link>
        </nav>
        <div className="flex flex-1 items-center justify-center">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
            City not found
          </div>
        </div>
      </div>
    );
  }

  if (error === "no-workspace" || !panel?.workspace || !city || !manifest) {
    return (
      <div className="flex h-screen flex-col bg-slate-950">
        <nav className="flex h-14 items-center border-b border-white/10 bg-slate-950/80 px-4 backdrop-blur">
          <Link href="/" className="text-sm font-medium text-slate-300 hover:text-white">
            {"<- Back to Map"}
          </Link>
        </nav>
        <div className="flex flex-1 items-center justify-center px-6">
          <div className="max-w-xl rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-slate-300">
            No source-backed dossier is available for this city yet.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-slate-950">
      <nav className="flex h-14 items-center justify-between border-b border-white/10 bg-slate-950/80 px-4 backdrop-blur">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm font-medium text-slate-300 transition-colors hover:text-white">
            {"<- Back to Map"}
          </Link>
          <span className="text-sm text-slate-500">/</span>
          <span className="text-sm font-medium text-white">{city.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400">
            {city.countryIso3}
          </span>
        </div>
      </nav>

      <main className="flex-1 overflow-hidden">
        <CityWorkspace commandCenterManifest={manifest} panel={panel} />
      </main>
    </div>
  );
}
