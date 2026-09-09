r"""Audit active citation -> PageIndex tree -> pinned PDF grounding.

The audit validates every active final Wave 1 evidence citation against its
registry metadata, normalized PageIndex tree, pinned local PDF hash/page count,
and one page-local text extraction. By default it also verifies the matching
Citation and completed EvidenceRecord--[:CITES]-->Citation relationships in
Neo4j. It never calls an LLM or handles patient data.

Run from health-ai-backend after setting local Neo4j environment values:
  .\.venv\Scripts\python.exe scripts\verify_curated_grounding.py --output ..\knowledge-sources\wave1\grounding-audit.json
Use --skip-neo4j only for a local file/provenance audit.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Iterable

import pymupdf
from neo4j import GraphDatabase
from neo4j.exceptions import DriverError, Neo4jError


BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_ROOT = BACKEND_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.config import get_settings
from app.knowledge_graph.page_text_extraction import _source_files
from app.knowledge_graph.retrieval import TREE_MANIFEST_PATHS


EVIDENCE_PATH = PROJECT_ROOT / "condition-evidence.wave1.full-tree-expanded.json"
REGISTRY_PATH = PROJECT_ROOT / "citation-registry.wave1.full-tree-expanded.json"


def read_object(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"Expected JSON object: {path}")
    return payload


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return f"sha256:{digest.hexdigest()}"


def walk(nodes: Iterable[dict[str, Any]]) -> Iterable[dict[str, Any]]:
    for node in nodes:
        yield node
        children = node.get("children", [])
        if isinstance(children, list):
            yield from walk(children)


def active_registry_metadata() -> tuple[dict[str, dict[str, Any]], dict[str, set[str]]]:
    registry = read_object(REGISTRY_PATH)
    metadata: dict[str, dict[str, Any]] = {}
    for condition in registry["conditions"]:
        for citation in condition["citations"]:
            metadata[citation["citationId"]] = citation
    evidence = read_object(EVIDENCE_PATH)
    links: dict[str, set[str]] = {}
    for record in evidence["records"]:
        for reference in record["citationRefs"]:
            links.setdefault(reference["citationId"], set()).add(record["evidenceId"])
    missing_registry = sorted(set(links) - set(metadata))
    if missing_registry:
        raise ValueError(f"Active evidence cites absent registry IDs: {missing_registry}")
    return metadata, links


def tree_index() -> dict[str, list[tuple[dict[str, Any], Path]]]:
    indexed: dict[str, list[tuple[dict[str, Any], Path]]] = {}
    for manifest_path in TREE_MANIFEST_PATHS:
        manifest = read_object(manifest_path)
        for entry in manifest["trees"]:
            for citation_id in entry.get("citationIds") or [entry["citationId"]]:
                indexed.setdefault(citation_id, []).append((entry, manifest_path))
    return indexed


def audit_files() -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]], dict[str, set[str]]]:
    metadata, evidence_links = active_registry_metadata()
    index = tree_index()
    source_files = _source_files()
    results: list[dict[str, Any]] = []
    for citation_id in sorted(evidence_links):
        issues: list[str] = []
        tree_records = index.get(citation_id, [])
        checked_documents: list[dict[str, Any]] = []
        if not tree_records:
            issues.append("No normalized PageIndex tree is mapped to this active citation.")
        for entry, manifest_path in tree_records:
            tree_path = PROJECT_ROOT / entry["normalizedTreePath"]
            if not tree_path.is_file():
                issues.append(f"Missing normalized tree: {tree_path}")
                continue
            tree = read_object(tree_path)
            document = tree.get("document", {})
            document_id = document.get("documentId")
            if citation_id not in document.get("citationIds", []):
                issues.append(f"Tree {document_id} does not declare citation {citation_id}.")
                continue
            source = source_files.get(document_id)
            if source is None:
                issues.append(f"No approved local PDF provenance for tree document {document_id}.")
                continue
            if not source.local_pdf.is_file():
                issues.append(f"Pinned PDF missing: {source.local_pdf}")
                continue
            actual_hash = sha256(source.local_pdf)
            if actual_hash != document.get("contentHash"):
                issues.append(f"PDF hash mismatch for {document_id}.")
                continue
            pdf = pymupdf.open(source.local_pdf)
            try:
                if pdf.page_count != document.get("pageCount"):
                    issues.append(f"PDF page count mismatch for {document_id}: {pdf.page_count} != {document.get('pageCount')}")
                    continue
                first_node = next(walk(tree.get("tree", [])), None)
                if not first_node:
                    issues.append(f"Normalized tree has no nodes: {document_id}")
                    continue
                locator = first_node["pageLocator"]
                start, end = locator["startPage"], locator["endPage"]
                if start < 1 or end < start or end > pdf.page_count:
                    issues.append(f"Invalid page locator for {document_id}: {locator}")
                    continue
                text = pdf.load_page(start - 1).get_text("text").strip()
                if not text:
                    issues.append(f"No extractable text on audited source page {start} for {document_id}.")
                    continue
                checked_documents.append({
                    "documentId": document_id,
                    "treeManifest": manifest_path.relative_to(PROJECT_ROOT).as_posix(),
                    "normalizedTree": entry["normalizedTreePath"],
                    "sourceTier": document["sourceTier"],
                    "localPdf": source.local_pdf.relative_to(PROJECT_ROOT).as_posix(),
                    "contentHashVerified": True,
                    "pageCountVerified": pdf.page_count,
                    "sampleNode": {"nodeId": first_node["nodeId"], "title": first_node["title"], "pageLocator": locator},
                    "sampleTextCharacters": len(text),
                })
            finally:
                pdf.close()
        citation = metadata[citation_id]
        results.append({
            "citationId": citation_id,
            "title": citation.get("title"),
            "url": citation.get("url"),
            "sectionTitle": citation.get("sectionTitle"),
            "evidenceIds": sorted(evidence_links[citation_id]),
            "documents": checked_documents,
            "status": "passed" if not issues else "failed",
            "issues": issues,
        })
    return results, metadata, evidence_links


def audit_neo4j(metadata: dict[str, dict[str, Any]], evidence_links: dict[str, set[str]]) -> dict[str, Any]:
    settings = get_settings()
    if not settings.neo4j_enabled:
        return {"status": "skipped", "reason": "NEO4J_ENABLED is false."}
    if not settings.neo4j_uri.strip() or not settings.neo4j_password.get_secret_value():
        return {"status": "skipped", "reason": "Neo4j URI or password is not configured."}
    citation_ids = sorted(evidence_links)
    cypher = """
    UNWIND $citationIds AS citationId
    OPTIONAL MATCH (citation:Citation {citationId: citationId})
    OPTIONAL MATCH (evidence:EvidenceRecord)-[:CITES]->(citation)
    WHERE evidence.clinicalReviewStatus = 'completed'
    RETURN citationId,
           citation.title AS title,
           citation.url AS url,
           citation.sectionTitle AS sectionTitle,
           count(DISTINCT evidence) AS completedEvidenceLinks
    """
    try:
        driver = GraphDatabase.driver(settings.neo4j_uri, auth=(settings.neo4j_username, settings.neo4j_password.get_secret_value()))
        try:
            with driver.session(database=settings.neo4j_database) as session:
                rows = {row["citationId"]: dict(row) for row in session.run(cypher, citationIds=citation_ids)}
        finally:
            driver.close()
    except (Neo4jError, DriverError) as error:
        return {"status": "failed", "reason": f"Neo4j connection/query failed: {error.__class__.__name__}"}
    issues: list[dict[str, Any]] = []
    for citation_id in citation_ids:
        row = rows.get(citation_id)
        expected = metadata[citation_id]
        if not row or row.get("completedEvidenceLinks", 0) < 1:
            issues.append({"citationId": citation_id, "reason": "Citation node or completed CITES relationship is missing."})
            continue
        for field in ("title", "url", "sectionTitle"):
            if row.get(field) != expected.get(field):
                issues.append({"citationId": citation_id, "reason": f"Neo4j {field} differs from active registry."})
    return {"status": "passed" if not issues else "failed", "checkedCitationCount": len(citation_ids), "issues": issues}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--skip-neo4j", action="store_true", help="Run only pinned-PDF/PageIndex grounding checks.")
    parser.add_argument("--output", type=Path, help="Optional JSON audit output path.")
    args = parser.parse_args()
    file_results, metadata, evidence_links = audit_files()
    file_failures = [item for item in file_results if item["status"] != "passed"]
    graph = {"status": "skipped", "reason": "Requested --skip-neo4j."} if args.skip_neo4j else audit_neo4j(metadata, evidence_links)
    report = {
        "schemaVersion": "1.0", "checkedAt": datetime.now(UTC).isoformat(),
        "scope": "Active Wave 1 evidence only; no patient data and no LLM calls.",
        "activeCitationCount": len(evidence_links), "fileAndTextGrounding": {"passed": len(file_results) - len(file_failures), "failed": len(file_failures), "results": file_results},
        "neo4j": graph,
        "fileAndTextComplete": not file_failures,
        "complete": not file_failures and graph["status"] == "passed",
    }
    serialized = json.dumps(report, indent=2, ensure_ascii=False) + "\n"
    if args.output:
        args.output.write_text(serialized, encoding="utf-8")
        print(f"Wrote grounding audit: {args.output}")
    print(json.dumps({
        "activeCitationCount": report["activeCitationCount"],
        "fileAndTextGrounding": {"passed": report["fileAndTextGrounding"]["passed"], "failed": report["fileAndTextGrounding"]["failed"]},
        "neo4j": graph["status"], "fileAndTextComplete": report["fileAndTextComplete"], "complete": report["complete"],
    }, indent=2))
    # A caller explicitly requesting the offline audit should be able to use
    # its exit status independently of whether Neo4j was contacted.
    if args.skip_neo4j:
        return 0 if report["fileAndTextComplete"] else 1
    return 0 if report["complete"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
