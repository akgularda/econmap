import Link from "next/link";

import { PageFrame } from "@/components/layout/page-frame";
import { loadLegacyOsintSurfaceModel } from "@/lib/command-center-data";
import { ConnectivityRanking } from "@/features/rankings/components/connectivity-ranking";

export async function RankingsPage() {
  const model = await loadLegacyOsintSurfaceModel();
  const ranking = [...model.selectedCities].sort((left, right) => {
    const rightScore = right.infrastructureCount + right.institutionCount;
    const leftScore = left.infrastructureCount + left.institutionCount;
    return rightScore - leftScore;
  });

  return (
    <PageFrame
      eyebrow="Rankings"
      title="Evidence-backed ranking slices"
      description="Rankings now come from the same city OSINT spine: visible source labels, infrastructure counts, and institutional footprint."
    >
      <div className="rounded-[2rem] border border-white/10 bg-slate-950/75 p-5">
        <p className="mb-4 text-sm leading-6 text-slate-300">
          The current table ranks featured cities by their combined infrastructure and institution footprint in the
          published operating model.
        </p>
        <table className="min-w-full text-left text-sm text-slate-300">
          <thead>
            <tr className="border-b border-white/10 text-slate-500">
              <th className="pb-3 pr-4">Rank</th>
              <th className="pb-3 pr-4">City</th>
              <th className="pb-3 pr-4">Country</th>
              <th className="pb-3 pr-4">Infrastructure</th>
              <th className="pb-3 pr-4">Institutions</th>
              <th className="pb-3 pr-4">Sources</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((city, index) => (
              <tr key={city.cityId} className="border-b border-white/5 align-top">
                <td className="py-3 pr-4 text-slate-400">#{index + 1}</td>
                <td className="py-3 pr-4 text-white">
                  <Link href={`/city/${city.slug}`} className="hover:text-cyan-200">
                    {city.name}
                  </Link>
                </td>
                <td className="py-3 pr-4">{city.countryIso3}</td>
                <td className="py-3 pr-4">{city.infrastructureCount.toLocaleString("en-US")}</td>
                <td className="py-3 pr-4">{city.institutionCount.toLocaleString("en-US")}</td>
                <td className="py-3 pr-4">{city.sourceLabels.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ConnectivityRanking />
    </PageFrame>
  );
}
