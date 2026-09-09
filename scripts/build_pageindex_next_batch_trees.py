"""Build and validate PageIndex trees for approved Wave 1 slices and rendered PDFs.

Default mode builds only the three-document slice pilot. Add --all to process
all 31 sources in source-tiering.wave1.pageindex-next-batch.json. The script
is offline from the application, never receives patient data, and requires
--execute before invoking the PageIndex/OpenAI indexing model.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from build_pageindex_pilot import INDEX_MODEL, RateLimitPause, sha256, submit_with_recovery, walk_nodes


ROOT = Path(__file__).resolve().parent.parent
WAVE_ROOT = ROOT / "knowledge-sources" / "wave1"
MANIFEST_PATH = WAVE_ROOT / "source-tiering.wave1.pageindex-next-batch.json"
PILOT_PATH = WAVE_ROOT / "pageindex-next-batch-pilot.json"
BACKEND_ENV_PATH = ROOT / "health-ai-backend" / ".env"


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def select_documents(use_all: bool) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    manifest = read_json(MANIFEST_PATH)
    pilot = read_json(PILOT_PATH)
    if pilot.get("indexModel") != INDEX_MODEL or pilot.get("indexingMode") != "standard":
        raise ValueError("The next-batch PageIndex configuration must use gpt-4o-mini and standard mode.")
    records_by_id = {record["documentId"]: record for record in manifest["records"]}
    selected = manifest["records"] if use_all else [records_by_id[item["documentId"]] for item in pilot["documents"]]
    labels = {item["documentId"]: item["label"] for item in pilot["documents"]}
    prepared: list[dict[str, Any]] = []
    for record in selected:
        local_path = ROOT / record["localPath"]
        if not local_path.is_file() or not local_path.read_bytes().startswith(b"%PDF-"):
            raise ValueError(f"PageIndex input is missing or not a PDF: {local_path}")
        if sha256(local_path) != record["contentHash"]:
            raise ValueError(f"PDF checksum mismatch: {local_path.name}")
        prepared.append({
            **record,
            "filePath": local_path,
            "label": labels.get(record["documentId"], record["title"]),
            "focusSections": [],
        })
    return pilot, prepared


def load_cache(path: Path) -> dict[str, Any]:
    return read_json(path) if path.exists() else {"schemaVersion": "1.0", "documents": {}}


def validate_exports(documents: list[dict[str, Any]], export_path: Path) -> None:
    report = {"schemaVersion": "1.0", "validatedAt": datetime.now(UTC).isoformat(), "documents": []}
    preview = ["# PageIndex next-batch tree preview", ""]
    errors_found = False
    for document in documents:
        tree_path = export_path / f"{document['documentId']}.tree.json"
        if not tree_path.exists():
            report["documents"].append({"documentId": document["documentId"], "valid": False, "errors": ["Tree export missing."]})
            errors_found = True
            continue
        exported = read_json(tree_path)
        errors = []
        if exported.get("contentHash") != document["contentHash"] or exported.get("citationIds") != document["citationIds"]:
            errors.append("Tree export does not match the approved manifest source identity.")
        tree = exported.get("tree", [])
        nodes, tree_errors = walk_nodes(tree, document["pageCount"]) if isinstance(tree, list) else ([], ["Tree is not a list."])
        errors.extend(tree_errors)
        report["documents"].append({"documentId": document["documentId"], "nodeCount": len(nodes), "valid": not errors and bool(nodes), "errors": errors})
        errors_found = errors_found or bool(errors) or not nodes
        preview.extend([f"## {document['label']}", ""])
        for node in nodes:
            locator = node.get("page_index")
            if locator is None:
                locator = f"{node.get('start_index', '?')}-{node.get('end_index', '?')}"
            preview.append(f"- {node.get('title', '[untitled]')} (p. {locator})")
        preview.append("")
    export_path.mkdir(parents=True, exist_ok=True)
    (export_path / "tree-validation.json").write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    (export_path / "tree-preview.md").write_text("\n".join(preview) + "\n", encoding="utf-8")
    print(f"Structural validation report: {export_path / 'tree-validation.json'}")
    print(f"Visual tree preview: {export_path / 'tree-preview.md'}")
    if errors_found:
        raise RuntimeError("One or more next-batch tree exports failed structural validation.")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--all", action="store_true", help="Process all 31 approved next-batch inputs instead of the three-document pilot.")
    parser.add_argument("--execute", action="store_true", help="Build trees; without this flag, only validates source PDFs.")
    parser.add_argument("--cooldown-seconds", type=int, help="Override the configured wait time between newly indexed documents.")
    args = parser.parse_args()
    pilot, documents = select_documents(args.all)
    export_path = ROOT / pilot["treeExportPath"]
    cache_path = export_path / "index-manifest.json"
    cache = load_cache(cache_path)
    cooldown = pilot["cooldownSeconds"] if args.cooldown_seconds is None else args.cooldown_seconds
    print(f"Validated {len(documents)} approved next-batch PDFs.")
    for document in documents:
        state = "cached" if cache["documents"].get(document["documentId"], {}).get("contentHash") == document["contentHash"] else "ready"
        print(f"- {document['label']}: {document['filePath'].name} ({state})")
    if not args.execute:
        print("Dry run only. Re-run with --execute to invoke PageIndex using gpt-4o-mini.")
        return 0

    from dotenv import load_dotenv
    from pageindex import PageIndexClient
    from pageindex.errors import PageIndexAPIError
    load_dotenv(BACKEND_ENV_PATH)
    if not os.environ.get("OPENAI_API_KEY"):
        print("OPENAI_API_KEY is required in health-ai-backend/.env.", file=sys.stderr)
        return 2
    client = PageIndexClient(mode="local", index_model=INDEX_MODEL, storage_path=str(ROOT / pilot["storagePath"]))
    export_path.mkdir(parents=True, exist_ok=True)
    failures: list[str] = []
    for document in documents:
        if cache["documents"].get(document["documentId"], {}).get("contentHash") == document["contentHash"]:
            print(f"Skipping unchanged cached tree: {document['label']}")
            continue
        try:
            result, mode, recovery_failures = submit_with_recovery(client, document, pilot, PageIndexAPIError)
        except RateLimitPause as error:
            print(f"OpenAI TPM limit reached; batch paused safely. Resume after 60 seconds. {error}", file=sys.stderr)
            return 75
        except PageIndexAPIError as error:
            print(f"Failed but continuing: {document['label']}: {error}", file=sys.stderr)
            failures.append(document["documentId"])
            continue
        pageindex_id = result["doc_id"]
        tree_result = client.get_tree(pageindex_id, node_summary=True, include_text=False)
        if tree_result.get("status") != "completed":
            failures.append(document["documentId"])
            continue
        exported = {
            "schemaVersion": "1.0", "documentId": document["documentId"], "pageIndexDocumentId": pageindex_id,
            "sourceUrl": document["sourceUrl"], "citationIds": document["citationIds"], "contentHash": document["contentHash"],
            "pageCount": document["pageCount"], "sourceTier": document["tier"], "sourceSelection": {"sourceAuditDocumentId": document["sourceAuditDocumentId"], "originalPageRanges": document["selectedOriginalPageRanges"]},
            "generatedAt": datetime.now(UTC).isoformat(), "indexingMode": mode, "tree": tree_result["result"],
        }
        output = export_path / f"{document['documentId']}.tree.json"
        output.write_text(json.dumps(exported, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        cache["documents"][document["documentId"]] = {"contentHash": document["contentHash"], "pageIndexDocumentId": pageindex_id, "treePath": output.relative_to(ROOT).as_posix(), "indexingMode": mode, "recoveryFailures": recovery_failures}
        cache_path.write_text(json.dumps(cache, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"Indexed and exported: {document['label']}")
        if cooldown and document is not documents[-1]:
            print(f"Cooling down for {cooldown} seconds.")
            time.sleep(cooldown)
    if failures:
        print(f"Batch has {len(failures)} unresolved sources: {', '.join(failures)}", file=sys.stderr)
        return 1
    validate_exports(documents, export_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
