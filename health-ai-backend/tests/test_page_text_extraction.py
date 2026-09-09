"""Offline checks for curated PageIndex page-text extraction."""

from __future__ import annotations

import sys
from pathlib import Path


BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.knowledge_graph.page_text_extraction import _clean_pdf_text, _original_mapping, _source_files


def run() -> None:
    sources = _source_files()
    diabetes = sources["pageindex_section_slice_www_nice_org_uk_guidance_ph38_chapter_recommendations_c00bacaeab4c"]
    assert diabetes.source_tier == "section_slice"
    assert _original_mapping(diabetes, 1) == 1
    assert _original_mapping(diabetes, 2) == 3
    assert _original_mapping(diabetes, 6) == 9
    assert diabetes.local_pdf.is_file()
    assert diabetes.original_pdf.is_file()

    full_tree = sources["full_tree_aafp_varicose_veins_2019"]
    assert full_tree.source_tier == "full_tree"
    assert _original_mapping(full_tree, 3) == 3
    assert full_tree.local_pdf.is_file()
    assert _clean_pdf_text("type\u00c2\u00a02 diabetes\u00e2\u0080\u0094test") == "type 2 diabetes—test"
    print("5 page-local extraction provenance checks passed")


if __name__ == "__main__":
    run()
