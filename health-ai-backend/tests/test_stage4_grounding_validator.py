"""Tests for deterministic Stage 4 final-response citation validation."""

import unittest

from app.schemas.response import RecommendationResponse
from app.services.stage4_grounding_validator import Stage4GroundingValidator
from tests.test_stage4_grounded_generator import _bundle


def _response(**overrides: object) -> RecommendationResponse:
    payload = {
        "summary": "This educational review uses cited evidence and is not a diagnosis.",
        "summaryCitationIds": ["nice_ph38_1_4_1"],
        "recommendations": [{
            "testKey": "type_2_diabetes_risk_pattern_v1:hba1c", "test_name": "HbA1c", "category": "laboratory",
            "priority": "medium", "reason_from_rules": "A citation-supported starting test.",
            "personalized_explanation": "The cited blood testing information can support a clinician discussion.",
            "citationIds": ["nice_ph38_1_4_1"],
        }],
        "educationalInsights": [{
            "headline": "Risk identification", "message": "Risk identification and blood testing are discussed in the cited source.",
            "citationIds": ["nice_ph38_1_4_1"],
        }],
        "careNavigationGuidance": [{
            "recommendationKey": "type_2_diabetes_risk_pattern_v1:review", "headline": "Discuss screening with a clinician",
            "message": "Educational discussion support.", "action": "Arrange a routine review.", "priority": "medium",
            "citationIds": ["nice_ph38_1_4_1"],
        }],
        "clinicalBoundaries": [{
            "message": "This is educational support and not a diagnosis.", "citationIds": ["nice_ph38_1_4_1"],
        }],
    }
    payload.update(overrides)
    return RecommendationResponse.model_validate(payload)


class Stage4GroundingValidatorTests(unittest.TestCase):
    def test_numbers_and_deduplicates_references(self) -> None:
        result = Stage4GroundingValidator().validate(_response(), _bundle())
        self.assertEqual(result.recommendations[0].citation_numbers, [1])
        self.assertEqual(result.recommendations[0].citation_markers, ["[1]"])
        self.assertEqual(result.educational_insights[0].citation_numbers, [1])
        self.assertEqual(len(result.references), 1)
        self.assertEqual(result.references[0].reference_number, 1)
        self.assertEqual(result.references[0].marker, "[1]")
        self.assertEqual(result.references[0].publisher, "NICE")
        self.assertEqual(result.references[0].page_ranges, [{"startPage": 4, "endPage": 4}])

    def test_prunes_invalid_items_and_returns_safe_empty_result(self) -> None:
        result = Stage4GroundingValidator().validate(_response(
            recommendations=[{
                "testKey": "invented", "test_name": "Invented test", "category": "laboratory", "priority": "medium",
                "reason_from_rules": "Unsupported.", "personalized_explanation": "Unsupported item explanation.",
                "citationIds": ["invented_citation"],
            }],
            educationalInsights=[{
                "headline": "Urgent action", "message": "Seek emergency care immediately.",
                "citationIds": ["nice_ph38_1_4_1"],
            }],
            careNavigationGuidance=[],
        ), _bundle())
        self.assertTrue(result.no_citation_supported_recommendation_available)
        self.assertEqual(result.recommendations, [])
        self.assertEqual(result.educational_insights, [])
        self.assertEqual(result.summary_citation_numbers, [1])
        self.assertEqual(len(result.references), 1)

    def test_prunes_duplicate_references_on_one_item(self) -> None:
        result = Stage4GroundingValidator().validate(_response(educationalInsights=[{
            "headline": "Risk identification", "message": "Risk identification and blood testing are discussed in the cited source.",
            "citationIds": ["nice_ph38_1_4_1", "nice_ph38_1_4_1"],
        }]), _bundle())
        self.assertEqual(result.educational_insights, [])
