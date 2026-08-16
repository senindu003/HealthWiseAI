"""Evaluator node that creates an initial evidence-linked test list."""

import json
import logging

from app.graph.prompts import EVALUATOR_PROMPT
from app.graph.state import RecommendationState
from app.llm.client import get_evaluator_llm
from app.llm.parser import parse_model_output
from app.schemas.response import RecommendationResponse

logger = logging.getLogger(__name__)


async def evaluate_questionnaire(state: RecommendationState) -> RecommendationState:
    """Analyze the questionnaire with DeepSeek and write the evaluator result to state."""

    questionnaire = state.get("questionnaire")
    if not questionnaire:
        raise ValueError("Workflow state is missing questionnaire data")
    prompt = EVALUATOR_PROMPT.replace("{questionnaire}", json.dumps(questionnaire))
    response = await get_evaluator_llm().ainvoke(prompt)
    result = parse_model_output(response.content, RecommendationResponse)
    logger.info("Evaluator produced %d recommendations", len(result.recommendations))
    return {"evaluator_result": result}
