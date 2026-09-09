"""Build non-runtime Wave 1 symptom-to-evidence candidates from the sparse matrix.

The prognosis matrix is legacy candidate data, not a clinical guideline.  This
tool therefore creates reviewable ``CANDIDATE_LEGACY_ASSOCIATION`` records only;
it never creates a runtime Stage 4 relationship.
"""

from __future__ import annotations

import csv
import json
from collections import defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MATRIX_PATH = ROOT / "prognosis_kg_amended.csv"
CATALOGUE_PATH = ROOT / "symptom-catalogue.v1.json"
EVIDENCE_PATH = ROOT / "condition-evidence.wave1.full-tree-expanded.json"
OUTPUT_PATH = ROOT / "knowledge-sources" / "wave1" / "symptom-evidence-candidates.wave1.json"

# These are vocabulary normalisations only.  They restrict the legacy matrix to
# the conditions that have a completed Wave 1 evidence record; they do not make
# the matrix association clinically proven.
WAVE1_PROGNOSIS_TO_CONDITION = {
    "Diabetes": "type_2_diabetes_risk_pattern",
    "Dengue": "dengue",
    "Chickenpox": "varicella_chickenpox",
    "Constipation": "idiopathic_constipation_in_children_and_young_people",
    "Ringworm": "ringworm_tinea",
    "Cholera": "cholera",
    "Pneumonia": "pneumonia",
    "Malaria": "malaria",
    "Otitis Media": "acute_otitis_media",
    "Chikungunya": "chikungunya_fever",
    "Influenza": "influenza",
    "Sinusitis": "acute_sinusitis",
    "Bronchitis": "acute_bronchitis",
    "Tuberculosis": "tuberculosis",
    "Typhoid": "typhoid_fever_enteric_fever",
    "GERD": "gastro_oesophageal_reflux_disease_gord",
    "Peptic Ulcer": "peptic_ulcer_disease",
    "Bronchial Asthma": "asthma",
    "High Blood Pressure": "hypertension",
    "Migraine": "migraine",
    "Gastroenteritis": "acute_diarrhoea_gastroenteritis_in_children",
    "Common Cold": "acute_cough_associated_with_an_upper_respiratory_tract_infection",
    "Varicose Vein": "varicose_veins",
    "Hypothyroidism": "hypothyroidism",
    "Hyperthyroidism": "hyperthyroidism_thyrotoxicosis",
    "Osteoarthritis": "osteoarthritis",
    "(Vertigo) Paroxysmal Positional Vertigo": "benign_paroxysmal_positional_vertigo_bppv",
    "Acne": "acne_vulgaris",
    "Hypoglycemia": "hypoglycaemia_in_adults_with_type_2_diabetes",
    "Urinary Tract Infection": "lower_urinary_tract_infection",
    "Psoriasis": "psoriasis",
    "Impetigo": "impetigo",
    "Conjunctivitis": "acute_conjunctivitis",
    "Dimorphic Hemorrhoids (Piles)": "haemorrhoids_piles",
    "Allergy": "allergic_rhinitis",
}


def read_json(path: Path) -> dict:
    with path.open(encoding="utf-8") as source:
        return json.load(source)


def main() -> int:
    catalogue = read_json(CATALOGUE_PATH)
    evidence = read_json(EVIDENCE_PATH)
    source_term_to_symptom = {
        source_term: item["symptomId"]
        for item in catalogue["symptoms"]
        for source_term in item.get("provenance", {}).get("sourceTerms", [])
    }
    evidence_by_condition = {item["conditionId"]: item for item in evidence["records"]}
    unknown_targets = set(WAVE1_PROGNOSIS_TO_CONDITION.values()) - set(evidence_by_condition)
    if unknown_targets:
        raise ValueError(f"Wave 1 mapping has unknown evidence conditions: {sorted(unknown_targets)}")

    observed_rows: dict[tuple[str, str, str], int] = defaultdict(int)
    unknown_matrix_columns: set[str] = set()
    with MATRIX_PATH.open(encoding="utf-8-sig", newline="") as source:
        for row in csv.DictReader(source):
            prognosis = (row.get("prognosis") or "").strip()
            condition_id = WAVE1_PROGNOSIS_TO_CONDITION.get(prognosis)
            if condition_id is None:
                continue
            for column, raw_value in row.items():
                if column == "prognosis" or str(raw_value).strip() not in {"1", "1.0"}:
                    continue
                symptom_id = source_term_to_symptom.get(column)
                if symptom_id is None:
                    unknown_matrix_columns.add(column)
                    continue
                observed_rows[(symptom_id, condition_id, prognosis)] += 1

    mappings = []
    grouped: dict[tuple[str, str], dict[str, int]] = defaultdict(dict)
    for (symptom_id, condition_id, prognosis), count in observed_rows.items():
        grouped[(symptom_id, condition_id)][prognosis] = count
    for (symptom_id, condition_id), source_rows in sorted(grouped.items()):
        record = evidence_by_condition[condition_id]
        mappings.append({
            "mappingId": f"{symptom_id}__{condition_id}",
            "symptomId": symptom_id,
            "conditionId": condition_id,
            "evidenceId": record["evidenceId"],
            "relationshipType": "candidate_legacy_association",
            "sourcePrognosisLabels": sorted(source_rows),
            "observedPositiveRows": sum(source_rows.values()),
            "evidenceCitationRefs": [item["citationId"] for item in record.get("citationRefs", [])],
            "provenance": {
                "sourceType": "legacy_sparse_matrix",
                "sourceFile": MATRIX_PATH.name,
                "sourceRole": "candidate_association_only",
                "matrixValue": 1
            },
            "review": {
                "clinicalReviewStatus": "pending_clinical_review",
                "runtimeEligible": False,
                "reviewedBy": None,
                "reviewedAt": None,
                "notes": [
                    "The sparse matrix provides a candidate association only.",
                    "Its rows do not establish causation, diagnosis, test appropriateness, or guideline support.",
                    "Promote this edge only after per-edge clinical review against the linked evidence citations."
                ]
            }
        })

    output = {
        "schemaVersion": "1.0",
        "purpose": "Review queue for legacy symptom-to-Wave-1-evidence candidate associations.",
        "clinicalBoundary": "No mapping in this file is runtime eligible. Stage 4 must not use these associations until a designated reviewer explicitly approves each edge.",
        "sourceMatrix": MATRIX_PATH.name,
        "conditionMapping": WAVE1_PROGNOSIS_TO_CONDITION,
        "excludedMatrixColumns": sorted(unknown_matrix_columns),
        "mappings": mappings
    }
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(mappings)} non-runtime Wave 1 candidate mappings: {OUTPUT_PATH}")
    print(f"Excluded non-Symptom matrix columns: {len(unknown_matrix_columns)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
