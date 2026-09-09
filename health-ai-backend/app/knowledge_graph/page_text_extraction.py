"""Extract bounded, page-local source text from a curated retrieval plan.

This module is deliberately offline and read-only.  It accepts a previously
created Neo4j/PageIndex retrieval plan, opens only its locally pinned public
clinical PDFs, and returns the text of the selected PageIndex pages together
with citation and original-page provenance.  It does not accept patient data,
call an LLM, choose conditions, or produce clinical advice.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

import pymupdf


PROJECT_ROOT = Path(__file__).resolve().parents[3]
WAVE1_ROOT = PROJECT_ROOT / "knowledge-sources" / "wave1"
FULL_TREE_INPUTS = WAVE1_ROOT / "source-tiering.wave1.full-tree-expanded.json"
NEXT_BATCH_INPUTS = WAVE1_ROOT / "source-tiering.wave1.pageindex-next-batch.json"
FINAL_BATCH_INPUTS = WAVE1_ROOT / "source-tiering.wave1.pageindex-final-batch.json"

# A recommendation agent must receive concise, page-pinned evidence rather
# than an entire guideline.  These caps also make accidental oversized context
# bundles fail predictably.
MAX_CHARS_PER_PAGE = 4_000
MAX_CHARS_PER_NODE = 8_000


def _load_object(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"{path.name} must contain a JSON object.")
    return payload


def _as_positive_page(value: Any, field: str) -> int:
    if not isinstance(value, int) or value < 1:
        raise ValueError(f"{field} must be a positive page number.")
    return value


def _page_range_pages(ranges: Iterable[dict[str, Any]]) -> list[int]:
    pages: list[int] = []
    for item in ranges:
        start = _as_positive_page(item.get("startPage"), "startPage")
        end = _as_positive_page(item.get("endPage"), "endPage")
        if end < start:
            raise ValueError("originalPageRanges contains an inverted range.")
        pages.extend(range(start, end + 1))
    return pages


def _clean_pdf_text(text: str) -> str:
    """Repair common PDF extraction artefacts without altering clinical wording."""
    replacements = {
        "\u00c2\u00a0": " ",
        "\u00c2\u00ad": "",
        "\u00e2\u0080\u0093": "–",
        "\u00e2\u0080\u0094": "—",
        "\u00e2\u0080\u0099": "’",
        "\u00e2\u0080\u0098": "‘",
        "\u00e2\u0080\u009c": "“",
        "\u00e2\u0080\u009d": "”",
    }
    for artifact, replacement in replacements.items():
        text = text.replace(artifact, replacement)
    return text


@dataclass(frozen=True)
class SourceFile:
    document_id: str
    citation_ids: tuple[str, ...]
    local_pdf: Path
    original_pdf: Path
    source_tier: str
    original_pages_by_local_page: tuple[int, ...] | None


def _source_files() -> dict[str, SourceFile]:
    """Create a documentId -> local-PDF provenance map from approved manifests."""
    sources: dict[str, SourceFile] = {}

    full_payload = _load_object(FULL_TREE_INPUTS)
    for record in full_payload.get("records", []):
        document_id = record["documentId"]
        path = PROJECT_ROOT / record["localPath"]
        sources[document_id] = SourceFile(
            document_id=document_id,
            citation_ids=(record["citationId"],),
            local_pdf=path,
            original_pdf=path,
            source_tier=record["tier"],
            original_pages_by_local_page=None,
        )

    next_payload = _load_object(NEXT_BATCH_INPUTS)
    for record in next_payload.get("records", []):
        document_id = record["documentId"]
        local_pdf = PROJECT_ROOT / record["localPath"]
        original_pdf = PROJECT_ROOT / record.get("originalPdf", record["localPath"])
        ranges = record.get("selectedOriginalPageRanges", [])
        source_tier = record["tier"]
        original_pages = tuple(_page_range_pages(ranges)) if source_tier == "section_slice" else None
        sources[document_id] = SourceFile(
            document_id=document_id,
            citation_ids=tuple(record["citationIds"]),
            local_pdf=local_pdf,
            original_pdf=original_pdf,
            source_tier=source_tier,
            original_pages_by_local_page=original_pages,
        )
    # The final manifest is created before indexing; it is safe to include its
    # pinned PDFs only after the manifest itself has passed offline validation.
    if FINAL_BATCH_INPUTS.is_file():
        for record in _load_object(FINAL_BATCH_INPUTS).get("records", []):
            document_id = record["documentId"]
            path = PROJECT_ROOT / record["localPath"]
            sources[document_id] = SourceFile(
                document_id=document_id,
                citation_ids=tuple(record["citationIds"]),
                local_pdf=path,
                original_pdf=path,
                source_tier=record["tier"],
                original_pages_by_local_page=None,
            )
    return sources


def _extract_pages(pdf_path: Path, start_page: int, end_page: int) -> list[dict[str, Any]]:
    if not pdf_path.is_file():
        raise FileNotFoundError(f"Pinned source PDF is missing: {pdf_path}")
    if end_page < start_page:
        raise ValueError("Selected node has an inverted page locator.")
    document = pymupdf.open(pdf_path)
    try:
        if end_page > document.page_count:
            raise ValueError(
                f"Selected PageIndex page {end_page} exceeds {pdf_path.name}'s {document.page_count} pages."
            )
        pages: list[dict[str, Any]] = []
        for page_number in range(start_page, end_page + 1):
            text = _clean_pdf_text(document.load_page(page_number - 1).get_text("text").strip())
            pages.append({
                "localPage": page_number,
                "text": text[:MAX_CHARS_PER_PAGE],
                "textTruncated": len(text) > MAX_CHARS_PER_PAGE,
                "characterCount": len(text),
            })
        return pages
    finally:
        document.close()


def _original_mapping(source: SourceFile, local_page: int) -> int:
    if source.original_pages_by_local_page is None:
        return local_page
    if local_page > len(source.original_pages_by_local_page):
        raise ValueError(
            f"Slice page {local_page} is outside the approved original-page mapping for {source.document_id}."
        )
    return source.original_pages_by_local_page[local_page - 1]


def extract_retrieval_plan(plan: dict[str, Any]) -> dict[str, Any]:
    """Return a bounded evidence bundle from a valid retrieval-plan object."""
    if plan.get("schemaVersion") != "1.0":
        raise ValueError("Unsupported retrieval-plan schema version.")
    selected_sources = plan.get("selectedSources")
    if not isinstance(selected_sources, list):
        raise ValueError("retrieval plan must contain selectedSources.")

    source_files = _source_files()
    evidence_items: list[dict[str, Any]] = []
    for source_item in selected_sources:
        citation = source_item.get("citation")
        tree = source_item.get("tree")
        nodes = source_item.get("selectedNodes")
        if not isinstance(citation, dict) or not isinstance(tree, dict) or not isinstance(nodes, list):
            raise ValueError("Each selected source needs citation, tree, and selectedNodes.")
        document_id = tree.get("documentId")
        if not isinstance(document_id, str) or document_id not in source_files:
            raise ValueError(f"No approved source-file mapping for PageIndex document {document_id!r}.")
        source = source_files[document_id]
        citation_id = citation.get("citationId")
        if citation_id not in source.citation_ids:
            raise ValueError(f"Citation {citation_id!r} is not approved for PageIndex document {document_id!r}.")

        extracted_nodes: list[dict[str, Any]] = []
        for node in nodes:
            locator = node.get("pageLocator", {})
            start = _as_positive_page(locator.get("startPage"), "pageLocator.startPage")
            end = _as_positive_page(locator.get("endPage"), "pageLocator.endPage")
            page_text = _extract_pages(source.local_pdf, start, end)
            mapped_pages = [
                {
                    **page,
                    "originalPage": _original_mapping(source, page["localPage"]),
                }
                for page in page_text
            ]
            excerpt = "\n\n".join(
                f"[Source page {page['originalPage']}; PageIndex input page {page['localPage']}]\n{page['text']}"
                for page in mapped_pages
                if page["text"]
            )[:MAX_CHARS_PER_NODE]
            extracted_nodes.append({
                "nodeId": node.get("nodeId"),
                "title": node.get("title"),
                "treePath": node.get("path", []),
                "pageLocator": {"startPage": start, "endPage": end},
                "originalPageRange": {
                    "startPage": mapped_pages[0]["originalPage"],
                    "endPage": mapped_pages[-1]["originalPage"],
                },
                "ranking": {"score": node.get("score"), "matchedTerms": node.get("matchedTerms", [])},
                "sourceExcerpt": excerpt,
                "excerptTruncated": len(excerpt) >= MAX_CHARS_PER_NODE,
                "pages": mapped_pages,
            })

        evidence_items.append({
            "conditionId": source_item.get("conditionId"),
            "conditionDisplayName": source_item.get("conditionDisplayName"),
            "evidenceId": source_item.get("evidenceId"),
            "citation": citation,
            "sourceDocument": {
                "documentId": document_id,
                "sourceTier": source.source_tier,
                "pageIndexInputPdf": source.local_pdf.relative_to(PROJECT_ROOT).as_posix(),
                "originalSourcePdf": source.original_pdf.relative_to(PROJECT_ROOT).as_posix(),
                "normalizedTreePath": tree.get("normalizedTreePath"),
            },
            "selectedNodeEvidence": extracted_nodes,
        })

    return {
        "schemaVersion": "1.0",
        "purpose": "Read-only, page-pinned curated source excerpts for a later evidence-grounded recommendation step; not clinical advice or a diagnosis.",
        "inputPlan": {
            "conditionIds": plan.get("input", {}).get("conditionIds", []),
            "retrievalQuery": plan.get("input", {}).get("retrievalQuery", ""),
        },
        "limits": {"maxCharactersPerPage": MAX_CHARS_PER_PAGE, "maxCharactersPerNode": MAX_CHARS_PER_NODE},
        "evidence": evidence_items,
        "unindexedCitations": plan.get("unindexedCitations", []),
    }
