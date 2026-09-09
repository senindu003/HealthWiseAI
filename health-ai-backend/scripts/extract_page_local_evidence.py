r"""Create a page-pinned evidence bundle from a curated retrieval plan.

Run from health-ai-backend:
  .\.venv\Scripts\python.exe scripts\extract_page_local_evidence.py ^
    --plan ..\knowledge-sources\wave1\pageindex-trees\retrieval-plan.diabetes.json ^
    --output ..\knowledge-sources\wave1\pageindex-trees\evidence-bundle.diabetes.json

No network, LLM, Neo4j, patient data, or recommendation generation is used.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.knowledge_graph.page_text_extraction import extract_retrieval_plan


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan", required=True, type=Path, help="Read-only retrieval-plan JSON created by retrieve_curated_evidence.py")
    parser.add_argument("--output", required=True, type=Path, help="Output evidence-bundle JSON")
    args = parser.parse_args()

    if not args.plan.is_file():
        parser.error(f"Retrieval plan does not exist: {args.plan}")
    plan = json.loads(args.plan.read_text(encoding="utf-8"))
    bundle = extract_retrieval_plan(plan)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(bundle, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    node_count = sum(len(item["selectedNodeEvidence"]) for item in bundle["evidence"])
    print(f"Wrote page-local evidence bundle: {args.output} ({len(bundle['evidence'])} citations, {node_count} nodes)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
