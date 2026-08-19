"""Deterministic safety checks for laboratory-report uploads.

These checks run before anonymization and before any model receives document text.
They are intentionally conservative: the report-analysis feature accepts laboratory
diagnostic reports, not general PDFs, instructions, or arbitrary documents.
"""

from __future__ import annotations

import re


class UnsafeReportError(ValueError):
    """Raised when an upload is outside the laboratory-report analysis scope."""


_LABORATORY_EVIDENCE = (
    re.compile(r"\b(?:laboratory|lab(?:oratory)? report|pathology|biochemistry|hematology|haematology|diagnostic)\b", re.I),
    re.compile(r"\b(?:result|results|reference range|reference interval|normal range|specimen|sample)\b", re.I),
    re.compile(r"\b(?:hemoglobin|haemoglobin|glucose|cholesterol|creatinine|bilirubin|platelet|leukocyte|white blood cell|red blood cell|hba1c|sodium|potassium|thyroid|tsh|alt|ast|vitamin)\b", re.I),
    re.compile(r"\b(?:mg/dl|mmol/l|g/dl|iu/l|u/l|µg/dl|ng/ml|pg/ml)\b|%", re.I),
)

_PROMPT_INJECTION_PATTERNS = (
    re.compile(r"\b(?:ignore|disregard|override) (?:all |any |the )?(?:previous|prior|above) instructions?\b", re.I),
    re.compile(r"\b(?:system prompt|developer message|jailbreak|prompt injection)\b", re.I),
    re.compile(r"\b(?:you are now|act as) (?:a |an )?(?:chatbot|assistant|system|developer)\b", re.I),
)


def validate_laboratory_report_text(markdown: str) -> None:
    """Reject non-laboratory documents and obvious instruction-injection content.

    This is a preflight classifier, not a medical judgement. It only verifies that
    the text has enough laboratory-report evidence to enter the specialised
    workflow. PDFs that are image-only or not laboratory reports receive a safe
    validation error rather than an LLM-generated response.
    """

    normalized = " ".join(markdown.split())
    if len(normalized) < 80:
        raise UnsafeReportError(
            "Safety check: this PDF does not contain enough readable laboratory-report text. "
            "Upload a text-readable laboratory diagnostic report."
        )
    if any(pattern.search(normalized) for pattern in _PROMPT_INJECTION_PATTERNS):
        raise UnsafeReportError(
            "Safety check: the uploaded document contains instructions that cannot be analysed. "
            "Upload only a laboratory diagnostic report."
        )

    has_laboratory_context = any(pattern.search(normalized) for pattern in _LABORATORY_EVIDENCE[:2])
    has_measurement_evidence = any(pattern.search(normalized) for pattern in _LABORATORY_EVIDENCE[2:])
    has_numeric_result = bool(re.search(r"\b\d+(?:\.\d+)?\b", normalized))
    if not (has_laboratory_context and has_measurement_evidence and has_numeric_result):
        raise UnsafeReportError(
            "Safety check: HealthWise AI can analyse only laboratory diagnostic-report PDFs "
            "with test results or reference ranges."
        )
