"""Add three audited, short sources to the Wave 1 full-tree evidence bundle.

The prior registry and evidence files are immutable inputs.  This script creates
an additive revision: the CPS practice point replaces the AAFP pneumonia review;
the already-downloaded WHO cholera and SA Health impetigo guidelines are added as
supplementary retrieval sources without assigning new patient-facing claims.
"""
from __future__ import annotations

import copy
import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

from PyPDF2 import PdfReader


ROOT = Path(__file__).resolve().parent.parent
REGISTRY = ROOT / "citation-registry.wave1.full-tree.json"
EVIDENCE = ROOT / "condition-evidence.wave1.full-tree.json"
PRIOR_MAP = ROOT / "knowledge-sources/wave1/full-tree-replacement-map.json"
PRIOR_TIERING = ROOT / "knowledge-sources/wave1/source-tiering.wave1.full-tree.json"
OUT_REGISTRY = ROOT / "citation-registry.wave1.full-tree-expanded.json"
OUT_EVIDENCE = ROOT / "condition-evidence.wave1.full-tree-expanded.json"
OUT_MAP = ROOT / "knowledge-sources/wave1/full-tree-expanded-map.json"
OUT_TIERING = ROOT / "knowledge-sources/wave1/source-tiering.wave1.full-tree-expanded.json"


def citation(citation_id, title, url, section_title, source_type, publisher, year, local_path, *, doi=None, status="source_verified"):
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
        "evidenceStatus": status,
        "localPath": local_path,
    }


SOURCES = {
    "canadian_paediatric_society_uncomplicated_pneumonia_2024": citation(
        "canadian_paediatric_society_uncomplicated_pneumonia_2024",
        "Uncomplicated pneumonia in healthy Canadian children and youth: Practice points for management",
        "https://cps.ca/en/documents/position/pneumonia-management-children-youth",
        "Investigations",
        "clinical_practice_point",
        "Canadian Paediatric Society",
        2018,
        "knowledge-sources/wave1/pdf/canadian_paediatric_society_uncomplicated_pneumonia.html-render.pdf",
    ),
    "who_cholera_clinical_tools_2024": citation(
        "who_cholera_clinical_tools_2024",
        "Clinical tools for cholera treatment facilities",
        "https://www.who.int/publications/i/item/B09194",
        "Cholera patient treatment flowchart",
        "clinical_guidance",
        "WHO",
        2024,
        "knowledge-sources/wave1/updated-short-documents/05_cholera_who_clinical_tools_2024.pdf",
        doi="10.2471/B09194",
        status="supplementary_source_verified_claim_mapping_pending",
    ),
    "sa_health_impetigo_clinical_practice_guideline_2025": citation(
        "sa_health_impetigo_clinical_practice_guideline_2025",
        "Impetigo: Clinical Practice Guideline",
        "https://www.sahealth.sa.gov.au/wps/wcm/connect/2ec41078-4eb5-4cc2-8213-427d4d0b445a/Impetigo%2B-%2BClinical%2BPractice%2BGuideline.pdf?MOD=AJPERES",
        "Investigation; Management and treatment plan",
        "clinical_practice_guideline",
        "SA Health (Government of South Australia)",
        2025,
        "knowledge-sources/wave1/updated-short-documents/12_impetigo_sahealth_2025.pdf",
        status="supplementary_source_verified_claim_mapping_pending",
    ),
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file:
        for block in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(block)
    return f"sha256:{digest.hexdigest()}"


def document(source: dict) -> dict:
    path = ROOT / source["localPath"]
    if not path.is_file():
        raise FileNotFoundError(path)
    pages = len(PdfReader(str(path)).pages)
    if pages > 30:
        raise ValueError(f"{path} has {pages} pages; direct full-tree inputs are limited to 30")
    return {
        "documentId": f"full_tree_{source['citationId']}",
        "citationId": source["citationId"],
        "title": source["title"],
        "sourceUrl": source["url"],
        "localPath": source["localPath"],
        "pageCount": pages,
        "contentHash": sha256(path),
        "tier": "full_tree",
        "pageIndexInputPolicy": "full_document_only_no_page_slicing",
        "selectionStatus": "full_tree_ready",
    }


def find_condition(registry: dict, normalized_name: str) -> dict:
    matches = [item for item in registry["conditions"] if item["normalizedCondition"] == normalized_name]
    if len(matches) != 1:
        raise ValueError(f"Expected one condition named {normalized_name}, found {len(matches)}")
    return matches[0]


def append_once(items: list, item: dict, key: str = "citationId") -> None:
    if not any(existing[key] == item[key] for existing in items):
        items.append(copy.deepcopy(item))


def replace_value(value, old: str, new: str):
    if isinstance(value, dict):
        return {key: replace_value(item, old, new) for key, item in value.items()}
    if isinstance(value, list):
        return [replace_value(item, old, new) for item in value]
    return new if value == old else value


def main() -> None:
    registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
    evidence = json.loads(EVIDENCE.read_text(encoding="utf-8"))
    prior_map = json.loads(PRIOR_MAP.read_text(encoding="utf-8"))
    prior_tiering = json.loads(PRIOR_TIERING.read_text(encoding="utf-8"))

    pneumonia = find_condition(registry, "Pneumonia")
    for item in pneumonia["citations"]:
        if item["citationId"] == "aafp_paediatric_cap_rapid_review_2021":
            item["evidenceStatus"] = "superseded_by_cps_practice_point"
    append_once(pneumonia["citations"], SOURCES["canadian_paediatric_society_uncomplicated_pneumonia_2024"])
    append_once(find_condition(registry, "Cholera")["citations"], SOURCES["who_cholera_clinical_tools_2024"])
    append_once(find_condition(registry, "Impetigo")["citations"], SOURCES["sa_health_impetigo_clinical_practice_guideline_2025"])

    evidence = replace_value(
        evidence,
        "aafp_paediatric_cap_rapid_review_2021",
        "canadian_paediatric_society_uncomplicated_pneumonia_2024",
    )
    evidence["sourceCitationRegistry"] = OUT_REGISTRY.name
    for record in evidence["records"]:
        if record["conditionId"] == "pneumonia":
            record["review"]["notes"].append(
                "AAFP pneumonia-review references were replaced with the Canadian Paediatric Society practice point; the current child-focused population limit remains conservative."
            )
        elif record["conditionId"] == "cholera":
            record["review"]["notes"].append(
                "WHO Clinical tools for cholera treatment facilities is a supplementary PageIndex source. It is intentionally not mapped to a new patient-facing claim until clinical claim-level review."
            )
        elif record["conditionId"] == "impetigo":
            record["review"]["notes"].append(
                "SA Health Impetigo Clinical Practice Guideline is a supplementary PageIndex source. It is intentionally not mapped to a new patient-facing claim until clinical claim-level review."
            )

    new_documents = [document(source) for source in SOURCES.values()]
    documents = {item["citationId"]: item for item in prior_tiering["records"]}
    documents.update({item["citationId"]: item for item in new_documents})
    all_documents = list(documents.values())

    registry.update({
        "registryName": "Wave 1 expanded full-tree registry",
        "generatedAt": datetime.now(UTC).isoformat(),
        "derivedFrom": REGISTRY.name,
    })
    registry.setdefault("supersessions", []).append({
        "supersededCitationId": "aafp_paediatric_cap_rapid_review_2021",
        "replacementCitationId": "canadian_paediatric_society_uncomplicated_pneumonia_2024",
        "status": "approved_full_tree_replacement",
    })
    registry["sourcePolicy"]["allowedPublishers"] = sorted(set(registry["sourcePolicy"]["allowedPublishers"] + [
        "Canadian Paediatric Society", "SA Health (Government of South Australia)",
    ]))

    valid_registry_ids = {
        citation["citationId"]
        for condition in registry["conditions"]
        for citation in condition["citations"]
    }
    evidence_refs = {
        reference["citationId"]
        for record in evidence["records"]
        for reference in record.get("citationRefs", [])
    }
    missing_refs = sorted(evidence_refs - valid_registry_ids)
    manual_active = sorted(
        citation["citationId"]
        for condition in registry["conditions"]
        for citation in condition["citations"]
        if citation["citationId"] in evidence_refs and citation.get("evidenceStatus") == "manual_review_required"
    )
    if missing_refs or manual_active:
        raise ValueError(f"missing evidence refs={missing_refs}; active manual-review refs={manual_active}")
    if any(item["pageCount"] > 30 for item in all_documents):
        raise ValueError("A full-tree document exceeds the 30-page limit")

    map_payload = {
        "schemaVersion": "1.0",
        "generatedAt": datetime.now(UTC).isoformat(),
        "derivedFrom": [REGISTRY.name, EVIDENCE.name, PRIOR_MAP.name],
        "policy": "All listed documents are direct PageIndex full-tree inputs of 30 pages or fewer; no page slicing is permitted.",
        "supersessions": registry["supersessions"],
        "supplementarySources": [
            {
                "citationId": "who_cholera_clinical_tools_2024",
                "claimMappingStatus": "pending_clinical_review",
                "reason": "Available for retrieval only; no new patient-facing claim is added in this bundle.",
            },
            {
                "citationId": "sa_health_impetigo_clinical_practice_guideline_2025",
                "claimMappingStatus": "pending_clinical_review",
                "reason": "Available for retrieval only; no new patient-facing claim is added in this bundle.",
            },
        ],
        "fullTreeDocuments": all_documents,
        "validation": {
            "missingEvidenceCitationIds": missing_refs,
            "activeManualReviewCitationIds": manual_active,
            "maxFullTreePages": max(item["pageCount"] for item in all_documents),
        },
    }
    tiering_payload = {
        "schemaVersion": "1.0",
        "purpose": "Wave 1 expanded direct PageIndex full-tree input set",
        "fullTreePageLimit": 30,
        "generatedAt": datetime.now(UTC).isoformat(),
        "records": all_documents,
    }

    OUT_REGISTRY.write_text(json.dumps(registry, indent=2) + "\n", encoding="utf-8")
    OUT_EVIDENCE.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
    OUT_MAP.write_text(json.dumps(map_payload, indent=2) + "\n", encoding="utf-8")
    OUT_TIERING.write_text(json.dumps(tiering_payload, indent=2) + "\n", encoding="utf-8")
    print(f"Created {OUT_REGISTRY.name}, {OUT_EVIDENCE.name}, {OUT_MAP.name}, and {OUT_TIERING.name}.")
    print(f"direct_full_tree_documents={len(all_documents)} max_pages={max(item['pageCount'] for item in all_documents)}")
    print(f"missing_evidence_refs={missing_refs} active_manual_review_refs={manual_active}")


if __name__ == "__main__":
    main()
