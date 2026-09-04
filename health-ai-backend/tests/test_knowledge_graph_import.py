"""Offline validation tests for the curated Neo4j import bundle."""

from pathlib import Path

from app.knowledge_graph.importer import load_and_validate_bundle


PROJECT_ROOT = Path(__file__).resolve().parents[2]


def test_wave_one_bundle_is_cross_file_compatible() -> None:
    bundle = load_and_validate_bundle(PROJECT_ROOT)

    assert len(bundle.catalogue["symptoms"]) == 150
    assert len(bundle.catalogue["termsRequiringSeparateModeling"]) == 11
    assert len(bundle.registry["conditions"]) == 35
    assert len(bundle.evidence["records"]) == 35


def test_wave_one_has_no_direct_symptom_to_condition_evidence_links() -> None:
    bundle = load_and_validate_bundle(PROJECT_ROOT)

    assert all(not record["supportedPattern"]["symptomIds"] for record in bundle.evidence["records"])
