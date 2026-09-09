"""Regression tests for the one-call, bounded Stage 4 generator."""

import unittest

from app.schemas.questionnaire import QuestionnaireRequest
from app.schemas.stage4_evidence import Stage4EvidenceBundle
from app.schemas.stage4_generation import Stage4ModelOutput
from app.services.stage4_grounded_generator import GroundedGenerationError, Stage4GroundedGenerator


def _questionnaire() -> QuestionnaireRequest:
    return QuestionnaireRequest.model_validate({
        "stage1": {"age": 32, "sex": "female", "height": 165, "weight": 62, "sleepHours": 7},
        "stage2": {"medications": [], "allergies": []},
        "stage3": {"selectedSymptoms": ["fatigue"]},
    })


def _bundle() -> Stage4EvidenceBundle:
    return Stage4EvidenceBundle.model_validate({
        "schemaVersion": "1.0",
        "purpose": "bounded_curated_stage4_evidence",
        "conditionIds": ["type_2_diabetes_risk_pattern"],
        "citations": [{
            "citationId": "nice_ph38_1_4_1", "title": "Type 2 diabetes prevention guidance",
            "publisher": "NICE",
            "url": "https://example.test/guidance", "sectionTitle": "Risk identification",
            "sourceType": "clinical_guideline", "publishedYear": 2012,
            "conditionIds": ["type_2_diabetes_risk_pattern"], "evidenceIds": ["type_2_diabetes_risk_pattern_v1"],
        }],
        "excerpts": [{
            "citationId": "nice_ph38_1_4_1", "conditionId": "type_2_diabetes_risk_pattern",
            "evidenceId": "type_2_diabetes_risk_pattern_v1", "documentId": "diabetes_source",
            "nodeId": "node_1", "nodeTitle": "Risk identification", "treePath": ["Risk identification"],
            "originalPageRange": {"startPage": 4, "endPage": 4},
            "sourceExcerpt": "The cited source discusses appropriate risk identification and blood testing.",
            "excerptTruncated": False,
        }],
        "allowedBasicTests": [{
            "testKey": "type_2_diabetes_risk_pattern_v1:hba1c", "testId": "hba1c",
            "conditionId": "type_2_diabetes_risk_pattern", "evidenceId": "type_2_diabetes_risk_pattern_v1",
            "displayName": "HbA1c", "testType": "laboratory", "priority": "medium",
            "why": "A citation-supported starting test.", "requiresClinicianReview": True,
            "citationIds": ["nice_ph38_1_4_1"],
        }],
        "allowedHealthRecommendations": [{
            "recommendationKey": "type_2_diabetes_risk_pattern_v1:review", "recommendationId": "review",
            "conditionId": "type_2_diabetes_risk_pattern", "evidenceId": "type_2_diabetes_risk_pattern_v1",
            "headline": "Discuss screening with a clinician", "message": "Educational discussion support.",
            "action": "Arrange a routine review.", "priority": "medium",
            "citationIds": ["nice_ph38_1_4_1"],
        }],
        "clinicalBoundaries": ["This is educational support and not a diagnosis."],
    })


def _invoker_for(output: Stage4ModelOutput):
    async def invoke(prompt: str, schema: type[Stage4ModelOutput], factory: object) -> Stage4ModelOutput:
        assert "<evidenceBundle>" in prompt
        assert schema is Stage4ModelOutput
        return output
    return invoke


class Stage4GroundedGeneratorTests(unittest.IsolatedAsyncioTestCase):
    async def test_resolves_only_approved_assets_and_citations(self) -> None:
        output = Stage4ModelOutput.model_validate({
            "insights": [{
                "headline": "Screening discussion", "message": "The cited information can support a clinician discussion about initial screening.",
                "citationIds": ["nice_ph38_1_4_1"],
            }],
            "basicTestSelections": [{
                "testKey": "type_2_diabetes_risk_pattern_v1:hba1c",
                "personalizedExplanation": "This approved starting test can be discussed with a clinician as part of the educational review.",
                "citationIds": ["nice_ph38_1_4_1"],
            }],
            "careNavigationSelections": [{
                "recommendationKey": "type_2_diabetes_risk_pattern_v1:review",
                "citationIds": ["nice_ph38_1_4_1"],
            }],
        })
        result = await Stage4GroundedGenerator(invoker=_invoker_for(output)).generate(_questionnaire(), _bundle())
        self.assertEqual(result.recommendations[0].test_name, "HbA1c")
        self.assertEqual(result.care_navigation_guidance[0].action, "Arrange a routine review.")
        self.assertEqual(result.educational_insights[0].citation_ids, ["nice_ph38_1_4_1"])

    async def test_prunes_an_invented_test_key(self) -> None:
        output = Stage4ModelOutput.model_validate({
            "basicTestSelections": [{
                "testKey": "invented_test", "personalizedExplanation": "Discuss this with a clinician if it seems suitable.",
                "citationIds": ["nice_ph38_1_4_1"],
            }],
        })
        result = await Stage4GroundedGenerator(invoker=_invoker_for(output)).generate(_questionnaire(), _bundle())
        self.assertEqual(result.recommendations, [])

    async def test_prunes_an_urgency_claim(self) -> None:
        output = Stage4ModelOutput.model_validate({
            "insights": [{
                "headline": "Urgent action", "message": "Seek emergency care immediately.",
                "citationIds": ["nice_ph38_1_4_1"],
            }],
        })
        result = await Stage4GroundedGenerator(invoker=_invoker_for(output)).generate(_questionnaire(), _bundle())
        self.assertEqual(result.educational_insights, [])

    async def test_prunes_an_unsupported_citation(self) -> None:
        output = Stage4ModelOutput.model_validate({
            "insights": [{
                "headline": "Screening discussion", "message": "This supports a clinician discussion about screening.",
                "citationIds": ["invented_citation"],
            }],
        })
        result = await Stage4GroundedGenerator(invoker=_invoker_for(output)).generate(_questionnaire(), _bundle())
        self.assertEqual(result.educational_insights, [])
