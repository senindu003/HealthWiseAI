"""Validate and import the curated Wave 1 JSON files into Neo4j.

Usage (from health-ai-backend):
  python scripts/import_knowledge_graph.py --dry-run
  python scripts/import_knowledge_graph.py
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.config import get_settings
from app.knowledge_graph.importer import KnowledgeGraphImporter, load_and_validate_bundle


DEFAULT_DATA_DIR = Path(__file__).resolve().parents[2]


def main() -> int:
    parser = argparse.ArgumentParser(description="Import HealthWise curated evidence JSON into Neo4j")
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA_DIR)
    parser.add_argument("--dry-run", action="store_true", help="Validate only; do not contact Neo4j")
    args = parser.parse_args()

    bundle = load_and_validate_bundle(args.data_dir)
    if args.dry_run:
        print(
            "Validated bundle: "
            f"{len(bundle.catalogue.get('symptoms', []))} symptoms, "
            f"{len(bundle.registry.get('conditions', []))} conditions, "
            f"{len(bundle.evidence.get('records', []))} evidence records, "
            f"{len(bundle.candidate_symptom_evidence_mappings.get('mappings', []))} non-runtime candidate mappings, "
            f"{len(bundle.reviewed_symptom_evidence_mappings.get('mappings', []))} reviewed runtime mappings."
        )
        return 0

    importer = KnowledgeGraphImporter(get_settings())
    try:
        counts = importer.import_bundle(bundle)
    finally:
        importer.close()
    print(f"Neo4j import complete: {counts}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
