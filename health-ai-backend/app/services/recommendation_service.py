"""Use case for producing laboratory test recommendations."""

import logging
from functools import lru_cache

from app.graph.workflow import build_recommendation_graph
from app.schemas.questionnaire import QuestionnaireRequest
from app.schemas.response import RecommendationResponse

logger = logging.getLogger(__name__)


class RecommendationService:
    """Coordinates questionnaire validation with the compiled LangGraph workflow."""

    def __init__(self) -> None:
        """Compile the immutable recommendation workflow once for this service."""

        self._graph = build_recommendation_graph()

    async def recommend(self, questionnaire: QuestionnaireRequest) -> RecommendationResponse:
        """Generate a frontend-compatible test recommendation response.

        Raises:
            RuntimeError: If the workflow completes without a valid final response.
        """

        if not isinstance(questionnaire, QuestionnaireRequest):
            raise TypeError("questionnaire must be a QuestionnaireRequest")
        logger.info("Generating recommendations for age=%d, sex=%s", questionnaire.stage1.age, questionnaire.stage1.sex)
        result = await self._graph.ainvoke({"questionnaire": questionnaire.as_clinical_context()})
        final_result = result.get("final_result")
        if not isinstance(final_result, RecommendationResponse):
            raise RuntimeError("Recommendation workflow returned no valid final result")
        return final_result


@lru_cache
def get_recommendation_service() -> RecommendationService:
    """Provide a cached service instance for FastAPI dependency injection."""

    return RecommendationService()
