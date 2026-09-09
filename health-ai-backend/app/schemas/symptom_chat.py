"""Strict schemas for the six-question Stage 3 symptom clarification flow."""

from __future__ import annotations

import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.schemas.questionnaire import LifestyleProfile, MedicalHistory


MAX_CLARIFICATION_QUESTIONS = 6
# A single concern normally triggers only a few confirmations. The ceiling is
# deliberately above the current approved-rule catalogue so no active rule is
# silently dropped if a user reports several unrelated warning patterns.
MAX_SAFETY_CONFIRMATION_QUESTIONS = 32


class ModelRequest(BaseModel):
    """A visible model hint only; FastAPI always selects the real model."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)
    provider: Literal["gemini"]
    model: Literal["gemini-3.1-flash-lite"]
    client_may_override: Literal[False] = Field(alias="clientMayOverride")


class PatientContext(BaseModel):
    model_config = ConfigDict(extra="forbid")
    stage1: LifestyleProfile
    stage2: MedicalHistory


class RequestedResponse(BaseModel):
    """Fixed client declaration of the safety boundary; it is not model control."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)
    purpose: Literal["clarify_current_symptoms_only"]
    must_not_diagnose: Literal[True] = Field(alias="mustNotDiagnose")
    must_not_prescribe_medication: Literal[True] = Field(alias="mustNotPrescribeMedication")
    must_use_approved_knowledge_graph_and_citations: Literal[False] = Field(
        alias="mustUseApprovedKnowledgeGraphAndCitations"
    )
    response_format: Literal["guided_six_question_clarification"] = Field(alias="responseFormat")


class ClarificationAnswer(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)
    question_id: str = Field(min_length=3, max_length=80, alias="questionId")
    value: str | list[str]

    @field_validator("value")
    @classmethod
    def normalise_value(cls, value: str | list[str]) -> str | list[str]:
        if isinstance(value, str):
            value = " ".join(value.split())
            if not value:
                raise ValueError("an answer cannot be blank")
            return value
        cleaned = [" ".join(item.split()) for item in value if isinstance(item, str) and item.strip()]
        if not cleaned:
            raise ValueError("an answer cannot be blank")
        return cleaned


class SafetyConfirmationOption(BaseModel):
    """A display label and the fixed machine token it represents."""

    model_config = ConfigDict(extra="forbid")

    label: str = Field(min_length=2, max_length=160)
    value: str = Field(pattern=r"^[a-z0-9_]{1,80}$")


class SafetyConfirmationQuestion(BaseModel):
    """Deterministic, clinician-reviewed safety confirmation question."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: str = Field(pattern=r"^[a-z][a-z0-9_]{2,79}$")
    fact_id: str = Field(pattern=r"^[a-z][a-z0-9_]{1,79}$", alias="factId")
    question: str = Field(min_length=8, max_length=360)
    answer_type: Literal["single_choice", "multiple_choice"] = Field(alias="answerType")
    options: list[SafetyConfirmationOption] = Field(min_length=2, max_length=8)

    @model_validator(mode="after")
    def unique_option_values(self) -> "SafetyConfirmationQuestion":
        values = [option.value for option in self.options]
        if len(values) != len(set(values)):
            raise ValueError("safety confirmation option values must be unique")
        return self


class SafetyConfirmationAnswer(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    question_id: str = Field(min_length=3, max_length=80, alias="questionId")
    values: list[str] = Field(min_length=1, max_length=8)

    @field_validator("values")
    @classmethod
    def valid_tokens(cls, values: list[str]) -> list[str]:
        if any(not re.fullmatch(r"[a-z0-9_]{1,80}", value) for value in values):
            raise ValueError("safety confirmation values must be machine-readable tokens")
        if len(values) != len(set(values)):
            raise ValueError("safety confirmation values must be unique")
        return values


class SymptomChatTurnRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)
    schema_version: Literal["2.0"] = Field(alias="schemaVersion")
    request_type: Literal["symptom_clarification_plan"] = Field(alias="requestType")
    flow_step: Literal["create_plan", "complete_plan", "complete_safety_confirmation"] = Field(alias="flowStep")
    # This opaque, signed token carries the plan between requests. FastAPI does
    # not retain a conversation, answer, or safety-fact record in memory.
    plan_token: str | None = Field(default=None, min_length=40, max_length=24000, alias="planToken")
    submitted_at: datetime | None = Field(default=None, alias="submittedAt")
    model_request: ModelRequest = Field(alias="modelRequest")
    patient_context: PatientContext = Field(alias="patientContext")
    initial_concern: str | None = Field(default=None, min_length=2, max_length=1200, alias="initialConcern")
    answers: list[ClarificationAnswer] = Field(default_factory=list, max_length=MAX_CLARIFICATION_QUESTIONS)
    safety_answers: list[SafetyConfirmationAnswer] = Field(
        default_factory=list,
        max_length=MAX_SAFETY_CONFIRMATION_QUESTIONS,
        alias="safetyAnswers",
    )
    final_additional_clarification: str | None = Field(
        default=None,
        min_length=1,
        max_length=1200,
        alias="finalAdditionalClarification",
    )
    requested_response: RequestedResponse = Field(alias="requestedResponse")

    @field_validator("initial_concern")
    @classmethod
    def normalise_concern(cls, value: str | None) -> str | None:
        return " ".join(value.split()) if value else value

    @field_validator("final_additional_clarification")
    @classmethod
    def normalise_final_addition(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = " ".join(value.split())
        if not value:
            raise ValueError("a final additional clarification cannot be blank")
        return value

    @model_validator(mode="after")
    def validate_step_payload(self) -> "SymptomChatTurnRequest":
        if self.flow_step == "create_plan":
            if not self.initial_concern:
                raise ValueError("initialConcern is required when creating a clarification plan")
            if self.answers:
                raise ValueError("answers are not accepted when creating a clarification plan")
            if self.final_additional_clarification:
                raise ValueError("a final additional clarification is not accepted when creating a clarification plan")
            if self.safety_answers:
                raise ValueError("safetyAnswers are not accepted when creating a clarification plan")
        elif self.flow_step == "complete_plan":
            if not self.plan_token:
                raise ValueError("planToken is required when completing a clarification plan")
            if not self.answers:
                raise ValueError("clarification answers are required before completion")
            if self.safety_answers:
                raise ValueError("safetyAnswers are only accepted in the safety confirmation step")
        else:
            if not self.plan_token:
                raise ValueError("planToken is required when completing safety confirmation")
            if self.answers:
                raise ValueError("clarification answers are not accepted when completing safety confirmation")
            if self.final_additional_clarification:
                raise ValueError("a final additional clarification is not accepted when completing safety confirmation")
            if not self.safety_answers:
                raise ValueError("safetyAnswers are required when completing safety confirmation")
        return self


class ClarificationSummary(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)
    current_concern: str = Field(min_length=2, max_length=800, alias="currentConcern")
    onset_and_course: str | None = Field(default=None, max_length=600, alias="onsetAndCourse")
    impact_and_associated_details: str | None = Field(default=None, max_length=800, alias="impactAndAssociatedDetails")
    uncertainties: list[str] = Field(default_factory=list, max_length=6)


class ClarificationQuestion(BaseModel):
    """A constrained LLM-generated question rendered by the frontend without alteration."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)
    id: str = Field(min_length=3, max_length=80)
    question: str = Field(min_length=8, max_length=360)
    answer_type: Literal["single_choice", "multiple_choice", "short_text"] = Field(alias="answerType")
    options: list[str] = Field(default_factory=list, max_length=8)
    helper_text: str | None = Field(default=None, max_length=240, alias="helperText")

    @model_validator(mode="after")
    def validate_question_shape(self) -> "ClarificationQuestion":
        if self.answer_type == "short_text":
            if self.options:
                raise ValueError("short_text questions cannot have options")
        else:
            if len(self.options) < 2:
                raise ValueError("choice questions require at least two options")
        if len(self.options) != len(set(self.options)):
            raise ValueError("question options must be unique")
        return self


class SymptomChatPlanModelOutput(BaseModel):
    """The narrow, plan-only response that Gemini may control."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)
    assistant_intro: str = Field(min_length=12, max_length=500, alias="assistantIntro")
    clarification_plan: list[ClarificationQuestion] = Field(
        min_length=1,
        max_length=MAX_CLARIFICATION_QUESTIONS,
        alias="clarificationPlan",
    )
    clarification_summary: ClarificationSummary = Field(alias="clarificationSummary")

    @model_validator(mode="after")
    def unique_question_ids(self) -> "SymptomChatPlanModelOutput":
        ids = [item.id for item in self.clarification_plan]
        if len(ids) != len(set(ids)):
            raise ValueError("clarification question IDs must be unique")
        return self


class QuestionProgress(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    current_question_index: int = Field(ge=0, le=MAX_CLARIFICATION_QUESTIONS, alias="currentQuestionIndex")
    answered_question_count: int = Field(ge=0, le=MAX_CLARIFICATION_QUESTIONS, alias="answeredQuestionCount")
    maximum_questions: int = Field(ge=1, le=MAX_CLARIFICATION_QUESTIONS, alias="maximumQuestions")


class SymptomChatTurnResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    plan_token: str | None = Field(default=None, alias="planToken")
    stage4_approval_token: str | None = Field(default=None, alias="stage4ApprovalToken")
    assistant_message: str = Field(alias="assistantMessage")
    clarification_plan: list[ClarificationQuestion] = Field(default_factory=list, alias="clarificationPlan")
    question_progress: QuestionProgress = Field(alias="questionProgress")
    continue_allowed: bool = Field(alias="continueAllowed")
    chat_closed: bool = Field(alias="chatClosed")
    end_reason: Literal["plan_ready", "safety_confirmation_required", "six_questions_completed"] = Field(alias="endReason")
    clarification_summary: ClarificationSummary = Field(alias="clarificationSummary")
    safety_confirmation_plan: list[SafetyConfirmationQuestion] = Field(
        default_factory=list,
        alias="safetyConfirmationPlan",
    )
    finalized_symptom_facts: dict[str, dict[str, object]] = Field(
        default_factory=dict,
        alias="finalizedSymptomFacts",
    )
