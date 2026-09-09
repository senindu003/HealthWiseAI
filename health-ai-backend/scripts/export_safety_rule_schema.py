"""Export the canonical Pydantic SafetyRule JSON Schema for registry review."""

from __future__ import annotations

import json
import sys
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.knowledge_graph.safety_rules import SafetyRuleRegistry


OUTPUT = PROJECT_ROOT / "knowledge-sources" / "wave1" / "safety-rule-registry.schema.json"


def main() -> int:
    OUTPUT.write_text(json.dumps(SafetyRuleRegistry.model_json_schema(), indent=2) + "\n", encoding="utf-8")
    print(f"Wrote SafetyRule JSON Schema: {OUTPUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
