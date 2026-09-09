"""Build the citation-linked PageIndex input manifest for Wave 1's next batch.

The tool joins only approved source tiers from the original source-selection
audit to the active citation registry. It verifies each local PDF, its page
count, SHA-256 hash, and citation references. It never calls PageIndex, an
LLM, Neo4j, or any patient-data store.

Run from the project root with the isolated PageIndex interpreter:
  .\\knowledge-sources\\wave1\\.pageindex-venv\\Scripts\\python.exe scripts\\build_pageindex_next_batch_manifest.py --dry-run
  .\\knowledge-sources\\wave1\\.pageindex-venv\\Scripts\\python.exe scripts\\build_pageindex_next_batch_manifest.py
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
SOURCE_TIER_AUDIT_PATH = WAVE_ROOT / "source-tiering.wave1.json"
ACTIVE_REGISTRY_PATH = ROOT / "citation-registry.wave1.full-tree-expanded.json"
OUTPUT_PATH = WAVE_ROOT / "source-tiering.wave1.pageindex-next-batch.json"
VALIDATION_PATH = WAVE_ROOT / "source-tiering.wave1.pageindex-next-batch.validation.json"
APPROVED_TIERS = frozenset({"section_slice", "full_tree_html_rendered"})


def read_json(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"{path.name} must contain a JSON object")
    return payload


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return f"sha256:{digest.hexdigest()}"


def active_citations(registry: dict[str, Any]) -> dict[str, dict[str, Any]]:
    citations: dict[str, dict[str, Any]] = {}
    for condition in registry.get("conditions", []):
        for citation in condition.get("citations", []):
            citation_id = citation.get("citationId")
            if not citation_id or citation_id in citations:
                raise ValueError(f"Active registry has a duplicate or empty citationId: {citation_id!r}")
            citations[citation_id] = citation
    return citations


def make_record(source: dict[str, Any], citation_map: dict[str, dict[str, Any]]) -> dict[str, Any]:
    citation_ids = source.get("citationIds")
    if not isinstance(citation_ids, list) or not citation_ids:
        raise ValueError(f"{source.get('documentId')} has no citation IDs")
    missing = [citation_id for citation_id in citation_ids if citation_id not in citation_map]
    if missing:
        raise ValueError(f"{source['documentId']} references citation IDs absent from the active registry: {missing}")

    tier = source["tier"]
    is_slice = tier == "section_slice"
    local_relative_path = source.get("slicePdf") if is_slice else source.get("originalPdf")
    if not isinstance(local_relative_path, str) or not local_relative_path:
        raise ValueError(f"{source['documentId']} has no approved local PDF path")
    local_path = ROOT / local_relative_path
    if not local_path.is_file() or not local_path.read_bytes().startswith(b"%PDF-"):
        raise ValueError(f"{source['documentId']} is missing or is not a PDF: {local_path}")

    actual_hash = sha256(local_path)
    expected_hash = source.get("sliceContentHash") if is_slice else source.get("originalContentHash")
    # Older selected slices did not persist hashes. Compute and pin them in
    # this manifest; if an audit hash exists, it must agree exactly.
    if expected_hash and expected_hash != actual_hash:
        raise ValueError(f"PDF checksum mismatch for {source['documentId']}: {local_path.name}")
    try:
        page_count = len(PdfReader(str(local_path)).pages)
    except Exception as error:  # pragma: no cover - protects malformed PDFs at execution time
        raise ValueError(f"Could not read page count for {local_path.name}: {error}") from error
    if page_count < 1:
        raise ValueError(f"PDF has no pages: {local_path.name}")

    citation_selections = source.get("citationSelections", []) if is_slice else []
    return {
        "documentId": f"pageindex_{tier}_{source['documentId']}",
        "sourceAuditDocumentId": source["documentId"],
        "citationIds": citation_ids,
        "citationMetadata": [
            {
                "citationId": citation_id,
                "title": citation_map[citation_id].get("title"),
                "sectionTitle": citation_map[citation_id].get("sectionTitle"),
                "url": citation_map[citation_id].get("url"),
            }
            for citation_id in citation_ids
        ],
        "title": citation_map[citation_ids[0]].get("title"),
        "sourceUrl": source["sourceUrl"],
        "localPath": local_relative_path,
        "contentHash": actual_hash,
        "pageCount": page_count,
        "tier": tier,
        "pageIndexInputPolicy": "slice_document_only" if is_slice else "full_document_only_no_page_slicing",
        "selectionStatus": "pageindex_ready",
        "sourceOriginFormat": source.get("sourceOriginFormat", "pdf"),
        "originalPdf": source.get("originalPdf"),
        "originalContentHash": source.get("originalContentHash"),
        "selectedOriginalPageRanges": source.get("selectedPageRanges", []) if is_slice else [],
        "citationSelections": citation_selections,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dry-run", action="store_true", help="Validate inputs and print the manifest summary without writing files.")
    parser.add_argument("--output", type=Path, default=OUTPUT_PATH, help="Output manifest path.")
    args = parser.parse_args()

    source_audit = read_json(SOURCE_TIER_AUDIT_PATH)
    registry = read_json(ACTIVE_REGISTRY_PATH)
    citations = active_citations(registry)
    selected = [record for record in source_audit.get("records", []) if record.get("tier") in APPROVED_TIERS]
    if len(selected) != 31:
        raise ValueError(f"Expected 31 approved next-batch sources (26 slices + 5 rendered documents), found {len(selected)}")

    records = [make_record(source, citations) for source in selected]
    records.sort(key=lambda record: (record["tier"], record["documentId"]))
    summary = {
        "sectionSlices": sum(record["tier"] == "section_slice" for record in records),
        "renderedHtmlFullTrees": sum(record["tier"] == "full_tree_html_rendered" for record in records),
        "citationReferences": sum(len(record["citationIds"]) for record in records),
    }
    manifest = {
        "schemaVersion": "1.0",
        "purpose": "Approved Wave 1 PageIndex inputs beyond the first 17 full-tree PDFs. Source-pinned, citation-linked, and free of patient data.",
        "generatedAt": datetime.now(UTC).isoformat(),
        "sourceTierAudit": SOURCE_TIER_AUDIT_PATH.relative_to(ROOT).as_posix(),
        "activeCitationRegistry": ACTIVE_REGISTRY_PATH.relative_to(ROOT).as_posix(),
        "summary": summary,
        "records": records,
    }
    validation = {
        "schemaVersion": "1.0",
        "validatedAt": datetime.now(UTC).isoformat(),
        "status": "valid",
        "summary": summary,
        "excludedTierCounts": {
            "section_slice_needs_review": sum(record.get("tier") == "section_slice_needs_review" for record in source_audit.get("records", [])),
        },
    }
    print(f"Validated {summary['sectionSlices']} approved slices and {summary['renderedHtmlFullTrees']} rendered full documents.")
    print(f"All {summary['citationReferences']} citation references exist in the active registry.")
    if args.dry_run:
        print("Dry run only; no manifest written.")
        return 0
    args.output.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    VALIDATION_PATH.write_text(json.dumps(validation, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote PageIndex next-batch manifest: {args.output}")
    print(f"Wrote validation report: {VALIDATION_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
