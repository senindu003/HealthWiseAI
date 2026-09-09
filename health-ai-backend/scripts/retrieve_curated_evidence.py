"""Create a read-only Neo4j-to-PageIndex retrieval plan for offline evaluation.

Examples (run from health-ai-backend):
  ..\\.venv\\Scripts\\python.exe scripts\\retrieve_curated_evidence.py --condition-id psoriasis --query "initial assessment"
  ..\\.venv\\Scripts\\python.exe scripts\\retrieve_curated_evidence.py --condition-query "varicose" --query "diagnosis testing"
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from neo4j.exceptions import DriverError, Neo4jError


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.config import get_settings
from app.knowledge_graph.retrieval import CuratedEvidenceRetriever


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--condition-id", action="append", default=[], help="Exact curated Neo4j Condition.conditionId; may be repeated.")
    parser.add_argument("--condition-query", default="", help="Offline condition-name search only; this does not map symptoms to a condition.")
    parser.add_argument("--query", default="", help="Optional source-navigation terms used only to rank nodes within linked trees.")
    parser.add_argument("--output", type=Path, help="Optional JSON output path; otherwise writes to stdout.")
    args = parser.parse_args()

    try:
        retriever = CuratedEvidenceRetriever(get_settings())
        try:
            plan = retriever.create_retrieval_plan(args.condition_id, args.query, args.condition_query)
        finally:
            retriever.close()
    except (Neo4jError, DriverError) as error:
        print(
            "Neo4j is unavailable. For local Docker Neo4j, set NEO4J_URI=bolt://localhost:7687 "
            "and the matching local NEO4J_PASSWORD for this PowerShell session before retrying. "
            f"Driver detail: {error}",
            file=sys.stderr,
        )
        return 2
    serialized = json.dumps(plan, indent=2, ensure_ascii=False) + "\n"
    if args.output:
        args.output.write_text(serialized, encoding="utf-8")
        print(f"Wrote retrieval plan: {args.output}")
    else:
        print(serialized, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
