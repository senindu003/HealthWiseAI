"""Build PageIndex trees for the 11 final active Wave 1 source PDFs.

Run the manifest builder first. This script validates hashes before indexing,
uses only gpt-4o-mini in standard mode, caches completed trees, and never
receives patient data. Add --execute to permit PageIndex/OpenAI calls.
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
MANIFEST_PATH = WAVE_ROOT / "source-tiering.wave1.pageindex-final-batch.json"
CONFIG_PATH = WAVE_ROOT / "pageindex-final-batch.json"
BACKEND_ENV_PATH = ROOT / "health-ai-backend" / ".env"


def read_object(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def validate_inputs() -> tuple[dict[str, Any], list[dict[str, Any]]]:
    manifest, config = read_object(MANIFEST_PATH), read_object(CONFIG_PATH)
    if config.get("indexModel") != INDEX_MODEL or config.get("indexingMode") != "standard":
        raise ValueError("Final batch must use gpt-4o-mini in standard mode.")
    records = manifest.get("records", [])
    if len(records) != 11:
        raise ValueError(f"Final manifest must contain exactly 11 inputs, found {len(records)}")
    for record in records:
        pdf = ROOT / record["localPath"]
        if not pdf.is_file() or not pdf.read_bytes().startswith(b"%PDF-"):
            raise ValueError(f"Missing or invalid approved PDF: {pdf}")
        if sha256(pdf) != record["contentHash"]:
            raise ValueError(f"PDF checksum mismatch: {pdf.name}")
        record["filePath"] = pdf
        record["label"] = record["title"]
        record["focusSections"] = []
    return config, records


def validate_exports(documents: list[dict[str, Any]], export_path: Path) -> None:
    failures: list[str] = []
    for document in documents:
        output = export_path / f"{document['documentId']}.tree.json"
        if not output.is_file():
            failures.append(f"{document['documentId']}: missing export")
            continue
        raw = read_object(output)
        if raw.get("contentHash") != document["contentHash"] or raw.get("citationIds") != document["citationIds"]:
            failures.append(f"{document['documentId']}: source identity mismatch")
            continue
        tree = raw.get("tree", [])
        nodes, errors = walk_nodes(tree, document["pageCount"]) if isinstance(tree, list) else ([], ["tree is not a list"])
        if errors or not nodes:
            failures.append(f"{document['documentId']}: {'; '.join(errors) or 'no tree nodes'}")
    if failures:
        raise RuntimeError("Final-batch structural validation failed: " + " | ".join(failures))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--execute", action="store_true", help="Invoke PageIndex after offline validation.")
    parser.add_argument("--cooldown-seconds", type=int, help="Override configured delay between new documents.")
    args = parser.parse_args()
    config, documents = validate_inputs()
    export_path = ROOT / config["treeExportPath"]
    cache_path = export_path / "index-manifest.json"
    cache = read_object(cache_path) if cache_path.is_file() else {"schemaVersion": "1.0", "documents": {}}
    print(f"Validated {len(documents)} final active citation PDFs.")
    for document in documents:
        state = "cached" if cache["documents"].get(document["documentId"], {}).get("contentHash") == document["contentHash"] else "ready"
        print(f"- {document['citationIds'][0]}: {document['filePath'].name} ({state})")
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
    client = PageIndexClient(mode="local", index_model=INDEX_MODEL, storage_path=str(ROOT / config["storagePath"]))
    export_path.mkdir(parents=True, exist_ok=True)
    cooldown = config["cooldownSeconds"] if args.cooldown_seconds is None else args.cooldown_seconds
    failures: list[str] = []
    for index, document in enumerate(documents):
        if cache["documents"].get(document["documentId"], {}).get("contentHash") == document["contentHash"]:
            print(f"Skipping unchanged cached tree: {document['label']}")
            continue
        try:
            result, mode, recovery_failures = submit_with_recovery(client, document, config, PageIndexAPIError)
        except RateLimitPause as error:
            print(f"OpenAI TPM limit reached; resume after 60 seconds. {error}", file=sys.stderr)
            return 75
        except PageIndexAPIError as error:
            print(f"Failed but continuing: {document['label']}: {error}", file=sys.stderr)
            failures.append(document["documentId"])
            continue
        tree_result = client.get_tree(result["doc_id"], node_summary=True, include_text=False)
        if tree_result.get("status") != "completed":
            failures.append(document["documentId"])
            continue
        output = export_path / f"{document['documentId']}.tree.json"
        output.write_text(json.dumps({
            "schemaVersion": "1.0", "documentId": document["documentId"], "pageIndexDocumentId": result["doc_id"],
            "sourceUrl": document["sourceUrl"], "citationIds": document["citationIds"], "contentHash": document["contentHash"],
            "pageCount": document["pageCount"], "sourceTier": document["tier"],
            "sourceSelection": {"sourceAuditDocumentId": document["sourceAuditDocumentId"], "originalPageRanges": []},
            "generatedAt": datetime.now(UTC).isoformat(), "indexingMode": mode, "tree": tree_result["result"],
        }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        cache["documents"][document["documentId"]] = {"contentHash": document["contentHash"], "pageIndexDocumentId": result["doc_id"], "treePath": output.relative_to(ROOT).as_posix(), "indexingMode": mode, "recoveryFailures": recovery_failures}
        cache_path.write_text(json.dumps(cache, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"Indexed and exported: {document['label']}")
        if cooldown and index < len(documents) - 1:
            print(f"Cooling down for {cooldown} seconds.")
            time.sleep(cooldown)
    if failures:
        print(f"Final batch has {len(failures)} unresolved sources: {', '.join(failures)}", file=sys.stderr)
        return 1
    validate_exports(documents, export_path)
    print("Final-batch tree exports passed structural validation.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
