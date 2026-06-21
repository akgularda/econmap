"use client";

import type { Feature, FeatureCollection, GeoJsonProperties, LineString } from "geojson";
import type { ExpressionSpecification, Point, StyleSpecification } from "maplibre-gl";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { BaseImageryCatalog, GlobeManifest } from "@/domain/types";
import { TacticalActionMenu } from "@/features/home/components/globe/tactical-action-menu";
import {
  getAvailableDatesForImageryLayer,
  getBaseImageryLayerById,
  getImageryLevelBounds,
} from "@/features/home/lib/globe-catalog";
import { resolveLayerRegistryEntry } from "@/features/home/lib/layer-registry";
import { assetUrl } from "@/lib/asset-url";

// Globe operational layers are served from a single range-addressable PMTiles archive
// (public/data/globe/layers.pmtiles, one source-layer per layer id). maplibre needs the `pmtiles://`
// protocol registered once before any map using that source is created.
const GLOBE_LAYERS_SOURCE_ID = "globe-layers";
let pmtilesProtocolRegistered = false;

async function ensurePmtilesProtocol(maplibregl: typeof import("maplibre-gl")) {
  if (pmtilesProtocolRegistered) return;
  const { Protocol } = await import("pmtiles");
  const protocol = new Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);
  pmtilesProtocolRegistered = true;
}

export type TacticalFocusCity = {
  cityId: string;
  latitude: number;
  longitude: number;
  name: string;
  slug: string;
};

export type TacticalFeaturedCity = TacticalFocusCity & {
  countryIso3: string;
};

const EMPTY_FEATURED_CITIES: TacticalFeaturedCity[] = [];
const DEFAULT_CENTER: [number, number] = [35, 39];
const DEFAULT_ZOOM = 3.15;
const FOCUSED_CITY_ZOOM = 6.2;
const HOVER_POSITION_THRESHOLD = 12;

type TacticalHoveredCity = TacticalFocusCity & {
  countryIso3: string;
  pointX: number;
  pointY: number;
};

const COUNTRIES_SOURCE_PATH = assetUrl("/data/globe/reference/natural-earth-countries.geojson");
const ADMIN1_SOURCE_PATH = assetUrl("/data/globe/reference/natural-earth-admin1.geojson");

type TacticalMapMountArgs = {
  activeLayerIds: string[];
  activeBaseImageryLayerId: string;
  activeDate?: string;
  baseImageryCatalog: BaseImageryCatalog;
  citySelectionAssetPath: string;
  container: HTMLDivElement;
  featuredCities: TacticalFeaturedCity[];
  globeManifest: GlobeManifest;
  onCityHover: (hoveredCity: TacticalHoveredCity | null) => void;
  onCitySelect: (selectedCity: TacticalHoveredCity) => void;
  selectedCity?: TacticalFocusCity;
};

type TacticalMapController = {
  destroy: () => void;
  update: (args: TacticalMapMountArgs) => void;
};

type TacticalMapMountResult = TacticalMapController | (() => void);

type TacticalMap2DProps = {
  activeLayerIds: string[];
  activeBaseImageryLayerId: string;
  activeDate?: string;
  activeViewId: string;
  baseImageryCatalog: BaseImageryCatalog;
  citySelectionAssetPath: string;
  className?: string;
  globeManifest: GlobeManifest;
  featuredCities?: TacticalFeaturedCity[];
  mountMap?: (args: TacticalMapMountArgs) => Promise<TacticalMapMountResult> | TacticalMapMountResult;
  searchQuery: string;
  selectedCity?: TacticalFocusCity;
  selectedCitySlug?: string;
  surfaceClassName?: string;
};

function joinClassNames(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

function browserSupportsTacticalMap() {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }

  return !window.navigator.userAgent.toLowerCase().includes("jsdom");
}

function buildGraticule(): FeatureCollection<LineString, GeoJsonProperties> {
  const features: Array<Feature<LineString, GeoJsonProperties>> = [];

  for (let longitude = -180; longitude <= 180; longitude += 20) {
    features.push({
      type: "Feature",
      properties: { axis: "longitude", value: longitude },
      geometry: {
        type: "LineString",
        coordinates: Array.from({ length: 181 }, (_, index) => [longitude, index - 90]),
      },
    });
  }

  for (let latitude = -80; latitude <= 80; latitude += 10) {
    features.push({
      type: "Feature",
      properties: { axis: "latitude", value: latitude },
      geometry: {
        type: "LineString",
        coordinates: Array.from({ length: 361 }, (_, index) => [index - 180, latitude]),
      },
    });
  }

  return {
    type: "FeatureCollection",
    features,
  };
}

function createEmptyFeatureCollection(): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: [],
  };
}

function createFeatureCollection(
  features: Array<GeoJSON.Feature<GeoJSON.Geometry, GeoJsonProperties>>,
): FeatureCollection {
  return {
    type: "FeatureCollection",
    features,
  };
}

export function extractCityTarget(
  feature: GeoJSON.Feature<GeoJSON.Geometry, GeoJsonProperties> | undefined,
  point?: { x: number; y: number },
): TacticalHoveredCity | null {
  if (!feature) {
    return null;
  }

  const cityId = typeof feature.properties?.cityId === "string" ? feature.properties.cityId : undefined;
  const slug = typeof feature.properties?.slug === "string" ? feature.properties.slug : undefined;
  const name = typeof feature.properties?.name === "string" ? feature.properties.name : undefined;
  const countryIso3 =
    typeof feature.properties?.countryIso3 === "string" ? feature.properties.countryIso3 : undefined;
  const latitudeFromProps =
    typeof feature.properties?.latitude === "number" ? feature.properties.latitude : undefined;
  const longitudeFromProps =
    typeof feature.properties?.longitude === "number" ? feature.properties.longitude : undefined;

  let latitude = latitudeFromProps;
  let longitude = longitudeFromProps;

  if ((latitude === undefined || longitude === undefined) && feature.geometry.type === "Point") {
    [longitude, latitude] = feature.geometry.coordinates;
  }

  if (!cityId || !slug || !name || !countryIso3 || latitude === undefined || longitude === undefined) {
    return null;
  }

  return {
    cityId,
    countryIso3,
    latitude,
    longitude,
    name,
    pointX: point?.x ?? 0,
    pointY: point?.y ?? 0,
    slug,
  };
}

function buildHomeMapHref({
  activeLayerIds,
  activeBaseImageryLayerId,
  activeDate,
  activeViewId,
  citySlug,
  searchQuery,
}: {
  activeLayerIds: string[];
  activeBaseImageryLayerId: string;
  activeDate?: string;
  activeViewId: string;
  citySlug?: string;
  searchQuery?: string;
}) {
  const params = new URLSearchParams();

  if (searchQuery) {
    params.set("q", searchQuery);
  }

  if (citySlug) {
    params.set("city", citySlug);
  }

  params.set("view", activeViewId);

  if (activeLayerIds.length > 0) {
    params.set("layers", activeLayerIds.join(","));
  }

  params.set("base", activeBaseImageryLayerId);

  if (activeDate) {
    params.set("date", activeDate);
  }

  return `/?${params.toString()}`;
}

function getSelectionFillOpacity(isCitiesLayerActive: boolean): ExpressionSpecification {
  return isCitiesLayerActive
    ? ["interpolate", ["linear"], ["zoom"], 3, 0.1, 5, 0.16, 8, 0.22]
    : ["interpolate", ["linear"], ["zoom"], 3, 0.03, 5, 0.06, 8, 0.1];
}

function getSelectionOutlineOpacity(isCitiesLayerActive: boolean): ExpressionSpecification {
  return isCitiesLayerActive
    ? ["interpolate", ["linear"], ["zoom"], 3, 0.65, 5, 0.85, 8, 1]
    : ["interpolate", ["linear"], ["zoom"], 3, 0.28, 5, 0.42, 8, 0.58];
}

function getResolvedBaseImagery(args: TacticalMapMountArgs) {
  const activeBaseImageryLayer = getBaseImageryLayerById(args.baseImageryCatalog, args.activeBaseImageryLayerId);
  const activeBaseImageryBounds = getImageryLevelBounds(args.baseImageryCatalog, args.activeBaseImageryLayerId);
  const resolvedActiveDate =
    args.activeDate ?? getAvailableDatesForImageryLayer(args.baseImageryCatalog, args.activeBaseImageryLayerId)[0];
  const isPublishedImageryActive =
    activeBaseImageryLayer?.status === "published" && Boolean(resolvedActiveDate);

  return {
    activeBaseImageryBounds,
    activeBaseImageryLayer,
    isPublishedImageryActive,
    resolvedActiveDate,
  };
}

function buildBaseImagerySource(args: TacticalMapMountArgs) {
  const { activeBaseImageryBounds, activeBaseImageryLayer, isPublishedImageryActive, resolvedActiveDate } =
    getResolvedBaseImagery(args);

  if (!isPublishedImageryActive || !activeBaseImageryLayer || !resolvedActiveDate) {
    return null;
  }

  return {
    source: {
      type: "raster" as const,
      tiles: [assetUrl(activeBaseImageryLayer.assetPathTemplate).replace("{date}", resolvedActiveDate)],
      tileSize: 256,
      minzoom: activeBaseImageryBounds?.minimumLevel,
      maxzoom: activeBaseImageryBounds?.maximumLevel,
    },
    layer: {
      id: "base-imagery",
      type: "raster" as const,
      source: "base-imagery",
      paint: {
        "raster-opacity": activeBaseImageryLayer.id === "night-lights" ? 0.12 : 0.25,
        "raster-brightness-min": activeBaseImageryLayer.id === "night-lights" ? 0.04 : 0.15,
        "raster-brightness-max": activeBaseImageryLayer.id === "night-lights" ? 0.65 : 0.75,
        "raster-contrast": activeBaseImageryLayer.id === "night-lights" ? 0.12 : 0.02,
        "raster-saturation": activeBaseImageryLayer.id === "night-lights" ? -0.9 : -0.55,
      },
    },
    key: `${activeBaseImageryLayer.id}:${resolvedActiveDate}`,
  };
}

function buildInitialStyle(args: TacticalMapMountArgs): {
  baseImageryKey: string | null;
  style: StyleSpecification;
} {
  const baseImagery = buildBaseImagerySource(args);

  return {
    baseImageryKey: baseImagery?.key ?? null,
    style: {
      version: 8,
      sources: {
        "tactical-grid": {
          type: "geojson",
          data: buildGraticule(),
        },
        "reference-countries": {
          type: "geojson",
          data: COUNTRIES_SOURCE_PATH,
        },
        "reference-admin1": {
          type: "geojson",
          data: ADMIN1_SOURCE_PATH,
        },
        ...(args.globeManifest.pmtilesPath
          ? {
              [GLOBE_LAYERS_SOURCE_ID]: {
                type: "vector" as const,
                url: `pmtiles://${assetUrl(args.globeManifest.pmtilesPath)}`,
              },
            }
          : {}),
        ...(baseImagery
          ? {
              "base-imagery": baseImagery.source,
            }
          : {}),
      },
      layers: [
        {
          id: "background",
          type: "background",
          paint: {
            "background-color": "#07090a",
          },
        },
        {
          id: "reference-countries-fill",
          type: "fill",
          source: "reference-countries",
          paint: {
            "fill-color": "#0f1312",
            "fill-opacity": 0.96,
          },
        },
        ...(baseImagery ? [baseImagery.layer] : []),
        {
          id: "reference-admin1-lines",
          type: "line",
          source: "reference-admin1",
          paint: {
            "line-color": "#2a332a",
            "line-width": 0.8,
            "line-opacity": 0.8,
          },
        },
        {
          id: "reference-country-lines-shadow",
          type: "line",
          source: "reference-countries",
          paint: {
            "line-color": "#0a0d0d",
            "line-width": 2.4,
            "line-opacity": 0.95,
          },
        },
        {
          id: "reference-country-lines",
          type: "line",
          source: "reference-countries",
          paint: {
            "line-color": "#5a6a54",
            "line-width": 1.2,
            "line-opacity": 0.95,
          },
        },
        {
          id: "tactical-grid-shadow",
          type: "line",
          source: "tactical-grid",
          paint: {
            "line-color": "#0f1413",
            "line-width": 1.2,
            "line-opacity": 0.85,
          },
        },
        {
          id: "tactical-grid",
          type: "line",
          source: "tactical-grid",
          paint: {
            "line-color": "#313930",
            "line-width": ["case", ["==", ["get", "axis"], "latitude"], 0.45, 0.55],
            "line-opacity": 0.22,
          },
        },
      ],
    },
  };
}

function normalizeMountResult(result: TacticalMapMountResult): TacticalMapController {
  if (typeof result === "function") {
    return {
      destroy: result,
      update: () => {},
    };
  }

  return result;
}

async function defaultMountMap(initialArgs: TacticalMapMountArgs): Promise<TacticalMapController> {
  const maplibregl = await import("maplibre-gl");
  await ensurePmtilesProtocol(maplibregl);
  const initialStyle = buildInitialStyle(initialArgs);
  const map = new maplibregl.Map({
    attributionControl: false,
    bearing: 0,
    center: DEFAULT_CENTER,
    container: initialArgs.container,
    dragRotate: false,
    maxPitch: 0,
    maxZoom: 10,
    minZoom: 2,
    pitch: 0,
    renderWorldCopies: false,
    style: initialStyle.style,
    zoom: initialArgs.selectedCity ? 5.4 : DEFAULT_ZOOM,
  });

  map.touchZoomRotate.disableRotation();

  let currentArgs = initialArgs;
  let currentBaseImageryKey = initialStyle.baseImageryKey;
  let isLoaded = false;
  let lastFocusedCityId: string | null = null;
  let lastHoveredCityId: string | null = null;

  const resetCamera = (duration = 0) => {
    if (currentArgs.selectedCity) {
      map.easeTo({
        center: [currentArgs.selectedCity.longitude, currentArgs.selectedCity.latitude],
        duration,
        pitch: 0,
        zoom: FOCUSED_CITY_ZOOM,
      });
      return;
    }

    map.easeTo({
      bearing: 0,
      center: DEFAULT_CENTER,
      duration,
      pitch: 0,
      zoom: DEFAULT_ZOOM,
    });
  };

  const syncBaseImagery = () => {
    const nextBaseImagery = buildBaseImagerySource(currentArgs);
    const nextKey = nextBaseImagery?.key ?? null;

    if (nextKey === currentBaseImageryKey) {
      return;
    }

    if (map.getLayer("base-imagery")) {
      map.removeLayer("base-imagery");
    }

    if (map.getSource("base-imagery")) {
      map.removeSource("base-imagery");
    }

    if (nextBaseImagery) {
      map.addSource("base-imagery", nextBaseImagery.source);
      map.addLayer(nextBaseImagery.layer, "reference-admin1-lines");
    }

    currentBaseImageryKey = nextKey;
  };

  const syncSelectionStyling = () => {
    const isCitiesLayerActive = currentArgs.activeLayerIds.includes("cities");

    if (map.getLayer("city-selection-fill")) {
      map.setPaintProperty("city-selection-fill", "fill-opacity", getSelectionFillOpacity(isCitiesLayerActive));
    }

    if (map.getLayer("city-selection-outline")) {
      map.setPaintProperty("city-selection-outline", "line-color", isCitiesLayerActive ? "#7f9070" : "#495345");
      map.setPaintProperty(
        "city-selection-outline",
        "line-opacity",
        getSelectionOutlineOpacity(isCitiesLayerActive),
      );
    }
  };

  const syncSelectedCityHighlight = () => {
    const selectedCityFilter = currentArgs.selectedCity
      ? (["==", ["get", "cityId"], currentArgs.selectedCity.cityId] as ExpressionSpecification)
      : (["==", ["get", "cityId"], "__no-selected-city__"] as ExpressionSpecification);

    if (map.getLayer("selected-city-fill")) {
      map.setFilter("selected-city-fill", selectedCityFilter);
    }

    if (map.getLayer("selected-city-outline")) {
      map.setFilter("selected-city-outline", selectedCityFilter);
    }
  };

  const syncActiveOperationalLayers = () => {
    // Operational layers render from the shared PMTiles vector source — maplibre fetches only the
    // visible tiles, so there is no per-region geojson swapping. Each layer's circle layer is added
    // once (lazily, on first activation) and thereafter just toggled visible/hidden. The `cities`
    // layer is excluded (its points come from the city-selection source, not layers.pmtiles).
    if (!map.getSource(GLOBE_LAYERS_SOURCE_ID)) {
      return;
    }
    const activeLayerIds = new Set(currentArgs.activeLayerIds);
    const operationalLayers = currentArgs.globeManifest.layers
      .map(resolveLayerRegistryEntry)
      .filter((layer) => layer.id !== "cities");

    for (const layer of operationalLayers) {
      const layerId = `${layer.id}-points`;
      const isActive = activeLayerIds.has(layer.id);

      if (!map.getLayer(layerId)) {
        if (!isActive) {
          continue;
        }
        // Scale point radius by the layer's registry markerSize (default 14) so
        // transport/ports (16-18) read slightly larger than connectivity/research (13-14).
        const radiusScale = layer.markerSize / 14;
        map.addLayer({
          id: layerId,
          type: "circle",
          source: GLOBE_LAYERS_SOURCE_ID,
          "source-layer": layer.sourceLayer,
          layout: {
            visibility: "visible",
          },
          paint: {
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              2,
              1.5 * radiusScale,
              4,
              2.6 * radiusScale,
              7,
              4.3 * radiusScale,
            ],
            "circle-color": layer.markerColor,
            "circle-opacity": 0.8,
            "circle-stroke-color": layer.strokeColor,
            "circle-stroke-width": 0.9,
          },
        });
        continue;
      }

      map.setLayoutProperty(layerId, "visibility", isActive ? "visible" : "none");
    }
  };

  const syncFocusedCamera = (duration: number, force = false) => {
    const nextFocusedCityId = currentArgs.selectedCity?.cityId ?? null;

    if (!force && nextFocusedCityId === lastFocusedCityId) {
      return;
    }

    lastFocusedCityId = nextFocusedCityId;
    resetCamera(duration);
  };

  const handleResetCamera = () => {
    resetCamera(300);
  };

  map.on("load", () => {
    isLoaded = true;

    map.addSource("city-selection-source", {
      type: "geojson",
      data: assetUrl(currentArgs.citySelectionAssetPath),
    });
    map.addSource("city-hover-source", {
      type: "geojson",
      data: createEmptyFeatureCollection(),
    });

    map.addLayer({
      id: "city-selection-fill",
      type: "fill",
      source: "city-selection-source",
      paint: {
        "fill-color": "#1a211c",
        "fill-opacity": getSelectionFillOpacity(currentArgs.activeLayerIds.includes("cities")),
      },
    });

    map.addLayer({
      id: "city-selection-outline",
      type: "line",
      source: "city-selection-source",
      paint: {
        "line-color": currentArgs.activeLayerIds.includes("cities") ? "#7f9070" : "#495345",
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.4, 5, 0.7, 8, 1.1],
        "line-opacity": getSelectionOutlineOpacity(currentArgs.activeLayerIds.includes("cities")),
      },
    });

    map.addLayer({
      id: "city-selection-hit",
      type: "fill",
      source: "city-selection-source",
      paint: {
        "fill-color": "#ffffff",
        "fill-opacity": 0.001,
      },
    });

    map.addLayer({
      id: "city-selection-labels",
      type: "symbol",
      source: "city-selection-source",
      minzoom: 5,
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Inter Semi Bold"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 5, 10, 8, 12, 10, 13],
        "text-transform": "none",
      },
      paint: {
        "text-color": "#dfe6d3",
        "text-halo-color": "#0c0f0d",
        "text-halo-width": 1.2,
        "text-opacity": ["interpolate", ["linear"], ["zoom"], 5, 0.35, 7, 0.7, 9, 0.9],
      },
      filter: [">=", ["coalesce", ["get", "population"], 0], 250000],
    });

    map.addLayer({
      id: "city-hover-fill",
      type: "fill",
      source: "city-hover-source",
      paint: {
        "fill-color": "#80916d",
        "fill-opacity": 0.18,
      },
    });

    map.addLayer({
      id: "city-hover-outline",
      type: "line",
      source: "city-hover-source",
      paint: {
        "line-color": "#dce6c9",
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 1.1, 6, 1.8, 10, 2.3],
        "line-opacity": 0.98,
      },
    });

    map.addLayer({
      id: "selected-city-fill",
      type: "fill",
      source: "city-selection-source",
      filter: ["==", ["get", "cityId"], "__no-selected-city__"],
      paint: {
        "fill-color": "#9cab7a",
        "fill-opacity": 0.12,
      },
    });

    map.addLayer({
      id: "selected-city-outline",
      type: "line",
      source: "city-selection-source",
      filter: ["==", ["get", "cityId"], "__no-selected-city__"],
      paint: {
        "line-color": "#eef5dc",
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 1.8, 6, 2.4, 10, 2.8],
        "line-opacity": 1,
      },
    });

    syncSelectedCityHighlight();
    syncSelectionStyling();
    syncActiveOperationalLayers();
    syncFocusedCamera(0, true);
  });

  map.on("moveend", () => {
    if (!isLoaded) {
      return;
    }

    syncActiveOperationalLayers();
  });

  // rAF-throttle the hover hit-test: queryRenderedFeatures on every raw pointer move is a per-frame
  // (or faster) cost that drops frames during pan on a dense selection layer. Coalesce moves to at
  // most one hit-test per animation frame against the most recent pointer position.
  let pendingHoverPoint: Point | null = null;
  let hoverRafId: number | null = null;

  const runHoverHitTest = () => {
    hoverRafId = null;
    const point = pendingHoverPoint;
    pendingHoverPoint = null;
    if (!point || !map.getLayer("city-selection-hit")) {
      return;
    }

    const cityFeatures = map.queryRenderedFeatures(point, { layers: ["city-selection-hit"] });
    const hoveredCity = extractCityTarget(
      cityFeatures[0] as GeoJSON.Feature<GeoJSON.Geometry, GeoJsonProperties> | undefined,
      point,
    );
    const hoverSource = map.getSource("city-hover-source") as maplibregl.GeoJSONSource | undefined;

    if (!hoveredCity) {
      map.getCanvas().style.cursor = "";

      if (lastHoveredCityId !== null) {
        hoverSource?.setData(createEmptyFeatureCollection());
        lastHoveredCityId = null;
      }

      currentArgs.onCityHover(null);
      return;
    }

    map.getCanvas().style.cursor = "pointer";

    if (hoveredCity.cityId !== lastHoveredCityId) {
      hoverSource?.setData(
        createFeatureCollection([
          cityFeatures[0] as GeoJSON.Feature<GeoJSON.Geometry, GeoJsonProperties>,
        ]),
      );
      lastHoveredCityId = hoveredCity.cityId;
    }

    currentArgs.onCityHover(hoveredCity);
  };

  map.on("mousemove", (event) => {
    pendingHoverPoint = event.point;
    if (hoverRafId === null) {
      hoverRafId =
        typeof requestAnimationFrame === "function"
          ? requestAnimationFrame(runHoverHitTest)
          : (runHoverHitTest(), null);
    }
  });

  map.on("click", (event) => {
    if (!map.getLayer("city-selection-hit")) {
      return;
    }

    const cityFeatures = map.queryRenderedFeatures(event.point, { layers: ["city-selection-hit"] });
    const selectedTarget = extractCityTarget(
      cityFeatures[0] as GeoJSON.Feature<GeoJSON.Geometry, GeoJsonProperties> | undefined,
      event.point,
    );

    if (!selectedTarget) {
      return;
    }

    currentArgs.onCitySelect(selectedTarget);
  });

  window.addEventListener("mapfactbook:reset-camera", handleResetCamera);

  return {
    destroy: () => {
      window.removeEventListener("mapfactbook:reset-camera", handleResetCamera);
      if (hoverRafId !== null && typeof cancelAnimationFrame === "function") {
        cancelAnimationFrame(hoverRafId);
      }
      map.remove();
    },
    update: (nextArgs) => {
      currentArgs = nextArgs;

      if (!isLoaded) {
        return;
      }

      syncBaseImagery();
      syncSelectionStyling();
      syncSelectedCityHighlight();
      syncActiveOperationalLayers();
      syncFocusedCamera(350);
    },
  };
}

export function TacticalMap2D({
  activeLayerIds,
  activeBaseImageryLayerId,
  activeDate,
  activeViewId,
  baseImageryCatalog,
  citySelectionAssetPath,
  className,
  featuredCities = EMPTY_FEATURED_CITIES,
  globeManifest,
  mountMap = defaultMountMap,
  searchQuery,
  selectedCity,
  selectedCitySlug,
  surfaceClassName,
}: TacticalMap2DProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<TacticalMapController | null>(null);
  const [hoveredCity, setHoveredCity] = useState<TacticalHoveredCity | null>(null);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);

  const handleCityHover = useEffectEvent((nextHoveredCity: TacticalHoveredCity | null) => {
    setHoveredCity((currentValue) => {
      if (!nextHoveredCity) {
        return currentValue ? null : currentValue;
      }

      if (
        currentValue &&
        currentValue.cityId === nextHoveredCity.cityId &&
        Math.abs(currentValue.pointX - nextHoveredCity.pointX) < HOVER_POSITION_THRESHOLD &&
        Math.abs(currentValue.pointY - nextHoveredCity.pointY) < HOVER_POSITION_THRESHOLD
      ) {
        return currentValue;
      }

      return nextHoveredCity;
    });
  });

  const handleCitySelect = useEffectEvent((nextSelectedCity: TacticalHoveredCity) => {
    setHoveredCity(nextSelectedCity);

    if (nextSelectedCity.slug === selectedCitySlug) {
      return;
    }

    router.push(
      buildHomeMapHref({
        activeLayerIds,
        activeBaseImageryLayerId,
        activeDate,
        activeViewId,
        citySlug: nextSelectedCity.slug,
        searchQuery,
      }),
      { scroll: false },
    );
  });

  const buildMountArgs = (container: HTMLDivElement): TacticalMapMountArgs => ({
    activeLayerIds,
    activeBaseImageryLayerId,
    activeDate,
    baseImageryCatalog,
    citySelectionAssetPath,
    container,
    featuredCities,
    globeManifest,
    onCityHover: handleCityHover,
    onCitySelect: handleCitySelect,
    selectedCity,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let isCancelled = false;

    if (mountMap === defaultMountMap && !browserSupportsTacticalMap()) {
      return;
    }

    void Promise.resolve(mountMap(buildMountArgs(container)))
      .then((result) => {
        if (isCancelled) {
          normalizeMountResult(result).destroy();
          return;
        }

        controllerRef.current = normalizeMountResult(result);
        controllerRef.current.update(buildMountArgs(container));
      })
      .catch(() => {
        controllerRef.current = null;
      });

    return () => {
      isCancelled = true;
      controllerRef.current?.destroy();
      controllerRef.current = null;
    };
  }, [mountMap]);

  // Signature of the values controller.update() actually consumes. Joined-id compare for layer ids
  // (like syncBaseImagery's key diff) + a stable selected-city id, so the update effect skips
  // redundant MapLibre work when an unrelated parent re-render produces new array/object identities
  // (e.g. selectedCity is rebuilt each render but resolves to the same cityId).
  const updateSignature = [
    [...activeLayerIds].sort().join(","),
    activeBaseImageryLayerId,
    activeDate ?? "",
    citySelectionAssetPath,
    selectedCity?.cityId ?? "",
    featuredCities.map((city) => city.cityId).join(","),
    baseImageryCatalog.generatedAt,
    globeManifest.generatedAt,
  ].join("|");
  const lastUpdateSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !controllerRef.current) {
      return;
    }

    if (lastUpdateSignatureRef.current === updateSignature) {
      return;
    }
    lastUpdateSignatureRef.current = updateSignature;

    controllerRef.current.update(buildMountArgs(container));
  }, [updateSignature]);

  return (
    <div
      data-surface-export-root="true"
      className={joinClassNames(
        "relative h-screen min-h-screen overflow-hidden border border-[#2a2f2a] bg-[linear-gradient(180deg,#050708_0%,#090b0b_100%)] shadow-[0_30px_90px_rgba(2,6,23,0.55)]",
        className,
      )}
      onContextMenu={(event) => {
        event.preventDefault();
        setIsActionMenuOpen((currentValue) => !currentValue);
      }}
    >
      <div
        data-testid="tactical-2d-surface"
        ref={containerRef}
        className={joinClassNames(
          "h-full min-h-screen w-full bg-[linear-gradient(180deg,#050708_0%,#0b0d0e_100%)]",
          surfaceClassName,
        )}
      />

      {hoveredCity ? (
        <div
          data-testid="hovered-city-label"
          className="pointer-events-none absolute z-20"
          style={{
            left: Math.max(16, hoveredCity.pointX + 18),
            top: Math.max(16, hoveredCity.pointY - 18),
          }}
        >
          <div className="tactical-panel border-[#dce6c9]/55 bg-[#0c100e]/95 px-3 py-2 shadow-[0_0_24px_rgba(220,230,201,0.12)]">
            <p className="text-sm font-semibold text-white">{hoveredCity.name}</p>
            <p className="mt-0.5 text-[10px] uppercase tracking-[0.2em] text-[#c7d59f]">
              {hoveredCity.countryIso3}
            </p>
          </div>
        </div>
      ) : null}

      {isActionMenuOpen ? (
        <div className="pointer-events-none absolute bottom-5 right-5 w-[280px] space-y-2">
          <div className="pointer-events-auto space-y-2">
            <TacticalActionMenu isOpen={isActionMenuOpen} selectedPoint={null} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
