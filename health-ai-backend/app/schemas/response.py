"""Response contracts consumed by the React frontend."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class TestRecommendation(BaseModel):
    """One clinically relevant laboratory investigation."""

    model_config = ConfigDict(extra="forbid")
    test_name: str = Field(min_length=2, max_length=160)
    category: str = Field(min_length=2, max_length=100)
    priority: Literal["high", "medium", "low"]
    # Rule identifiers such as "diabetes" and "asthma" are valid rationales.
    reason_from_rules: str = Field(min_length=1, max_length=700)
    personalized_explanation: str = Field(min_length=10, max_length=700)

    @field_validator("test_name", "category", "reason_from_rules", "personalized_explanation")
    @classmethod
    def strip_text(cls, value: str) -> str:
        """Normalize model-generated prose and reject empty values."""

        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Text fields cannot be blank")
        return cleaned


class RecommendationResponse(BaseModel):
    """The fixed response schema exposed by the API."""

    model_config = ConfigDict(extra="forbid")
    summary: str = Field(min_length=10, max_length=1500)
    recommendations: list[TestRecommendation] = Field(min_length=1, max_length=20)

    @field_validator("recommendations", mode="before")
    @classmethod
    def supply_preventive_option_when_model_returns_none(cls, value: object) -> object:
        """Keep low-risk questionnaires usable when an LLM returns an empty list.

        The frontend and persistence flow expect at least one recommendation.  An
        empty list is therefore represented by a deliberately low-priority,
        clinician-guided preventive option rather than an API validation failure.
        """

        if value == []:
            return [
                {
                    "test_name": "Routine preventive health screening review",
                    "category": "Preventive care",
                    "priority": "low",
                    "reason_from_rules": "no specific risk factors reported",
                    "personalized_explanation": (
                        "No targeted laboratory test was identified from the provided "
                        "answers. Discuss routine age-appropriate screening with a clinician."
                    ),
                }
            ]
        return value
