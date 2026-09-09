"""Typed schema for clinician-reviewed Stage 4 safety rules.

Safety rules are separate from condition evidence.  They may only be evaluated
after clinical approval and never allow an LLM to decide urgency.
"""

from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import AnyUrl, BaseModel, ConfigDict, Field, model_validator


class SafetyCitation(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    citation_id: str = Field(min_length=3, alias="citationId")
    title: str = Field(min_length=3)
    url: AnyUrl
    section_title: str = Field(min_length=3, alias="sectionTitle")
    publisher: str = Field(min_length=2)
    source_type: Literal["clinical_guideline", "quality_standard"] = Field(alias="sourceType")
    published_year: int = Field(ge=1900, le=2100, alias="publishedYear")
    last_checked_at: date = Field(alias="lastCheckedAt")
    source_status: Literal["source_verified"] = Field(alias="sourceStatus")


class SafetyCriterion(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    fact_ref: str = Field(pattern=r"^stage3\.finalizedSymptomFacts\.[a-z][a-z0-9_]*$", alias="factRef")
    operator: Literal["equals", "contains_any"]
    values: list[str] = Field(min_length=1)
    required_user_confirmation: Literal[True] = Field(alias="requiredUserConfirmation")


class SafetyTriggerAlternative(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    all_of: list[SafetyCriterion] = Field(min_length=1, alias="allOf")


class SafetyDisposition(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    level: Literal["emergency_now", "urgent_same_day", "routine_clinician_review", "insufficient_information"]
    action: Literal["seek_immediate_in_person_assessment", "seek_same_day_in_person_assessment"]
    message: str = Field(min_length=20, max_length=500)
    blocks_basic_investigation_recommendations: bool = Field(alias="blocksBasicInvestigationRecommendations")


class SafetyReview(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    clinical_review_status: Literal["pending_clinical_review", "approved", "rejected"] = Field(alias="clinicalReviewStatus")
    reviewed_by: str | None = Field(alias="reviewedBy")
    reviewed_at: date | None = Field(alias="reviewedAt")
    notes: list[str] = Field(default_factory=list)


class SafetyRule(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    safety_rule_id: str = Field(pattern=r"^[a-z][a-z0-9_]+$", alias="safetyRuleId")
    title: str = Field(min_length=5)
    status: Literal["candidate", "approved", "retired"]
    runtime_eligible: bool = Field(alias="runtimeEligible")
    applies_to: Literal[
        "adults_16_and_over",
        "children_under_5",
        "pregnant_or_recently_pregnant",
        "all_ages",
    ] = Field(alias="appliesTo")
    trigger_alternatives: list[SafetyTriggerAlternative] = Field(min_length=1, alias="triggerAlternatives")
    disposition: SafetyDisposition
    citation_refs: list[str] = Field(min_length=1, alias="citationRefs")
    excluded_from_llm_evaluation: Literal[True] = Field(alias="excludedFromLlmEvaluation")
    review: SafetyReview

    @model_validator(mode="after")
    def approval_must_be_explicit(self) -> "SafetyRule":
        approved = self.status == "approved"
        review_approved = self.review.clinical_review_status == "approved"
        if approved != review_approved:
            raise ValueError("Rule status and clinical review status must agree for approval.")
        if approved and (not self.runtime_eligible or not self.review.reviewed_by or not self.review.reviewed_at):
            raise ValueError("An approved runtime rule needs reviewer identity, date, and runtime eligibility.")
        if not approved and self.runtime_eligible:
            raise ValueError("Only an approved rule may be runtime eligible.")
        return self


class SafetyRuleRegistry(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    schema_version: Literal["1.0"] = Field(alias="schemaVersion")
    purpose: str = Field(min_length=20)
    clinical_boundary: str = Field(min_length=20, alias="clinicalBoundary")
    citations: list[SafetyCitation] = Field(min_length=1)
    rules: list[SafetyRule] = Field(min_length=1)

    @model_validator(mode="after")
    def references_must_exist(self) -> "SafetyRuleRegistry":
        citation_ids = {citation.citation_id for citation in self.citations}
        rule_ids: set[str] = set()
        for rule in self.rules:
            if rule.safety_rule_id in rule_ids:
                raise ValueError(f"Duplicate safetyRuleId: {rule.safety_rule_id}")
            rule_ids.add(rule.safety_rule_id)
            missing = set(rule.citation_refs) - citation_ids
            if missing:
                raise ValueError(f"{rule.safety_rule_id} has unknown citation refs: {sorted(missing)}")
        return self
