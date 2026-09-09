"""Create an auditable Wave 1 registry variant using compatible short sources.

The original registry and evidence bundle are never overwritten.  Only mappings
whose population and condition scope remain compatible are activated here.
"""
from __future__ import annotations

import copy
import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
REGISTRY = ROOT / "citation-registry.wave1.nice-who.json"
EVIDENCE = ROOT / "condition-evidence.wave1.json"
SHORT_TIER = ROOT / "knowledge-sources/wave1/updated-short-documents.tiering.json"
ORIGINAL_TIERING = ROOT / "knowledge-sources/wave1/source-tiering.wave1.json"
OUT_REGISTRY = ROOT / "citation-registry.wave1.curated-short.json"
OUT_EVIDENCE = ROOT / "condition-evidence.wave1.curated-short.json"
OUT_MAP = ROOT / "knowledge-sources/wave1/curated-short-replacement-map.json"


def source(citation_id, title, url, section, source_type, publisher, year, doi=None):
    return {"citationId": citation_id, "title": title, "doi": doi, "url": url,
            "sectionTitle": section, "sourceType": source_type, "publisher": publisher,
            "publishedYear": year, "lastUpdatedYear": year, "lastCheckedAt": "2026-09-06",
            "evidenceStatus": "source_verified"}


ACTIVE = [
    ("Dengue", "who_dengue_lab_testing_2025", source(
        "cdc_mmwr_dengue_zika_diagnostic_testing_2019",
        "Dengue and Zika Virus Diagnostic Testing for Patients with a Clinically Compatible Illness and Risk for Infection with Both Viruses",
        "https://stacks.cdc.gov/view/cdc/79095/cdc_79095_DS1.pdf", "Dengue and Zika Virus Diagnostic Testing",
        "technical_guidance", "CDC", 2019, "10.15585/mmwr.rr6801a1"), "01_dengue_cdc_mmwr_2019.pdf"),
    ("Varicella (chickenpox)", "who_varicella_position_paper_2025", source(
        "cdc_varicella_clinician_testing_2025", "Test Types Typically Available to Clinicians and Descriptions for Measles, Mumps, Rubella, and Varicella",
        "https://stacks.cdc.gov/view/cdc/257238/cdc_257238_DS1.pdf", "Varicella – Recommendations for Testing for Clinicians",
        "technical_guidance", "CDC", 2025), "02_varicella_cdc_clinician_testing_2025.pdf"),
    ("Varicella (chickenpox)", "who_varicella_herpes_zoster_position_paper_2014", source(
        "cdc_varicella_clinician_testing_2025", "Test Types Typically Available to Clinicians and Descriptions for Measles, Mumps, Rubella, and Varicella",
        "https://stacks.cdc.gov/view/cdc/257238/cdc_257238_DS1.pdf", "Varicella – Recommendations for Testing for Clinicians",
        "technical_guidance", "CDC", 2025), "02_varicella_cdc_clinician_testing_2025.pdf"),
    ("Idiopathic constipation in children and young people", "nice_cg99_constipation_recommendations", source(
        "espghan_naspghan_functional_constipation_2014", "Evaluation and Treatment of Functional Constipation in Infants and Children: Evidence-Based Recommendations From ESPGHAN and NASPGHAN",
        "https://www.naspghan.org/files/documents/pdfs/cme/jpgn/Evaluation_and_Treatment_of_Functional.24.pdf", "Diagnostic evaluation",
        "clinical_guideline", "ESPGHAN and NASPGHAN", 2014, "10.1097/MPG.0000000000000266"), "03_constipation_espghan_naspghan_2014.pdf"),
    ("Idiopathic constipation in children and young people", "nice_qs62_constipation_children_overview", source(
        "espghan_naspghan_functional_constipation_2014", "Evaluation and Treatment of Functional Constipation in Infants and Children: Evidence-Based Recommendations From ESPGHAN and NASPGHAN",
        "https://www.naspghan.org/files/documents/pdfs/cme/jpgn/Evaluation_and_Treatment_of_Functional.24.pdf", "Diagnostic evaluation",
        "clinical_guideline", "ESPGHAN and NASPGHAN", 2014, "10.1097/MPG.0000000000000266"), "03_constipation_espghan_naspghan_2014.pdf"),
    ("Ringworm (tinea)", "who_fungal_disease_blueprint_2026", source(
        "aafp_tinea_diagnosis_management_2014", "Diagnosis and Management of Tinea Infections",
        "https://www.aafp.org/pubs/afp/issues/2014/1115/p702.pdf", "Diagnostic Tests for Tinea Infections",
        "clinical_review", "American Family Physician", 2014), "04_tinea_aafp_2014.pdf"),
    ("Chikungunya fever", "who_searo_chikungunya_clinical_management", source(
        "cdc_chikungunya_clinician_information_2014", "Chikungunya: Information for Healthcare Providers",
        "https://stacks.cdc.gov/view/cdc/24001/cdc_24001_DS1.pdf", "Information for healthcare providers",
        "clinical_reference", "CDC", 2014), "07_chikungunya_cdc_clinician.pdf"),
    ("Influenza", "who_influenza_clinical_practice_guideline_2024", source(
        "multisociety_influenza_consensus_2023", "Executive Summary: Diagnosis, Treatment and Prophylaxis of Influenza Virus Infection",
        "https://diposit.ub.edu/server/api/core/bitstreams/c2b610c8-1180-4f66-8348-307b459b6336/content", "Diagnosis",
        "clinical_guideline", "SEIMC, SEIP, AEV, SEMFYC and SEMPSPGS", 2023, "10.1016/j.anpedi.2022.12.001"), "08_influenza_multisociety_2023_en.pdf"),
    ("Influenza", "who_influenza_clinical_management_2022", source(
        "multisociety_influenza_consensus_2023", "Executive Summary: Diagnosis, Treatment and Prophylaxis of Influenza Virus Infection",
        "https://diposit.ub.edu/server/api/core/bitstreams/c2b610c8-1180-4f66-8348-307b459b6336/content", "Diagnosis",
        "clinical_guideline", "SEIMC, SEIP, AEV, SEMFYC and SEMPSPGS", 2023, "10.1016/j.anpedi.2022.12.001"), "08_influenza_multisociety_2023_en.pdf"),
    ("Typhoid fever / enteric fever", "who_childhood_conditions_typhoid_2012", source(
        "cdc_typhoid_paratyphoid_clinician_2020", "Typhoid and Paratyphoid Fever: Information for Healthcare Professionals",
        "https://stacks.cdc.gov/view/cdc/90752/cdc_90752_DS1.pdf", "Information for healthcare professionals",
        "clinical_reference", "CDC", 2020), "09_typhoid_cdc_clinician.pdf"),
]


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
    short_tier = json.loads(SHORT_TIER.read_text(encoding="utf-8"))
    original_tiering = json.loads(ORIGINAL_TIERING.read_text(encoding="utf-8"))
    by_condition = {item["normalizedCondition"]: item for item in registry["conditions"]}
    replacements, supersessions, active_files = {}, [], set()
    for condition, old_id, new_citation, filename in ACTIVE:
        target = by_condition[condition]
        if not any(item["citationId"] == new_citation["citationId"] for item in target["citations"]):
            target["citations"].append(new_citation)
        replacements[old_id] = new_citation["citationId"]
        supersessions.append({"supersededCitationId": old_id, "replacementCitationId": new_citation["citationId"], "condition": condition, "status": "activated_scope_compatible"})
        active_files.add(filename)
    registry.update({
        "registryName": "Wave 1 curated-short-source registry",
        "generatedAt": datetime.now(UTC).isoformat(),
        "derivedFrom": REGISTRY.name,
        "supersessions": supersessions,
    })
    registry["sourcePolicy"]["allowedPublishers"] = sorted(set(
        registry["sourcePolicy"]["allowedPublishers"] + [
            "CDC", "ESPGHAN and NASPGHAN", "American Family Physician",
            "SEIMC, SEIP, AEV, SEMFYC and SEMPSPGS",
        ]
    ))
    # Official-source verification does not prove that a cited section can be
    # located safely in a PDF. Exclude unresolved locators from runtime evidence.
    unresolved_ids = {
        citation_id
        for tier_record in original_tiering["records"]
        if tier_record.get("selectionStatus") == "manual_review_required"
        for citation_id in tier_record.get("citationIds", [])
    }
    unresolved_ids.difference_update(replacements)
    for condition in registry["conditions"]:
        for citation in condition["citations"]:
            if citation["citationId"] in unresolved_ids:
                citation["evidenceStatus"] = "manual_review_required"
    evidence = replace_ids(evidence, replacements)
    evidence["sourceCitationRegistry"] = OUT_REGISTRY.name
    for record in evidence["records"]:
        if json.dumps(record) != json.dumps(replace_ids(record, {})):
            pass
        refs = {item["citationId"] for item in record.get("citationRefs", [])}
        used = refs.intersection(set(replacements.values()))
        if used:
            record["review"]["notes"].append("Curated short-source citation replacement applied; clinical review remains required before runtime use.")
    tier_docs = []
    for item in short_tier["documents"]:
        active = Path(item["localPath"]).name in active_files
        tier_docs.append({**item, "ingestionStatus": "active_full_tree" if active else "deferred_scope_or_redundant", "tier": "full_tree", "pageIndexInputPolicy": "full_document_only_no_page_slicing"})
    mapping = {
        "schemaVersion": "1.0", "generatedAt": datetime.now(UTC).isoformat(), "derivedFrom": [REGISTRY.name, EVIDENCE.name],
        "policy": "Only scope-compatible replacements are activated. Deferred PDFs are retained locally but cannot support runtime evidence claims.",
        "activatedSupersessions": supersessions,
        "unresolvedCitationIdsRetainedForManualReview": sorted(unresolved_ids),
        "deferredShortDocuments": [item["documentId"] for item in tier_docs if item["ingestionStatus"] != "active_full_tree"],
        "shortDocumentTiering": tier_docs,
    }
    OUT_REGISTRY.write_text(json.dumps(registry, indent=2) + "\n", encoding="utf-8")
    OUT_EVIDENCE.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
    OUT_MAP.write_text(json.dumps(mapping, indent=2) + "\n", encoding="utf-8")
    print(f"Created {OUT_REGISTRY.name}, {OUT_EVIDENCE.name}, and {OUT_MAP.name}.")
    print(f"Activated {len(supersessions)} supersessions across {len(active_files)} short PDFs.")


if __name__ == "__main__":
    main()
