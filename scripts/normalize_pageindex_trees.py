"""Normalize PageIndex raw exports into HealthWise's permanent tree schema.

This is an offline source-ingestion utility. It reads only public clinical
document trees, verifies their source identity against the final Wave 1 tier
manifest, and never receives patient data or creates recommendations.
"""

from __future__ import annotations

import argparse
import importlib.metadata
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator, FormatChecker


ROOT = Path(__file__).resolve().parent.parent
WAVE_ROOT = ROOT / "knowledge-sources" / "wave1"
PILOT_PATH = WAVE_ROOT / "pageindex-pilot.json"
TIER_MANIFEST_PATH = WAVE_ROOT / "source-tiering.wave1.full-tree-expanded.json"
SCHEMA_PATH = WAVE_ROOT / "pageindex-tree.schema.json"
RAW_TREE_PATH = WAVE_ROOT / "pageindex-trees"
NORMALIZED_TREE_PATH = RAW_TREE_PATH / "normalized"
NORMALIZER_VERSION = "1.0"
INDEX_MODEL = "gpt-4o-mini"


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def clean_text(value: Any, field: str) -> str:
    if not isinstance(value, str) or not (text := " ".join(value.split())):
        raise ValueError(f"PageIndex node has an invalid {field}.")
    return text


def page_locator(raw_node: dict[str, Any], page_count: int) -> dict[str, int]:
    """Normalize PageIndex range and point-anchor variants into one locator."""
    start = raw_node.get("start_index")
    end = raw_node.get("end_index")
    if isinstance(start, int) and isinstance(end, int):
        start_page, end_page = start, end
    elif isinstance(raw_node.get("page_index"), int):
        start_page = end_page = raw_node["page_index"]
    else:
        raise ValueError(f"Node {raw_node.get('node_id')!r} has no usable PageIndex page locator.")
    if start_page < 1 or end_page < start_page or end_page > page_count:
        raise ValueError(f"Node {raw_node.get('node_id')!r} has out-of-bounds pages {start_page}-{end_page}.")
    return {"startPage": start_page, "endPage": end_page}


def normalize_node(raw_node: Any, page_count: int, seen_ids: set[str]) -> dict[str, Any]:
    if not isinstance(raw_node, dict):
        raise ValueError("A PageIndex tree item is not an object.")
    node_id = clean_text(raw_node.get("node_id"), "node_id")
    if node_id in seen_ids:
        raise ValueError(f"Duplicate PageIndex node ID: {node_id}")
    seen_ids.add(node_id)
    raw_children = raw_node.get("nodes", [])
    if raw_children is None:
        raw_children = []
    if not isinstance(raw_children, list):
        raise ValueError(f"Node {node_id!r} has a non-list nodes field.")
    raw_key_items = raw_node.get("key_items", [])
    if raw_key_items is None:
        raw_key_items = []
    if not isinstance(raw_key_items, list):
        raise ValueError(f"Node {node_id!r} has a non-list key_items field.")

    normalized = {
        "nodeId": node_id,
        "title": clean_text(raw_node.get("title"), "title"),
        "pageLocator": page_locator(raw_node, page_count),
        "keyItems": list(dict.fromkeys(clean_text(item, "key_items item") for item in raw_key_items)),
        "children": [normalize_node(child, page_count, seen_ids) for child in raw_children],
    }
    # PageIndex uses prefix_summary for some parent nodes. It is the only
    # available source-derived summary in that case, so retain it explicitly.
    summary = raw_node.get("summary") or raw_node.get("prefix_summary")
    if summary is not None:
        normalized["summary"] = clean_text(summary, "summary")
    return normalized


def selected_records(all_records: list[dict[str, Any]], use_all: bool) -> list[dict[str, Any]]:
    records_by_citation = {record["citationId"]: record for record in all_records}
    if use_all:
        return [record for record in all_records if record.get("tier") == "full_tree"]
    pilot = read_json(PILOT_PATH)
    return [records_by_citation[item["citationId"]] for item in pilot["documents"]]


def validate_instance(instance: dict[str, Any], validator: Draft202012Validator) -> None:
    errors = sorted(validator.iter_errors(instance), key=lambda error: list(error.path))
    if errors:
        rendered = "; ".join(f"{'/'.join(map(str, error.path)) or '<root>'}: {error.message}" for error in errors)
        raise ValueError(f"Normalized tree failed permanent schema validation: {rendered}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--all", action="store_true", help="Normalize every approved full_tree raw export instead of only the pilot documents.")
    args = parser.parse_args()

    schema = read_json(SCHEMA_PATH)
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    tier_manifest = read_json(TIER_MANIFEST_PATH)
    records = selected_records(tier_manifest["records"], args.all)
    NORMALIZED_TREE_PATH.mkdir(parents=True, exist_ok=True)
    generated_at = datetime.now(UTC).isoformat()
    manifest: dict[str, Any] = {"schemaVersion": "1.0", "normalizerVersion": NORMALIZER_VERSION, "trees": []}

    for record in records:
        if record.get("tier") != "full_tree" or record.get("pageIndexInputPolicy") != "full_document_only_no_page_slicing":
            raise ValueError(f"Unapproved PageIndex input: {record['citationId']}")
        raw_path = RAW_TREE_PATH / f"{record['documentId']}.tree.json"
        if not raw_path.is_file():
            raise FileNotFoundError(f"Missing raw PageIndex export: {raw_path}")
        raw = read_json(raw_path)
        if raw.get("documentId") != record["documentId"] or raw.get("sourceUrl") != record["sourceUrl"] or raw.get("contentHash") != record["contentHash"]:
            raise ValueError(f"Raw export identity does not match the active source manifest: {record['documentId']}")
        if raw.get("citationIds") != [record["citationId"]]:
            raise ValueError(f"Raw export citation mapping does not match: {record['documentId']}")
        if not isinstance(raw.get("tree"), list) or not raw["tree"]:
            raise ValueError(f"Raw PageIndex tree is empty: {record['documentId']}")

        seen_ids: set[str] = set()
        normalized = {
            "schemaVersion": "1.0",
            "document": {
                "documentId": record["documentId"],
                "citationIds": [record["citationId"]],
                "title": record["title"],
                "sourceUrl": record["sourceUrl"],
                "contentHash": record["contentHash"],
                "pageCount": record["pageCount"],
                "sourceTier": "full_tree",
            },
            "generation": {
                "engine": "PageIndex",
                "engineVersion": importlib.metadata.version("pageindex"),
                "indexModel": INDEX_MODEL,
                "pageIndexDocumentId": clean_text(raw.get("pageIndexDocumentId"), "pageIndexDocumentId"),
                "generatedAt": raw["generatedAt"],
                "rawExportPath": raw_path.relative_to(ROOT).as_posix(),
            },
            "tree": [normalize_node(node, record["pageCount"], seen_ids) for node in raw["tree"]],
            "validation": {"status": "validated", "validatedAt": generated_at, "normalizerVersion": NORMALIZER_VERSION},
        }
        validate_instance(normalized, validator)
        output_path = NORMALIZED_TREE_PATH / f"{record['documentId']}.normalized.tree.json"
        output_path.write_text(json.dumps(normalized, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        manifest["trees"].append({
            "documentId": record["documentId"],
            "citationId": record["citationId"],
            "contentHash": record["contentHash"],
            "normalizedTreePath": output_path.relative_to(ROOT).as_posix(),
            "nodeCount": len(seen_ids),
        })
        print(f"Normalized and schema-validated: {record['title']} ({len(seen_ids)} nodes)")

    (NORMALIZED_TREE_PATH / "normalized-tree-manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote normalized tree manifest: {NORMALIZED_TREE_PATH / 'normalized-tree-manifest.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
