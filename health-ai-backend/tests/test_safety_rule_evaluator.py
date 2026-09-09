"""Regression tests for deterministic Stage 4 safety-rule routing."""

import asyncio
import unittest

from fastapi import HTTPException

from app.api.routes import create_recommendations
from app.knowledge_graph.safety_evaluator import SafetyRuleMatched, get_safety_rule_evaluator
from app.schemas.questionnaire import QuestionnaireRequest
from app.schemas.symptom_chat import (
    ClarificationAnswer,
    ClarificationQuestion,
    ClarificationSummary,
    SymptomChatTurnRequest,
)
from app.services.recommendation_service import RecommendationService
from app.services.symptom_chat_service import SymptomChatService


def questionnaire_with_facts(facts: dict[str, object], *, age: int = 32) -> QuestionnaireRequest:
    return QuestionnaireRequest.model_validate(
        {
            "stage1": {
                "age": age,
                "sex": "female",
                "height": 165,
                "weight": 62,
                "pregnancy": "No",
                "physicalActivity": "3-4 days",
                "exerciseDuration": 45,
                "sleepHours": 7,
            },
            "stage2": {"medications": [], "allergies": []},
            "stage3": {
                "selectedSymptoms": ["current_concern_reported"],
                "finalizedSymptomFacts": facts,
            },
        }
    )


def confirmed(value: str | list[str], source_question_id: str = "safety_confirmation") -> dict[str, object]:
    return {
        "value": value,
        "confirmedByUser": True,
        "sourceQuestionIds": [source_question_id],
    }


class SafetyRuleEvaluatorTests(unittest.TestCase):
    def test_matches_approved_chest_pain_rule_without_llm(self) -> None:
        result = get_safety_rule_evaluator().evaluate(
            questionnaire_with_facts(
                {
                    "current_chest_pain_or_discomfort": confirmed("present"),
                    "possible_acs_feature": confirmed(["pain_over_fifteen_minutes"]),
                }
            )
        )

        self.assertTrue(result.blocked)
        self.assertEqual(
            [match.safety_rule_id for match in result.matched_rules],
            ["adult_current_chest_pain_with_possible_acs_features"],
        )
        self.assertEqual(result.as_api_detail()["code"], "SAFETY_RULE_MATCHED")

    def test_unconfirmed_fact_can_never_trigger_a_rule(self) -> None:
        result = get_safety_rule_evaluator().evaluate(
            questionnaire_with_facts(
                {
                    "current_chest_pain_or_discomfort": {
                        "value": "present",
                        "confirmedByUser": False,
                        "sourceQuestionIds": ["safety_confirmation"],
                    },
                    "possible_acs_feature": confirmed(["pain_over_fifteen_minutes"]),
                }
            )
        )

        self.assertFalse(result.blocked)
        self.assertEqual(result.matched_rules, ())

    def test_missing_required_fact_does_not_match(self) -> None:
        result = get_safety_rule_evaluator().evaluate(
            questionnaire_with_facts({"sudden_vision_loss": confirmed("present")})
        )

        self.assertFalse(result.blocked)

    def test_child_rule_respects_its_reviewed_age_scope(self) -> None:
        facts = {
            "fever": confirmed("present"),
            "non_blanching_rash": confirmed("present"),
        }
        child_result = get_safety_rule_evaluator().evaluate(
            questionnaire_with_facts(facts, age=4)
        )
        adult_result = get_safety_rule_evaluator().evaluate(
            questionnaire_with_facts(facts, age=32)
        )

        self.assertTrue(child_result.blocked)
        self.assertIn(
            "child_under_five_fever_with_non_blanching_rash",
            [match.safety_rule_id for match in child_result.matched_rules],
        )
        self.assertFalse(adult_result.blocked)

    def test_service_blocks_before_graph_invocation(self) -> None:
        class FailingGraph:
            async def ainvoke(self, _: object) -> object:
                raise AssertionError("The graph must not run after a safety-rule match")

        service = RecommendationService()
        service._graph = FailingGraph()
        flagged = questionnaire_with_facts(
            {
                "current_chest_pain_or_discomfort": confirmed("present"),
                "possible_acs_feature": confirmed(["pain_over_fifteen_minutes"]),
            }
        )

        with self.assertRaises(SafetyRuleMatched):
            asyncio.run(service.recommend(flagged))

    def test_service_allows_supported_age_safety_block_before_normal_age_rejection(self) -> None:
        service = RecommendationService()
        flagged_child = questionnaire_with_facts(
            {"fever": confirmed("present"), "non_blanching_rash": confirmed("present")},
            age=4,
        )

        with self.assertRaises(SafetyRuleMatched):
            asyncio.run(service.recommend(flagged_child))

    def test_api_returns_structured_conflict_for_a_safety_block(self) -> None:
        flagged = questionnaire_with_facts(
            {
                "current_chest_pain_or_discomfort": confirmed("present"),
                "possible_acs_feature": confirmed(["pain_over_fifteen_minutes"]),
            }
        )

        class BlockingService:
            async def recommend(self, _: QuestionnaireRequest) -> object:
                result = get_safety_rule_evaluator().evaluate(flagged)
                raise SafetyRuleMatched(result)

        with self.assertRaises(HTTPException) as raised:
            asyncio.run(create_recommendations(flagged, BlockingService()))

        self.assertEqual(raised.exception.status_code, 409)
        self.assertEqual(raised.exception.detail["code"], "SAFETY_RULE_MATCHED")
        self.assertTrue(raised.exception.detail["blocked"])

    def test_symptom_chat_captures_confirmed_safety_facts_without_another_llm_call(self) -> None:
        service = SymptomChatService()
        question = ClarificationQuestion(
            id="duration",
            question="How long has this been happening?",
            answerType="single_choice",
            options=["Today", "More than a day"],
            helperText=None,
        )
        base = {
            "schemaVersion": "2.0",
            "requestType": "symptom_clarification_plan",
            "modelRequest": {"provider": "gemini", "model": "gemini-3.1-flash-lite", "clientMayOverride": False},
            "patientContext": {
                "stage1": {"age": 32, "sex": "female", "height": 165, "weight": 62, "pregnancy": "No", "physicalActivity": "3-4 days", "exerciseDuration": 45, "sleepHours": 7},
                "stage2": {"medications": [], "allergies": []},
            },
            "requestedResponse": {"purpose": "clarify_current_symptoms_only", "mustNotDiagnose": True, "mustNotPrescribeMedication": True, "mustUseApprovedKnowledgeGraphAndCitations": False, "responseFormat": "guided_six_question_clarification"},
        }
        plan_token = service._sign(
            {
                "purpose": "clarification_plan",
                "contextHash": service._context_hash(
                    SymptomChatTurnRequest.model_validate(
                        {**base, "flowStep": "create_plan", "initialConcern": "I have chest pain and pressure."}
                    )
                ),
                "initialConcern": "I have chest pain and pressure.",
                "clarificationPlan": [question.model_dump(by_alias=True)],
                "clarificationSummary": ClarificationSummary(
                    currentConcern="I have chest pain and pressure.",
                    onsetAndCourse=None,
                    impactAndAssociatedDetails=None,
                    uncertainties=[],
                ).model_dump(by_alias=True),
            },
            300,
        )
        main_response = service._complete_plan(
            SymptomChatTurnRequest.model_validate(
                {**base, "flowStep": "complete_plan", "planToken": plan_token, "answers": [{"questionId": "duration", "value": "Today"}]}
            )
        )
        self.assertEqual(main_response.end_reason, "safety_confirmation_required")
        self.assertEqual([item.fact_id for item in main_response.safety_confirmation_plan], [
            "current_chest_pain_or_discomfort", "possible_acs_feature"
        ])
        safety_response = service._complete_safety_confirmation(
            SymptomChatTurnRequest.model_validate(
                {
                    **base,
                    "flowStep": "complete_safety_confirmation",
                    "planToken": main_response.plan_token,
                    "safetyAnswers": [
                        {"questionId": "confirm_current_chest_pain", "values": ["present"]},
                        {"questionId": "confirm_acs_features", "values": ["pain_over_fifteen_minutes"]},
                    ],
                }
            )
        )
        self.assertTrue(safety_response.continue_allowed)
        self.assertTrue(safety_response.chat_closed)
        self.assertEqual(
            safety_response.finalized_symptom_facts["current_chest_pain_or_discomfort"]["confirmedByUser"],
            True,
        )
        stage4_request = QuestionnaireRequest.model_validate(
            {
                "stage1": base["patientContext"]["stage1"],
                "stage2": base["patientContext"]["stage2"],
                "stage3": {
                    "selectedSymptoms": ["current_concern_reported"],
                    "symptomChatApprovalToken": safety_response.stage4_approval_token,
                    # This browser value is deliberately replaced by the receipt.
                    "finalizedSymptomFacts": {},
                },
            }
        )
        facts = service.finalized_facts_from_approval(
            safety_response.stage4_approval_token, stage4_request
        )
        self.assertEqual(facts, safety_response.finalized_symptom_facts)

    def test_stage4_context_must_match_the_signed_stage3_conversation(self) -> None:
        service = SymptomChatService()
        stage1 = {
            "age": 32, "sex": "female", "height": 165, "weight": 62,
            "pregnancy": "No", "physicalActivity": "3-4 days", "exerciseDuration": 45, "sleepHours": 7,
        }
        stage2 = {"medications": [], "allergies": []}
        answers = [ClarificationAnswer(questionId="headache_pattern", value="Comes and goes")]
        stage3_hash = service._stage3_context_hash("I have a headache", answers, "It started yesterday")
        request = QuestionnaireRequest.model_validate({
            "stage1": stage1,
            "stage2": stage2,
            "stage3": {
                "selectedSymptoms": ["current_concern_reported"],
                "currentConcern": "I have a headache",
                "clarificationAnswers": [item.model_dump(by_alias=True) for item in answers],
                "finalAdditionalClarification": "It started yesterday",
            },
        })
        context_hash = service._hash_value({
            "stage1": request.stage1.model_dump(by_alias=True, mode="json"),
            "stage2": request.stage2.model_dump(by_alias=True, mode="json"),
        })
        token = service._approval_token(context_hash, {}, stage3_hash)
        self.assertEqual(
            service.stage3_context_from_approval(token, request)["initialConcern"],
            "I have a headache",
        )

        altered = request.model_dump(by_alias=True)
        altered["stage3"]["currentConcern"] = "I have chest discomfort instead"
        with self.assertRaises(ValueError):
            service.stage3_context_from_approval(token, QuestionnaireRequest.model_validate(altered))


if __name__ == "__main__":
    unittest.main()
