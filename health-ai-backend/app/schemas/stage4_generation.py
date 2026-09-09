"""The only model-owned contract used by the grounded Stage 4 generator.

It contains references, not test names, condition names, source URLs, urgency
levels, diagnoses, or free-form guideline recommendations. The server resolves
references against a validated Stage4EvidenceBundle afterwards.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class GeneratedInsight(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    headline: str = Field(min_length=4, max_length=120)
    message: str = Field(min_length=20, max_length=600)
    citation_ids: list[str] = Field(min_length=1, max_length=3, alias="citationIds")


class BasicTestSelection(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    test_key: str = Field(min_length=3, alias="testKey")
    personalized_explanation: str = Field(min_length=12, max_length=500, alias="personalizedExplanation")
    citation_ids: list[str] = Field(min_length=1, max_length=3, alias="citationIds")


class CareNavigationSelection(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    recommendation_key: str = Field(min_length=3, alias="recommendationKey")
    citation_ids: list[str] = Field(min_length=1, max_length=3, alias="citationIds")


class Stage4ModelOutput(BaseModel):
    """A constrained selection/prose plan, before deterministic resolution."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    insights: list[GeneratedInsight] = Field(default_factory=list, max_length=3)
    basic_test_selections: list[BasicTestSelection] = Field(default_factory=list, max_length=4, alias="basicTestSelections")
    care_navigation_selections: list[CareNavigationSelection] = Field(
        default_factory=list, max_length=3, alias="careNavigationSelections"
    )
