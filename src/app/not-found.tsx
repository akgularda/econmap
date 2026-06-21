"use client";

import Link from "next/link";
import { useState } from "react";

import { PageFrame } from "@/components/layout/page-frame";
import { CityPageClient } from "@/app/city/[slug]/city-page-client";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Resolve the city slug from a /city/<slug>/ pathname (basePath-aware), or null.
 * Exported for unit testing the SPA-fallback routing rule.
 */
export function resolveCitySlugFromPath(pathname: string): string | null {
  let path = pathname;
  if (BASE_PATH && path.startsWith(BASE_PATH)) {
    path = path.slice(BASE_PATH.length);
  }
  // Match /city/<slug> with optional trailing slash; reject empty/nested slugs.
  const match = path.match(/^\/city\/([^/]+)\/?$/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * GitHub-Pages-style SPA fallback.
 *
 * With `output: "export"` we pre-render only the top-N cities (see src/lib/city-prerender.ts),
 * so a deep link to a non-pre-rendered (minor) city has no static HTML and the host serves the
 * exported 404.html. Next renders THIS component (with the full app JS) into 404.html, so on the
 * client we detect a /city/<slug>/ path and mount CityPageClient, which resolves ANY slug from the
 * Range-addressable dossier bundle. Result: minor-city deep links render the dossier client-side
 * instead of 404ing. Anything that isn't a city path falls through to the normal not-found UI.
 */
export default function NotFound() {
  // Resolve the slug once, lazily, from the live URL. On the server (export prerender of 404.html)
  // window is undefined → null → the not-found UI is emitted as the static shell; on the client the
  // initializer reads the real pathname so a /city/<slug>/ deep link mounts CityPageClient on first
  // render (no effect, no flash of the not-found UI for a valid city deep link).
  const [citySlug] = useState<string | null>(() =>
    typeof window === "undefined" ? null : resolveCitySlugFromPath(window.location.pathname),
  );

  if (citySlug) {
    return <CityPageClient slug={citySlug} />;
  }

  return (
    <PageFrame
      eyebrow="Not found"
      title="Requested page is outside current coverage"
      description="The route exists in the architecture, but the specific entity was not found in the current data coverage."
    >
      <div className="rounded-[2rem] border border-white/10 bg-slate-950/75 p-6 text-sm text-slate-300">
        Return to the <Link href="/" className="text-cyan-300">world map</Link> to select a covered country or region.
      </div>
    </PageFrame>
  );
}
