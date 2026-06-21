// @ts-check
/**
 * Bootstrap downloader for the REQUIRED city-pipeline bulk sources.
 *
 * The pipeline's `assertRequiredBulkSourcesExist()` gates on a small set of
 * freely-redistributable datasets (GeoNames, OurAirports, UN/LOCODE). Historically
 * these had to be placed under `data/raw/cities/bulk/` by hand; this script fetches
 * them automatically so a fresh clone can run `npm run data:cities`.
 *
 * Idempotent: existing, non-empty target files are skipped. ZIP archives are
 * extracted with the platform `tar` (bsdtar, ships with Win10+/macOS/Linux).
 *
 * Usage:  node scripts/data/cities/download-bulk-sources.mjs [--optional]
 *   --optional  also fetch the optional enrichment sources (Natural Earth, WHO, ...)
 */
import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const execFileAsync = promisify(execFile);
const BULK_ROOT = path.join(process.cwd(), "data", "raw", "cities", "bulk");
const wantOptional = process.argv.includes("--optional");

/** @typedef {{ kind: "file", url: string, dest: string }} FileJob */
/** @typedef {{ kind: "zip", url: string, extractDir: string, expect: string[] }} ZipJob */

/** @type {(FileJob|ZipJob)[]} */
const REQUIRED = [
  // GeoNames small lookup tables
  f("https://download.geonames.org/export/dump/admin1CodesASCII.txt", "geonames/admin1CodesASCII.txt"),
  f("https://download.geonames.org/export/dump/admin2Codes.txt", "geonames/admin2Codes.txt"),
  f("https://download.geonames.org/export/dump/countryInfo.txt", "geonames/countryInfo.txt"),
  f("https://download.geonames.org/export/dump/featureCodes_en.txt", "geonames/featureCodes_en.txt"),
  // GeoNames large archives
  z("https://download.geonames.org/export/dump/allCountries.zip", "geonames/allCountries", ["allCountries.txt"]),
  z("https://download.geonames.org/export/dump/alternateNamesV2.zip", "geonames/alternateNamesV2", ["alternateNamesV2.txt"]),
  // OurAirports
  f("https://ourairports.com/data/airports.csv", "ourairports/airports.csv"),
  f("https://ourairports.com/data/countries.csv", "ourairports/countries.csv"),
  f("https://ourairports.com/data/regions.csv", "ourairports/regions.csv"),
  f("https://ourairports.com/data/runways.csv", "ourairports/runways.csv"),
  // UN/LOCODE (one zip → CSV parts)
  z("https://service.unece.org/trade/locode/loc242csv.zip", "unlocode/loc242csv", [
    "2024-2 UNLOCODE CodeListPart1.csv",
  ]),
];

/** @type {(FileJob|ZipJob)[]} */
const OPTIONAL = [
  z("https://naturalearth.s3.amazonaws.com/10m_cultural/ne_10m_populated_places.zip", "naturalearth", ["ne_10m_populated_places.shp"]),
  z("https://naturalearth.s3.amazonaws.com/10m_cultural/ne_10m_urban_areas.zip", "naturalearth", ["ne_10m_urban_areas.shp"]),
];

function f(/** @type {string} */ url, /** @type {string} */ rel) {
  return /** @type {FileJob} */ ({ kind: "file", url, dest: path.join(BULK_ROOT, ...rel.split("/")) });
}
function z(/** @type {string} */ url, /** @type {string} */ relDir, /** @type {string[]} */ expect) {
  return /** @type {ZipJob} */ ({ kind: "zip", url, extractDir: path.join(BULK_ROOT, ...relDir.split("/")), expect });
}

function log(/** @type {string} */ msg) {
  process.stdout.write(`[bulk] ${new Date().toISOString()} ${msg}\n`);
}

async function exists(/** @type {string} */ p) {
  try {
    const s = await fs.stat(p);
    return s.size > 0;
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
  await pipeline(Readable.fromWeb(/** @type {any} */ (res.body)), createWriteStream(tmp));
  await fs.rename(tmp, dest);
  const { size } = await fs.stat(dest);
  log(`saved ${path.relative(process.cwd(), dest)} (${(size / 1e6).toFixed(1)} MB)`);
}

async function extractZip(/** @type {string} */ zipPath, /** @type {string} */ destDir) {
  await fs.mkdir(destDir, { recursive: true });
  if (process.platform === "win32") {
    // GNU tar (Git Bash) misreads "C:\..." as a remote host ("Cannot connect to C:").
    // PowerShell's Expand-Archive handles Windows drive paths natively.
    const q = (/** @type {string} */ s) => s.replace(/'/g, "''");
    await execFileAsync(
      "powershell",
      [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        `Expand-Archive -LiteralPath '${q(zipPath)}' -DestinationPath '${q(destDir)}' -Force`,
      ],
      { maxBuffer: 1024 * 1024 * 64, windowsHide: true },
    );
  } else {
    await execFileAsync("tar", ["-xf", zipPath, "-C", destDir]);
  }
}

async function run() {
  const jobs = wantOptional ? [...REQUIRED, ...OPTIONAL] : REQUIRED;
  log(`root=${BULK_ROOT} jobs=${jobs.length} (optional=${wantOptional})`);
  let done = 0;
  let skipped = 0;
  const failures = [];
  for (const job of jobs) {
    try {
      if (job.kind === "file") {
        if (await exists(job.dest)) {
          skipped++;
          continue;
        }
        await download(job.url, job.dest);
        done++;
      } else {
        const allPresent = (
          await Promise.all(job.expect.map((name) => exists(path.join(job.extractDir, name))))
        ).every(Boolean);
        if (allPresent) {
          skipped++;
          continue;
        }
        const cacheDir = path.join(BULK_ROOT, ".zipcache");
        await fs.mkdir(cacheDir, { recursive: true });
        const cachedZip = path.join(cacheDir, `${path.basename(job.extractDir)}.zip`);
        if (!(await exists(cachedZip))) {
          await download(job.url, cachedZip);
        } else {
          log(`reuse cached zip ${path.relative(process.cwd(), cachedZip)}`);
        }
        log(`extract -> ${path.relative(process.cwd(), job.extractDir)}`);
        await extractZip(cachedZip, job.extractDir);
        done++;
      }
    } catch (error) {
      log(`FAILED ${job.url}: ${error instanceof Error ? error.message : String(error)}`);
      failures.push(job.url);
    }
  }
  log(`complete: downloaded=${done} skipped=${skipped} failed=${failures.length}`);
  if (failures.length) {
    log(`failures:\n  ${failures.join("\n  ")}`);
    process.exitCode = 1;
  }
}

run().catch((error) => {
  log(`fatal: ${error instanceof Error ? error.stack : String(error)}`);
  process.exit(1);
});
