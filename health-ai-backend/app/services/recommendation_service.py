"""Use case for producing one evidence-grounded Stage 4 review."""

import logging
from functools import lru_cache

from app.knowledge_graph.safety_evaluator import (
    SafetyRuleMatched,
    get_safety_rule_evaluator,
)
from app.schemas.questionnaire import QuestionnaireRequest
from app.schemas.response import RecommendationResponse
from app.services.questionnaire_safety import validate_questionnaire_for_recommendations
from app.services.stage4_evidence_bundle_service import GroundedEvidenceUnavailableError, Stage4EvidenceBundleService
from app.services.stage4_grounding_validator import Stage4GroundingValidator
from app.services.stage4_grounded_generator import Stage4GroundedGenerator
from app.services.stage4_symptom_node_matcher import Stage4SymptomNodeMatcher
from app.services.symptom_chat_service import get_symptom_chat_service

logger = logging.getLogger(__name__)


class RecommendationService:
    """Coordinates safety validation with one bounded, grounded generator call."""

    def __init__(self) -> None:
        self._safety_evaluator = get_safety_rule_evaluator()
        self._evidence_bundle_service = Stage4EvidenceBundleService()
        self._generator = Stage4GroundedGenerator()
        self._grounding_validator = Stage4GroundingValidator()
        self._symptom_node_matcher = Stage4SymptomNodeMatcher()

    async def recommend(self, questionnaire: QuestionnaireRequest) -> RecommendationResponse:
        """Generate a frontend-compatible test recommendation response."""

        if not isinstance(questionnaire, QuestionnaireRequest):
            raise TypeError("questionnaire must be a QuestionnaireRequest")
        questionnaire = self._with_verified_finalized_safety_facts(questionnaire)
        safety_result = self._safety_evaluator.evaluate(questionnaire)
        if safety_result.blocked:
            # This happens before graph invocation, so neither an LLM nor the
            # normal recommendation workflow can produce a competing response.
            raise SafetyRuleMatched(safety_result)
        validate_questionnaire_for_recommendations(questionnaire)
        stage3_context = self._verified_stage3_context(questionnaire)
        symptom_match = await self._symptom_node_matcher.match(questionnaire, stage3_context)
        evidence_bundle = self._evidence_bundle_service.build_for_reviewed_symptom_ids(list(symptom_match.symptom_ids))
        logger.info(
            "Generating grounded Stage 4 review from %d approved symptom node(s) and %d curated evidence scope(s)",
            len(symptom_match.symptom_ids), len(evidence_bundle.condition_ids),
        )
        generated = await self._generator.generate(
            questionnaire, evidence_bundle,
            stage3_context=stage3_context,
            matched_symptom_ids=list(symptom_match.symptom_ids),
        )
        return self._grounding_validator.validate(generated, evidence_bundle)

    @staticmethod
    def _verified_stage3_context(questionnaire: QuestionnaireRequest) -> dict[str, object]:
        stage3_extra = questionnaire.stage3.model_extra or {}
        approval_token = stage3_extra.get("symptomChatApprovalToken")
        if not isinstance(approval_token, str) or not approval_token:
            raise GroundedEvidenceUnavailableError(
                "Stage 4 requires an approved Stage 3 clarification before matching graph symptom nodes."
            )
        return get_symptom_chat_service().stage3_context_from_approval(approval_token, questionnaire)

    @staticmethod
    def _with_verified_finalized_safety_facts(questionnaire: QuestionnaireRequest) -> QuestionnaireRequest:
        """Bind Stage 4 to a signed, stateless Stage 3 completion receipt.

        Browser-supplied facts are always replaced with facts decoded from the
        short-lived HMAC receipt. No FastAPI process memory or patient session
        store is required.
        """

        stage3_extra = questionnaire.stage3.model_extra or {}
        approval_token = stage3_extra.get("symptomChatApprovalToken")
        if not isinstance(approval_token, str) or not approval_token:
            if any(key in stage3_extra for key in ("currentConcern", "chatHistory", "symptomChatCompletion")):
                raise ValueError(
                    "Safety check: Stage 3 must be approved by FastAPI before requesting the review. "
                    "Please complete the clarification questions again."
                )
            return questionnaire
        finalized_facts = get_symptom_chat_service().finalized_facts_from_approval(
            approval_token, questionnaire
        )
        payload = questionnaire.model_dump(by_alias=True, mode="json")
        payload["stage3"]["finalizedSymptomFacts"] = finalized_facts
        return QuestionnaireRequest.model_validate(payload)


@lru_cache
def get_recommendation_service() -> RecommendationService:
    """Provide a cached service instance for FastAPI dependency injection."""

    return RecommendationService()
