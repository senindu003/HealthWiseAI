"""Optimizer node that returns the final frontend response."""

import json
import logging

from app.graph.prompts import OPTIMIZER_PROMPT
from app.graph.state import RecommendationState
from app.llm.client import get_optimizer_llm, invoke_structured
from app.schemas.response import RecommendationResponse

logger = logging.getLogger(__name__)


async def optimize_recommendations(state: RecommendationState) -> RecommendationState:
    """Merge evaluator and critic findings into the final validated response."""

    questionnaire = state.get("questionnaire")
    evaluator_result = state.get("evaluator_result")
    critic_result = state.get("critic_result")
    if not questionnaire or evaluator_result is None or critic_result is None:
        raise ValueError("Optimizer requires questionnaire, evaluator, and critic results")
    prompt = OPTIMIZER_PROMPT.replace("{questionnaire}", json.dumps(questionnaire))
    prompt = prompt.replace("{evaluator_output}", evaluator_result.model_dump_json())
    prompt = prompt.replace("{critic_output}", critic_result.model_dump_json())
    result = await invoke_structured(prompt, RecommendationResponse, get_optimizer_llm)
    logger.info("Optimizer produced %d final recommendations", len(result.recommendations))
    return {"final_result": result}
