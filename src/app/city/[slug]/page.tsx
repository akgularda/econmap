import { Metadata } from "next";

import { CityPageClient } from "./city-page-client";
import { loadCitySlugMeta } from "@/lib/city-data";
import { selectPrerenderSlugs } from "@/lib/city-prerender";

type PageProps = {
  params: Promise<{ slug: string }>;
};

// Pre-render only the top-N cities by population (see src/lib/city-prerender.ts).
// Every other (minor) city still resolves client-side: a non-pre-rendered /city/<slug>/
// deep link boots the SPA via public/404.html and CityPageClient loads its dossier from
// the Range-addressable bundle. So no valid slug 404s — only HTML shells are reduced.
// Uses the slim slug-meta map (~11MB) rather than the full registry (113MB) so the
// static-export workers don't hold ~500MB resident per worker (which OOM'd).
export async function generateStaticParams() {
  const slugMeta = await loadCitySlugMeta();
  const entries = Object.entries(slugMeta).map(([slug, meta]) => ({
    slug,
    population: meta.p,
  }));
  // Empty registry (fresh clone, no data) → [] without crashing.
  return selectPrerenderSlugs(entries).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const slugMeta = await loadCitySlugMeta();
  const meta = slugMeta[slug];

  if (!meta) {
    return {
      title: "City OSINT Dossier | MapFactbook",
    };
  }

  return {
    title: `${meta.n} City OSINT Dossier | MapFactbook`,
    description: `Source-backed city-first OSINT dossier for ${meta.n}, ${meta.i}`,
  };
}

export default async function CityPage({ params }: PageProps) {
  const { slug } = await params;
  // No notFound() guard: minor (non-pre-rendered) cities are first-class. CityPageClient
  // resolves ANY slug from the dossier bundle and renders an honest "no dossier yet" state
  // for genuinely unknown slugs, so deep links to minor cities never 404.
  return <CityPageClient slug={slug} />;
}
