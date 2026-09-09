"""Offline checks for curated citation-to-PageIndex-tree mappings."""

from app.knowledge_graph.retrieval import (
    TREE_MANIFEST_PATHS,
    CuratedEvidenceRetriever,
    GraphCitation,
)


def _offline_retriever() -> CuratedEvidenceRetriever:
    # Tree selection is deliberately testable without a Neo4j connection or
    # any patient data. Live Neo4j lookup is covered by the CLI at runtime.
    retriever = object.__new__(CuratedEvidenceRetriever)
    retriever.tree_manifest_paths = TREE_MANIFEST_PATHS
    return retriever


def _citation(condition_id: str, display_name: str, evidence_id: str, citation_id: str) -> GraphCitation:
    return GraphCitation(
        condition_id=condition_id,
        condition_display_name=display_name,
        evidence_id=evidence_id,
        citation_id=citation_id,
        citation_title=citation_id,
        publisher="Offline test publisher",
        source_url=None,
        section_title=None,
        source_type=None,
        published_year=None,
        supported_claims=[],
    )


def test_psoriasis_citation_selects_pageindex_nodes() -> None:
    result = _offline_retriever().select_tree_nodes(
        [_citation("psoriasis", "Psoriasis", "psoriasis_v1", "aafp_psoriasis_recognition_management_2023")],
        "initial assessment",
    )
    assert len(result["selectedSources"]) == 1
    assert result["selectedSources"][0]["selectedNodes"]


def test_cholera_citation_selects_pageindex_nodes() -> None:
    result = _offline_retriever().select_tree_nodes(
        [_citation("cholera", "Cholera", "cholera_v1", "who_cholera_clinical_tools_2024")],
        "clinical assessment",
    )
    assert len(result["selectedSources"]) == 1
    assert result["selectedSources"][0]["tree"]["pageCount"] == 15
    assert result["selectedSources"][0]["tree"]["sourceTier"] == "full_tree"


def test_bppv_citation_selects_pageindex_nodes() -> None:
    result = _offline_retriever().select_tree_nodes(
        [_citation("benign_paroxysmal_positional_vertigo_bppv", "Benign paroxysmal positional vertigo", "bppv_v1", "aao_hnsf_bppv_executive_summary_2017")],
        "assessment diagnosis",
    )
    nodes = result["selectedSources"][0]["selectedNodes"]
    assert nodes
    assert all(node["pageLocator"]["startPage"] >= 1 for node in nodes)


def test_diabetes_slice_citation_selects_slice_tree_nodes() -> None:
    result = _offline_retriever().select_tree_nodes(
        [_citation("type_2_diabetes_risk_pattern", "Type 2 diabetes risk pattern", "type_2_diabetes_risk_adult_v1", "nice_ph38_1_4_1")],
        "risk identification",
    )
    tree = result["selectedSources"][0]["tree"]
    assert tree["sourceTier"] == "section_slice"
    assert "/next-batch/" in tree["normalizedTreePath"]
