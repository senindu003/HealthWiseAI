r"""Build a deterministic, page-pinned Stage 4 evidence bundle for review.

Run from ``health-ai-backend`` after enabling the reviewed graph runtime:

  $env:KNOWLEDGE_GRAPH_RUNTIME_ENABLED = "true"
  .\.venv\Scripts\python.exe scripts\build_stage4_evidence_bundle.py \
    --condition-id type_2_diabetes_risk_pattern

This is a read-only verification tool. It accepts curated condition IDs only;
it does not accept patient data or use an LLM, and it does not generate advice.
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

from app.services.stage4_evidence_bundle_service import (
    GroundedEvidenceUnavailableError,
    Stage4EvidenceBundleService,
)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--condition-id",
        action="append",
        default=[],
        help="Exact reviewed Neo4j Condition.conditionId; may be repeated.",
    )
    parser.add_argument("--output", type=Path, help="Optional JSON output path; otherwise writes to stdout.")
    args = parser.parse_args()

    try:
        bundle = Stage4EvidenceBundleService().build_for_condition_ids(args.condition_id)
    except (GroundedEvidenceUnavailableError, Neo4jError, DriverError, FileNotFoundError, ValueError) as error:
        print(f"Stage 4 evidence bundle was not created: {error}", file=sys.stderr)
        return 2

    serialized = json.dumps(bundle.model_dump(by_alias=True, mode="json"), indent=2, ensure_ascii=False) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(serialized, encoding="utf-8")
        print(f"Wrote validated Stage 4 evidence bundle: {args.output}")
    else:
        print(serialized, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
