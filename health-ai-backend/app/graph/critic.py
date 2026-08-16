"""Critic node that safety-checks and refines evaluator output."""

import json
import logging

from app.graph.prompts import CRITIC_PROMPT
from app.graph.state import RecommendationState
from app.llm.client import get_criticizer_llm
from app.llm.parser import parse_model_output
from app.schemas.response import RecommendationResponse

logger = logging.getLogger(__name__)


async def critique_recommendations(state: RecommendationState) -> RecommendationState:
    """Review evaluator recommendations against questionnaire evidence."""

    questionnaire = state.get("questionnaire")
    evaluator_result = state.get("evaluator_result")
    if not questionnaire or evaluator_result is None:
        raise ValueError("Critic requires questionnaire and evaluator results")
    prompt = CRITIC_PROMPT.replace("{questionnaire}", json.dumps(questionnaire)).replace(
        "{evaluator_output}", evaluator_result.model_dump_json()
    )
    response = await get_criticizer_llm().ainvoke(prompt)
    result = parse_model_output(response.content, RecommendationResponse)
    logger.info("Critic produced %d recommendations", len(result.recommendations))
    return {"critic_result": result}
