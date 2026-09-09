"""Tests for exact-ID matching and reviewed-edge-only Stage 4 traversal."""

import unittest
from types import SimpleNamespace

from app.knowledge_graph.retrieval import GraphCitation, RuntimeSymptom
from app.schemas.questionnaire import QuestionnaireRequest
from app.schemas.stage4_symptom_matching import Stage4SymptomMatchOutput
from app.services.stage4_evidence_bundle_service import GroundedEvidenceUnavailableError, Stage4EvidenceBundleService
from app.services.stage4_symptom_node_matcher import Stage4SymptomNodeMatcher


def _questionnaire() -> QuestionnaireRequest:
    return QuestionnaireRequest.model_validate({
        "stage1": {"age": 32, "sex": "female", "height": 165, "weight": 62, "sleepHours": 7},
        "stage2": {"medications": [], "allergies": []},
        "stage3": {"selectedSymptoms": ["current_concern_reported"]},
    })


class _MatcherRetriever:
    def __init__(self, _: object) -> None:
        self.closed = False

    def list_runtime_symptoms(self) -> list[RuntimeSymptom]:
        return [
            RuntimeSymptom("headache", "Headache", ["Head pain"]),
            RuntimeSymptom("dizziness", "Dizziness", ["Feeling dizzy"]),
        ]

    def close(self) -> None:
        self.closed = True


class _ReviewedOnlyRetriever:
    def __init__(self, _: object) -> None:
        self.closed = False
        self.requested_symptoms: list[str] | None = None

    def find_reviewed_graph_citations_for_symptom_ids(self, symptoms: list[str]) -> list[GraphCitation]:
        self.requested_symptoms = symptoms
        # This represents the reviewed edge. There is intentionally no
        # candidate-edge method for the bundle to call.
        return [GraphCitation(
            condition_id="migraine", condition_display_name="Migraine", evidence_id="migraine_v1",
            citation_id="nice_migraine", citation_title="Migraine guidance", publisher="NICE",
            source_url="https://example.test/migraine", section_title="Assessment", source_type="clinical_guideline",
            published_year=2025, supported_claims=["health_recommendation"],
            clinical_boundary_json='{"message":"Educational support only; this is not a diagnosis."}',
        )]

    def create_retrieval_plan_for_citations(self, citations: list[GraphCitation], retrieval_query: str) -> dict:
        assert [item.citation_id for item in citations] == ["nice_migraine"]
        assert retrieval_query == "basic starting assessment care navigation prevention"
        return {"unindexedCitations": []}

    def find_grounded_assets_for_evidence_ids(self, evidence_ids: list[str]) -> dict:
        assert evidence_ids == ["migraine_v1"]
        return {"basicTests": [], "healthRecommendations": []}

    def close(self) -> None:
        self.closed = True


def _extract(_: dict) -> dict:
    return {"evidence": [{
        "conditionId": "migraine", "evidenceId": "migraine_v1",
        "citation": {"citationId": "nice_migraine"},
        "sourceDocument": {"documentId": "migraine_doc"},
        "selectedNodeEvidence": [{
            "nodeId": "assessment", "title": "Assessment", "treePath": ["Assessment"],
            "originalPageRange": {"startPage": 1, "endPage": 1},
            "sourceExcerpt": "A page-pinned reviewed excerpt.", "excerptTruncated": False,
        }],
    }]}


class Stage4SymptomNodeMatcherTests(unittest.IsolatedAsyncioTestCase):
    async def test_keeps_only_exact_runtime_symptom_ids(self) -> None:
        async def invoke(prompt: str, schema: object, factory: object) -> Stage4SymptomMatchOutput:
            self.assertIn('"symptomId":"headache"', prompt)
            self.assertNotIn("conditionId", prompt)
            return Stage4SymptomMatchOutput(matchedSymptomIds=["headache", "invented_symptom"])

        matcher = Stage4SymptomNodeMatcher(
            settings=SimpleNamespace(knowledge_graph_runtime_enabled=True),
            retriever_factory=lambda settings: _MatcherRetriever(settings),
            invoker=invoke,
            anonymizer=lambda text: text,
        )
        result = await matcher.match(
            _questionnaire(),
            {"initialConcern": "I have a headache", "clarificationAnswers": [], "finalAdditionalClarification": None},
        )
        self.assertEqual(result.symptom_ids, ("headache",))
        self.assertEqual(result.symptoms[0].display_name, "Headache")

    async def test_fails_closed_when_model_selects_no_allowed_id(self) -> None:
        async def invoke(_: str, __: object, ___: object) -> Stage4SymptomMatchOutput:
            return Stage4SymptomMatchOutput(matchedSymptomIds=["invented_symptom"])

        matcher = Stage4SymptomNodeMatcher(
            settings=SimpleNamespace(knowledge_graph_runtime_enabled=True),
            retriever_factory=lambda settings: _MatcherRetriever(settings),
            invoker=invoke,
            anonymizer=lambda text: text,
        )
        with self.assertRaises(GroundedEvidenceUnavailableError):
            await matcher.match(_questionnaire(), {"initialConcern": "Something unfamiliar", "clarificationAnswers": []})

    async def test_bundle_uses_only_reviewed_symptom_evidence_path(self) -> None:
        service = Stage4EvidenceBundleService(
            settings=SimpleNamespace(knowledge_graph_runtime_enabled=True),
            retriever_factory=lambda settings: _ReviewedOnlyRetriever(settings),
            extractor=_extract,
        )
        bundle = service.build_for_reviewed_symptom_ids(["headache"])
        self.assertEqual(bundle.condition_ids, ["migraine"])
        self.assertEqual(bundle.citations[0].evidence_ids, ["migraine_v1"])


if __name__ == "__main__":
    unittest.main()
