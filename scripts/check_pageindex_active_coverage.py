"""Report whether every active Wave 1 evidence citation has a normalized tree.

This is read-only and does not call Neo4j, PageIndex, an LLM, or a network.
Use --strict for a non-zero exit code while any active citation is missing.
"""

from __future__ import annotations

import argparse
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent.parent
WAVE_ROOT = ROOT / "knowledge-sources" / "wave1"
EVIDENCE_PATH = ROOT / "condition-evidence.wave1.full-tree-expanded.json"
MANIFESTS = (
    WAVE_ROOT / "pageindex-trees" / "normalized" / "normalized-tree-manifest.json",
    WAVE_ROOT / "pageindex-trees" / "normalized" / "next-batch" / "normalized-tree-manifest.json",
    WAVE_ROOT / "pageindex-trees" / "normalized" / "final-batch" / "normalized-tree-manifest.json",
)


def read_object(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--strict", action="store_true", help="Exit 1 when any active evidence citation lacks a tree.")
    parser.add_argument("--output", type=Path, help="Optional JSON report path.")
    args = parser.parse_args()
    active = {ref["citationId"] for record in read_object(EVIDENCE_PATH)["records"] for ref in record["citationRefs"]}
    indexed: set[str] = set()
    used_manifests: list[str] = []
    for manifest_path in MANIFESTS:
        if not manifest_path.is_file():
            continue
        used_manifests.append(manifest_path.relative_to(ROOT).as_posix())
        for entry in read_object(manifest_path)["trees"]:
            indexed.update(entry.get("citationIds") or [entry["citationId"]])
    missing = sorted(active - indexed)
    report = {
        "schemaVersion": "1.0", "checkedAt": datetime.now(UTC).isoformat(),
        "activeEvidenceCitationCount": len(active), "indexedActiveCitationCount": len(active & indexed),
        "missingCitationIds": missing, "complete": not missing, "normalizedManifests": used_manifests,
    }
    serialized = json.dumps(report, indent=2, ensure_ascii=False) + "\n"
    if args.output:
        args.output.write_text(serialized, encoding="utf-8")
        print(f"Wrote coverage report: {args.output}")
    print(serialized, end="")
    return 1 if args.strict and missing else 0


if __name__ == "__main__":
    raise SystemExit(main())
