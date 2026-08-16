"""Interpreter node for cautious, questionnaire-aware report analysis."""

import json
import logging

from app.graph.report_prompts import REPORT_INTERPRETER_PROMPT
from app.graph.report_state import ReportAnalysisState
from app.llm.client import get_evaluator_llm, invoke_structured
from app.schemas.report import ReportAnalysisResponse

logger = logging.getLogger(__name__)


async def interpret_report(state: ReportAnalysisState) -> dict[str, ReportAnalysisResponse]:
    """Produce a cautious patient-facing interpretation from extracted data only."""

    if not isinstance(state, ReportAnalysisState) or state.extracted_report is None:
        raise ValueError("Interpreter requires a structured extracted report")
    prompt = REPORT_INTERPRETER_PROMPT.replace("{questionnaire}", json.dumps(state.questionnaire))
    prompt = prompt.replace("{extracted_report}", state.extracted_report.model_dump_json())
    interpreted = await invoke_structured(prompt, ReportAnalysisResponse, get_evaluator_llm)
    logger.info("Interpreter proposed %d abnormal findings", len(interpreted.abnormal_findings))
    return {"interpreted_response": interpreted}
