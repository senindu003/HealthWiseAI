"""Extractor node for anonymized laboratory-report Markdown."""

import logging

from app.graph.report_prompts import REPORT_EXTRACTOR_PROMPT
from app.graph.report_state import ReportAnalysisState
from app.llm.client import get_evaluator_llm, invoke_structured
from app.schemas.report import ExtractedReport

logger = logging.getLogger(__name__)


async def extract_report_parameters(state: ReportAnalysisState) -> dict[str, ExtractedReport]:
    """Extract structured laboratory parameters without performing interpretation."""

    if not isinstance(state, ReportAnalysisState) or not state.anonymized_markdown.strip():
        raise ValueError("Extractor requires anonymized report Markdown")
    prompt = REPORT_EXTRACTOR_PROMPT.replace("{markdown}", state.anonymized_markdown)
    extracted = await invoke_structured(prompt, ExtractedReport, get_evaluator_llm)
    logger.info("Extracted %d parameters from %s", len(extracted.parameters), extracted.report_type)
    return {"extracted_report": extracted}
