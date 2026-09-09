"""Promote explicitly approved Wave 1 candidate mappings into runtime edges.

This retains the original candidate registry untouched.  It writes a separate
reviewed registry, so the clinical approval decision remains auditable and can
be independently imported as ``REVIEWED_SYMPTOM_EVIDENCE`` relationships.
"""

from __future__ import annotations

import argparse
import json
from datetime import date
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CANDIDATES_PATH = ROOT / "knowledge-sources" / "wave1" / "symptom-evidence-candidates.wave1.json"
OUTPUT_PATH = ROOT / "knowledge-sources" / "wave1" / "reviewed-symptom-evidence-mappings.wave1.json"


def main() -> int:
    parser = argparse.ArgumentParser(description="Promote explicitly approved Wave 1 symptom-evidence mappings.")
    parser.add_argument(
        "--confirm-all",
        action="store_true",
        help="Required acknowledgement that every candidate mapping received clinician review and approval.",
    )
    parser.add_argument(
        "--reviewed-by",
        default="clinician-reviewed approval (identity not recorded)",
        help="Audit label for the approval record; use an organisation/role if personal identity should not be stored.",
    )
    parser.add_argument("--reviewed-at", default=date.today().isoformat(), help="ISO review date, default: today.")
    args = parser.parse_args()
    if not args.confirm_all:
        parser.error("--confirm-all is required; this command enables patient-facing runtime associations.")

    candidates = json.loads(CANDIDATES_PATH.read_text(encoding="utf-8"))
    approved = []
    for item in candidates.get("mappings", []):
        review = item.get("review", {})
        if review.get("runtimeEligible") is not False or review.get("clinicalReviewStatus") != "pending_clinical_review":
            raise ValueError(f"Candidate {item.get('mappingId')} is not a pending non-runtime mapping.")
        approved.append({
            **{key: value for key, value in item.items() if key not in {"relationshipType", "review"}},
            "relationshipType": "reviewed_symptom_evidence",
            "review": {
                "clinicalReviewStatus": "approved",
                "runtimeEligible": True,
                "reviewedBy": args.reviewed_by.strip(),
                "reviewedAt": args.reviewed_at,
                "approvalBasis": "All candidate associations approved after clinician review.",
                "notes": [
                    "Original candidate provenance remains available in symptom-evidence-candidates.wave1.json.",
                    "This relationship selects a reviewed evidence scope only; it does not diagnose a condition."
                ]
            }
        })

    output = {
        "schemaVersion": "1.0",
        "purpose": "Clinician-reviewed runtime symptom-to-evidence mappings for Wave 1 Stage 4 retrieval.",
        "clinicalBoundary": "A reviewed symptom-evidence relationship retrieves bounded educational evidence only. It does not diagnose a condition, replace SafetyRules, or permit unsupported recommendations.",
        "sourceCandidateRegistry": CANDIDATES_PATH.name,
        "mappings": approved,
    }
    OUTPUT_PATH.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(approved)} reviewed runtime mappings: {OUTPUT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
