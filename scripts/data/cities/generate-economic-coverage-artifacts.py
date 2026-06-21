from __future__ import annotations

import csv
import gzip
import json
import math
import re
import unicodedata
import zipfile
from collections import defaultdict
from datetime import UTC, datetime
from pathlib import Path
from xml.etree import ElementTree as ET


ROOT = Path.cwd()
REGISTRY_FILE = ROOT / "src" / "data" / "generated" / "cities" / "registry.json"
OECD_MUNICIPALITIES_FILE = ROOT / "data" / "raw" / "cities" / "bulk" / "oecd" / "list_of_municipalities_in_FUAs_and_Cities.csv"
EUROSTAT_LABOUR_FILE = ROOT / "data" / "raw" / "cities" / "bulk" / "eurostat" / "urb_clma.tsv.gz"
GLEIF_LEI_ZIP_FILE = ROOT / "data" / "raw" / "cities" / "bulk" / "gleif" / "lei2-latest.zip"
OUTPUT_FILE = ROOT / "src" / "data" / "generated" / "command-center" / "city-economic-coverage-enrichment.json"

LEI_NS = "{http://www.gleif.org/data/schema/leidata/2016}"
EUROSTAT_RELEVANT_INDICATORS = {
    "EC1001V",
    "EC1002V",
    "EC1003V",
    "EC1010V",
    "EC1011V",
    "EC1012V",
    "EC1077V",
    "EC1078V",
    "EC1079V",
}


def normalize_label(value: str | None) -> str:
    if not value:
        return ""

    normalized = (
        unicodedata.normalize("NFKD", value)
        .encode("ascii", "ignore")
        .decode("ascii")
        .lower()
    )
    normalized = re.sub(r"\([^)]*\)", " ", normalized)
    normalized = re.sub(r"\b(greater|metropolitan)\b", " ", normalized)
    normalized = re.sub(r"[^a-z0-9]+", "-", normalized)
    return normalized.strip("-")


def normalize_region_token(value: str | None) -> str | None:
    if not value:
        return None

    normalized = (
        unicodedata.normalize("NFKD", value)
        .encode("ascii", "ignore")
        .decode("ascii")
        .upper()
    )
    if "-" in normalized:
        normalized = normalized.split("-")[-1]

    normalized = re.sub(r"[^A-Z0-9]+", "", normalized)
    return normalized or None


def build_city_labels(city) -> set[str]:
    labels = {normalize_label(city["name"])}
    for alias in city.get("aliases", []):
        label = normalize_label(alias)
        if label:
            labels.add(label)
    return {label for label in labels if label}


def build_city_lookup(registry, iso_key: str, major_only: bool = False):
    lookup = defaultdict(list)

    for city in registry:
        if major_only and not city.get("isMajorCity"):
            continue

        iso_code = (city.get(iso_key) or "").upper()
        if not iso_code:
            continue

        for label in build_city_labels(city):
            lookup[(iso_code, label)].append(city)

    return lookup


def build_eurostat_city_code_map(registry):
    city_lookup = build_city_lookup(registry, "countryIso3")
    city_codes = defaultdict(set)

    # The OECD FUA municipality list is the City-ID <-> registry-city crosswalk Eurostat matching
    # depends on. It is a portal-only (manual) source; without it there is no Eurostat city mapping.
    if not OECD_MUNICIPALITIES_FILE.exists():
        return {}

    with OECD_MUNICIPALITIES_FILE.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            country_iso3 = (row.get("ISO3 code") or "").strip().upper()
            city_code = (row.get("City ID") or "").strip()
            city_name = row.get("City name") or ""
            if not country_iso3 or not city_code or not city_name:
                continue

            matches = city_lookup.get((country_iso3, normalize_label(city_name)), [])
            if len(matches) != 1:
                continue

            city_codes[matches[0]["cityId"]].add(city_code)

    return {
        city_id: next(iter(codes))
        for city_id, codes in city_codes.items()
        if len(codes) == 1
    }


def parse_eurostat_cell(value: str) -> float | None:
    cleaned = (value or "").strip()
    if not cleaned or cleaned.startswith(":"):
        return None

    match = re.search(r"-?\d+(?:\.\d+)?", cleaned)
    if not match:
        return None

    return float(match.group(0))


def read_eurostat_series(valid_city_codes: set[str]):
    series: dict[str, dict[str, dict[int, float]]] = defaultdict(dict)

    # Eurostat is a bulk/portal source; degrade to no city-labour coverage when absent.
    if not EUROSTAT_LABOUR_FILE.exists():
        return series

    with gzip.open(EUROSTAT_LABOUR_FILE, "rt", encoding="utf-8") as handle:
        header = next(handle).rstrip("\n").split("\t")
        years = [int(column.strip()) for column in header[1:]]

        for line in handle:
            parts = line.rstrip("\n").split("\t")
            if len(parts) < 2:
                continue

            dimensions = parts[0].split(",")
            if len(dimensions) != 3:
                continue

            freq, indicator_id, city_code = dimensions
            if freq != "A" or indicator_id not in EUROSTAT_RELEVANT_INDICATORS or city_code not in valid_city_codes:
                continue

            values: dict[int, float] = {}
            for year, cell in zip(years, parts[1:]):
                parsed = parse_eurostat_cell(cell)
                if parsed is not None:
                    values[year] = parsed

            if values:
                series[city_code][indicator_id] = values

    return series


def combine_series(primary: dict[int, float], left: dict[int, float], right: dict[int, float]):
    if primary:
        return dict(primary)

    common_years = set(left) & set(right)
    return {year: left[year] + right[year] for year in common_years}


def subtract_series(minuend: dict[int, float], subtrahend: dict[int, float]):
    common_years = set(minuend) & set(subtrahend)
    return {
        year: minuend[year] - subtrahend[year]
        for year in common_years
        if math.isfinite(minuend[year]) and math.isfinite(subtrahend[year]) and minuend[year] >= subtrahend[year]
    }


def latest_observation(values: dict[int, float]):
    if not values:
        return None

    year = max(values)
    return year, values[year]


def build_metric(indicator_id: str, value: float, unit: str, year: int, source):
    if value is None or not math.isfinite(value):
        return None

    return {
        "indicatorId": indicator_id,
        "value": round(value),
        "unit": unit,
        "year": year,
        "status": "actual",
        "source": source,
    }


def build_eurostat_metrics(registry):
    city_code_map = build_eurostat_city_code_map(registry)
    series = read_eurostat_series(set(city_code_map.values()))
    source = {
        "id": "eurostat-city-labour",
        "name": "Eurostat City Statistics",
        "updatedAt": datetime.now(UTC).date().isoformat(),
        "coverage": "city_statistics",
        "methodology": (
            "Latest Eurostat city labour observation matched through the shared OECD/EC city code, "
            "with total employment derived from labour force and unemployment when needed."
        ),
        "url": "https://ec.europa.eu/eurostat/web/cities/data",
    }

    metrics_by_city: dict[str, list[dict]] = {}
    for city_id, city_code in city_code_map.items():
        city_series = series.get(city_code, {})

        labour_force_series = combine_series(
            city_series.get("EC1001V", {}),
            city_series.get("EC1002V", {}),
            city_series.get("EC1003V", {}),
        )
        unemployment_series = combine_series(
            city_series.get("EC1010V", {}),
            city_series.get("EC1011V", {}),
            city_series.get("EC1012V", {}),
        )
        employment_series = combine_series(
            city_series.get("EC1077V", {}),
            city_series.get("EC1078V", {}),
            city_series.get("EC1079V", {}),
        )
        if not employment_series and labour_force_series and unemployment_series:
            employment_series = subtract_series(labour_force_series, unemployment_series)

        city_metrics = []
        labour_force_observation = latest_observation(labour_force_series)
        if labour_force_observation:
            metric = build_metric("labour-force", labour_force_observation[1], "persons", labour_force_observation[0], source)
            if metric:
                city_metrics.append(metric)

        employment_observation = latest_observation(employment_series)
        if employment_observation:
            metric = build_metric("employment", employment_observation[1], "persons", employment_observation[0], source)
            if metric:
                city_metrics.append(metric)

        if city_metrics:
            metrics_by_city[city_id] = city_metrics

    return metrics_by_city, source


def match_major_city(lookup, country_iso2: str | None, city_name: str | None, region: str | None):
    normalized_city = normalize_label(city_name)
    normalized_country = (country_iso2 or "").upper()
    if not normalized_city or not normalized_country:
        return None

    candidates = lookup.get((normalized_country, normalized_city), [])
    if len(candidates) == 1:
        return candidates[0]

    region_token = normalize_region_token(region)
    if region_token:
        narrowed = []
        for city in candidates:
            candidate_tokens = {
                normalize_region_token(city.get("admin1Code")),
                normalize_region_token(city.get("admin1Name")),
            }
            if region_token in candidate_tokens:
                narrowed.append(city)

        if len(narrowed) == 1:
            return narrowed[0]

    return None


def parse_gleif_company_counts(registry):
    major_city_lookup = build_city_lookup(registry, "countryIso2", major_only=True)
    counts = defaultdict(int)
    content_date = None

    # GLEIF concatenated file is huge and optional here; degrade to no company-presence when absent.
    if not GLEIF_LEI_ZIP_FILE.exists():
        return counts, content_date

    with zipfile.ZipFile(GLEIF_LEI_ZIP_FILE) as archive:
        xml_name = next(name for name in archive.namelist() if name.lower().endswith(".xml"))
        with archive.open(xml_name) as handle:
            for event, elem in ET.iterparse(handle, events=("end",)):
                if elem.tag == f"{LEI_NS}ContentDate" and content_date is None:
                    content_date = (elem.text or "").strip()
                    elem.clear()
                    continue

                if elem.tag != f"{LEI_NS}LEIRecord":
                    continue

                entity = elem.find(f"{LEI_NS}Entity")
                registration = elem.find(f"{LEI_NS}Registration")
                if entity is None or registration is None:
                    elem.clear()
                    continue

                entity_status = (entity.findtext(f"{LEI_NS}EntityStatus") or "").strip().upper()
                registration_status = (registration.findtext(f"{LEI_NS}RegistrationStatus") or "").strip().upper()
                if entity_status != "ACTIVE" or registration_status != "ISSUED":
                    elem.clear()
                    continue

                matched_city_ids = set()
                for address_tag in ("LegalAddress", "HeadquartersAddress"):
                    address = entity.find(f"{LEI_NS}{address_tag}")
                    if address is None:
                        continue

                    matched_city = match_major_city(
                        major_city_lookup,
                        address.findtext(f"{LEI_NS}Country"),
                        address.findtext(f"{LEI_NS}City"),
                        address.findtext(f"{LEI_NS}Region"),
                    )
                    if matched_city:
                        matched_city_ids.add(matched_city["cityId"])

                for city_id in matched_city_ids:
                    counts[city_id] += 1

                elem.clear()

    return counts, content_date


def ensure_city_entry(entries, city_id: str, generated_at: str):
    return entries.setdefault(
        city_id,
        {
            "generatedAt": generated_at,
            "economicFactbook": [],
            "investorIntel": [],
            "urbanIntel": [],
            "sources": [],
        },
    )


def dedupe_sources(sources):
    deduped = {}
    for source in sources:
        deduped[source["id"]] = source
    return list(deduped.values())


def main():
    generated_at = datetime.now(UTC).isoformat().replace("+00:00", "Z")
    registry = json.loads(REGISTRY_FILE.read_text(encoding="utf-8"))
    city_entries = {}

    eurostat_metrics, eurostat_source = build_eurostat_metrics(registry)
    for city_id, metrics in eurostat_metrics.items():
        entry = ensure_city_entry(city_entries, city_id, generated_at)
        entry["economicFactbook"].extend(metrics)
        entry["sources"].append(eurostat_source)

    gleif_counts, gleif_content_date = parse_gleif_company_counts(registry)
    gleif_updated_at = (gleif_content_date or generated_at)[:10]
    gleif_year = int((gleif_content_date or generated_at)[:4])
    gleif_source = {
        "id": "gleif-lei",
        "name": "GLEIF LEI",
        "updatedAt": gleif_updated_at,
        "coverage": "legal-entity-city-match",
        "methodology": (
            "Active GLEIF LEI records counted when the legal or headquarters city matches the selected major city."
        ),
        "url": "https://leidata.gleif.org/",
    }
    for city_id, company_count in gleif_counts.items():
        entry = ensure_city_entry(city_entries, city_id, generated_at)
        metric = build_metric("company-presence", company_count, "LEIs", gleif_year, gleif_source)
        if metric:
            entry["investorIntel"].append(metric)
            entry["sources"].append(gleif_source)

    for entry in city_entries.values():
        entry["sources"] = dedupe_sources(entry["sources"])

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(
        json.dumps(
            {
                "generatedAt": generated_at,
                "cities": city_entries,
            },
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print(
        "Generated economic coverage artifacts:",
        f"eurostat_cities={len(eurostat_metrics)}",
        f"gleif_cities={len(gleif_counts)}",
        f"output_cities={len(city_entries)}",
        f"output={OUTPUT_FILE}",
    )


if __name__ == "__main__":
    main()
