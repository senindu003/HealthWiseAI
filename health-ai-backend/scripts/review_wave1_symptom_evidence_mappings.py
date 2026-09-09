"""Read-only reviewer for Wave 1 legacy symptom-to-evidence candidates.

Run from ``health-ai-backend``.  This script never promotes, edits, or imports
an edge; it displays the current review queue built from the amended sparse
prognosis matrix.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
ROOT = BACKEND_DIR.parent
CANDIDATES_PATH = ROOT / "knowledge-sources" / "wave1" / "symptom-evidence-candidates.wave1.json"
CATALOGUE_PATH = ROOT / "symptom-catalogue.v1.json"
EVIDENCE_PATH = ROOT / "condition-evidence.wave1.full-tree-expanded.json"


def read_json(path: Path) -> dict:
    with path.open(encoding="utf-8") as source:
        return json.load(source)


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Inspect non-runtime Wave 1 symptom-to-evidence candidate mappings."
    )
    selector = parser.add_mutually_exclusive_group()
    selector.add_argument("--prognosis", help='Exact amended sparse-matrix label, for example "Migraine".')
    selector.add_argument("--condition-id", help="Exact Wave 1 evidence condition ID, for example migraine.")
    selector.add_argument("--all", action="store_true", help="Show every Wave 1 mapping.")
    parser.add_argument("--json", action="store_true", help="Emit machine-readable JSON instead of a table.")
    args = parser.parse_args()

    candidates = read_json(CANDIDATES_PATH)
    catalogue = read_json(CATALOGUE_PATH)
    evidence = read_json(EVIDENCE_PATH)
    display_by_symptom = {item["symptomId"]: item["displayName"] for item in catalogue["symptoms"]}
    display_by_condition = {item["conditionId"]: item["conditionDisplayName"] for item in evidence["records"]}

    mappings = list(candidates.get("mappings", []))
    if args.prognosis:
        mappings = [item for item in mappings if args.prognosis in item.get("sourcePrognosisLabels", [])]
    elif args.condition_id:
        mappings = [item for item in mappings if item.get("conditionId") == args.condition_id]
    elif not args.all:
        # A compact condition summary is safer than dumping 197 rows by default.
        summary: dict[tuple[str, str, str], int] = {}
        for item in mappings:
            key = (
                item["conditionId"],
                item["evidenceId"],
                ", ".join(item.get("sourcePrognosisLabels", [])),
            )
            summary[key] = summary.get(key, 0) + 1
        for (condition_id, evidence_id, labels), count in sorted(summary.items()):
            print(f"{condition_id:62}  {count:3} candidate symptoms  {labels}  ({evidence_id})")
        print(f"\nTotal candidate mappings: {len(candidates.get('mappings', []))}")
        print('Use --prognosis "Migraine" or --condition-id migraine to inspect one condition.')
        return 0

    review_rows = [
        {
            "prognosisLabels": item.get("sourcePrognosisLabels", []),
            "conditionId": item["conditionId"],
            "conditionDisplayName": display_by_condition.get(item["conditionId"], item["conditionId"]),
            "evidenceId": item["evidenceId"],
            "symptomId": item["symptomId"],
            "symptomDisplayName": display_by_symptom.get(item["symptomId"], item["symptomId"]),
            "observedPositiveRows": item.get("observedPositiveRows", 0),
            "evidenceCitationRefs": item.get("evidenceCitationRefs", []),
            "clinicalReviewStatus": item.get("review", {}).get("clinicalReviewStatus"),
            "runtimeEligible": item.get("review", {}).get("runtimeEligible"),
        }
        for item in sorted(mappings, key=lambda item: (item["conditionId"], item["symptomId"]))
    ]
    if not review_rows:
        print("No candidate mappings matched that selector.", file=sys.stderr)
        return 2
    if args.json:
        print(json.dumps(review_rows, indent=2))
        return 0

    for row in review_rows:
        print(f"\n{row['conditionDisplayName']} ({row['conditionId']})")
        print(f"  Symptom: {row['symptomDisplayName']} [{row['symptomId']}]")
        print(f"  Evidence: {row['evidenceId']}")
        print(f"  Sparse-matrix positive rows: {row['observedPositiveRows']}")
        print(f"  Evidence citations: {', '.join(row['evidenceCitationRefs'])}")
        print(f"  Review: {row['clinicalReviewStatus']}; runtimeEligible={row['runtimeEligible']}")
    print(f"\nMappings shown: {len(review_rows)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
