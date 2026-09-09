"""Create auditable PageIndex source tiers and section slices for Wave 1.

This utility never changes the official PDFs.  It creates local derivative
PDFs only for reasoning-based retrieval, records their exact original page
ranges, and leaves uncertain selections for human review.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from collections import defaultdict
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from PyPDF2 import PdfReader, PdfWriter


ROOT = Path(__file__).resolve().parent.parent
WAVE_ROOT = ROOT / "knowledge-sources" / "wave1"
DOCUMENT_MANIFEST_PATH = WAVE_ROOT / "document-manifest.json"
CITATION_REGISTRY_PATH = ROOT / "citation-registry.wave1.nice-who.json"
TIER_MANIFEST_PATH = WAVE_ROOT / "source-tiering.wave1.json"
SLICE_ROOT = WAVE_ROOT / "slices"
FULL_TREE_PAGE_LIMIT = 15

STOPWORDS = {
    "and", "the", "for", "with", "from", "that", "this", "into", "of", "in", "on", "to", "a", "an",
    "recommendation", "recommendations", "guidance", "guideline", "summary", "evidence", "chapter", "section",
    "clinical", "management", "people", "adults", "children", "young", "patients", "patient", "care",
}


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def normalize(value: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", value.lower())).strip()


def meaningful_tokens(value: str) -> list[str]:
    return [token for token in normalize(value).split() if len(token) > 2 and token not in STOPWORDS]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return f"sha256:{digest.hexdigest()}"


def merge_ranges(pages: set[int]) -> list[dict[str, int]]:
    if not pages:
        return []
    ranges: list[dict[str, int]] = []
    start = previous = min(pages)
    for page in sorted(pages)[1:]:
        if page == previous + 1:
            previous = page
            continue
        ranges.append({"startPage": start, "endPage": previous})
        start = previous = page
    ranges.append({"startPage": start, "endPage": previous})
    return ranges


def source_citations(registry: dict[str, Any]) -> dict[str, dict[str, Any]]:
    citations: dict[str, dict[str, Any]] = {}
    for condition in registry["conditions"]:
        for citation in condition["citations"]:
            citations[citation["citationId"]] = citation
    return citations


def find_toc_pages(reader: PdfReader) -> tuple[list[int], str]:
    """Read at most the first 20 PDF pages to locate the contents pages."""
    front_matter = [page.extract_text() or "" for page in reader.pages[:20]]
    # Contents may span several adjacent pages. Search the front matter only
    # to avoid a later reference to the word "contents" creating a false TOC.
    candidates = [
        index + 1 for index, text in enumerate(front_matter)
        if re.search(r"\b(table of )?contents\b", text, flags=re.I)
    ]
    pages: set[int] = set()
    for page in candidates:
        pages.update(range(page, min(page + 3, len(reader.pages)) + 1))
    extracted = "\n".join((reader.pages[page - 1].extract_text() or "") for page in sorted(pages))
    return sorted(pages), extracted


def flatten_outline(reader: PdfReader) -> list[dict[str, Any]]:
    """Read PDF bookmark destinations without traversing document body text."""
    try:
        outline = reader.outline
    except Exception:
        return []

    entries: list[dict[str, Any]] = []

    def visit(items: list[Any], level: int = 0) -> None:
        for item in items:
            if isinstance(item, list):
                visit(item, level + 1)
                continue
            fallback_title = item.get("/Title", "") if isinstance(item, dict) else ""
            title = str(getattr(item, "title", "") or fallback_title)
            try:
                page = reader.get_destination_page_number(item) + 1
            except Exception:
                continue
            entries.append({"title": title, "page": page, "level": level})

    visit(outline if isinstance(outline, list) else [outline])
    return entries


def locate_section(section_title: str, outline: list[dict[str, Any]], toc_text: str) -> dict[str, Any]:
    """Match a cited heading only against bookmarks/contents, never body text."""
    target = normalize(section_title)
    tokens = meaningful_tokens(section_title)
    candidates: list[tuple[int, int, bool, dict[str, Any]]] = []
    for entry in outline:
        heading = normalize(entry["title"])
        heading_tokens = set(meaningful_tokens(entry["title"]))
        exact = bool(target and target in heading)
        score = sum(token in heading_tokens for token in tokens)
        if exact or score >= max(2, min(3, len(tokens))):
            candidates.append((score, -entry["page"], exact, entry))

    if candidates:
        score, _, exact, entry = max(candidates, key=lambda item: (item[2], item[0], item[1]))
        return {
            "status": "outline_exact" if exact else "outline_token_match",
            "page": entry["page"],
            "outlineTitle": entry["title"],
            "matchedTokens": [token for token in tokens if token in normalize(entry["title"])],
            "score": score,
        }

    # A contents-only hit confirms a potentially relevant heading but cannot
    # safely map printed page numbering to PDF numbering without bookmarks.
    if target and target in normalize(toc_text):
        return {"status": "toc_match_needs_page_mapping", "page": None, "matchedTokens": tokens}
    return {"status": "unmatched", "page": None, "matchedTokens": []}


def build_slice(reader: PdfReader, target: Path, pages: set[int]) -> None:
    writer = PdfWriter()
    for page in sorted(pages):
        writer.add_page(reader.pages[page - 1])
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("wb") as handle:
        writer.write(handle)


def process_pdf(document: dict[str, Any], citations: dict[str, dict[str, Any]], write: bool) -> dict[str, Any]:
    local_path = ROOT / document["localPath"]
    reader = PdfReader(local_path)
    page_count = len(reader.pages)
    source_hash = sha256(local_path)
    if source_hash != document["contentHash"]:
        raise ValueError(f"Checksum mismatch: {local_path.name}")

    record: dict[str, Any] = {
        "documentId": document["documentId"],
        "sourceUrl": document["canonicalSourceUrl"],
        "citationIds": document["citationIds"],
        "originalPdf": document["localPath"],
        "originalContentHash": source_hash,
        "pageCount": page_count,
        "tier": "full_tree" if page_count <= FULL_TREE_PAGE_LIMIT else "section_slice",
        "tableOfContentsPages": [],
        "citationSelections": [],
        "selectedPageRanges": [],
        "slicePdf": None,
        "selectionStatus": "not_needed" if page_count <= FULL_TREE_PAGE_LIMIT else "pending",
    }
    if document.get("status") == "pdf_rendered_from_official_html":
        record.update({
            "tier": "full_tree_html_rendered",
            "selectionStatus": "full_document_only_no_page_slicing",
            "sourceOriginFormat": "official_html",
            "pageIndexInputPolicy": "full_document_only_no_page_slicing",
        })
        return record
    if page_count <= FULL_TREE_PAGE_LIMIT:
        return record

    toc_pages, toc_text = find_toc_pages(reader)
    outline = flatten_outline(reader)
    record["tableOfContentsPages"] = toc_pages
    record["outlineEntryCount"] = len(outline)
    record["structureInspectionPages"] = list(range(1, min(page_count, 20) + 1))
    selected_pages: set[int] = {1, *toc_pages}
    has_unmatched = False

    for citation_id in document["citationIds"]:
        citation = citations[citation_id]
        match = locate_section(citation["sectionTitle"], outline, toc_text)
        selection = {
            "citationId": citation_id,
            "sectionTitle": citation["sectionTitle"],
            "match": match,
            "selectedPageRange": None,
        }
        if match["page"] is None:
            has_unmatched = True
        else:
            # Derive a bounded section range from the next bookmark. This is a
            # retrieval slice, not a claim of the exact clinical boundary.
            next_pages = [entry["page"] for entry in outline if entry["page"] > match["page"]]
            next_page = min(next_pages) if next_pages else page_count + 1
            start = match["page"]
            end = min(page_count, next_page - 1, start + 19)
            selected_pages.update(range(start, end + 1))
            selection["selectedPageRange"] = {"startPage": start, "endPage": end}
        record["citationSelections"].append(selection)

    record["selectedPageRanges"] = merge_ranges(selected_pages)
    if has_unmatched:
        record["selectionStatus"] = "manual_review_required"
        record["tier"] = "section_slice_needs_review"
        return record

    target = SLICE_ROOT / f"{document['documentId']}.slice.pdf"
    if write:
        build_slice(reader, target, selected_pages)
    record.update({
        "selectionStatus": "slice_generated" if write else "slice_ready",
        "slicePdf": target.relative_to(ROOT).as_posix(),
        "sliceContentHash": sha256(target) if write else None,
        "slicePageCount": len(selected_pages),
    })
    return record


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="Write local derivative slice PDFs. Default validates and plans only.")
    args = parser.parse_args()

    documents = read_json(DOCUMENT_MANIFEST_PATH)["documents"]
    citations = source_citations(read_json(CITATION_REGISTRY_PATH))
    records: list[dict[str, Any]] = []
    for document in documents:
        if document.get("status") in {"pdf_downloaded", "pdf_rendered_from_official_html"} and document.get("sourceFormat") == "pdf":
            records.append(process_pdf(document, citations, args.write))
        else:
            records.append({
                "documentId": document["documentId"],
                "sourceUrl": document["canonicalSourceUrl"],
                "citationIds": document["citationIds"],
                "tier": "html_direct",
                "selectionStatus": "official_html_source",
            })

    manifest = {
        "schemaVersion": "1.0",
        "purpose": "PageIndex source-tier plan and local derivative-PDF provenance. Original official sources remain authoritative.",
        "fullTreePageLimit": FULL_TREE_PAGE_LIMIT,
        "generatedAt": datetime.now(UTC).isoformat(),
        "records": records,
    }
    TIER_MANIFEST_PATH.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    counts: dict[str, int] = defaultdict(int)
    for record in records:
        counts[record["tier"]] += 1
    print(json.dumps({"records": len(records), "tiers": dict(sorted(counts.items())), "manifest": str(TIER_MANIFEST_PATH)}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
