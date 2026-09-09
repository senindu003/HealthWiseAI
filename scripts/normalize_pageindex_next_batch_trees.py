"""Normalize next-batch PageIndex exports into the permanent HealthWise tree schema.

Without --all, normalizes only the three approved slice-pilot documents.
With --all, normalizes every completed next-batch tree. This utility makes no
LLM, Neo4j, network, or patient-data calls.
"""

from __future__ import annotations

import argparse
import importlib.metadata
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator, FormatChecker

from normalize_pageindex_trees import clean_text, normalize_node, validate_instance


ROOT = Path(__file__).resolve().parent.parent
WAVE_ROOT = ROOT / "knowledge-sources" / "wave1"
MANIFEST_PATH = WAVE_ROOT / "source-tiering.wave1.pageindex-next-batch.json"
PILOT_PATH = WAVE_ROOT / "pageindex-next-batch-pilot.json"
SCHEMA_PATH = WAVE_ROOT / "pageindex-tree.schema.json"
RAW_PATH = WAVE_ROOT / "pageindex-trees" / "next-batch"
OUTPUT_PATH = WAVE_ROOT / "pageindex-trees" / "normalized" / "next-batch"


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def select_records(use_all: bool) -> list[dict[str, Any]]:
    manifest = read_json(MANIFEST_PATH)
    if use_all:
        return manifest["records"]
    records_by_id = {record["documentId"]: record for record in manifest["records"]}
    pilot = read_json(PILOT_PATH)
    return [records_by_id[item["documentId"]] for item in pilot["documents"]]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--all", action="store_true", help="Normalize all completed next-batch trees.")
    args = parser.parse_args()
    validator = Draft202012Validator(read_json(SCHEMA_PATH), format_checker=FormatChecker())
    records = select_records(args.all)
    OUTPUT_PATH.mkdir(parents=True, exist_ok=True)
    normalized_manifest: dict[str, Any] = {"schemaVersion": "1.0", "normalizerVersion": "1.0", "trees": []}
    now = datetime.now(UTC).isoformat()
    for record in records:
        raw_path = RAW_PATH / f"{record['documentId']}.tree.json"
        if not raw_path.is_file():
            raise FileNotFoundError(f"Missing raw PageIndex export: {raw_path}")
        raw = read_json(raw_path)
        for field in ("documentId", "sourceUrl", "contentHash", "citationIds"):
            if raw.get(field) != record[field]:
                raise ValueError(f"Raw export {field} does not match approved manifest for {record['documentId']}")
        tree = raw.get("tree")
        if not isinstance(tree, list) or not tree:
            raise ValueError(f"Raw PageIndex tree is empty for {record['documentId']}")
        seen_ids: set[str] = set()
        normalized = {
            "schemaVersion": "1.0",
            "document": {
                "documentId": record["documentId"], "citationIds": record["citationIds"], "title": record["title"],
                "sourceUrl": record["sourceUrl"], "contentHash": record["contentHash"], "pageCount": record["pageCount"],
                "sourceTier": record["tier"],
                "sourceSelection": {"sourceAuditDocumentId": record["sourceAuditDocumentId"], "originalPageRanges": record["selectedOriginalPageRanges"]},
            },
            "generation": {
                "engine": "PageIndex", "engineVersion": importlib.metadata.version("pageindex"), "indexModel": "gpt-4o-mini",
                "pageIndexDocumentId": clean_text(raw.get("pageIndexDocumentId"), "pageIndexDocumentId"),
                "generatedAt": raw["generatedAt"], "rawExportPath": raw_path.relative_to(ROOT).as_posix(),
                "indexingMode": raw.get("indexingMode", "standard"),
            },
            "tree": [normalize_node(node, record["pageCount"], seen_ids) for node in tree],
            "validation": {"status": "validated", "validatedAt": now, "normalizerVersion": "1.0"},
        }
        validate_instance(normalized, validator)
        output = OUTPUT_PATH / f"{record['documentId']}.normalized.tree.json"
        output.write_text(json.dumps(normalized, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        normalized_manifest["trees"].append({"documentId": record["documentId"], "citationIds": record["citationIds"], "contentHash": record["contentHash"], "normalizedTreePath": output.relative_to(ROOT).as_posix(), "nodeCount": len(seen_ids)})
        print(f"Normalized and schema-validated: {record['title']} ({len(seen_ids)} nodes)")
    manifest_path = OUTPUT_PATH / "normalized-tree-manifest.json"
    manifest_path.write_text(json.dumps(normalized_manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote normalized next-batch manifest: {manifest_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
