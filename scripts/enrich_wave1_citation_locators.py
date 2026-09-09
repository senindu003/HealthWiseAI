"""Create an auditable Wave 1 citation-registry candidate with section locators.

Only PDF bookmarks and the first 20 front-matter pages are read.  No document
body pages and no patient data are sent to an LLM.  The original registry is
never overwritten; this script writes an enriched candidate for review.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from copy import deepcopy
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from PyPDF2 import PdfReader


ROOT = Path(__file__).resolve().parent.parent
WAVE_ROOT = ROOT / "knowledge-sources" / "wave1"
REGISTRY_PATH = ROOT / "citation-registry.wave1.nice-who.json"
DOCUMENT_MANIFEST_PATH = WAVE_ROOT / "document-manifest.json"
OUTPUT_PATH = ROOT / "citation-registry.wave1.enriched.json"
REVIEW_PATH = ROOT / "citation-locator-review.wave1.json"
MAX_FRONT_MATTER_PAGES = 20

STOPWORDS = {
    "and", "the", "for", "with", "from", "that", "this", "into", "of", "in", "on", "to", "a", "an",
    "recommendation", "recommendations", "guidance", "guideline", "summary", "evidence", "chapter", "section",
    "clinical", "management", "people", "adults", "children", "young", "patients", "patient", "care",
}


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def normalize(value: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9]+", " ", value.lower())).strip()


def meaningful_tokens(value: str) -> list[str]:
    return [token for token in normalize(value).split() if len(token) > 2 and token not in STOPWORDS]


def extract_outline(reader: PdfReader) -> list[dict[str, Any]]:
    try:
        outline = reader.outline
    except Exception:
        return []
    entries: list[dict[str, Any]] = []

    def walk(items: list[Any], parent_path: list[str]) -> None:
        previous: dict[str, Any] | None = None
        for item in items:
            if isinstance(item, list):
                if previous is not None:
                    walk(item, previous["tocPath"])
                continue
            fallback_title = item.get("/Title", "") if isinstance(item, dict) else ""
            title = str(getattr(item, "title", "") or fallback_title).strip()
            if not title:
                continue
            try:
                page = reader.get_destination_page_number(item) + 1
            except Exception:
                continue
            previous = {"title": title, "tocPath": [*parent_path, title], "pdfPageStart": page}
            entries.append(previous)

    walk(outline if isinstance(outline, list) else [outline], [])
    return entries


def extract_front_matter(reader: PdfReader) -> tuple[list[int], str]:
    texts = [(page.extract_text() or "") for page in reader.pages[:MAX_FRONT_MATTER_PAGES]]
    candidates = [
        index + 1 for index, text in enumerate(texts)
        if re.search(r"\b(table of )?contents\b", text, flags=re.I)
    ]
    pages: set[int] = set()
    for page in candidates:
        pages.update(range(page, min(page + 3, len(reader.pages)) + 1))
    return sorted(pages), "\n".join(texts[page - 1] for page in sorted(pages))


def exact_outline_match(section_title: str, outline: list[dict[str, Any]]) -> dict[str, Any] | None:
    target = normalize(section_title)
    tokens = meaningful_tokens(section_title)
    candidates: list[tuple[int, bool, dict[str, Any]]] = []
    for entry in outline:
        heading = normalize(entry["title"])
        heading_tokens = set(meaningful_tokens(entry["title"]))
        exact = bool(target and (target in heading or heading in target))
        score = sum(token in heading_tokens for token in tokens)
        if exact or (len(tokens) >= 2 and score == len(tokens)):
            candidates.append((score, exact, entry))
    if not candidates:
        return None
    _, exact, entry = max(candidates, key=lambda item: (item[1], item[0], -item[2]["pdfPageStart"]))
    return {
        "tocPath": entry["tocPath"],
        "tocHeading": entry["title"],
        "printedPageStart": None,
        "pdfPageStart": entry["pdfPageStart"],
        "locatorSource": "pdf_bookmark",
        "locatorStatus": "bookmark_verified",
        "matchMethod": "exact_heading" if exact else "all_significant_tokens",
        "matchConfidence": "high",
        "reviewStatus": "pending_human_review",
    }


def default_locator(status: str, note: str) -> dict[str, Any]:
    return {
        "tocPath": [], "tocHeading": None, "printedPageStart": None, "pdfPageStart": None,
        "locatorSource": None, "locatorStatus": status, "matchMethod": None,
        "matchConfidence": "none", "reviewStatus": "manual_review_required", "note": note,
    }


CURATED_BOOKMARK_MATCHES = {
    # These are only structural aliases: both sides are visible in the source
    # registry or its publisher bookmark tree. They are still review-pending.
    "who_malaria_guidelines_2025_diagnosis": "5.1 Diagnosing malaria",
    "who_tb_module2_screening_2021": "3. Recommendations for tools for systematic screening for TB disease",
    "nice_qs198_bppv_hallpike": "Quality statement 4: Hallpike manoeuvre for adults",
}


def curated_bookmark_match(citation_id: str, outline: list[dict[str, Any]]) -> dict[str, Any] | None:
    expected_heading = CURATED_BOOKMARK_MATCHES.get(citation_id)
    if not expected_heading:
        return None
    entry = next((item for item in outline if item["title"] == expected_heading), None)
    if entry is None:
        raise ValueError(f"Curated bookmark heading disappeared for {citation_id}: {expected_heading}")
    return {
        "tocPath": entry["tocPath"],
        "tocHeading": entry["title"],
        "printedPageStart": None,
        "pdfPageStart": entry["pdfPageStart"],
        "locatorSource": "pdf_bookmark",
        "locatorStatus": "bookmark_proposed",
        "matchMethod": "curated_structure_alias",
        "matchConfidence": "medium",
        "reviewStatus": "pending_human_review",
        "note": "Publisher bookmark selected from an explicit structural alias; clinical reviewer must confirm scope.",
    }


def structure_candidates(section_title: str, document: dict[str, Any]) -> list[dict[str, Any]]:
    """Return bookmark candidates for human review; never infer a selection."""
    if document.get("status") != "pdf_downloaded" or document.get("sourceFormat") != "pdf":
        return []
    reader = PdfReader(ROOT / document["localPath"])
    tokens = set(meaningful_tokens(section_title))
    if not tokens:
        return []
    candidates: list[tuple[int, dict[str, Any]]] = []
    for entry in extract_outline(reader):
        heading_tokens = set(meaningful_tokens(entry["title"]))
        overlap = len(tokens & heading_tokens)
        if overlap:
            candidates.append((overlap, entry))
    return [
        {"tocPath": entry["tocPath"], "tocHeading": entry["title"], "pdfPageStart": entry["pdfPageStart"]}
        for _, entry in sorted(candidates, key=lambda pair: (-pair[0], pair[1]["pdfPageStart"]))[:8]
    ]


def write_review_queue(enriched: dict[str, Any], documents_by_citation: dict[str, dict[str, Any]]) -> None:
    items: list[dict[str, Any]] = []
    for condition in enriched["conditions"]:
        for citation in condition["citations"]:
            locator = citation["sectionLocator"]
            if locator["reviewStatus"] == "pending_human_review":
                continue
            document = documents_by_citation[citation["citationId"]]
            items.append({
                "citationId": citation["citationId"],
                "condition": condition["normalizedCondition"],
                "title": citation["title"],
                "publisher": citation["publisher"],
                "url": citation["url"],
                "registrySectionTitleOriginal": citation["registrySectionTitleOriginal"],
                "sourceDocument": document.get("localPath"),
                "reason": locator.get("note"),
                "publisherStructureCandidates": structure_candidates(citation["registrySectionTitleOriginal"], document),
                "requiredAction": "Confirm an exact publisher heading from the official document before this citation is used for extraction or PDF slicing.",
            })
    write_json(REVIEW_PATH, {
        "schemaVersion": "1.0",
        "purpose": "Non-clinical citation-locator review queue generated from Wave 1 source structure inspection.",
        "generatedAt": datetime.now(UTC).isoformat(),
        "items": items,
    })


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.parse_args()

    registry = read_json(REGISTRY_PATH)
    documents = read_json(DOCUMENT_MANIFEST_PATH)["documents"]
    by_citation_id = {citation["citationId"]: citation for condition in registry["conditions"] for citation in condition["citations"]}
    documents_by_citation: dict[str, dict[str, Any]] = {}
    for document in documents:
        for citation_id in document["citationIds"]:
            documents_by_citation[citation_id] = document

    enriched = deepcopy(registry)
    results: dict[str, dict[str, Any]] = {}
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for citation_id, citation in by_citation_id.items():
        grouped[documents_by_citation[citation_id]["documentId"]].append(citation)

    for document_id, citations in grouped.items():
        document = documents_by_citation[citations[0]["citationId"]]
        if document.get("status") == "pdf_rendered_from_official_html":
            for citation in citations:
                results[citation["citationId"]] = {
                    "tocPath": [], "tocHeading": None, "printedPageStart": None, "pdfPageStart": 1,
                    "locatorSource": "official_html_rendered_pdf",
                    "locatorStatus": "full_document_no_section_locator",
                    "matchMethod": "full_document_input_policy",
                    "matchConfidence": "high",
                    "reviewStatus": "pending_human_review",
                    "note": "Official HTML was rendered locally for full-document retrieval only; no section slicing or original-PDF claim is made.",
                }
            continue
        if document.get("status") != "pdf_downloaded" or document.get("sourceFormat") != "pdf":
            for citation in citations:
                results[citation["citationId"]] = default_locator("not_applicable_html_source", "No local PDF contents/bookmark structure is available.")
            continue

        reader = PdfReader(ROOT / document["localPath"])
        outline = extract_outline(reader)
        toc_pages, toc_text = extract_front_matter(reader)
        unresolved: list[dict[str, Any]] = []
        for citation in citations:
            locator = exact_outline_match(citation["sectionTitle"], outline)
            if locator:
                locator["structureInspectionPages"] = list(range(1, min(len(reader.pages), MAX_FRONT_MATTER_PAGES) + 1))
                locator["tableOfContentsPages"] = toc_pages
                results[citation["citationId"]] = locator
            else:
                unresolved.append(citation)

        for citation in unresolved:
            if citation["citationId"] not in results:
                locator = curated_bookmark_match(citation["citationId"], outline)
                results[citation["citationId"]] = locator or default_locator(
                    "manual_review_required",
                    "No unambiguous match was found in the publisher bookmarks or front-matter contents pages.",
                )
                results[citation["citationId"]]["structureInspectionPages"] = list(range(1, min(len(reader.pages), MAX_FRONT_MATTER_PAGES) + 1))
                results[citation["citationId"]]["tableOfContentsPages"] = toc_pages

    for condition in enriched["conditions"]:
        for citation in condition["citations"]:
            original = citation["sectionTitle"]
            locator = results[citation["citationId"]]
            citation["registrySectionTitleOriginal"] = original
            citation["sectionLocator"] = locator
            if locator.get("tocHeading"):
                citation["sectionTitle"] = locator["tocHeading"]

    enriched.update({
        "schemaVersion": "1.1",
        "derivedFrom": REGISTRY_PATH.name,
        "locatorPolicy": "Only publisher bookmarks and the first 20 PDF front-matter pages were used. Every proposed locator requires human review before clinical use.",
        "generatedAt": datetime.now(UTC).isoformat(),
    })
    write_json(OUTPUT_PATH, enriched)
    write_review_queue(enriched, documents_by_citation)
    counts: dict[str, int] = defaultdict(int)
    for locator in results.values():
        counts[locator["locatorStatus"]] += 1
    print(json.dumps({"citations": len(results), "locatorStatuses": dict(sorted(counts.items())), "output": str(OUTPUT_PATH), "reviewQueue": str(REVIEW_PATH)}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
