"""Normalize final active-citation PageIndex trees into the permanent schema.

This is an offline validation step. Run it only after every final-batch raw
tree has been exported successfully.
"""

from __future__ import annotations

import importlib.metadata
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator, FormatChecker

from normalize_pageindex_trees import clean_text, normalize_node, validate_instance


ROOT = Path(__file__).resolve().parent.parent
WAVE_ROOT = ROOT / "knowledge-sources" / "wave1"
MANIFEST_PATH = WAVE_ROOT / "source-tiering.wave1.pageindex-final-batch.json"
SCHEMA_PATH = WAVE_ROOT / "pageindex-tree.schema.json"
RAW_PATH = WAVE_ROOT / "pageindex-trees" / "final-batch"
OUTPUT_PATH = WAVE_ROOT / "pageindex-trees" / "normalized" / "final-batch"


def read_object(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    records = read_object(MANIFEST_PATH)["records"]
    validator = Draft202012Validator(read_object(SCHEMA_PATH), format_checker=FormatChecker())
    OUTPUT_PATH.mkdir(parents=True, exist_ok=True)
    normalized_manifest: dict[str, Any] = {"schemaVersion": "1.0", "normalizerVersion": "1.0", "trees": []}
    now = datetime.now(UTC).isoformat()
    for record in records:
        raw_path = RAW_PATH / f"{record['documentId']}.tree.json"
        if not raw_path.is_file():
            raise FileNotFoundError(f"Missing final-batch raw PageIndex export: {raw_path}")
        raw = read_object(raw_path)
        for field in ("documentId", "sourceUrl", "contentHash", "citationIds"):
            if raw.get(field) != record[field]:
                raise ValueError(f"Raw export {field} does not match final manifest for {record['documentId']}")
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
        normalized_manifest["trees"].append({
            "documentId": record["documentId"], "citationIds": record["citationIds"], "contentHash": record["contentHash"],
            "normalizedTreePath": output.relative_to(ROOT).as_posix(), "nodeCount": len(seen_ids),
        })
        print(f"Normalized and schema-validated: {record['title']} ({len(seen_ids)} nodes)")
    output_manifest = OUTPUT_PATH / "normalized-tree-manifest.json"
    output_manifest.write_text(json.dumps(normalized_manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote normalized final-batch manifest: {output_manifest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
