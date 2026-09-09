"""Strict, non-patient Stage 4 evidence-bundle contracts.

These models describe only curated graph records and page-pinned public-source
text. They intentionally contain no diagnosis, user information, or generated
recommendation prose.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class EvidenceCitation(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    citation_id: str = Field(min_length=3, alias="citationId")
    title: str = Field(min_length=3)
    publisher: str = Field(min_length=2)
    url: str = Field(min_length=8)
    section_title: str = Field(min_length=2, alias="sectionTitle")
    source_type: str | None = Field(default=None, alias="sourceType")
    published_year: int = Field(ge=1900, le=2100, alias="publishedYear")
    condition_ids: list[str] = Field(min_length=1, alias="conditionIds")
    evidence_ids: list[str] = Field(min_length=1, alias="evidenceIds")


class PageRange(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    start_page: int = Field(ge=1, alias="startPage")
    end_page: int = Field(ge=1, alias="endPage")

    @model_validator(mode="after")
    def ordered(self) -> "PageRange":
        if self.end_page < self.start_page:
            raise ValueError("page ranges must be ordered")
        return self


class EvidenceExcerpt(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    citation_id: str = Field(min_length=3, alias="citationId")
    condition_id: str = Field(min_length=2, alias="conditionId")
    evidence_id: str = Field(min_length=2, alias="evidenceId")
    document_id: str = Field(min_length=3, alias="documentId")
    node_id: str = Field(min_length=2, alias="nodeId")
    node_title: str = Field(min_length=1, alias="nodeTitle")
    tree_path: list[str] = Field(min_length=1, alias="treePath")
    original_page_range: PageRange = Field(alias="originalPageRange")
    source_excerpt: str = Field(min_length=1, max_length=8_000, alias="sourceExcerpt")
    excerpt_truncated: bool = Field(alias="excerptTruncated")


class GroundedBasicTest(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    test_key: str = Field(min_length=3, alias="testKey")
    test_id: str = Field(min_length=2, alias="testId")
    condition_id: str = Field(min_length=2, alias="conditionId")
    evidence_id: str = Field(min_length=2, alias="evidenceId")
    display_name: str = Field(min_length=2, alias="displayName")
    test_type: str | None = Field(default=None, alias="testType")
    priority: Literal["high", "medium", "low"] | None = None
    why: str = Field(min_length=1)
    requires_clinician_review: bool = Field(alias="requiresClinicianReview")
    citation_ids: list[str] = Field(min_length=1, alias="citationIds")


class GroundedHealthRecommendation(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    recommendation_key: str = Field(min_length=3, alias="recommendationKey")
    recommendation_id: str = Field(min_length=2, alias="recommendationId")
    condition_id: str = Field(min_length=2, alias="conditionId")
    evidence_id: str = Field(min_length=2, alias="evidenceId")
    headline: str = Field(min_length=2)
    message: str = Field(min_length=1)
    action: str = Field(min_length=1)
    priority: Literal["high", "medium", "low"] | None = None
    citation_ids: list[str] = Field(min_length=1, alias="citationIds")


class Stage4EvidenceBundle(BaseModel):
    """LLM-ready evidence only after deterministic cross-source validation."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    schema_version: Literal["1.0"] = Field(alias="schemaVersion")
    purpose: Literal["bounded_curated_stage4_evidence"]
    condition_ids: list[str] = Field(min_length=1, alias="conditionIds")
    citations: list[EvidenceCitation] = Field(min_length=1)
    excerpts: list[EvidenceExcerpt] = Field(min_length=1)
    allowed_basic_tests: list[GroundedBasicTest] = Field(alias="allowedBasicTests")
    allowed_health_recommendations: list[GroundedHealthRecommendation] = Field(alias="allowedHealthRecommendations")
    clinical_boundaries: list[str] = Field(min_length=1, alias="clinicalBoundaries")

    @model_validator(mode="after")
    def all_links_are_grounded(self) -> "Stage4EvidenceBundle":
        citation_ids = [item.citation_id for item in self.citations]
        if len(citation_ids) != len(set(citation_ids)):
            raise ValueError("citations must be unique")
        citation_set = set(citation_ids)
        condition_set = set(self.condition_ids)
        excerpt_citations = {item.citation_id for item in self.excerpts}
        if citation_set != excerpt_citations:
            raise ValueError("every bundle citation must have at least one page-pinned excerpt")
        for excerpt in self.excerpts:
            if excerpt.citation_id not in citation_set or excerpt.condition_id not in condition_set:
                raise ValueError("every excerpt must link to a selected citation and condition")
        for asset in [*self.allowed_basic_tests, *self.allowed_health_recommendations]:
            if asset.condition_id not in condition_set:
                raise ValueError("every allowed asset must link to a selected condition")
            if not set(asset.citation_ids).issubset(citation_set):
                raise ValueError("every allowed asset citation must be included in the evidence bundle")
        return self
