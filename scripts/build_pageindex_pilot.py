"""Build and cache PageIndex trees for the Wave 1 pilot documents.

This is an offline ingestion utility, intentionally separate from FastAPI.
It never receives patient data.  It defaults to a dry run; `--execute` is
required before PageIndex may call the configured index LLM.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parent.parent
WAVE_ROOT = ROOT / "knowledge-sources" / "wave1"
TIER_MANIFEST_PATH = WAVE_ROOT / "source-tiering.wave1.full-tree-expanded.json"
PILOT_PATH = WAVE_ROOT / "pageindex-pilot.json"
BACKEND_ENV_PATH = ROOT / "health-ai-backend" / ".env"
INDEX_MODEL = "gpt-4o-mini"


class RateLimitPause(RuntimeError):
    """Stop batch work so a later resume starts after the API quota window."""


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return f"sha256:{digest.hexdigest()}"


def load_pilot_documents(include_all: bool = False) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """Load only final, full-document PageIndex inputs.

    The source-tier manifest is the active Wave 1 source-of-truth.  This
    keeps pilot trees pinned to the same PDF hashes that the final evidence
    bundle cites, rather than to the superseded discovery manifest.
    """
    manifest = read_json(TIER_MANIFEST_PATH)
    pilot = read_json(PILOT_PATH)
    if pilot.get("indexModel") != INDEX_MODEL:
        raise ValueError(f"The PageIndex pilot must use {INDEX_MODEL}.")
    if pilot.get("indexingMode") != "standard":
        raise ValueError("The PageIndex pilot must use standard indexing so the bound model constructs the tree.")

    documents_by_citation_id = {
        document["citationId"]: document for document in manifest["records"]
    }
    configured_by_citation_id = {item["citationId"]: item for item in pilot["documents"]}
    selected = (
        [record for record in manifest["records"] if record.get("tier") == "full_tree"]
        if include_all
        else [documents_by_citation_id[item["citationId"]] for item in pilot["documents"]]
    )
    prepared: list[dict[str, Any]] = []

    for source in selected:
        citation_id = source["citationId"]
        configured = configured_by_citation_id.get(citation_id, {})
        if source.get("tier") != "full_tree" or source.get("pageIndexInputPolicy") != "full_document_only_no_page_slicing":
            raise ValueError(f"Pilot input is not approved for full-tree indexing: {citation_id}")

        local_path = ROOT / source["localPath"]
        if not local_path.is_file() or not local_path.read_bytes().startswith(b"%PDF-"):
            raise ValueError(f"Pilot document is missing or not a PDF: {local_path}")

        actual_hash = sha256(local_path)
        if actual_hash != source["contentHash"]:
            raise ValueError(f"PDF checksum no longer matches the manifest: {local_path.name}")

        prepared.append({
            "documentId": source["documentId"],
            "citationId": citation_id,
            "label": configured.get("label", source["title"]),
            # Focus sections are descriptive metadata only; PageIndex builds
            # the full source tree. Non-pilot documents have no manually set
            # focus list until retrieval evaluation begins.
            "focusSections": configured.get("focusSections", []),
            "sourceUrl": source["sourceUrl"],
            "citationIds": [citation_id],
            "contentHash": actual_hash,
            "expectedPageCount": source["pageCount"],
            "filePath": local_path,
        })
    return pilot, prepared


def load_cache(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"schemaVersion": "1.0", "documents": {}}
    return read_json(path)


def submit_with_recovery(client: Any, document: dict[str, Any], pilot: dict[str, Any], api_error: type[Exception]) -> tuple[dict[str, Any], str, list[dict[str, str]]]:
    """Try model-driven indexing first, then PageIndex Flash if it cannot parse.

    Both routes use the same PageIndex client configured with gpt-4o-mini.
    Flash is only a document-structure fallback; it does not replace clinical
    source provenance or alter the original PDF.
    """
    requested_mode = pilot["indexingMode"]
    fallback_mode = pilot.get("fallbackIndexingMode")
    standard_attempts = int(pilot.get("standardAttemptLimit", 1))
    modes = [requested_mode] * max(1, standard_attempts)
    if fallback_mode and fallback_mode not in modes:
        modes.append(fallback_mode)
    failures: list[dict[str, str]] = []
    metadata = {
        "healthwiseDocumentId": document["documentId"],
        "citationIds": document["citationIds"],
        "sourceUrl": document["sourceUrl"],
        "contentHash": document["contentHash"],
        "focusSections": document["focusSections"],
    }
    for attempt, mode in enumerate(modes, start=1):
        try:
            result = client.submit_document(
                str(document["filePath"]), mode=mode, wait=True, metadata=metadata,
            )
            return result, mode, failures
        except api_error as error:
            if "ratelimit" in str(error).lower() or "rate limit" in str(error).lower():
                raise RateLimitPause(str(error)) from error
            failure = {"mode": mode, "attempt": str(attempt), "error": str(error)}
            failures.append(failure)
            retry_label = "; trying the next recovery step" if attempt < len(modes) else ""
            print(f"PageIndex {mode} attempt {attempt} failed for {document['label']}: {error}{retry_label}", file=sys.stderr)
    raise api_error(f"All PageIndex recovery attempts failed for {document['label']}: {failures[-1]['error']}")


def walk_nodes(nodes: list[Any], page_count: int, parent_range: tuple[int, int] | None = None) -> tuple[list[dict[str, Any]], list[str]]:
    """Validate PageIndex's nested tree shape without interpreting clinical text."""
    all_nodes: list[dict[str, Any]] = []
    errors: list[str] = []
    for node in nodes:
        if not isinstance(node, dict):
            errors.append("A tree item is not an object.")
            continue
        all_nodes.append(node)
        node_id = node.get("node_id")
        title = node.get("title")
        start = node.get("start_index")
        end = node.get("end_index")
        page_index = node.get("page_index")
        if not isinstance(node_id, str) or not node_id.strip():
            errors.append(f"Node with title {title!r} has no node_id.")
        if not isinstance(title, str) or not title.strip():
            errors.append(f"Node {node_id!r} has no title.")
        has_range = isinstance(start, int) or isinstance(end, int)
        if has_range:
            if not isinstance(start, int) or not isinstance(end, int) or start < 1 or end < start or end > page_count:
                errors.append(f"Node {node_id or title!r} has invalid page range {start!r}-{end!r} for {page_count} pages.")
            elif parent_range and (start < parent_range[0] or end > parent_range[1]):
                errors.append(f"Node {node_id or title!r} falls outside its parent page range.")
        elif not isinstance(page_index, int) or page_index < 1 or page_index > page_count:
            errors.append(f"Node {node_id or title!r} has neither a valid page range nor a valid page_index for {page_count} pages.")
        children = node.get("nodes", [])
        if children is not None and not isinstance(children, list):
            errors.append(f"Node {node_id or title!r} has a non-list nodes field.")
        elif children:
            child_nodes, child_errors = walk_nodes(children, page_count, (start, end) if isinstance(start, int) and isinstance(end, int) else None)
            all_nodes.extend(child_nodes)
            errors.extend(child_errors)
    return all_nodes, errors


def validate_and_preview_exports(documents: list[dict[str, Any]], export_path: Path) -> None:
    """Create a deterministic structural report and human-readable tree preview.

    This checks only tree integrity and source identity.  It deliberately does
    not claim that an LLM-generated summary is clinically correct; that review
    happens before a final runtime schema is adopted.
    """
    report: dict[str, Any] = {
        "schemaVersion": "1.0",
        "validationType": "PageIndex tree structural validation",
        "validatedAt": datetime.now(UTC).isoformat(),
        "documents": [],
    }
    preview = ["# PageIndex pilot tree preview", "", "Generated from the final Wave 1 full-tree source manifest. Page ranges are PDF pages.", ""]
    any_errors = False

    def add_preview(nodes: list[Any], depth: int = 0) -> None:
        for node in nodes:
            if not isinstance(node, dict):
                continue
            title = str(node.get("title", "[untitled]"))
            start = node.get("start_index")
            end = node.get("end_index")
            page_index = node.get("page_index")
            locator = f"pp. {start}-{end}" if isinstance(start, int) and isinstance(end, int) else f"p. {page_index}" if isinstance(page_index, int) else "page unavailable"
            preview.append(f"{'  ' * depth}- {title} ({locator})")
            nested = node.get("nodes")
            if isinstance(nested, list):
                add_preview(nested, depth + 1)

    for document in documents:
        export_file = export_path / f"{document['documentId']}.tree.json"
        if not export_file.is_file():
            any_errors = True
            report["documents"].append({"documentId": document["documentId"], "valid": False, "errors": ["Tree export is missing."]})
            continue
        export = read_json(export_file)
        identity_errors = []
        for field in ("documentId", "sourceUrl", "contentHash"):
            if export.get(field) != document[field]:
                identity_errors.append(f"Export {field} does not match the final source manifest.")
        tree = export.get("tree")
        if not isinstance(tree, list):
            identity_errors.append("Export tree is not a list.")
            nodes, tree_errors = [], []
        else:
            nodes, tree_errors = walk_nodes(tree, document["expectedPageCount"])
        node_ids = [node.get("node_id") for node in nodes if isinstance(node.get("node_id"), str)]
        duplicate_ids = sorted({node_id for node_id in node_ids if node_ids.count(node_id) > 1})
        if duplicate_ids:
            tree_errors.append(f"Duplicate node IDs: {', '.join(duplicate_ids)}")
        errors = identity_errors + tree_errors
        valid = not errors and bool(nodes)
        any_errors = any_errors or not valid
        report["documents"].append({
            "documentId": document["documentId"],
            "citationId": document["citationId"],
            "pageIndexDocumentId": export.get("pageIndexDocumentId"),
            "expectedPageCount": document["expectedPageCount"],
            "nodeCount": len(nodes),
            "valid": valid,
            "errors": errors,
        })
        preview.extend([f"## {document['label']}", ""])
        if isinstance(tree, list):
            add_preview(tree)
        preview.append("")

    export_path.mkdir(parents=True, exist_ok=True)
    (export_path / "pilot-tree-validation.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (export_path / "pilot-tree-preview.md").write_text("\n".join(preview) + "\n", encoding="utf-8")
    print(f"Structural validation report: {export_path / 'pilot-tree-validation.json'}")
    print(f"Visual tree preview: {export_path / 'pilot-tree-preview.md'}")
    if any_errors:
        raise RuntimeError("One or more pilot tree exports failed structural validation.")


def export_completed_local_trees(
    documents: list[dict[str, Any]],
    storage_path: Path,
    export_path: Path,
    cache_path: Path,
) -> None:
    """Export already completed SDK-local trees without another LLM call.

    The current Windows SDK starts a local worker which can outlive its caller.
    The SDK storage manifest is the authoritative completion record, so this
    recovery/export operation is deterministic and token-free.
    """
    sdk_manifest_path = storage_path / "manifest.json"
    if not sdk_manifest_path.exists():
        raise FileNotFoundError("No local PageIndex manifest exists yet; run with --execute first.")
    sdk_docs = read_json(sdk_manifest_path).get("docs", {})
    export_path.mkdir(parents=True, exist_ok=True)
    cache = load_cache(cache_path)

    for document in documents:
        candidates = [
            item for item in sdk_docs.values()
            if item.get("status") == "completed"
            and (item.get("metadata") or {}).get("healthwiseDocumentId") == document["documentId"]
            and (item.get("metadata") or {}).get("contentHash") == document["contentHash"]
        ]
        if not candidates:
            raise RuntimeError(f"No completed local PageIndex tree for {document['label']}")
        # Prefer the first completed copy if a prior interrupted caller made a
        # duplicate filename. All candidates have the same pinned source hash.
        selected = min(candidates, key=lambda item: item.get("createdAt", ""))
        pageindex_doc_id = selected["id"]
        tree_path = storage_path / "docs" / pageindex_doc_id / "tree.json"
        tree = read_json(tree_path)
        if not isinstance(tree, list):
            raise ValueError(f"Unexpected tree format for {document['label']}")

        export = {
            "schemaVersion": "1.0",
            "documentId": document["documentId"],
            "pageIndexDocumentId": pageindex_doc_id,
            "sourceUrl": document["sourceUrl"],
            "citationIds": document["citationIds"],
            "contentHash": document["contentHash"],
            "focusSections": document["focusSections"],
            "generatedAt": selected.get("createdAt"),
            "pageCount": selected.get("pageNum"),
            "tree": tree,
        }
        export_file = export_path / f"{document['documentId']}.tree.json"
        export_file.write_text(json.dumps(export, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        cache["documents"][document["documentId"]] = {
            "contentHash": document["contentHash"],
            "pageIndexDocumentId": pageindex_doc_id,
            "treePath": export_file.relative_to(ROOT).as_posix(),
            "generatedAt": selected.get("createdAt"),
            "pageCount": selected.get("pageNum"),
        }
        print(f"Exported completed tree: {document['label']}")

    cache_path.write_text(json.dumps(cache, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--execute", action="store_true", help="Build trees; without this flag only validate the pilot.")
    parser.add_argument("--export-existing", action="store_true", help="Export completed local SDK trees without calling an LLM.")
    parser.add_argument("--force", action="store_true", help="Rebuild documents even if their checksum is already cached.")
    parser.add_argument("--validate", action="store_true", help="Validate and preview existing exported trees without calling an LLM.")
    parser.add_argument("--all", action="store_true", help="Use every approved full_tree document in the active Wave 1 tier manifest.")
    parser.add_argument("--cooldown-seconds", type=int, help="Seconds to wait between newly indexed documents; defaults to pageindex-pilot.json.")
    args = parser.parse_args()

    pilot, documents = load_pilot_documents(include_all=args.all)
    cooldown_seconds = pilot.get("cooldownSeconds", 30) if args.cooldown_seconds is None else args.cooldown_seconds
    if cooldown_seconds < 0:
        raise ValueError("--cooldown-seconds cannot be negative.")
    storage_path = ROOT / pilot["storagePath"]
    export_path = ROOT / pilot["treeExportPath"]
    cache_path = export_path / "index-manifest.json"
    cache = load_cache(cache_path)

    selection = "all approved Wave 1 full-tree" if args.all else "pilot"
    print(f"Validated {len(documents)} {selection} PDFs. Local PageIndex storage: {storage_path}")
    for document in documents:
        cached = cache["documents"].get(document["documentId"])
        state = "cached" if cached and cached.get("contentHash") == document["contentHash"] else "ready"
        print(f"- {document['label']}: {document['filePath'].name} ({state})")

    if args.export_existing:
        export_completed_local_trees(documents, storage_path, export_path, cache_path)
        validate_and_preview_exports(documents, export_path)
        return 0

    if args.validate:
        validate_and_preview_exports(documents, export_path)
        return 0

    if not args.execute:
        print("Dry run only. Re-run with --execute to call the index LLM and build trees.")
        return 0

    # The dedicated ingestion environment has its own dependencies. Load the
    # existing local secret without printing it or placing it in any JSON file.
    from dotenv import load_dotenv
    from pageindex import PageIndexClient
    from pageindex.errors import PageIndexAPIError

    load_dotenv(BACKEND_ENV_PATH)
    if not os.environ.get("OPENAI_API_KEY"):
        print("OPENAI_API_KEY is required for local PageIndex indexing. Set it in health-ai-backend/.env.", file=sys.stderr)
        return 2

    storage_path.mkdir(parents=True, exist_ok=True)
    export_path.mkdir(parents=True, exist_ok=True)
    client = PageIndexClient(
        mode=pilot["mode"],
        index_model=INDEX_MODEL,
        storage_path=str(storage_path),
    )

    batch_report_path = export_path / "batch-build-report.json"
    batch_report: dict[str, Any] = {
        "schemaVersion": "1.0",
        "generatedAt": datetime.now(UTC).isoformat(),
        "indexModel": INDEX_MODEL,
        "documents": [],
    }
    failed_documents: list[str] = []

    for document in documents:
        previous = cache["documents"].get(document["documentId"])
        if previous and previous.get("contentHash") == document["contentHash"] and not args.force:
            print(f"Skipping unchanged cached tree: {document['label']}")
            batch_report["documents"].append({
                "documentId": document["documentId"],
                "citationId": document["citationId"],
                "status": "cached",
            })
            continue

        try:
            result, indexing_mode, recovery_failures = submit_with_recovery(
                client, document, pilot, PageIndexAPIError,
            )
        except RateLimitPause as error:
            batch_report["documents"].append({
                "documentId": document["documentId"],
                "citationId": document["citationId"],
                "status": "paused_rate_limited",
                "error": str(error),
            })
            batch_report_path.write_text(json.dumps(batch_report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            print(f"OpenAI TPM limit reached. Batch paused safely; resume after at least 60 seconds. See {batch_report_path}.", file=sys.stderr)
            return 75
        except PageIndexAPIError as error:
            failed_documents.append(document["label"])
            batch_report["documents"].append({
                "documentId": document["documentId"],
                "citationId": document["citationId"],
                "status": "failed",
                "error": str(error),
            })
            batch_report_path.write_text(json.dumps(batch_report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            print(f"Failed after recovery attempts; continuing batch: {document['label']}", file=sys.stderr)
            continue
        pageindex_doc_id = result["doc_id"]
        structure = client.get_document_structure(pageindex_doc_id)
        tree_result = client.get_tree(pageindex_doc_id, node_summary=True, include_text=False)
        if tree_result.get("status") != "completed":
            raise RuntimeError(f"PageIndex did not finish {document['label']}: {tree_result}")

        export = {
            "schemaVersion": "1.0",
            "documentId": document["documentId"],
            "pageIndexDocumentId": pageindex_doc_id,
            "sourceUrl": document["sourceUrl"],
            "citationIds": document["citationIds"],
            "contentHash": document["contentHash"],
            "focusSections": document["focusSections"],
            "generatedAt": datetime.now(UTC).isoformat(),
            "indexingMode": indexing_mode,
            "tree": tree_result["result"],
            "structure": structure,
        }
        export_file = export_path / f"{document['documentId']}.tree.json"
        export_file.write_text(json.dumps(export, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        cache["documents"][document["documentId"]] = {
            "contentHash": document["contentHash"],
            "pageIndexDocumentId": pageindex_doc_id,
            "treePath": export_file.relative_to(ROOT).as_posix(),
            "generatedAt": export["generatedAt"],
            "indexingMode": indexing_mode,
        }
        cache_path.write_text(json.dumps(cache, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        batch_report["documents"].append({
            "documentId": document["documentId"],
            "citationId": document["citationId"],
            "status": "indexed",
            "indexingMode": indexing_mode,
            "recoveryFailures": recovery_failures,
        })
        batch_report_path.write_text(json.dumps(batch_report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"Indexed and exported: {document['label']}")
        if cooldown_seconds and document is not documents[-1]:
            print(f"Cooling down for {cooldown_seconds} seconds to stay below the OpenAI TPM limit.")
            time.sleep(cooldown_seconds)

    batch_report_path.write_text(json.dumps(batch_report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    if failed_documents:
        print(f"Batch completed with {len(failed_documents)} unresolved document(s). See {batch_report_path}.", file=sys.stderr)
        return 1
    validate_and_preview_exports(documents, export_path)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
