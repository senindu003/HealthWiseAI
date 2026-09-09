"""Create an auditable Wave 1 bundle from user-approved, short full-tree PDFs.

The source registry and prior curated bundles are intentionally never overwritten.
This script only maps citations where the replacement document was selected by the
project owner and exists locally with a verified page count of 30 or fewer.
"""
from __future__ import annotations

import copy
import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

from PyPDF2 import PdfReader


ROOT = Path(__file__).resolve().parent.parent
REGISTRY = ROOT / "citation-registry.wave1.curated-short.json"
EVIDENCE = ROOT / "condition-evidence.wave1.curated-short.json"
OUT_REGISTRY = ROOT / "citation-registry.wave1.full-tree.json"
OUT_EVIDENCE = ROOT / "condition-evidence.wave1.full-tree.json"
OUT_MAP = ROOT / "knowledge-sources/wave1/full-tree-replacement-map.json"
OUT_TIERING = ROOT / "knowledge-sources/wave1/source-tiering.wave1.full-tree.json"


def source(citation_id, title, url, section_title, source_type, publisher, year, local_path, doi=None):
    return {
        "citationId": citation_id,
        "title": title,
        "doi": doi,
        "url": url,
        "sectionTitle": section_title,
        "sourceType": source_type,
        "publisher": publisher,
        "publishedYear": year,
        "lastUpdatedYear": year,
        "lastCheckedAt": "2026-09-06",
        "evidenceStatus": "source_verified",
        "localPath": local_path,
    }


APPROVED = {
    "who_pneumonia_diarrhoea_children_guideline_2024": source(
        "aafp_paediatric_cap_rapid_review_2021",
        "Community-Acquired Pneumonia in Children: Rapid Evidence Review",
        "https://www.aafp.org/pubs/afp/issues/2021/1200/p618.pdf",
        "Diagnosis and diagnostic testing",
        "clinical_review", "American Academy of Family Physicians", 2021,
        "knowledge-sources/wave1/candidate-validation/cap_children.pdf"),
    "who_pneumonia_diarrhoea_children_guideline_2024_diarrhoea": source(
        "cdc_paediatric_gastroenteritis_2003",
        "Managing Acute Gastroenteritis Among Children: Oral Rehydration, Maintenance, and Nutritional Therapy",
        "https://www.cdc.gov/mmwr/PDF/rr/rr5216.pdf",
        "Assessment and management of acute diarrhoea",
        "public_health_guidance", "CDC", 2003,
        "knowledge-sources/wave1/candidate-validation/pediatric_gastroenteritis.pdf"),
    "who_childhood_conditions_diarrhoea_2012": source(
        "cdc_paediatric_gastroenteritis_2003",
        "Managing Acute Gastroenteritis Among Children: Oral Rehydration, Maintenance, and Nutritional Therapy",
        "https://www.cdc.gov/mmwr/PDF/rr/rr5216.pdf",
        "Assessment and management of acute diarrhoea",
        "public_health_guidance", "CDC", 2003,
        "knowledge-sources/wave1/candidate-validation/pediatric_gastroenteritis.pdf"),
    "who_malaria_guidelines_2025_diagnosis": source(
        "cdc_malaria_diagnosis_treatment_algorithm_2026",
        "Algorithm for Diagnosis and Treatment of Malaria in the United States",
        "https://www.cdc.gov/malaria/media/pdfs/2026/06/Treatment-Algorithm_6-17-26.pdf",
        "Order immediate diagnostic testing",
        "public_health_guidance", "CDC", 2026,
        "knowledge-sources/wave1/candidate-validation/malaria_algorithm.pdf"),
    "who_tb_module2_screening_2021": source(
        "cdc_igra_guidance_2010",
        "Updated Guidelines for Using Interferon Gamma Release Assays to Detect Mycobacterium tuberculosis Infection — United States, 2010",
        "https://www.cdc.gov/mmwr/pdf/rr/rr5905.pdf",
        "Recommendations: general recommendations for use of IGRAs",
        "public_health_guidance", "CDC", 2010,
        "knowledge-sources/wave1/candidate-validation/tb_igra.pdf"),
    "nice_cg184_gord_recommendations": source(
        "aafp_gerd_common_questions_2015",
        "Common Questions About the Management of Gastroesophageal Reflux Disease",
        "https://www.aafp.org/pubs/afp/issues/2015/0515/p692.pdf",
        "Diagnosis and testing",
        "clinical_review", "American Academy of Family Physicians", 2015,
        "knowledge-sources/wave1/candidate-validation/gerd_common_questions.pdf"),
    "nice_cg184_gord_endoscopy": source(
        "aafp_functional_dyspepsia_2020",
        "Functional Dyspepsia: Evaluation and Management",
        "https://www.aafp.org/pubs/afp/issues/2020/0115/p84.pdf",
        "Evaluation and endoscopy considerations",
        "clinical_review", "American Academy of Family Physicians", 2020,
        "knowledge-sources/wave1/candidate-validation/dyspepsia.pdf"),
    "nice_cg184_h_pylori_testing": source(
        "aafp_peptic_ulcer_h_pylori_2015",
        "Diagnosis and Treatment of Peptic Ulcer Disease and H. pylori Infection",
        "https://www.aafp.org/pubs/afp/issues/2015/0215/p236.pdf",
        "Diagnosis and H. pylori testing",
        "clinical_review", "American Academy of Family Physicians", 2015,
        "knowledge-sources/wave1/candidate-validation/pud_h_pylori.pdf"),
    "nice_cg184_peptic_ulcer_interventions": source(
        "aafp_peptic_ulcer_h_pylori_2015",
        "Diagnosis and Treatment of Peptic Ulcer Disease and H. pylori Infection",
        "https://www.aafp.org/pubs/afp/issues/2015/0215/p236.pdf",
        "Diagnosis and H. pylori testing",
        "clinical_review", "American Academy of Family Physicians", 2015,
        "knowledge-sources/wave1/candidate-validation/pud_h_pylori.pdf"),
    "nice_cg168_varicose_veins_recommendations": source(
        "aafp_varicose_veins_2019",
        "Varicose Veins: Diagnosis and Treatment",
        "https://www.aafp.org/pubs/afp/issues/2019/0601/p682.pdf",
        "Diagnosis and treatment",
        "clinical_review", "American Academy of Family Physicians", 2019,
        "knowledge-sources/wave1/candidate-validation/varicose_veins.pdf"),
    "nice_qs198_bppv_hallpike": source(
        "aao_hnsf_bppv_executive_summary_2017",
        "Clinical Practice Guideline: Benign Paroxysmal Positional Vertigo (Update) Executive Summary",
        "https://journals.sagepub.com/doi/pdf/10.1177/0194599816689660",
        "Diagnosis of posterior canal BPPV",
        "clinical_guideline", "American Academy of Otolaryngology–Head and Neck Surgery Foundation", 2017,
        "knowledge-sources/wave1/pdf/bhattacharyya-et-al-2017-clinical-practice-guideline-benign-paroxysmal-positional-vertigo-(update)-executive-summary.pdf",
        "10.1177/0194599816689660"),
    "nice_ng198_acne_recommendations": source(
        "aafp_acne_vulgaris_2019",
        "Acne Vulgaris: Diagnosis and Treatment",
        "https://www.aafp.org/pubs/afp/issues/2019/1015/p475.pdf",
        "Diagnosis and treatment",
        "clinical_review", "American Academy of Family Physicians", 2019,
        "knowledge-sources/wave1/candidate-validation/acne.pdf"),
    "nice_ng28_hypoglycaemia_blood_glucose_management": source(
        "ada_abridged_hypoglycaemia_2024",
        "Section 6: Glycemic Goals and Hypoglycemia — Standards of Care in Diabetes—2024",
        "https://diabetesjournals.org/clinical/article-pdf/42/2/196/756131/diaclincd24a006.pdf",
        "Hypoglycemia assessment, prevention, and treatment",
        "clinical_guideline", "American Diabetes Association", 2024,
        "knowledge-sources/wave1/pdf/diaclincd24a006.pdf", "10.2337/cd24-a006"),
    "nice_ng28_hypoglycaemia_overview": source(
        "ada_abridged_hypoglycaemia_2024",
        "Section 6: Glycemic Goals and Hypoglycemia — Standards of Care in Diabetes—2024",
        "https://diabetesjournals.org/clinical/article-pdf/42/2/196/756131/diaclincd24a006.pdf",
        "Hypoglycemia assessment, prevention, and treatment",
        "clinical_guideline", "American Diabetes Association", 2024,
        "knowledge-sources/wave1/pdf/diaclincd24a006.pdf", "10.2337/cd24-a006"),
    "nice_cg153_psoriasis_recommendations": source(
        "aafp_psoriasis_recognition_management_2023",
        "Psoriasis: Recognition and Management Strategies",
        "https://www.aafp.org/pubs/afp/issues/2023/1200/psoriasis.pdf",
        "Recognition and management strategies",
        "clinical_review", "American Academy of Family Physicians", 2023,
        "knowledge-sources/wave1/candidate-validation/psoriasis.pdf"),
    "who_searo_district_clinician_manual_bacterial_conjunctivitis": source(
        "aafp_red_eye_primary_care_2010",
        "Diagnosis and Management of Red Eye in Primary Care",
        "https://www.aafp.org/pubs/afp/issues/2010/0115/p137.pdf",
        "Conjunctivitis evaluation",
        "clinical_review", "American Academy of Family Physicians", 2010,
        "knowledge-sources/wave1/candidate-validation/red_eye.pdf"),
    "who_searo_district_clinician_manual_viral_conjunctivitis": source(
        "aafp_red_eye_primary_care_2010",
        "Diagnosis and Management of Red Eye in Primary Care",
        "https://www.aafp.org/pubs/afp/issues/2010/0115/p137.pdf",
        "Conjunctivitis evaluation",
        "clinical_review", "American Academy of Family Physicians", 2010,
        "knowledge-sources/wave1/candidate-validation/red_eye.pdf"),
    "aaaai_acaai_rhinitis_practice_parameter_2020": source(
        "aafp_allergic_rhinitis_rapid_review_2023",
        "Allergic Rhinitis: Rapid Evidence Review",
        "https://www.aafp.org/pubs/afp/issues/2023/0500/allergic-rhinitis.pdf",
        "Diagnosis and diagnostic testing",
        "clinical_review", "American Academy of Family Physicians", 2023,
        "knowledge-sources/wave1/candidate-validation/rhinitis.pdf"),
}


def replace_ids(value, replacements):
    if isinstance(value, dict):
        return {key: replace_ids(item, replacements) for key, item in value.items()}
    if isinstance(value, list):
        return [replace_ids(item, replacements) for item in value]
    return replacements.get(value, value)


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for block in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(block)
    return f"sha256:{digest.hexdigest()}"


def main():
    registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
    evidence = json.loads(EVIDENCE.read_text(encoding="utf-8"))
    replacements = {old_id: citation["citationId"] for old_id, citation in APPROVED.items()}
    used_ids = set()
    for condition in registry["conditions"]:
        citation_ids = {item["citationId"] for item in condition["citations"]}
        for old_id, replacement in APPROVED.items():
            if old_id not in citation_ids:
                continue
            used_ids.add(old_id)
            if not any(item["citationId"] == replacement["citationId"] for item in condition["citations"]):
                condition["citations"].append(copy.deepcopy(replacement))
            for item in condition["citations"]:
                if item["citationId"] == old_id:
                    item["evidenceStatus"] = "superseded_by_full_tree_curated_source"
    missing = set(APPROVED) - used_ids
    if missing:
        raise ValueError(f"Approved replacements not found in curated registry: {sorted(missing)}")

    local_documents = {}
    for citation in APPROVED.values():
        path = ROOT / citation["localPath"]
        if not path.is_file():
            raise FileNotFoundError(path)
        page_count = len(PdfReader(str(path)).pages)
        if page_count > 30:
            raise ValueError(f"{path} is {page_count} pages; full-tree policy permits 30 or fewer")
        local_documents.setdefault(citation["citationId"], {
            "documentId": f"full_tree_{citation['citationId']}",
            "citationId": citation["citationId"],
            "title": citation["title"],
            "sourceUrl": citation["url"],
            "localPath": citation["localPath"],
            "pageCount": page_count,
            "contentHash": sha256(path),
            "tier": "full_tree",
            "pageIndexInputPolicy": "full_document_only_no_page_slicing",
            "selectionStatus": "full_tree_ready",
        })

    registry.update({
        "registryName": "Wave 1 approved full-tree replacement registry",
        "generatedAt": datetime.now(UTC).isoformat(),
        "derivedFrom": REGISTRY.name,
        "supersessions": [
            {"supersededCitationId": old_id, "replacementCitationId": citation["citationId"], "status": "approved_full_tree_replacement"}
            for old_id, citation in sorted(APPROVED.items())
        ],
    })
    registry["sourcePolicy"]["allowedPublishers"] = sorted(set(registry["sourcePolicy"]["allowedPublishers"] + [
        "American Academy of Family Physicians", "American Academy of Otolaryngology–Head and Neck Surgery Foundation",
        "American Diabetes Association", "CDC",
    ]))
    evidence = replace_ids(evidence, replacements)
    evidence["sourceCitationRegistry"] = OUT_REGISTRY.name
    for record in evidence["records"]:
        references = {item["citationId"] for item in record.get("citationRefs", [])}
        applied = references.intersection(set(replacements.values()))
        if applied:
            record["review"]["notes"].append(
                "Approved full-tree replacement citation applied; clinical review remains required before runtime use."
            )

    active_ids = set(replacements.values())
    unresolved = [
        citation["citationId"] for condition in registry["conditions"] for citation in condition["citations"]
        if citation.get("evidenceStatus") == "manual_review_required" and citation["citationId"] not in active_ids
    ]
    under_two = [condition["normalizedCondition"] for condition in registry["conditions"] if len(condition["citations"]) < 2]
    if unresolved or under_two:
        raise ValueError(f"unresolved={sorted(set(unresolved))}; fewer-than-two={under_two}")

    map_payload = {
        "schemaVersion": "1.0",
        "generatedAt": datetime.now(UTC).isoformat(),
        "derivedFrom": [REGISTRY.name, EVIDENCE.name],
        "policy": "User-approved PDFs of 30 pages or fewer are full-tree PageIndex inputs; no page splitting is allowed.",
        "supersessions": registry["supersessions"],
        "fullTreeDocuments": list(local_documents.values()),
        "validation": {"unresolvedManualReviewCitationIds": [], "conditionsWithFewerThanTwoCitations": []},
    }
    tiering_payload = {
        "schemaVersion": "1.0",
        "purpose": "Wave 1 approved full-tree PageIndex input set",
        "fullTreePageLimit": 30,
        "generatedAt": datetime.now(UTC).isoformat(),
        "records": list(local_documents.values()),
    }
    OUT_REGISTRY.write_text(json.dumps(registry, indent=2) + "\n", encoding="utf-8")
    OUT_EVIDENCE.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
    OUT_MAP.write_text(json.dumps(map_payload, indent=2) + "\n", encoding="utf-8")
    OUT_TIERING.write_text(json.dumps(tiering_payload, indent=2) + "\n", encoding="utf-8")
    print(f"Created {OUT_REGISTRY.name}, {OUT_EVIDENCE.name}, {OUT_MAP.name}, and {OUT_TIERING.name}.")
    print(f"Replaced {len(APPROVED)} citation IDs with {len(local_documents)} unique full-tree PDFs.")


if __name__ == "__main__":
    main()
