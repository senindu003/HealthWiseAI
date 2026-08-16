"""Strongly typed state used by the report-analysis LangGraph."""

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.report import ExtractedReport, ReportAnalysisResponse


class ReportAnalysisState(BaseModel):
    """Data that may pass through report-analysis workflow nodes."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    anonymized_markdown: str = Field(min_length=1)
    questionnaire: dict[str, object]
    extracted_report: ExtractedReport | None = None
    interpreted_response: ReportAnalysisResponse | None = None
    final_response: ReportAnalysisResponse | None = None
