"""Acquire the official source documents referenced by the Wave 1 registry.

This is deliberately an acquisition and audit step, not a clinical-extraction
step.  It groups duplicate registry URLs, caches public official HTML sources,
downloads a PDF only when the source URL or its official page exposes one, and
writes a manifest that PageIndex can use later.
"""

from __future__ import annotations

import hashlib
import html
import json
import re
import time
from collections import defaultdict
from pathlib import Path
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parent.parent
REGISTRY_PATH = ROOT / "citation-registry.wave1.nice-who.json"
OUTPUT_ROOT = ROOT / "knowledge-sources" / "wave1"
HTML_ROOT = OUTPUT_ROOT / "html"
PDF_ROOT = OUTPUT_ROOT / "pdf"
MANIFEST_PATH = OUTPUT_ROOT / "document-manifest.json"

# These are the publishers already represented in the existing registry. A
# discovered download is accepted only from one of these official hosts.
OFFICIAL_HOSTS = {
    "www.nice.org.uk",
    "www.who.int",
    "iris.who.int",
    "aria.med.up.pt",
    "www.aaaai.org",
}
USER_AGENT = "HealthWiseAI-Wave1EvidenceAcquisition/1.0 (educational evidence curation)"


def slug(value: str) -> str:
    return re.sub(r"_+", "_", re.sub(r"[^a-z0-9]+", "_", value.lower())).strip("_")


def sha256(content: bytes) -> str:
    return f"sha256:{hashlib.sha256(content).hexdigest()}"


def fetch(url: str) -> tuple[str, str, bytes]:
    request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/pdf;q=0.9,*/*;q=0.1"})
    with urlopen(request, timeout=10) as response:  # noqa: S310 - URLs are registry-controlled.
        final_url = response.geturl()
        content_type = response.headers.get_content_type().lower()
        return final_url, content_type, response.read()


def looks_like_pdf(url: str, content_type: str, content: bytes) -> bool:
    return content_type == "application/pdf" or urlparse(url).path.lower().endswith(".pdf") or content.startswith(b"%PDF-")


def is_official(url: str) -> bool:
    host = urlparse(url).netloc.lower().split(":", 1)[0]
    return host in OFFICIAL_HOSTS


def linked_pdf_urls(base_url: str, source_html: bytes) -> list[str]:
    text = html.unescape(source_html.decode("utf-8", errors="replace"))
    # WHO publication pages commonly use unquoted `href=` attributes.  Their
    # official IRIS download route is `/server/api/core/bitstreams/<uuid>/content`
    # and does not include a `.pdf` suffix, so capture both quoted and unquoted
    # attributes before applying the official-host-only filter below.
    hrefs = re.findall(
        r"href\s*=\s*(?:[\"']([^\"']+)[\"']|([^\s>]+))",
        text,
        flags=re.I,
    )
    candidates: list[str] = []
    for quoted_href, unquoted_href in hrefs:
        href = quoted_href or unquoted_href
        absolute = urljoin(base_url, href)
        parsed = urlparse(absolute)
        if parsed.scheme != "https" or not is_official(absolute):
            continue
        path_and_query = f"{parsed.path}?{parsed.query}".lower()
        # NICE download routes frequently use a friendly path such as
        # `/resources/<title>-pdf-<resource-id>` rather than a `.pdf` suffix.
        nice_pdf_resource = (
            parsed.netloc.lower() == "www.nice.org.uk"
            and "/resources/" in parsed.path.lower()
            and "pdf" in parsed.path.lower()
        )
        who_iris_bitstream = (
            parsed.netloc.lower() == "iris.who.int"
            and "/server/api/core/bitstreams/" in parsed.path.lower()
            and parsed.path.lower().endswith("/content")
        )
        if ".pdf" in path_and_query or "download" in path_and_query or nice_pdf_resource or who_iris_bitstream:
            if absolute not in candidates:
                candidates.append(absolute)
    return candidates


def document_id(url: str) -> str:
    parsed = urlparse(url)
    raw = f"{parsed.netloc}_{parsed.path}".strip("/")
    # A readable prefix alone can collide for long WHO/NICE paths. Keep a
    # stable URL-derived suffix so one official document can never overwrite
    # another in the PageIndex source cache.
    suffix = hashlib.sha256(url.encode("utf-8")).hexdigest()[:12]
    return f"{slug(raw)[:84]}_{suffix}"


def citation_groups(registry: dict) -> dict[str, list[dict]]:
    groups: dict[str, list[dict]] = defaultdict(list)
    for condition in registry["conditions"]:
        for citation in condition["citations"]:
            groups[citation["url"]].append({
                "citationId": citation["citationId"],
                "title": citation["title"],
                "publisher": citation.get("publisher"),
                "sectionTitle": citation.get("sectionTitle"),
            })
    return groups


def acquire(url: str, citations: list[dict]) -> dict:
    source_id = document_id(url)
    record = {
        "documentId": source_id,
        "canonicalSourceUrl": url,
        "citationIds": [item["citationId"] for item in citations],
        "publisher": citations[0].get("publisher"),
        "title": citations[0]["title"],
        "sourceFormat": None,
        "localPath": None,
        "linkedPdfUrl": None,
        "finalUrl": None,
        "contentHash": None,
        "pageIndexDocumentId": source_id,
        "status": "pending",
        "error": None,
    }
    try:
        final_url, content_type, content = fetch(url)
        record["finalUrl"] = final_url
        if looks_like_pdf(final_url, content_type, content):
            target = PDF_ROOT / f"{source_id}.pdf"
            target.write_bytes(content)
            record.update({
                "sourceFormat": "pdf",
                "localPath": target.relative_to(ROOT).as_posix(),
                "contentHash": sha256(content),
                "status": "pdf_downloaded",
            })
            return record

        if content_type != "text/html":
            record.update({"sourceFormat": content_type, "status": "unsupported_source_format"})
            return record

        # Preserve the canonical public page for PageIndex when no official PDF
        # can be found. It is intentionally not treated as a clinical extraction.
        html_target = HTML_ROOT / f"{source_id}.html"
        html_target.write_bytes(content)
        record.update({
            "sourceFormat": "html",
            "localPath": html_target.relative_to(ROOT).as_posix(),
            "contentHash": sha256(content),
            "status": "html_cached",
        })

        candidates = linked_pdf_urls(final_url, content)
        record["officialPdfCandidates"] = candidates
        record["pdfDownloadErrors"] = []
        for candidate in candidates:
            try:
                pdf_final_url, pdf_content_type, pdf_content = fetch(candidate)
                if not looks_like_pdf(pdf_final_url, pdf_content_type, pdf_content):
                    continue
                pdf_target = PDF_ROOT / f"{source_id}.pdf"
                pdf_target.write_bytes(pdf_content)
                record.update({
                    "sourceFormat": "pdf",
                    "localPath": pdf_target.relative_to(ROOT).as_posix(),
                    "linkedPdfUrl": pdf_final_url,
                    "contentHash": sha256(pdf_content),
                    "status": "pdf_downloaded",
                })
                return record
            except Exception as exc:  # Continue to the next official PDF candidate.
                record["pdfDownloadErrors"].append({
                    "url": candidate,
                    "error": f"{type(exc).__name__}: {exc}"[:500],
                })
                continue
        return record
    except Exception as exc:
        record.update({"status": "fetch_failed", "error": f"{type(exc).__name__}: {exc}"[:500]})
        return record


def main() -> None:
    registry = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    groups = citation_groups(registry)
    HTML_ROOT.mkdir(parents=True, exist_ok=True)
    PDF_ROOT.mkdir(parents=True, exist_ok=True)

    existing_by_url = {}
    if MANIFEST_PATH.exists():
        previous = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        existing_by_url = {
            item["canonicalSourceUrl"]: item
            for item in previous.get("documents", [])
            # Revisit cached HTML sources. The initial parser missed NICE
            # resource downloads and WHO IRIS bitstream download routes.
            if item.get("status") in {"pdf_downloaded", "unsupported_source_format"}
        }

    # Retain every prior record while a recovery pass is in progress.  A slow
    # public endpoint must never make a partially completed process overwrite
    # the manifest with only its first N records.
    documents_by_url = {
        item["canonicalSourceUrl"]: item
        for item in previous.get("documents", [])
    } if MANIFEST_PATH.exists() else {}
    for index, (url, citations) in enumerate(groups.items(), start=1):
        if url in existing_by_url:
            print(f"[{index}/{len(groups)}] cached {url}", flush=True)
            continue
        print(f"[{index}/{len(groups)}] {url}", flush=True)
        documents_by_url[url] = acquire(url, citations)
        manifest = {
            "schemaVersion": "1.0",
            "registry": REGISTRY_PATH.name,
            "purpose": "Wave 1 PageIndex source-document inventory; not patient data and not clinical runtime logic.",
            "documents": [documents_by_url[item_url] for item_url in groups if item_url in documents_by_url],
        }
        # Persist after every source: a slow or inaccessible public URL must
        # never discard previous acquisition results.
        MANIFEST_PATH.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        # Be polite to public publisher sites while retaining practical progress.
        time.sleep(0.1)
    documents = [documents_by_url[item_url] for item_url in groups if item_url in documents_by_url]
    counts = defaultdict(int)
    for document in documents:
        counts[document["status"]] += 1
    print(json.dumps({"documents": len(documents), "statuses": dict(sorted(counts.items())), "manifest": str(MANIFEST_PATH)}, indent=2))


if __name__ == "__main__":
    main()
