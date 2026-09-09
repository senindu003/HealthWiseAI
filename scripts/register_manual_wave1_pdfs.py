"""Register verified, manually downloaded official Wave 1 PDFs in the manifest.

The files remain in the local evidence cache. This script does not upload,
redistribute, or alter the source documents.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
MANIFEST_PATH = ROOT / "knowledge-sources" / "wave1" / "document-manifest.json"
PDF_ROOT = ROOT / "knowledge-sources" / "wave1" / "pdf"

# Each association was verified from the PDF filename, title/first-page text,
# and the corresponding official registry title.
MANUAL_FILES = {
    "www_who_int_publications_i_item_b09394_d06181da46fa": "B09394-eng.pdf",
    "www_who_int_publications_i_item_9789240111110_a2f555e25299": "9789240111110-eng.pdf",
    "www_who_int_teams_immunization_vaccines_and_biologicals_policies_position_papers_var_038f74390af6": "WER10047-567-590.pdf",
    "www_who_int_publications_i_item_who_wer_8925_265_288_38beeefd2b2f": "WER8925.PDF",
    "www_who_int_publications_i_item_9789240122529_a99600a7e89f": "9789240122529-eng.pdf",
    "www_who_int_publications_i_item_9789240103412_02dade0b4e5e": "9789240103412-eng.pdf",
    "www_who_int_publications_detail_redirect_guidelines_for_malaria_af52cc27192f": "B09514-eng.pdf",
    "www_who_int_publications_i_item_sea_cd_180_999119736b99": "B3234.pdf",
    "iris_who_int_bitstream_handle_10665_378872_9789240097759_eng_pdf_f6ee307aa8b5": "9789240097759-eng.pdf",
    "www_who_int_publications_i_item_9789240040816_0926345c65cf": "9789240040816-eng.pdf",
    "www_who_int_publications_i_item_9789240107984_efbeb65eb9ae": "9789240107984-eng.pdf",
    "www_who_int_publications_i_item_9789240022676_ece4c2515f4d": "9789240022676-eng.pdf",
    "www_who_int_publications_i_item_9789241502825_6875bb4a5037": "9789241502825_eng.pdf",
    "iris_who_int_bitstream_handle_10665_350624_9789290228905_eng_pdf_4c2ed557c4ec": "9789290228905-eng.pdf",
}


def checksum(path: Path) -> str:
    return f"sha256:{hashlib.sha256(path.read_bytes()).hexdigest()}"


def main() -> None:
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    by_id = {item["documentId"]: item for item in manifest["documents"]}

    for document_id, filename in MANUAL_FILES.items():
        document = by_id[document_id]
        path = PDF_ROOT / filename
        content = path.read_bytes()
        if not content.startswith(b"%PDF-"):
            raise ValueError(f"{filename} is not a valid PDF header")
        document.update({
            "sourceFormat": "pdf",
            "localPath": path.relative_to(ROOT).as_posix(),
            "contentHash": checksum(path),
            "status": "pdf_downloaded",
            "error": None,
            "manualImport": True,
            "manualFilename": filename,
        })

    MANIFEST_PATH.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"Registered {len(MANUAL_FILES)} manually downloaded PDFs.")


if __name__ == "__main__":
    main()
