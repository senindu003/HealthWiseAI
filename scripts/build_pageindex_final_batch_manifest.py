"""Build the final PageIndex manifest for active citations lacking a tree.

This is an offline provenance step. It finds citation IDs referenced by the
final condition-evidence bundle but absent from the completed tree manifests,
then resolves them only to approved local PDFs. It never calls PageIndex, an
LLM, Neo4j, or a patient-data store.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parent.parent
WAVE_ROOT = ROOT / "knowledge-sources" / "wave1"
EVIDENCE_PATH = ROOT / "condition-evidence.wave1.full-tree-expanded.json"
REGISTRY_PATH = ROOT / "citation-registry.wave1.full-tree-expanded.json"
DOCUMENT_MANIFEST_PATH = WAVE_ROOT / "document-manifest.json"
SHORT_DOCUMENTS_PATH = WAVE_ROOT / "updated-short-documents.tiering.json"
COMPLETED_MANIFESTS = (
    WAVE_ROOT / "pageindex-trees" / "normalized" / "normalized-tree-manifest.json",
    WAVE_ROOT / "pageindex-trees" / "normalized" / "next-batch" / "normalized-tree-manifest.json",
)
OUTPUT_PATH = WAVE_ROOT / "source-tiering.wave1.pageindex-final-batch.json"
VALIDATION_PATH = WAVE_ROOT / "source-tiering.wave1.pageindex-final-batch.validation.json"

# These short, user-approved PDFs superseded longer sources.  The explicit
# mapping makes their use auditable and protects against title/filename guesses.
SHORT_DOCUMENT_MAPPING = {
    "cdc_mmwr_dengue_zika_diagnostic_testing_2019": "01_dengue_cdc_mmwr_2019.pdf",
    "cdc_varicella_clinician_testing_2025": "02_varicella_cdc_clinician_testing_2025.pdf",
    "espghan_naspghan_functional_constipation_2014": "03_constipation_espghan_naspghan_2014.pdf",
    "aafp_tinea_diagnosis_management_2014": "04_tinea_aafp_2014.pdf",
    "cdc_chikungunya_clinician_information_2014": "07_chikungunya_cdc_clinician.pdf",
    "multisociety_influenza_consensus_2023": "08_influenza_multisociety_2023_en.pdf",
    "cdc_typhoid_paratyphoid_clinician_2020": "09_typhoid_cdc_clinician.pdf",
}


def read_object(path: Path) -> dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError(f"{path} must be a JSON object")
    return data


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return f"sha256:{digest.hexdigest()}"


def registry_by_id() -> dict[str, dict[str, Any]]:
    registry = read_object(REGISTRY_PATH)
    result: dict[str, dict[str, Any]] = {}
    for condition in registry["conditions"]:
        for citation in condition["citations"]:
            citation_id = citation["citationId"]
            if citation_id in result:
                raise ValueError(f"Duplicate citation ID in active registry: {citation_id}")
            result[citation_id] = citation
    return result


def active_evidence_citation_ids() -> set[str]:
    evidence = read_object(EVIDENCE_PATH)
    return {ref["citationId"] for record in evidence["records"] for ref in record["citationRefs"]}


def completed_citation_ids() -> set[str]:
    completed: set[str] = set()
    for path in COMPLETED_MANIFESTS:
        manifest = read_object(path)
        for entry in manifest["trees"]:
            completed.update(entry.get("citationIds") or [entry["citationId"]])
    return completed


def source_from_document_manifest() -> dict[str, dict[str, Any]]:
    sources: dict[str, dict[str, Any]] = {}
    for record in read_object(DOCUMENT_MANIFEST_PATH)["documents"]:
        for citation_id in record.get("citationIds", []):
            sources[citation_id] = {
                "documentId": f"pageindex_final_full_tree_{record['documentId']}",
                "sourceAuditDocumentId": record["documentId"],
                "localPath": record["localPath"],
                "originalPdf": record["localPath"],
                "sourceOriginFormat": record.get("sourceFormat", "pdf"),
            }
    return sources


def source_from_short_documents() -> dict[str, dict[str, Any]]:
    records = read_object(SHORT_DOCUMENTS_PATH)["documents"]
    by_filename = {Path(record["localPath"]).name: record for record in records}
    sources: dict[str, dict[str, Any]] = {}
    for citation_id, filename in SHORT_DOCUMENT_MAPPING.items():
        record = by_filename.get(filename)
        if record is None:
            raise ValueError(f"Approved short document is missing from its tier manifest: {filename}")
        sources[citation_id] = {
            "documentId": f"pageindex_final_full_tree_{Path(filename).stem}",
            "sourceAuditDocumentId": f"updated_short_{Path(filename).stem}",
            "localPath": record["localPath"],
            "originalPdf": record["localPath"],
            "sourceOriginFormat": "pdf",
        }
    return sources


def make_record(citation_id: str, citation: dict[str, Any], source: dict[str, Any]) -> dict[str, Any]:
    path = ROOT / source["localPath"]
    if not path.is_file() or not path.read_bytes().startswith(b"%PDF-"):
        raise ValueError(f"Missing or invalid approved PDF for {citation_id}: {path}")
    page_count = len(PdfReader(str(path)).pages)
    if page_count < 1:
        raise ValueError(f"PDF has no pages: {path}")
    return {
        **source,
        "citationIds": [citation_id],
        "citationMetadata": [{
            "citationId": citation_id,
            "title": citation["title"],
            "sectionTitle": citation.get("sectionTitle"),
            "url": citation["url"],
        }],
        "title": citation["title"],
        "sourceUrl": citation["url"],
        "contentHash": sha256(path),
        "pageCount": page_count,
        "tier": "full_tree",
        "pageIndexInputPolicy": "full_document_only_no_page_slicing",
        "selectionStatus": "pageindex_ready",
        "originalContentHash": sha256(path),
        "selectedOriginalPageRanges": [],
        "citationSelections": [],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Validate final inputs but do not write the manifest.")
    parser.add_argument("--output", type=Path, default=OUTPUT_PATH)
    args = parser.parse_args()

    registry = registry_by_id()
    missing = active_evidence_citation_ids() - completed_citation_ids()
    sources = source_from_document_manifest() | source_from_short_documents()
    unresolved = sorted(missing - sources.keys())
    if unresolved:
        raise ValueError(f"No approved local PDF mapping for active unindexed citations: {unresolved}")
    records = [make_record(citation_id, registry[citation_id], sources[citation_id]) for citation_id in sorted(missing)]
    if len(records) != 11:
        raise ValueError(f"Expected 11 active unindexed citation PDFs, found {len(records)}")
    manifest = {
        "schemaVersion": "1.0",
        "purpose": "Final approved full-PDF PageIndex inputs for active Wave 1 citations that previously lacked trees. Public clinical documents only; no patient data.",
        "generatedAt": datetime.now(UTC).isoformat(),
        "activeEvidence": EVIDENCE_PATH.relative_to(ROOT).as_posix(),
        "completedTreeManifests": [path.relative_to(ROOT).as_posix() for path in COMPLETED_MANIFESTS],
        "summary": {"fullTreeDocuments": len(records), "citationReferences": len(records)},
        "records": records,
    }
    validation = {
        "schemaVersion": "1.0",
        "validatedAt": datetime.now(UTC).isoformat(),
        "status": "valid",
        "activeUnindexedCitationIds": sorted(missing),
        "resolvedCitationIds": [record["citationIds"][0] for record in records],
    }
    print(f"Validated {len(records)} approved full-PDF inputs for all currently active unindexed citations.")
    if args.dry_run:
        print("Dry run only; no final-batch manifest written.")
        return 0
    args.output.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    VALIDATION_PATH.write_text(json.dumps(validation, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote final PageIndex manifest: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
