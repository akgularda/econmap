// @ts-check
/**
 * Bootstrap downloader for the OPTIONAL city-intel ENRICHMENT bulk sources.
 *
 * Companion to download-bulk-sources.mjs (which fetches only the REQUIRED identity/geo
 * sources: GeoNames, OurAirports, UN/LOCODE). This script fetches the enrichment sources
 * that expand Connectivity / Environment / Economy coverage in resolve-entities.ts —
 * the data the "coverage pending" layer families need to go from 7,310 enriched cities
 * toward the full 191,845-city registry.
 *
 * Source URLs + local paths are the same ones declared in
 * scripts/data/cities/bulk-source-manifest.ts. Every AUTO url below was HEAD-validated
 * (HTTP 206, correct content-type) on 2026-06-21.
 *
 * Sources split into two tiers:
 *   AUTO   — a stable direct-file URL exists; this script fetches it (idempotent).
 *   MANUAL — only a portal/landing page exists (SDMX query builders, gated forms, etc.);
 *            this script CANNOT fetch them. It prints exactly what to place where.
 *
 * Idempotent: existing, non-empty target files are skipped. ZIPs are extracted with
 * PowerShell Expand-Archive on Windows (GNU tar misreads "C:\..." as a remote host).
 *
 * Usage:
 *   node scripts/data/cities/download-enrichment-sources.mjs           # fetch AUTO, report MANUAL
 *   node scripts/data/cities/download-enrichment-sources.mjs --list    # print the plan, fetch nothing
 *   node scripts/data/cities/download-enrichment-sources.mjs --auto-only# fetch AUTO, skip MANUAL report
 *
 * NOTE: several AUTO sources are large (GLEIF lei2 ~1 GB+, Ookla parquet ~100s MB each).
 * This is the "go" step the v1.1 / Phase 5 plan gates on — see .planning/data/PHASE5-PLAN.md.
 */
import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const execFileAsync = promisify(execFile);
const BULK_ROOT = path.join(process.cwd(), "data", "raw", "cities", "bulk");
const listOnly = process.argv.includes("--list");
const autoOnly = process.argv.includes("--auto-only");

/** @typedef {{ kind: "file", url: string, dest: string, label: string }} FileJob */
/** @typedef {{ kind: "zip", url: string, extractDir: string, expect: string[], label: string }} ZipJob */
/** @typedef {{ label: string, portal: string, targets: string[], note?: string }} ManualSource */

/** AUTO: direct-file URLs, HEAD-validated 2026-06-21. */
/** @type {(FileJob|ZipJob)[]} */
const AUTO = [
  // Economy / assets
  f("WRI Global Power Plant DB",
    "https://raw.githubusercontent.com/wri/global-power-plant-database/master/output_database/global_power_plant_database.csv",
    "wri/global_power_plant_database.csv"),
  z("ROR research orgs v2.1",
    "https://zenodo.org/api/records/18260365/files/v2.1-2026-01-15-ror-data.zip/content",
    "ror/v2.1-2026-01-15-ror-data",
    ["v2.1-2026-01-15-ror-data.csv", "v2.1-2026-01-15-ror-data.json"]),
  // GLEIF concatenated files (required by manifest; large — ~1 GB+ each). Stored as the .zip
  // (load-bulk-entities reads inside the archive); not extracted here.
  f("GLEIF LEI2 (concatenated)",
    "https://leidata.gleif.org/api/v1/concatenated-files/lei2/latest/zip",
    "gleif/lei2-latest.zip"),
  f("GLEIF RR (relationships)",
    "https://leidata.gleif.org/api/v1/concatenated-files/rr/latest/zip",
    "gleif/rr-latest.zip"),
  f("GLEIF RepEx (reporting exceptions)",
    "https://leidata.gleif.org/api/v1/concatenated-files/repex/latest/zip",
    "gleif/repex-latest.zip"),
  // Environment
  f("WHO Ambient Air Quality v2024",
    "https://cdn.who.int/media/docs/default-source/air-pollution-documents/air-quality-and-health/who_ambient_air_quality_database_version_2024_%28v6.1%29.xlsx?download=true&sfvrsn=c504c0cd_3",
    "who/who_ambient_air_quality_database_v2024.xlsx"),
  // Connectivity (digital infrastructure) — Ookla open-data S3, latest published quarter.
  f("Ookla mobile perf tiles (2025Q4)",
    "https://ookla-open-data.s3.amazonaws.com/parquet/performance/type=mobile/year=2025/quarter=4/2025-10-01_performance_mobile_tiles.parquet",
    "ookla/2025-10-01_performance_mobile_tiles.parquet"),
  f("Ookla fixed perf tiles (2025Q4)",
    "https://ookla-open-data.s3.amazonaws.com/parquet/performance/type=fixed/year=2025/quarter=4/2025-10-01_performance_fixed_tiles.parquet",
    "ookla/2025-10-01_performance_fixed_tiles.parquet"),
  // Transit
  f("Mobility Database GTFS catalog",
    "https://files.mobilitydatabase.org/feeds_v2.csv",
    "mobilitydatabase/feeds_v2.csv"),
  // NOTE: USGS MRDS is intentionally NOT here. Its rdbms-tab-all.zip ships tab-delimited RDBMS
  // tables, but the manifest + parser + extract-mining-assets all read a comma-delimited
  // usgs/mrds.csv — a plain extract produces a file nothing consumes. It needs a tab->csv
  // transform, so it lives in MANUAL below.
];

/** MANUAL: portal/landing only — query builders, gated forms, or tiled archives. */
/** @type {ManualSource[]} */
const MANUAL = [
  {
    label: "GHSL GHS-WUP-MTUC R2025A (population / land area / boundaries)",
    portal: "https://ghsl.jrc.ec.europa.eu/download.php",
    targets: [
      "ghsl/GHS_WUP_MTUC_GLOBE_R2025A_V1_1_statistics/GHS_WUP_MTUC_MT_GLOBE_R2025A_v1_1.xlsx",
      "ghsl/GHS_WUP_MTUC_GLOBE_R2025A_V1_1_vector.zip",
    ],
    note: "Select GHS-WUP MTUC (R2025A) statistics + vector; download.php builds a one-off link per selection.",
  },
  {
    label: "OECD FUA economy / labour / boundaries",
    portal: "https://www.oecd.org/en/data/datasets/functional-urban-areas.html (SDMX: https://sdmx.oecd.org/public/rest/data/)",
    targets: [
      "oecd/oecd-fua-economy.csv",
      "oecd/oecd-fua-labour.csv",
      "oecd/list_of_municipalities_in_FUAs_and_Cities.csv",
      "oecd/fuas (1)/fuas.shp",
      "oecd/cities (4)/cities.shp",
    ],
    note: "OECD Data Explorer / SDMX query — exact CSV layout must match generate-city-intel-enrichment.py readers.",
  },
  {
    label: "Eurostat Urban Audit (city/FUA tables)",
    portal: "https://ec.europa.eu/eurostat/web/cities/database",
    targets: ["eurostat/inventory.xml", "eurostat/urb_cpop1.tsv.gz", "eurostat/urb_clma.tsv.gz", "eurostat/… (14 tables)"],
    note: "Bulk-download facility: https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/urb_* (one .tsv.gz per table).",
  },
  {
    label: "World Port Index (NGA)",
    portal: "https://msi.nga.mil/Publications/WPI",
    targets: ["worldportindex/wpi_data_download/wpi_data_download/WPI.csv"],
    note: "NGA MSI download button serves a session-scoped zip; place WPI.csv at the manifest path.",
  },
  {
    label: "WRI Aqueduct 4.0 water risk",
    portal: "https://www.wri.org/data/aqueduct-global-maps-40-data",
    targets: ["aqueduct/aqueduct-4-0-water-risk-data.zip"],
    note: "Aqueduct 4.0 'water risk' bundle (large).",
  },
  {
    label: "Carbon Monitor Cities",
    portal: "https://carbonmonitor-cities.org/ (figshare: https://figshare.com/ search 'Carbon Monitor Cities')",
    targets: ["carbon-monitor/carbon-monitor-cities-live.csv", "carbon-monitor/carbon-monitor-cities-figshare.zip"],
  },
  {
    label: "USGS MRDS mineral sites",
    portal: "https://mrdata.usgs.gov/mrds/ (bulk: https://mrdata.usgs.gov/mrds/rdbms-tab-all.zip)",
    targets: ["usgs/mrds.csv"],
    note: "rdbms-tab-all.zip ships tab-delimited RDBMS tables; export the MRDS table to a COMMA-delimited usgs/mrds.csv (cols: dep_id,mrds_id,site_name,latitude,longitude,country,commod1,dev_stat) — the parser is comma-delimited, so a raw extract is not consumable.",
  },
];

function f(/** @type {string} */ label, /** @type {string} */ url, /** @type {string} */ rel) {
  return /** @type {FileJob} */ ({ kind: "file", url, dest: path.join(BULK_ROOT, ...rel.split("/")), label });
}
function z(/** @type {string} */ label, /** @type {string} */ url, /** @type {string} */ relDir, /** @type {string[]} */ expect) {
  return /** @type {ZipJob} */ ({ kind: "zip", url, extractDir: path.join(BULK_ROOT, ...relDir.split("/")), expect, label });
}
function log(/** @type {string} */ msg) {
  process.stdout.write(`[enrich] ${new Date().toISOString()} ${msg}\n`);
}
async function exists(/** @type {string} */ p) {
  try {
    return (await fs.stat(p)).size > 0;
  } catch {
    return false;
  }
}
async function download(/** @type {string} */ url, /** @type {string} */ dest) {
  await fs.mkdir(path.dirname(dest), { recursive: true });
  const tmp = `${dest}.part`;
  log(`GET ${url}`);
  const res = await fetch(url, { redirect: "follow", headers: { "user-agent": "econmap-bulk-downloader/1.0" } });
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status} for ${url}`);
  // A 200 carrying an HTML login/error/captcha page would otherwise be written and cached as a
  // "valid" artifact forever. Reject it up front — every source here is binary/CSV/TSV/parquet.
  const ctype = (res.headers.get("content-type") || "").toLowerCase();
  if (ctype.startsWith("text/html")) {
    throw new Error(`refusing to save HTML body (likely an error/login page) for ${url}`);
  }
  const expectedLen = Number(res.headers.get("content-length")) || 0;
  // On any stream failure, remove the partial so it is never mistaken for a complete cached file.
  try {
    await pipeline(Readable.fromWeb(/** @type {any} */ (res.body)), createWriteStream(tmp));
  } catch (err) {
    await fs.rm(tmp, { force: true });
    throw err;
  }
  const { size } = await fs.stat(tmp);
  if (expectedLen && size !== expectedLen) {
    await fs.rm(tmp, { force: true });
    throw new Error(`size mismatch for ${url}: wrote ${size} bytes, expected ${expectedLen}`);
  }
  // Atomic publish: dest only ever appears once the body is fully (and length-) verified.
  await fs.rename(tmp, dest);
  log(`saved ${path.relative(process.cwd(), dest)} (${(size / 1e6).toFixed(1)} MB)`);
}
async function extractZip(/** @type {string} */ zipPath, /** @type {string} */ destDir) {
  await fs.mkdir(destDir, { recursive: true });
  if (process.platform === "win32") {
    const q = (/** @type {string} */ s) => s.replace(/'/g, "''");
    await execFileAsync(
      "powershell",
      ["-NoProfile", "-NonInteractive", "-Command",
        `Expand-Archive -LiteralPath '${q(zipPath)}' -DestinationPath '${q(destDir)}' -Force`],
      { maxBuffer: 1024 * 1024 * 64, windowsHide: true },
    );
  } else {
    await execFileAsync("tar", ["-xf", zipPath, "-C", destDir]);
  }
}

function printPlan() {
  log(`AUTO sources (${AUTO.length}) — direct download:`);
  for (const j of AUTO) {
    const target = j.kind === "file" ? path.relative(BULK_ROOT, j.dest) : `${path.relative(BULK_ROOT, j.extractDir)}/`;
    process.stdout.write(`  • ${j.label.padEnd(38)} → ${target}\n`);
  }
  log(`MANUAL sources (${MANUAL.length}) — portal acquisition required:`);
  for (const m of MANUAL) {
    process.stdout.write(`  • ${m.label}\n      portal: ${m.portal}\n      place:  ${m.targets.join(", ")}\n${m.note ? `      note:   ${m.note}\n` : ""}`);
  }
}

async function run() {
  log(`root=${BULK_ROOT}`);
  if (listOnly) {
    printPlan();
    return;
  }

  let done = 0, skipped = 0;
  const failures = [];
  for (const job of AUTO) {
    try {
      if (job.kind === "file") {
        if (await exists(job.dest)) { skipped++; continue; }
        await download(job.url, job.dest);
        done++;
      } else {
        const present = (await Promise.all(job.expect.map((n) => exists(path.join(job.extractDir, n))))).every(Boolean);
        if (present) { skipped++; continue; }
        const cacheDir = path.join(BULK_ROOT, ".zipcache");
        await fs.mkdir(cacheDir, { recursive: true });
        // Key the cache on the FULL relative extractDir, not just its basename, so two jobs that
        // happen to share a basename cannot clobber each other's archive (a real bug in the
        // basename-keyed baseline, where both Natural Earth zips map to naturalearth.zip).
        const cacheKey = path.relative(BULK_ROOT, job.extractDir).replace(/[\\/]+/g, "__");
        const cachedZip = path.join(cacheDir, `${cacheKey}.zip`);
        if (!(await exists(cachedZip))) await download(job.url, cachedZip);
        else log(`reuse cached zip ${path.relative(process.cwd(), cachedZip)}`);
        log(`extract -> ${path.relative(process.cwd(), job.extractDir)}`);
        try {
          await extractZip(cachedZip, job.extractDir);
        } catch (err) {
          await fs.rm(cachedZip, { force: true }); // drop the bad archive so the next run re-downloads
          throw err;
        }
        // A wrong-layout archive can "extract" without error; require the expected files to exist,
        // else invalidate the cache and fail (don't count a hollow extract as done).
        const extracted = (await Promise.all(job.expect.map((n) => exists(path.join(job.extractDir, n))))).every(Boolean);
        if (!extracted) {
          await fs.rm(cachedZip, { force: true });
          throw new Error(`extract of ${job.url} did not produce expected files: ${job.expect.join(", ")}`);
        }
        done++;
      }
    } catch (error) {
      log(`FAILED ${job.label}: ${error instanceof Error ? error.message : String(error)}`);
      failures.push(job.label);
    }
  }
  log(`AUTO complete: downloaded=${done} skipped=${skipped} failed=${failures.length}`);
  if (failures.length) log(`AUTO failures:\n  ${failures.join("\n  ")}`);

  if (!autoOnly) {
    process.stdout.write("\n");
    log(`MANUAL sources still needed (this script cannot fetch — portal/SDMX/gated):`);
    for (const m of MANUAL) {
      const allPresent = (await Promise.all(
        m.targets.filter((t) => !t.includes("…")).map((t) => exists(path.join(BULK_ROOT, ...t.split("/")))),
      )).every(Boolean);
      if (allPresent) continue;
      process.stdout.write(`  • ${m.label}\n      portal: ${m.portal}\n      place:  ${m.targets.join(", ")}\n${m.note ? `      note:   ${m.note}\n` : ""}`);
    }
  }
  if (failures.length) process.exitCode = 1;
}

run().catch((error) => {
  log(`fatal: ${error instanceof Error ? error.stack : String(error)}`);
  process.exit(1);
});
