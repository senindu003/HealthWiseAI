"""Source-linked Stage 4 response contracts consumed by the React frontend."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class TestRecommendation(BaseModel):
    """A graph-approved basic investigation, with model prose limited to context."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    test_name: str = Field(min_length=2, max_length=160)
    category: str = Field(min_length=2, max_length=100)
    priority: Literal["high", "medium", "low"]
    reason_from_rules: str = Field(min_length=1, max_length=700)
    personalized_explanation: str = Field(min_length=10, max_length=700)
    citation_ids: list[str] = Field(min_length=1, max_length=3, alias="citationIds")
    citation_numbers: list[int] = Field(default_factory=list, max_length=3, alias="citationNumbers")
    citation_markers: list[str] = Field(default_factory=list, max_length=3, alias="citationMarkers")
    test_key: str | None = Field(default=None, min_length=3, alias="testKey")

    @field_validator("test_name", "category", "reason_from_rules", "personalized_explanation")
    @classmethod
    def strip_text(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Text fields cannot be blank")
        return cleaned


class HealthInsight(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    headline: str = Field(min_length=4, max_length=120)
    message: str = Field(min_length=20, max_length=600)
    citation_ids: list[str] = Field(min_length=1, max_length=3, alias="citationIds")
    citation_numbers: list[int] = Field(default_factory=list, max_length=3, alias="citationNumbers")
    citation_markers: list[str] = Field(default_factory=list, max_length=3, alias="citationMarkers")


class CareNavigationRecommendation(BaseModel):
    """A clinician-reviewed graph recommendation selected by stable key."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    recommendation_key: str = Field(min_length=3, alias="recommendationKey")
    headline: str = Field(min_length=2, max_length=160)
    message: str = Field(min_length=1, max_length=700)
    action: str = Field(min_length=1, max_length=400)
    priority: Literal["high", "medium", "low"] | None = None
    citation_ids: list[str] = Field(min_length=1, max_length=3, alias="citationIds")
    citation_numbers: list[int] = Field(default_factory=list, max_length=3, alias="citationNumbers")
    citation_markers: list[str] = Field(default_factory=list, max_length=3, alias="citationMarkers")


class ClinicalBoundary(BaseModel):
    """A non-diagnostic boundary copied deterministically from reviewed data."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    message: str = Field(min_length=10, max_length=700)
    citation_ids: list[str] = Field(min_length=1, max_length=3, alias="citationIds")
    citation_numbers: list[int] = Field(default_factory=list, max_length=3, alias="citationNumbers")
    citation_markers: list[str] = Field(default_factory=list, max_length=3, alias="citationMarkers")


class CitationReference(BaseModel):
    """A deduplicated, page-pinned reference rendered as ``[referenceNumber]``."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    reference_number: int = Field(ge=1, alias="referenceNumber")
    marker: str = Field(min_length=3)
    citation_id: str = Field(min_length=3, alias="citationId")
    title: str = Field(min_length=3)
    publisher: str = Field(min_length=2)
    published_year: int = Field(ge=1900, le=2100, alias="publishedYear")
    url: str = Field(min_length=8)
    section_title: str = Field(min_length=2, alias="sectionTitle")
    page_ranges: list[dict[str, int]] = Field(min_length=1, alias="pageRanges")


class RecommendationResponse(BaseModel):
    """The grounded Stage 4 API response.

    Empty test or care-navigation arrays are valid: the system must omit an
    unsupported item instead of inventing a generic replacement.
    """

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    summary: str = Field(min_length=10, max_length=1500)
    summary_citation_ids: list[str] = Field(min_length=1, max_length=3, alias="summaryCitationIds")
    summary_citation_numbers: list[int] = Field(default_factory=list, max_length=3, alias="summaryCitationNumbers")
    summary_citation_markers: list[str] = Field(default_factory=list, max_length=3, alias="summaryCitationMarkers")
    recommendations: list[TestRecommendation] = Field(default_factory=list, max_length=4)
    educational_insights: list[HealthInsight] = Field(default_factory=list, max_length=3, alias="educationalInsights")
    care_navigation_guidance: list[CareNavigationRecommendation] = Field(
        default_factory=list, max_length=3, alias="careNavigationGuidance"
    )
    clinical_boundaries: list[ClinicalBoundary] = Field(min_length=1, max_length=4, alias="clinicalBoundaries")
    references: list[CitationReference] = Field(default_factory=list)
    no_citation_supported_recommendation_available: bool = Field(
        default=False, alias="noCitationSupportedRecommendationAvailable"
    )
    validation_token: str | None = Field(default=None, alias="validationToken")
