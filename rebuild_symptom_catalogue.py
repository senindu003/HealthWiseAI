"""Rebuild the terminology-only symptom catalogue from prognosis_kg_amended.csv."""

from __future__ import annotations

import csv
import json
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
INPUT_CSV = BASE_DIR / "prognosis_kg_amended.csv"
OUTPUT_JSON = BASE_DIR / "symptom-catalogue.v1.json"

# These amended CSV features are represented in dedicated graph models instead
# of (:Symptom) nodes. They remain fully traceable in the output JSON.
SEPARATE_MODELING = {
    "Family History": ("risk_factor", "History/risk information, not a symptom."),
    "Hypertension": ("condition_or_measurement", "Condition or measurement concept, not a symptom."),
    "Physical Disability": ("functional_status", "Functional-status concept, too broad for one symptom node."),
    "Blood Clot": ("clinical_finding", "Clinical finding requiring anatomical and clinical context."),
    "Corneal Damage": ("clinical_finding", "Examination or diagnostic finding rather than a patient-reported symptom."),
    "Enlarged Liver": ("clinical_finding", "Examination or imaging finding rather than a patient-reported symptom."),
    "Gingivitis": ("condition", "Condition label rather than a symptom."),
    "Gum Abscess": ("condition", "Condition label rather than a symptom."),
    "Gum Cavity": ("needs_review", "Non-standard dental label; preserve separately pending dental terminology review."),
    "Paralysis": ("clinical_finding", "High-severity neurological deficit; requires separate urgent-triage safeguards."),
    "Coma": ("clinical_finding", "Emergency consciousness state; requires separate urgent-triage safeguards."),
}

ALIASES = {
    "Generalized body numbness": ["Body numbness"],
    "Numbness (unspecified distribution)": ["Numbness"],
    "Burning sensation (skin)": ["Burning sensation"],
    "Dry or rough skin": ["Dry skin", "Rough skin"],
    "Feeling cold": ["Cold body"],
    "Productive cough": ["Cough with mucus"],
    "Vaginal discharge": ["Discharge"],
    "Eye problems (likely diabetes)": ["Eye problems"],
    "Aerophobia (fear of drafts or fresh air)": ["Fear of wind"],
    "Chest heaviness": ["Heaviness"],
    "Menstrual irregularity": ["Abnormal menstruation"],
    "Reduced bladder function": ["Bladder dysfunction"],
    "Reduced sense of smell and taste": ["Reduced smell and taste"],
    "Sensation of mucus in the throat": ["Throat mucus"],
    "Perceived joint weakness": ["Weak joints"],
    "Generalized weakness": ["Weakness"],
    "Yellowing of eyes": ["Yellow eyes"],
    "Yellowing of skin": ["Yellow skin"],
    "Shortness of Breath": ["Breathlessness", "Dyspnea"],
    "Frequent Urination": ["Increased urination", "Passing urine more often"],
    "Burning Urination": ["Painful urination", "Dysuria"],
    "Coughing Up Blood": ["Haemoptysis"],
    "Vomiting Blood": ["Haematemesis"],
    "Pain Behind Eyes": ["Retro-orbital pain"],
    "Tingling in Hands and Feet": ["Pins and needles in hands and feet"],
    "Sensitivity to Light": ["Photophobia"],
    "Difficulty Swallowing": ["Dysphagia"],
}

# Exact assignments take precedence over heuristic keyword matching.  They avoid
# false matches such as "color" in "Clay Colored Stool" and "ear" in
# "Heartburn" or "fear".  These labels classify the symptom for navigation;
# they are not disease assertions or clinical evidence.
BODY_SYSTEM_OVERRIDES = {
    "Acidity": "gastrointestinal_or_oral",
    "Aerophobia (fear of drafts or fresh air)": "mental_health",
    "Anal Burning": "gastrointestinal_or_oral",
    "Anal Pain": "gastrointestinal_or_oral",
    "Chest Pain": "cardiovascular_or_hematological",
    "Clay Colored Stool": "gastrointestinal_or_oral",
    "Constipation": "gastrointestinal_or_oral",
    "Deja Vu": "neurological",
    "Heartburn": "gastrointestinal_or_oral",
    "Lightheadedness": "neurological",
    "Pus Filled Pimples": "skin",
    "Tingling Around Lips": "neurological",
}


def identifier(label: str) -> str:
    """Create a stable machine identifier from an amended source header."""
    return "".join(char.lower() if char.isalnum() else "_" for char in label).strip("_")


def body_system(label: str) -> str:
    if label in BODY_SYSTEM_OVERRIDES:
        return BODY_SYSTEM_OVERRIDES[label]
    value = label.lower()
    if any(token in value for token in ("eye", "vision", "eyelid", "color", "light")):
        return "eye"
    if any(token in value for token in ("ear", "hearing")):
        return "ear"
    if any(token in value for token in ("urination", "urine", "bladder", "vaginal", "menstru", "breast", "genital")):
        return "urinary_reproductive"
    if any(token in value for token in ("stool", "defec", "diarrhea", "vomit", "abdominal", "appetite", "nausea", "indigestion", "heartburn", "tongue", "salivation", "swallow", "gum", "teeth", "mouth", "liver", "clay")):
        return "gastrointestinal_or_oral"
    if any(token in value for token in ("cough", "breath", "phlegm", "nasal", "sneezing", "runny", "throat", "hoarseness", "smell")):
        return "respiratory"
    if any(token in value for token in ("joint", "muscle", "limb", "back", "neck", "bone", "legs", "ankles", "walk")):
        return "musculoskeletal"
    if any(token in value for token in ("skin", "rash", "itch", "nail", "boil", "blister", "wound", "lip")):
        return "skin"
    if any(token in value for token in ("memory", "speech", "cognitive", "dizziness", "balance", "facial", "conscious", "headache", "numb", "tremor", "seizure", "confusion", "faint", "tingling", "concentrat")):
        return "neurological"
    if any(token in value for token in ("pulse", "sweating", "lightheaded", "blood", "bruis", "bleeding", "pressure", "chest heaviness")):
        return "cardiovascular_or_hematological"
    if any(token in value for token in ("anxiety", "mood", "insomnia", "sleep", "aerophobia", "restlessness")):
        return "mental_health"
    return "general_or_metabolic"


def make_symptom(header: str) -> dict:
    record = {
        "symptomId": identifier(header),
        "displayName": header,
        "aliases": ALIASES.get(header, []),
        "bodySystem": body_system(header),
        "provenance": {
            "sourceType": "legacy_dataset",
            "sourceId": "prognosis_kg_amended_v1",
            "sourceFile": "prognosis_kg_amended.csv",
            "sourceRole": "candidate_vocabulary_only",
            "sourceTerms": [header],
        },
        "reviewStatus": "normalized_candidate",
    }
    if header == "Eye problems (likely diabetes)":
        record["evidenceEligibility"] = "not_eligible"
        record["normalizationNote"] = (
            "User-selected legacy dataset label. It is vocabulary-only and must not "
            "be used as a diagnosis or evidence-backed condition relationship."
        )
    return record


def main() -> None:
    with INPUT_CSV.open(encoding="utf-8", newline="") as source_file:
        header = next(csv.reader(source_file), None)
    if not header or header[0] != "prognosis":
        raise ValueError("Expected prognosis_kg_amended.csv with first column 'prognosis'.")
    if len(header) != len(set(header)):
        raise ValueError("Amended CSV still contains duplicate headers.")

    features = header[1:]
    missing_separate = sorted(set(SEPARATE_MODELING) - set(features))
    if missing_separate:
        raise ValueError(f"Missing expected separate-model headers: {missing_separate}")

    symptoms = [make_symptom(name) for name in features if name not in SEPARATE_MODELING]
    identifiers = [record["symptomId"] for record in symptoms]
    if len(identifiers) != len(set(identifiers)):
        raise ValueError("Normalization generated duplicate symptom IDs.")

    catalogue = {
        "schemaVersion": "1.1",
        "catalogueName": "HealthWise AI Symptom Catalogue",
        "generatedAt": "2026-09-04",
        "scope": (
            "Terminology catalogue only. It contains candidate symptom vocabulary from "
            "prognosis_kg_amended.csv and is not clinical evidence, diagnostic logic, "
            "or a condition-to-symptom mapping."
        ),
        "sourcePolicy": {
            "allowedCandidateVocabularySources": ["prognosis_kg_amended_v1"],
            "retiredSource": "The original prognosis_kg.csv is superseded for catalogue generation.",
            "excludedSource": "SympScan is excluded because it lacks citation provenance.",
        },
        "normalizationPolicy": {
            "sourceOfTruth": "prognosis_kg_amended.csv",
            "duplicateHeaders": "Already consolidated in the amended CSV using binary OR.",
            "rule": "Every amended feature header is represented exactly once as a symptom or separately modelled record."
        },
        "termsRequiringSeparateModeling": [
            {
                "sourceTerm": source_term,
                "targetType": target_type,
                "reason": reason,
                "provenance": {
                    "sourceType": "legacy_dataset",
                    "sourceId": "prognosis_kg_amended_v1",
                    "sourceFile": "prognosis_kg_amended.csv",
                    "sourceRole": "candidate_vocabulary_only",
                },
                "reviewStatus": "needs_terminology_review",
            }
            for source_term, (target_type, reason) in SEPARATE_MODELING.items()
        ],
        "symptoms": symptoms,
    }
    OUTPUT_JSON.write_text(json.dumps(catalogue, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT_JSON}")
    print(f"Features={len(features)}; symptoms={len(symptoms)}; separate={len(SEPARATE_MODELING)}")


if __name__ == "__main__":
    main()
