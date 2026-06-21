from __future__ import annotations

import argparse
import json
import math
import re
import unicodedata
from dataclasses import dataclass
from datetime import UTC, datetime
from io import TextIOWrapper
from pathlib import Path
from zipfile import ZipFile

import pandas as pd


WHO_SOURCE_URL = "https://www.who.int/data/gho/data/themes/air-pollution/who-air-quality-database"
AQUEDUCT_SOURCE_URL = "https://www.wri.org/aqueduct"
CARBON_MONITOR_SOURCE_URL = "https://carbonmonitor.org/cities/"


@dataclass(frozen=True)
class SelectedCity:
    city_id: str
    slug: str
    name: str
    country_iso3: str
    latitude: float
    longitude: float
    population: float | None
    aliases: tuple[str, ...]
    admin1_name: str | None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate city-first environment artifacts from WHO, Aqueduct, and Carbon Monitor.",
    )
    parser.add_argument("--root-dir", type=Path, default=Path.cwd())
    parser.add_argument("--selection-asset")
    parser.add_argument("--registry-file")
    parser.add_argument("--who-file")
    parser.add_argument("--aqueduct-file")
    parser.add_argument("--carbon-file")
    parser.add_argument("--processed-indexes-dir")
    parser.add_argument("--output-file")
    return parser.parse_args()


def resolve_path(root_dir: Path, override: str | None, relative_path: str) -> Path:
    if override:
        return Path(override).resolve()
    return (root_dir / relative_path).resolve()


def normalize_label(value: str | None) -> str:
    if not value:
        return ""

    raw_value = str(value).strip()
    if "/" in raw_value:
        head, tail = raw_value.rsplit("/", 1)
        if len(tail) == 3 and tail.isalpha():
            raw_value = head

    normalized = (
        unicodedata.normalize("NFKD", raw_value)
        .encode("ascii", "ignore")
        .decode("ascii")
        .lower()
    )
    normalized = normalized.replace("&", " and ")
    normalized = re.sub(r"[^a-z0-9]+", "-", normalized)
    return normalized.strip("-")


def to_float(value) -> float | None:
    if value is None:
        return None

    try:
        numeric = float(value)
    except (TypeError, ValueError):
        return None

    if not math.isfinite(numeric):
        return None

    return numeric


def to_int(value) -> int | None:
    numeric = to_float(value)
    if numeric is None:
        return None
    return int(numeric)


def round_metric(value: float | None, digits: int = 1) -> float | None:
    if value is None:
        return None
    return round(value, digits)


def source_meta(
    source_id: str,
    name: str,
    updated_at: str,
    coverage: str,
    methodology: str,
    url: str,
) -> dict[str, str]:
    return {
        "id": source_id,
        "name": name,
        "updatedAt": updated_at,
        "coverage": coverage,
        "methodology": methodology,
        "url": url,
    }


def metric(indicator_id: str, value: float | None, unit: str, year: int | None, source: dict[str, str]) -> dict[str, object]:
    return {
        "indicatorId": indicator_id,
        "value": round_metric(value),
        "unit": unit,
        "year": year,
        "status": "actual",
        "source": source,
    }


def layer_record(
    city: SelectedCity,
    entity_type: str,
    source_id: str,
    source_label: str,
    properties: dict[str, object],
) -> dict[str, object]:
    return {
        "entityId": f"{entity_type}-{city.city_id}",
        "entityType": entity_type,
        "entitySubtype": "city_selection_surface",
        "name": city.name,
        "cityId": city.city_id,
        "slug": city.slug,
        "countryIso3": city.country_iso3,
        "latitude": round(city.latitude, 6),
        "longitude": round(city.longitude, 6),
        "population": city.population,
        "exactSite": False,
        "sourceId": source_id,
        "sourceLabel": source_label,
        **properties,
    }


def build_selected_cities(selection_asset: Path, registry_file: Path) -> tuple[list[SelectedCity], dict[str, SelectedCity]]:
    if not selection_asset.exists():
        raise FileNotFoundError(f"City selection asset not found: {selection_asset}")
    if not registry_file.exists():
        raise FileNotFoundError(f"City registry file not found: {registry_file}")

    selection_payload = json.loads(selection_asset.read_text(encoding="utf-8"))
    registry_payload = json.loads(registry_file.read_text(encoding="utf-8"))
    registry_by_city_id = {record["cityId"]: record for record in registry_payload}

    selected_cities: list[SelectedCity] = []
    selected_city_by_id: dict[str, SelectedCity] = {}

    for feature in selection_payload.get("features", []):
        properties = feature.get("properties", {})
        city_id = properties.get("cityId")
        registry_record = registry_by_city_id.get(city_id, {})
        if not city_id:
            continue

        city = SelectedCity(
            city_id=str(city_id),
            slug=str(properties["slug"]),
            name=str(properties["name"]),
            country_iso3=str(properties["countryIso3"]),
            latitude=float(properties["latitude"]),
            longitude=float(properties["longitude"]),
            population=to_float(properties.get("population")),
            aliases=tuple(str(alias) for alias in registry_record.get("aliases", [])),
            admin1_name=registry_record.get("admin1Name"),
        )
        selected_cities.append(city)
        selected_city_by_id[city.city_id] = city

    selected_cities.sort(key=lambda city: (-(city.population or 0), city.name))
    return selected_cities, selected_city_by_id


def haversine_km(latitude_a: float, longitude_a: float, latitude_b: float, longitude_b: float) -> float:
    earth_radius_km = 6371.0088
    latitude_delta = math.radians(latitude_b - latitude_a)
    longitude_delta = math.radians(longitude_b - longitude_a)
    start = math.radians(latitude_a)
    end = math.radians(latitude_b)

    haversine_value = (
        math.sin(latitude_delta / 2) ** 2
        + math.cos(start) * math.cos(end) * math.sin(longitude_delta / 2) ** 2
    )
    return 2 * earth_radius_km * math.asin(math.sqrt(haversine_value))


def choose_city(candidates: list[SelectedCity], latitude: float | None = None, longitude: float | None = None) -> SelectedCity:
    if len(candidates) == 1 or latitude is None or longitude is None:
        return sorted(candidates, key=lambda city: (-(city.population or 0), city.name))[0]

    return min(
        candidates,
        key=lambda city: haversine_km(latitude, longitude, city.latitude, city.longitude),
    )


def build_city_name_lookup(selected_cities: list[SelectedCity]) -> dict[tuple[str, str], list[SelectedCity]]:
    lookup: dict[tuple[str, str], list[SelectedCity]] = {}

    for city in selected_cities:
        labels = {normalize_label(city.name), *(normalize_label(alias) for alias in city.aliases)}
        for label in labels:
            if not label:
                continue
            lookup.setdefault((city.country_iso3, label), []).append(city)

    return lookup


def build_admin_lookup(selected_cities: list[SelectedCity]) -> dict[tuple[str, str], list[SelectedCity]]:
    lookup: dict[tuple[str, str], list[SelectedCity]] = {}

    for city in selected_cities:
        labels = {normalize_label(city.admin1_name), normalize_label(city.name)}
        for label in labels:
            if not label:
                continue
            lookup.setdefault((city.country_iso3, label), []).append(city)

    return lookup


def build_unique_city_lookup(selected_cities: list[SelectedCity]) -> dict[str, SelectedCity]:
    grouped: dict[str, list[SelectedCity]] = {}

    for city in selected_cities:
        labels = {normalize_label(city.name), *(normalize_label(alias) for alias in city.aliases)}
        for label in labels:
            if not label:
                continue
            grouped.setdefault(label, []).append(city)

    return {
        label: cities[0]
        for label, cities in grouped.items()
        if len(cities) == 1
    }


def load_latest_who_rows(who_file: Path, name_lookup: dict[tuple[str, str], list[SelectedCity]]):
    who_data = pd.read_excel(who_file, sheet_name="Update 2024 (V6.1)")
    latest_rows: dict[str, dict[str, object]] = {}

    for row in who_data.itertuples(index=False):
        pm25 = to_float(getattr(row, "pm25_concentration", None))
        if pm25 is None:
            continue

        iso3 = str(getattr(row, "iso3", "")).upper()
        city_label = normalize_label(getattr(row, "city", ""))
        candidates = name_lookup.get((iso3, city_label), [])
        if not candidates:
            continue

        city = choose_city(
            candidates,
            latitude=to_float(getattr(row, "latitude", None)),
            longitude=to_float(getattr(row, "longitude", None)),
        )

        year = to_int(getattr(row, "year", None)) or 0
        current = latest_rows.get(city.city_id)
        if current and year < current["year"]:
            continue

        latest_rows[city.city_id] = {
            "city": city,
            "year": year,
            "pm10": to_float(getattr(row, "pm10_concentration", None)),
            "pm25": pm25,
            "no2": to_float(getattr(row, "no2_concentration", None)),
        }

    return latest_rows


def load_aqueduct_rows(aqueduct_file: Path):
    # Aqueduct is a portal-only (manual) source; degrade gracefully to no water-stress
    # coverage when it is absent, matching load_carbon_monitor_rows' existence guard.
    if not aqueduct_file.exists():
        return {}

    baseline_name = "Aqueduct40_waterrisk_download_Y2023M07D05/CVS/Aqueduct40_baseline_annual_y2023m07d05.csv"
    with ZipFile(aqueduct_file) as archive:
        with archive.open(baseline_name) as handle:
            dataframe = pd.read_csv(
                TextIOWrapper(handle, encoding="utf-8"),
                usecols=["gid_0", "name_1", "area_km2", "bws_score", "bws_label"],
            )

    by_admin: dict[tuple[str, str], dict[str, object]] = {}
    for row in dataframe.itertuples(index=False):
        water_stress_score = to_float(getattr(row, "bws_score", None))
        if water_stress_score is None or water_stress_score < 0:
            continue

        key = (str(getattr(row, "gid_0", "")).upper(), normalize_label(getattr(row, "name_1", "")))
        if not key[0] or not key[1]:
            continue

        current = by_admin.get(key)
        area_km2 = to_float(getattr(row, "area_km2", None)) or 0
        if current and area_km2 < current["area_km2"]:
            continue

        by_admin[key] = {
            "area_km2": area_km2,
            "water_stress": water_stress_score,
            "water_stress_label": str(getattr(row, "bws_label", "")),
        }

    return by_admin


def load_carbon_monitor_rows(carbon_file: Path, unique_city_lookup: dict[str, SelectedCity]):
    latest_totals: dict[str, tuple[str, float]] = {}

    if not carbon_file.exists():
        return latest_totals

    for chunk in pd.read_csv(
        carbon_file,
        usecols=["city", "date", "value (KtCO2 per day)"],
        chunksize=50_000,
    ):
        for row in chunk.itertuples(index=False):
            city = unique_city_lookup.get(normalize_label(getattr(row, "city", "")))
            if not city:
                continue

            date_value = str(getattr(row, "date", ""))
            emission_value = to_float(getattr(row, "_2", None))
            if emission_value is None:
                continue

            current = latest_totals.get(city.city_id)
            if current is None or date_value > current[0]:
                latest_totals[city.city_id] = (date_value, emission_value)
            elif date_value == current[0]:
                latest_totals[city.city_id] = (date_value, current[1] + emission_value)

    return latest_totals


def main() -> None:
    args = parse_args()
    root_dir = args.root_dir.resolve()
    generated_at = datetime.now(UTC).isoformat().replace("+00:00", "Z")

    selection_asset = resolve_path(
        root_dir,
        args.selection_asset,
        "public/data/globe/reference/city-footprints/selectable.geojson",
    )
    registry_file = resolve_path(
        root_dir,
        args.registry_file,
        "src/data/generated/cities/registry.json",
    )
    who_file = resolve_path(
        root_dir,
        args.who_file,
        "data/raw/cities/bulk/who/who_ambient_air_quality_database_v2024.xlsx",
    )
    aqueduct_file = resolve_path(
        root_dir,
        args.aqueduct_file,
        "data/raw/cities/bulk/aqueduct/aqueduct-4-0-water-risk-data.zip",
    )
    carbon_file = resolve_path(
        root_dir,
        args.carbon_file,
        "data/raw/cities/bulk/carbon-monitor/carbon-monitor-cities-figshare/carbon-monitor-cities-all-cities-FUA-v0325.csv",
    )
    processed_indexes_dir = resolve_path(
        root_dir,
        args.processed_indexes_dir,
        "data/processed/cities/indexes",
    )
    output_file = resolve_path(
        root_dir,
        args.output_file,
        "src/data/generated/command-center/city-environment-enrichment.json",
    )

    selected_cities, selected_city_by_id = build_selected_cities(selection_asset, registry_file)
    city_name_lookup = build_city_name_lookup(selected_cities)
    admin_lookup = build_admin_lookup(selected_cities)
    unique_city_lookup = build_unique_city_lookup(selected_cities)

    who_rows = load_latest_who_rows(who_file, city_name_lookup)
    aqueduct_rows = load_aqueduct_rows(aqueduct_file)
    carbon_rows = load_carbon_monitor_rows(carbon_file, unique_city_lookup)

    who_source = source_meta(
        "who-air-quality",
        "WHO Air Quality",
        generated_at[:10],
        "city_selection_surface",
        "Latest WHO PM2.5 observation matched to the visible city selection surface.",
        WHO_SOURCE_URL,
    )
    aqueduct_source = source_meta(
        "wri-aqueduct",
        "WRI Aqueduct",
        "2023-07-05",
        "admin1_to_city_match",
        "Aqueduct baseline water stress score matched from administrative coverage to the visible city selection surface.",
        AQUEDUCT_SOURCE_URL,
    )
    carbon_source = source_meta(
        "carbon-monitor",
        "Carbon Monitor",
        max((date_value for date_value, _ in carbon_rows.values()), default=generated_at[:10]),
        "selected_city_match",
        "Latest Carbon Monitor city daily emissions total matched to a visible city selection surface.",
        CARBON_MONITOR_SOURCE_URL,
    )

    air_quality_records: list[dict[str, object]] = []
    water_stress_records: list[dict[str, object]] = []
    enrichment_cities: dict[str, dict[str, object]] = {}

    for city in selected_cities:
        urban_intel: list[dict[str, object]] = []
        sources: dict[str, dict[str, str]] = {}

        who_match = who_rows.get(city.city_id)
        if who_match:
            air_quality_records.append(
                layer_record(
                    city,
                    "air_quality",
                    "who-air-quality",
                    "WHO Air Quality",
                    {
                        "pm25": round_metric(who_match["pm25"]),
                        "pm10": round_metric(who_match["pm10"]),
                        "no2": round_metric(who_match["no2"]),
                        "year": who_match["year"],
                    },
                ),
            )
            urban_intel.extend(
                [
                    metric("pm25", who_match["pm25"], "ug/m3", who_match["year"], who_source),
                    metric("pm10", who_match["pm10"], "ug/m3", who_match["year"], who_source),
                    metric("no2", who_match["no2"], "ug/m3", who_match["year"], who_source),
                ],
            )
            sources[who_source["id"]] = who_source

        aqueduct_match = aqueduct_rows.get((city.country_iso3, normalize_label(city.admin1_name or city.name)))
        if aqueduct_match:
            water_stress_records.append(
                layer_record(
                    city,
                    "water_stress",
                    "wri-aqueduct",
                    "WRI Aqueduct",
                    {
                        "waterStress": round_metric(aqueduct_match["water_stress"]),
                        "waterStressLabel": aqueduct_match["water_stress_label"],
                    },
                ),
            )
            urban_intel.append(
                metric(
                    "water-stress",
                    aqueduct_match["water_stress"],
                    "score",
                    2023,
                    aqueduct_source,
                ),
            )
            sources[aqueduct_source["id"]] = aqueduct_source

        carbon_match = carbon_rows.get(city.city_id)
        if carbon_match:
            carbon_date, carbon_value = carbon_match
            urban_intel.append(
                metric(
                    "co2-emissions-ktco2-per-day",
                    carbon_value,
                    "KtCO2/day",
                    to_int(carbon_date[:4]),
                    carbon_source,
                ),
            )
            sources[carbon_source["id"]] = carbon_source

        filtered_urban_intel = [entry for entry in urban_intel if entry["value"] is not None]
        if not filtered_urban_intel:
            continue

        enrichment_cities[city.city_id] = {
            "generatedAt": generated_at,
            "economicFactbook": [],
            "investorIntel": [],
            "urbanIntel": filtered_urban_intel,
            "sources": list(sources.values()),
        }

    processed_indexes_dir.mkdir(parents=True, exist_ok=True)
    output_file.parent.mkdir(parents=True, exist_ok=True)

    (processed_indexes_dir / "air-quality.json").write_text(
        json.dumps(air_quality_records, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (processed_indexes_dir / "water-stress.json").write_text(
        json.dumps(water_stress_records, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    output_file.write_text(
        json.dumps(
            {
                "generatedAt": generated_at,
                "cities": enrichment_cities,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print(
        "Generated environment artifacts:",
        f"air_quality={len(air_quality_records)}",
        f"water_stress={len(water_stress_records)}",
        f"cities={len(enrichment_cities)}",
        f"output={output_file}",
    )


if __name__ == "__main__":
    main()
