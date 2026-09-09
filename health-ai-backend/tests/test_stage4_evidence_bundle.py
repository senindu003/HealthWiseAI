"""Tests for the deterministic Stage 4 graph-to-PDF evidence contract."""

import json
import unittest
from types import SimpleNamespace

from app.knowledge_graph.retrieval import GraphCitation
from app.services.stage4_evidence_bundle_service import (
    GroundedEvidenceUnavailableError,
    Stage4EvidenceBundleService,
)


class _Retriever:
    def __init__(self, _: object, *, unindexed: bool = False) -> None:
        self.unindexed = unindexed
        self.closed = False

    def find_graph_citations(self, _: list[str]) -> list[GraphCitation]:
        return [
            GraphCitation(
                condition_id="type_2_diabetes_risk_pattern",
                condition_display_name="Type 2 diabetes risk pattern",
                evidence_id="type_2_diabetes_risk_pattern_v1",
                citation_id="nice_ph38_1_4_1",
                citation_title="Type 2 diabetes: prevention in people at high risk",
                publisher="NICE",
                source_url="https://www.nice.org.uk/guidance/ph38",
                section_title="Risk identification",
                source_type="clinical_guideline",
                published_year=2012,
                supported_claims=["basic_starting_test"],
                clinical_boundary_json=json.dumps({"message": "Educational support only; this is not a diagnosis."}),
            )
        ]

    def create_retrieval_plan(self, _: list[str], retrieval_query: str) -> dict:
        assert retrieval_query == "basic starting assessment care navigation prevention"
        return {"unindexedCitations": [{"citationId": "nice_ph38_1_4_1"}] if self.unindexed else []}

    def find_grounded_assets(self, _: list[str]) -> dict:
        return {
            "basicTests": [{
                "testKey": "type_2_diabetes_risk_pattern_v1:hba1c",
                "testId": "hba1c",
                "conditionId": "type_2_diabetes_risk_pattern",
                "evidenceId": "type_2_diabetes_risk_pattern_v1",
                "displayName": "HbA1c",
                "testType": "laboratory",
                "priority": "medium",
                "why": "A citation-supported starting test.",
                "requiresClinicianReview": True,
                "citationIds": ["nice_ph38_1_4_1"],
            }],
            "healthRecommendations": [],
        }

    def close(self) -> None:
        self.closed = True


def _extracted(_: dict) -> dict:
    return {
        "evidence": [{
            "conditionId": "type_2_diabetes_risk_pattern",
            "evidenceId": "type_2_diabetes_risk_pattern_v1",
            "citation": {"citationId": "nice_ph38_1_4_1"},
            "sourceDocument": {"documentId": "diabetes_pdf"},
            "selectedNodeEvidence": [{
                "nodeId": "node_1", "title": "Risk identification", "treePath": ["Risk identification"],
                "originalPageRange": {"startPage": 4, "endPage": 4},
                "sourceExcerpt": "HbA1c is discussed in the cited source section.",
                "excerptTruncated": False,
            }],
        }]
    }


class Stage4EvidenceBundleTests(unittest.TestCase):
    def test_builds_only_page_pinned_graph_linked_assets(self) -> None:
        service = Stage4EvidenceBundleService(
            settings=SimpleNamespace(knowledge_graph_runtime_enabled=True),
            retriever_factory=lambda settings: _Retriever(settings),
            extractor=_extracted,
        )
        bundle = service.build_for_condition_ids(["type_2_diabetes_risk_pattern"])

        self.assertEqual(bundle.condition_ids, ["type_2_diabetes_risk_pattern"])
        self.assertEqual(bundle.citations[0].citation_id, "nice_ph38_1_4_1")
        self.assertEqual(bundle.excerpts[0].original_page_range.start_page, 4)
        self.assertEqual(bundle.allowed_basic_tests[0].citation_ids, ["nice_ph38_1_4_1"])

    def test_fails_closed_for_unindexed_citation(self) -> None:
        service = Stage4EvidenceBundleService(
            settings=SimpleNamespace(knowledge_graph_runtime_enabled=True),
            retriever_factory=lambda settings: _Retriever(settings, unindexed=True),
            extractor=_extracted,
        )
        with self.assertRaises(GroundedEvidenceUnavailableError):
            service.build_for_condition_ids(["type_2_diabetes_risk_pattern"])

    def test_fails_closed_when_runtime_is_disabled(self) -> None:
        service = Stage4EvidenceBundleService(
            settings=SimpleNamespace(knowledge_graph_runtime_enabled=False),
            retriever_factory=lambda settings: _Retriever(settings),
            extractor=_extracted,
        )
        with self.assertRaises(GroundedEvidenceUnavailableError):
            service.build_for_condition_ids(["type_2_diabetes_risk_pattern"])


if __name__ == "__main__":
    unittest.main()
