import type { NextConfig } from "next";

// Single source of truth. Empty in dev (root serving); "/econmap" in prod build (.env.production).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  // NOTE: assetPrefix intentionally omitted. basePath alone already prefixes /_next/* asset
  // URLs for a GitHub Pages project path. Setting assetPrefix non-empty made Next 16's
  // static-export worker retain per-page state and OOM after ~73 pages (12k-page export).
  images: { unoptimized: true },
  // Cap static-generation workers when NEXT_BUILD_CPUS is set, to keep peak RAM in
  // physical memory on a busy machine (avoids swap-thrash OOM during the 12k-page export).
  // Unset → undefined → Next's default worker count (no throttle on an idle machine).
  experimental: {
    cpus: process.env.NEXT_BUILD_CPUS ? Number(process.env.NEXT_BUILD_CPUS) : undefined,
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  turbopack: {},
};

export default nextConfig;

