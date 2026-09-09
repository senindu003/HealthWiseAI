"""Record the project owner's completed manual review across Wave 1 variants.

This is an audit-metadata update only. It does not make the evidence runtime
eligible or replace any required clinician/governance approval.
"""
from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
FILES = (
    "condition-evidence.wave1.full-tree-expanded.json",
)
REVIEW_DATE = "2026-09-06"
NOTE = (
    "Project owner recorded manual review as completed on 2026-09-06. "
    "This audit flag alone does not grant runtime eligibility or replace "
    "required clinician/governance approval."
)


def main() -> None:
    for name in FILES:
        path = ROOT / name
        document = json.loads(path.read_text(encoding="utf-8"))
        records = document.get("records", [])
        if not records:
            raise ValueError(f"{name} has no evidence records")
        for record in records:
            review = record.setdefault("review", {})
            review["clinicalReviewStatus"] = "completed"
            review["reviewedBy"] = "manual_project_review"
            review["reviewedAt"] = REVIEW_DATE
            notes = review.setdefault("notes", [])
            if NOTE not in notes:
                notes.append(NOTE)
        path.write_text(json.dumps(document, indent=2) + "\n", encoding="utf-8")
        print(f"Updated {name}: {len(records)} records")


if __name__ == "__main__":
    main()
