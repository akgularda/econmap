import fs from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import {
  baseImageryCatalogSchema,
  cityFootprintCatalogSchema,
  cityFootprintSelectionSchema,
  commandCenterDatasetWorkspaceSchema,
  commandCenterManifestSchema,
  globeManifestSchema,
} from "@/domain/command-center-schemas";
import type {
  BaseImageryCatalog,
  CityFootprintCatalog,
  CityFootprintSelection,
  CityRegistryEntry,
  CommandCenterDatasetWorkspace,
  CommandCenterManifest,
  GlobeManifest,
} from "@/domain/types";

const COMMAND_CENTER_MANIFEST_FILE = path.join(
  process.cwd(),
  "src",
  "data",
  "generated",
  "command-center",
  "manifest.json",
);
const GLOBE_MANIFEST_FILE = path.join(process.cwd(), "public", "data", "globe", "manifest.json");
const BASE_IMAGERY_CATALOG_FILE = path.join(
  process.cwd(),
  "public",
  "data",
  "globe",
  "base-imagery",
  "catalog.json",
);
const CITY_FOOTPRINT_CATALOG_FILE = path.join(
  process.cwd(),
  "public",
  "data",
  "globe",
  "reference",
  "city-footprints",
  "catalog.json",
);
const COMMAND_CENTER_DATASETS_DIR = path.join(
  process.cwd(),
  "src",
  "data",
  "generated",
  "command-center",
  "datasets",
);
const FEATURED_CITIES_FILE = path.join(
  process.cwd(),
  "src",
  "data",
  "generated",
  "command-center",
  "featured-cities.json",
);

// Epoch marker used for empty fallbacks so the UI can tell "data not generated yet"
// apart from a real (recent) generation timestamp.
const MISSING_DATA_EPOCH = new Date(0).toISOString();

let cachedCommandCenterManifestPromise: Promise<CommandCenterManifest> | null = null;
let cachedGlobeManifestPromise: Promise<GlobeManifest> | null = null;
let cachedBaseImageryCatalogPromise: Promise<BaseImageryCatalog> | null = null;
let cachedCityFootprintCatalogPromise: Promise<CityFootprintCatalog> | null = null;
let cachedCityFootprintSelectionPromise: Promise<CityFootprintSelection> | null = null;
let cachedFeaturedCitiesPromise: Promise<CityRegistryEntry[]> | null = null;

function shouldUseCachedArtifacts() {
  return process.env.NODE_ENV === "production";
}

function parseGeneratedJson<T>(content: string): T {
  return JSON.parse(content) as T;
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ENOENT"
  );
}

/**
 * Read + schema-validate a generated JSON artifact. If the file is simply absent
 * (e.g. a fresh clone before `npm run data:cities` has produced `src/data/generated`
 * and `public/data`), degrade to an empty-but-schema-valid surface so the page still
 * renders a coverage-pending state instead of throwing a 500. Malformed JSON or
 * schema violations still throw, because those are real defects worth surfacing.
 */
async function readGeneratedJson<S extends z.ZodTypeAny>(
  file: string,
  schema: S,
  emptyFallback: z.input<S>,
): Promise<z.output<S>> {
  try {
    const content = await fs.readFile(file, "utf-8");
    return schema.parse(JSON.parse(content)) as z.output<S>;
  } catch (error) {
    if (isMissingFileError(error)) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(
          `[command-center] generated artifact missing, using empty fallback: ${path.relative(process.cwd(), file)}`,
        );
      }
      return schema.parse(emptyFallback) as z.output<S>;
    }
    throw error;
  }
}

async function readCommandCenterManifest() {
  return readGeneratedJson(COMMAND_CENTER_MANIFEST_FILE, commandCenterManifestSchema, {
    generatedAt: MISSING_DATA_EPOCH,
    defaultViewId: "default",
    globalIntelligence: [],
    opsTimeline: [],
    savedViews: [],
    sourceSummary: [],
  });
}

async function readGlobeManifest() {
  return readGeneratedJson(GLOBE_MANIFEST_FILE, globeManifestSchema, {
    generatedAt: MISSING_DATA_EPOCH,
    layers: [],
  });
}

async function readBaseImageryCatalog() {
  return readGeneratedJson(BASE_IMAGERY_CATALOG_FILE, baseImageryCatalogSchema, {
    generatedAt: MISSING_DATA_EPOCH,
    defaultLayerId: "night-lights",
    layers: [],
  });
}

async function readCityFootprintCatalog() {
  return readGeneratedJson(CITY_FOOTPRINT_CATALOG_FILE, cityFootprintCatalogSchema, {
    generatedAt: MISSING_DATA_EPOCH,
    selectionAssetPath: "",
    cities: [],
  });
}

async function readCityFootprintSelection() {
  return readGeneratedJson(CITY_FOOTPRINT_CATALOG_FILE, cityFootprintSelectionSchema, {
    generatedAt: MISSING_DATA_EPOCH,
    selectionAssetPath: "",
  });
}

async function readDatasetWorkspace(datasetId: string) {
  const content = await fs.readFile(path.join(COMMAND_CENTER_DATASETS_DIR, `${datasetId}.json`), "utf-8");
  return commandCenterDatasetWorkspaceSchema.parse(JSON.parse(content));
}

async function readFeaturedCitiesArtifact() {
  try {
    const content = await fs.readFile(FEATURED_CITIES_FILE, "utf-8");
    return parseGeneratedJson<CityRegistryEntry[]>(content);
  } catch {
    return [];
  }
}

export async function loadCommandCenterManifest() {
  if (!shouldUseCachedArtifacts()) {
    return readCommandCenterManifest();
  }

  cachedCommandCenterManifestPromise ??= readCommandCenterManifest();
  return cachedCommandCenterManifestPromise;
}

export async function loadGlobeManifest() {
  if (!shouldUseCachedArtifacts()) {
    return readGlobeManifest();
  }

  cachedGlobeManifestPromise ??= readGlobeManifest();
  return cachedGlobeManifestPromise;
}

export async function loadBaseImageryCatalog() {
  if (!shouldUseCachedArtifacts()) {
    return readBaseImageryCatalog();
  }

  cachedBaseImageryCatalogPromise ??= readBaseImageryCatalog();
  return cachedBaseImageryCatalogPromise;
}

export async function loadCityFootprintCatalog() {
  if (!shouldUseCachedArtifacts()) {
    return readCityFootprintCatalog();
  }

  cachedCityFootprintCatalogPromise ??= readCityFootprintCatalog();
  return cachedCityFootprintCatalogPromise;
}

export async function loadCityFootprintSelection() {
  if (!shouldUseCachedArtifacts()) {
    return readCityFootprintSelection();
  }

  cachedCityFootprintSelectionPromise ??= readCityFootprintSelection();
  return cachedCityFootprintSelectionPromise;
}

export async function loadCommandCenterDatasetWorkspace(
  datasetId: string,
): Promise<CommandCenterDatasetWorkspace> {
  return readDatasetWorkspace(datasetId);
}

export async function loadFeaturedCommandCenterCities(limit = 8): Promise<CityRegistryEntry[]> {
  if (!shouldUseCachedArtifacts()) {
    const featuredCities = await readFeaturedCitiesArtifact();
    return featuredCities.slice(0, limit);
  }

  cachedFeaturedCitiesPromise ??= readFeaturedCitiesArtifact();
  const featuredCities = await cachedFeaturedCitiesPromise;
  return featuredCities.slice(0, limit);
}
