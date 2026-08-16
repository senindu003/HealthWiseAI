"""Verifier node that grounds report analysis in extracted laboratory parameters."""

import logging
import re

from app.graph.report_prompts import REPORT_VERIFIER_PROMPT
from app.graph.report_state import ReportAnalysisState
from app.llm.client import get_optimizer_llm, invoke_structured
from app.schemas.report import AbnormalFinding, ExtractedReport, LaboratoryParameter, OverallStatus, ReportAnalysisResponse

logger = logging.getLogger(__name__)

_DISCLAIMER = "This AI-generated analysis is intended for educational purposes only and is not a substitute for professional medical advice."


def _key(value: str) -> str:
    """Create a forgiving comparison key for parameter names."""

    return re.sub(r"[^a-z0-9]+", "", value.lower())


def _display_value(parameter: LaboratoryParameter) -> str:
    """Format a report value with its original unit for the frontend contract."""

    value = f"{parameter.value:g}" if isinstance(parameter.value, float) else str(parameter.value)
    return f"{value} {parameter.unit}".strip()


def _reference_range(parameter: LaboratoryParameter) -> str:
    """Format available numeric reference limits without inventing a range."""

    if parameter.reference_low is None and parameter.reference_high is None:
        return "Not provided in report"
    low = "" if parameter.reference_low is None else f"{parameter.reference_low:g}"
    high = "" if parameter.reference_high is None else f"{parameter.reference_high:g}"
    return f"{low} – {high} {parameter.unit}".strip()


def ground_verified_response(response: ReportAnalysisResponse, extracted: ExtractedReport) -> ReportAnalysisResponse:
    """Remove hallucinated findings and canonically ground values in extraction output.

    This deterministic final gate ensures that values, reference ranges, statuses, and finding
    names shown to the user came from the extractor rather than the interpreter or verifier.
    """

    abnormal = {_key(item.parameter): item for item in extracted.parameters if item.status != "Normal"}
    normal = {_key(item.parameter): item.parameter for item in extracted.parameters if item.status == "Normal"}
    findings: list[AbnormalFinding] = []
    seen: set[str] = set()
    for finding in response.abnormal_findings:
        parameter = abnormal.get(_key(finding.parameter))
        if parameter is None or parameter.parameter in seen:
            continue
        seen.add(parameter.parameter)
        findings.append(
            AbnormalFinding(
                parameter=parameter.parameter,
                value=_display_value(parameter),
                reference_range=_reference_range(parameter),
                status=parameter.status,
                severity=finding.severity,
                explanation=finding.explanation,
            )
        )
    # Do not allow an LLM to omit an abnormal parameter it acknowledged in its own source data.
    for parameter in abnormal.values():
        if parameter.parameter not in seen:
            findings.append(
                AbnormalFinding(
                    parameter=parameter.parameter,
                    value=_display_value(parameter),
                    reference_range=_reference_range(parameter),
                    status=parameter.status,
                    severity="High" if parameter.status == "Critical" else "Moderate",
                    explanation="This result is outside the reference range shown in the laboratory report and requires clinical review.",
                )
            )
    normal_findings = [name for name in response.normal_findings if _key(name) in normal]
    if not normal_findings:
        normal_findings = list(normal.values())
    has_critical = any(item.status == "Critical" for item in abnormal.values())
    has_abnormal = bool(abnormal)
    if has_critical:
        status_update = OverallStatus(level="critical", title="Urgent Medical Review Recommended")
    elif has_abnormal:
        status_update = OverallStatus(level="warning", title="Needs Medical Review")
    else:
        status_update = OverallStatus(level="normal", title="Results Within Reported Ranges")
    consultation = response.doctor_consultation.model_copy(
        update={"recommended": has_abnormal or response.doctor_consultation.recommended}
    )
    return response.model_copy(
        update={
            "overall_status": status_update,
            "abnormal_findings": findings,
            "normal_findings": list(dict.fromkeys(normal_findings)),
            "doctor_consultation": consultation,
            "disclaimer": _DISCLAIMER,
        }
    )


async def verify_report_analysis(state: ReportAnalysisState) -> dict[str, ReportAnalysisResponse]:
    """Verify and correct interpretation claims before returning the final JSON response."""

    if not isinstance(state, ReportAnalysisState) or state.extracted_report is None or state.interpreted_response is None:
        raise ValueError("Verifier requires extracted report and interpreted response")
    prompt = REPORT_VERIFIER_PROMPT.replace("{extracted_report}", state.extracted_report.model_dump_json())
    prompt = prompt.replace("{interpreted_response}", state.interpreted_response.model_dump_json(by_alias=True))
    verified = await invoke_structured(prompt, ReportAnalysisResponse, get_optimizer_llm)
    final_response = ground_verified_response(verified, state.extracted_report)
    logger.info("Verifier returned %d grounded abnormal findings", len(final_response.abnormal_findings))
    return {"final_response": final_response}
