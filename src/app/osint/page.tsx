import type { Metadata } from "next";

import { OsintConsole } from "@/features/osint/components/osint-console";

export const metadata: Metadata = {
  title: "OSINT — MapFactbook",
  description:
    "Search-first city intelligence: query any city and read its source-backed entities, coverage states, and provenance.",
};

export default function OsintRoute() {
  return <OsintConsole />;
}
