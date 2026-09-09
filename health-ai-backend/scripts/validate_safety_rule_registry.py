"""Validate the non-runtime clinician-review SafetyRule registry.

No LLM, patient data, Neo4j access, or rule evaluation occurs here.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.knowledge_graph.safety_rules import SafetyRuleRegistry


DEFAULT_REGISTRY = PROJECT_ROOT / "knowledge-sources" / "wave1" / "safety-rule-registry.wave1.json"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--registry", type=Path, default=DEFAULT_REGISTRY)
    args = parser.parse_args()
    registry = SafetyRuleRegistry.model_validate_json(args.registry.read_text(encoding="utf-8"))
    candidate_count = sum(rule.status == "candidate" for rule in registry.rules)
    approved_count = sum(rule.status == "approved" for rule in registry.rules)
    runtime_count = sum(rule.runtime_eligible for rule in registry.rules)
    print(json.dumps({
        "status": "valid",
        "citationCount": len(registry.citations),
        "ruleCount": len(registry.rules),
        "candidateRuleCount": candidate_count,
        "approvedRuleCount": approved_count,
        "runtimeEligibleRuleCount": runtime_count,
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
