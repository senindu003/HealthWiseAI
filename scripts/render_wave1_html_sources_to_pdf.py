"""Render Wave 1 official HTML fallbacks to local full-document PDFs.

This preserves each cached official HTML source and records the rendered PDF as
a derivative retrieval copy. It is never represented as an original publisher
PDF and is never eligible for section slicing.
"""

from __future__ import annotations

import hashlib
import json
import re
from datetime import UTC, datetime
from pathlib import Path

from PyPDF2 import PdfReader


ROOT = Path(__file__).resolve().parent.parent
WAVE_ROOT = ROOT / "knowledge-sources" / "wave1"
MANIFEST_PATH = WAVE_ROOT / "document-manifest.json"
REGISTRY_PATH = ROOT / "citation-registry.wave1.enriched.json"
PDF_ROOT = WAVE_ROOT / "pdf"


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def digest(path: Path) -> str:
    hasher = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            hasher.update(block)
    return f"sha256:{hasher.hexdigest()}"


def render(source: Path, target: Path) -> int:
    target.parent.mkdir(parents=True, exist_ok=True)
    # xhtml2pdf runs locally and does not fetch the live source page.
    from xhtml2pdf import pisa

    with source.open("r", encoding="utf-8") as html, target.open("wb") as pdf:
        markup = html.read()
        # Do not permit the renderer to fetch fonts, stylesheets, or images.
        markup = re.sub(r"<link\b[^>]*(?:https?:)?//[^>]*>", "", markup, flags=re.I)
        markup = re.sub(r"@import\s+(?:url\()?['\"]?(?:https?:)?//[^;]+;", "", markup, flags=re.I)
        result = pisa.CreatePDF(markup, dest=pdf, path=str(source.parent))
    if result.err or not target.exists():
        raise RuntimeError(f"HTML-to-PDF rendering failed for {source.name}")
    return len(PdfReader(target).pages)


def main() -> int:
    manifest = read_json(MANIFEST_PATH)
    registry = read_json(REGISTRY_PATH)
    rendered: list[dict] = []

    for document in manifest["documents"]:
        if document.get("sourceFormat") != "html" and document.get("sourceOriginFormat") != "official_html":
            continue
        html_path = ROOT / document.get("officialHtmlPath", document["localPath"])
        if not html_path.exists():
            raise FileNotFoundError(html_path)
        pdf_path = PDF_ROOT / f"{document['documentId']}.html-render.pdf"
        pages = render(html_path, pdf_path)
        document.update({
            "sourceFormat": "pdf",
            "status": "pdf_rendered_from_official_html",
            "localPath": pdf_path.relative_to(ROOT).as_posix(),
            "contentHash": digest(pdf_path),
            "sourceOriginFormat": "official_html",
            "officialHtmlPath": html_path.relative_to(ROOT).as_posix(),
            "renderingTool": "xhtml2pdf local renderer (external assets disabled)",
            "renderedAt": datetime.now(UTC).isoformat(),
            "pageCount": pages,
            "pageIndexInputPolicy": "full_document_only_no_page_slicing",
        })
        rendered.append({"documentId": document["documentId"], "pages": pages})

    rendered_ids = {item["documentId"] for item in rendered}
    citations_to_rendered_doc = {
        citation_id: document["documentId"]
        for document in manifest["documents"] if document["documentId"] in rendered_ids
        for citation_id in document["citationIds"]
    }
    for condition in registry["conditions"]:
        for citation in condition["citations"]:
            document_id = citations_to_rendered_doc.get(citation["citationId"])
            if not document_id:
                continue
            locator = citation["sectionLocator"]
            locator.update({
                "locatorSource": "official_html_rendered_pdf",
                "locatorStatus": "full_document_no_section_locator",
                "matchMethod": "full_document_input_policy",
                "matchConfidence": "high",
                "reviewStatus": "pending_human_review",
                "note": "Official HTML was rendered locally for full-document retrieval only; no section slicing or original-PDF claim is made.",
                "pdfPageStart": 1,
            })

    write_json(MANIFEST_PATH, manifest)
    write_json(REGISTRY_PATH, registry)
    print(json.dumps({"renderedDocuments": rendered, "sourcePolicy": "full_document_only_no_page_slicing"}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
