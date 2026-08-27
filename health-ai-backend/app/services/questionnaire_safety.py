"""Deterministic pre-LLM plausibility and safety checks for questionnaires.

The browser is not a trust boundary: a caller can bypass input attributes or
send arbitrary JSON to the API.  These checks deliberately reject values that
are impossible, outside HealthWise's supported assessment range, or clearly
inconsistent before any questionnaire content is placed in an LLM prompt.
They are not clinical diagnosis rules and must not be used to judge whether a
person's lived experience is valid.
"""

from __future__ import annotations

import re
from collections.abc import Mapping, Sequence
from typing import Any

from app.schemas.questionnaire import QuestionnaireRequest


class UnsafeQuestionnaireError(ValueError):
    """Raised when a questionnaire is unsafe or implausible for AI processing."""


_PROMPT_INJECTION_PATTERNS = (
    re.compile(r"\b(?:ignore|disregard|override) (?:all |any |the )?(?:previous|prior|above) instructions?\b", re.I),
    re.compile(r"\b(?:system prompt|developer message|jailbreak|prompt injection)\b", re.I),
    re.compile(r"\b(?:you are now|act as) (?:a |an )?(?:chatbot|assistant|system|developer)\b", re.I),
)

_ALLOWED_SEX_VALUES = {"male", "female", "prefer_not"}
_ALLOWED_PREGNANCY_VALUES = {"yes", "no", "unsure", "prefer not"}
_ALLOWED_ACTIVITY_VALUES = {"none", "1-2 days", "3-4 days", "5+ days"}
_MAX_FREE_TEXT_LENGTH = 500
_MAX_LIST_ITEMS = 40


def validate_questionnaire_for_recommendations(questionnaire: QuestionnaireRequest) -> None:
    """Reject suspicious payloads before the evaluator node and all LLM calls."""

    stage1 = questionnaire.stage1
    _require_range("Age", stage1.age, minimum=13, maximum=99)
    _require_profile_value("Height", stage1.height, minimum=80, maximum=250)
    _require_profile_value("Weight", stage1.weight, minimum=20, maximum=350)
    _require_profile_value("Average sleep hours", stage1.sleep_hours, minimum=1, maximum=18)
    _require_profile_value("Exercise duration", stage1.exercise_duration, minimum=0, maximum=300)

    if stage1.height is not None and stage1.weight is not None:
        height_metres = stage1.height / 100
        bmi = stage1.weight / (height_metres * height_metres)
        if bmi < 10 or bmi > 100:
            raise UnsafeQuestionnaireError(
                "Safety check: height and weight produce an implausible body-mass value. "
                "Please correct the measurements before continuing."
            )

    sex = stage1.sex.strip().lower()
    if sex not in _ALLOWED_SEX_VALUES:
        raise UnsafeQuestionnaireError("Safety check: select a valid biological-sex option before continuing.")
    if stage1.pregnancy is not None:
        pregnancy = stage1.pregnancy.strip().lower()
        if pregnancy not in _ALLOWED_PREGNANCY_VALUES:
            raise UnsafeQuestionnaireError("Safety check: select a valid pregnancy option before continuing.")
        if sex == "male" and pregnancy == "yes":
            raise UnsafeQuestionnaireError(
                "Safety check: pregnancy cannot be marked 'Yes' when biological sex is marked male. "
                "Please correct the questionnaire."
            )
    if stage1.physical_activity is not None and stage1.physical_activity.strip().lower() not in _ALLOWED_ACTIVITY_VALUES:
        raise UnsafeQuestionnaireError("Safety check: select a valid weekly physical-activity option before continuing.")
    if stage1.physical_activity and stage1.physical_activity.strip().lower() == "none" and (stage1.exercise_duration or 0) > 0:
        raise UnsafeQuestionnaireError(
            "Safety check: exercise duration cannot be greater than zero when weekly activity is marked 'None'. "
            "Please correct one of these answers."
        )

    if not questionnaire.stage3.selected_symptoms:
        raise UnsafeQuestionnaireError("Safety check: select at least one current symptom before requesting recommendations.")

    _validate_untrusted_text(questionnaire.as_clinical_context())


def _require_range(label: str, value: float, *, minimum: float, maximum: float) -> None:
    if not minimum <= value <= maximum:
        raise UnsafeQuestionnaireError(
            f"Safety check: {label.lower()} must be between {minimum:g} and {maximum:g} for this assessment. "
            "Please correct the questionnaire."
        )


def _require_profile_value(label: str, value: float | None, *, minimum: float, maximum: float) -> None:
    if value is None:
        raise UnsafeQuestionnaireError(
            f"Safety check: {label.lower()} is required before requesting recommendations."
        )
    _require_range(label, value, minimum=minimum, maximum=maximum)


def _validate_untrusted_text(value: Any) -> None:
    """Bound arbitrary JSON and reject instruction-like text before prompt construction."""

    if isinstance(value, str):
        if len(value) > _MAX_FREE_TEXT_LENGTH:
            raise UnsafeQuestionnaireError(
                "Safety check: a questionnaire text field is too long. Use concise health information only."
            )
        if any(pattern.search(value) for pattern in _PROMPT_INJECTION_PATTERNS):
            raise UnsafeQuestionnaireError(
                "Safety check: questionnaire answers must contain health information only, not instructions for the AI."
            )
        return
    if isinstance(value, Mapping):
        for item in value.values():
            _validate_untrusted_text(item)
        return
    if isinstance(value, Sequence) and not isinstance(value, (bytes, bytearray)):
        if len(value) > _MAX_LIST_ITEMS:
            raise UnsafeQuestionnaireError(
                "Safety check: a questionnaire list contains too many entries. Please provide only relevant health information."
            )
        for item in value:
            _validate_untrusted_text(item)
