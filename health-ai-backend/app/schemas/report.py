"""Request, graph, and fixed frontend contracts for laboratory report analysis."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.questionnaire import QuestionnaireRequest


ParameterStatus = Literal["Normal", "High", "Low", "Critical"]


class LaboratoryParameter(BaseModel):
    """A measurable laboratory parameter extracted from anonymized report Markdown."""

    model_config = ConfigDict(extra="forbid")

    parameter: str = Field(min_length=1, max_length=180)
    value: float | str
    unit: str = Field(default="", max_length=80)
    reference_low: float | None = None
    reference_high: float | None = None
    status: ParameterStatus

    @field_validator("parameter", "unit")
    @classmethod
    def strip_text(cls, value: str) -> str:
        """Normalize text values emitted by the extraction model."""

        return value.strip()


class ExtractedReport(BaseModel):
    """Structured, non-interpretive output of the report extractor."""

    model_config = ConfigDict(extra="forbid")

    report_type: str = Field(min_length=2, max_length=160)
    parameters: list[LaboratoryParameter] = Field(min_length=1, max_length=300)


class OverallStatus(BaseModel):
    """High-level review state shown by the frontend."""

    model_config = ConfigDict(extra="forbid")

    level: Literal["normal", "warning", "critical"]
    title: str = Field(min_length=2, max_length=100)


class AbnormalFinding(BaseModel):
    """A user-facing abnormal result grounded in an extracted parameter."""

    model_config = ConfigDict(extra="forbid")

    parameter: str = Field(min_length=1, max_length=180)
    value: str = Field(min_length=1, max_length=120)
    reference_range: str = Field(min_length=1, max_length=160)
    status: Literal["High", "Low", "Critical"]
    severity: Literal["Mild", "Moderate", "High"]
    explanation: str = Field(min_length=8, max_length=700)


class LifestyleRecommendations(BaseModel):
    """Lifestyle guidance grouped into continuation and improvement actions."""

    model_config = ConfigDict(extra="forbid")

    continue_: list[str] = Field(default_factory=list, alias="continue", max_length=10)
    improve: list[str] = Field(default_factory=list, max_length=10)


class DoctorConsultation(BaseModel):
    """Cautious recommendation about medical follow-up."""

    model_config = ConfigDict(extra="forbid")

    recommended: bool
    urgency: str = Field(min_length=2, max_length=100)
    reason: str = Field(min_length=8, max_length=700)


class ReportAnalysisResponse(BaseModel):
    """Exact final response contract for the laboratory-report frontend."""

    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    overall_status: OverallStatus
    summary: str = Field(min_length=10, max_length=1500)
    abnormal_findings: list[AbnormalFinding] = Field(default_factory=list, max_length=100)
    normal_findings: list[str] = Field(default_factory=list, max_length=300)
    lifestyle_recommendations: LifestyleRecommendations
    doctor_consultation: DoctorConsultation
    disclaimer: str = Field(min_length=20, max_length=500)


class ReportAnalysisUploadRequest(BaseModel):
    """Internal validated payload built from the multipart report upload."""

    model_config = ConfigDict(extra="forbid")

    report_filename: str = Field(min_length=5, max_length=255)
    report_pdf: bytes = Field(min_length=5)
    questionnaire: QuestionnaireRequest

    @field_validator("report_filename")
    @classmethod
    def ensure_pdf_filename(cls, value: str) -> str:
        """Require a PDF filename without accepting a filesystem path."""

        cleaned = value.strip()
        if not cleaned.lower().endswith(".pdf") or "/" in cleaned or "\\" in cleaned:
            raise ValueError("report_file must have a safe .pdf filename")
        return cleaned

    @field_validator("report_pdf")
    @classmethod
    def ensure_pdf_signature(cls, value: bytes) -> bytes:
        """Reject files that do not begin with the PDF magic header."""

        if not value.startswith(b"%PDF-"):
            raise ValueError("report_file must be a valid PDF")
        return value
