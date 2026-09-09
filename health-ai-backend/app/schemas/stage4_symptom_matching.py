"""Strict contract for the non-diagnostic Stage 4 symptom-node selector."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, field_validator


class Stage4SymptomMatchOutput(BaseModel):
    """The LLM can select IDs, never conditions or free-text labels."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    matched_symptom_ids: list[str] = Field(
        default_factory=list,
        max_length=6,
        alias="matchedSymptomIds",
    )

    @field_validator("matched_symptom_ids")
    @classmethod
    def unique_ids(cls, values: list[str]) -> list[str]:
        if len(values) != len(set(values)):
            raise ValueError("matchedSymptomIds must not contain duplicates")
        return values
