"""State definitions flowing through the recommendation workflow."""

from typing import TypedDict

from app.schemas.response import RecommendationResponse


class RecommendationState(TypedDict, total=False):
    """State passed between evaluator, critic, and optimizer nodes."""

    questionnaire: dict[str, object]
    evaluator_result: RecommendationResponse
    critic_result: RecommendationResponse
    final_result: RecommendationResponse
