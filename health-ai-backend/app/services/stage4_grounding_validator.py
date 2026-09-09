"""Deterministic last-mile validation for the Stage 4 public response."""

from __future__ import annotations

import re
from collections import defaultdict

from app.schemas.response import (
    CareNavigationRecommendation,
    CitationReference,
    ClinicalBoundary,
    HealthInsight,
    RecommendationResponse,
    TestRecommendation,
)
from app.schemas.stage4_evidence import EvidenceCitation, Stage4EvidenceBundle
from app.services.stage4_grounded_generator import _UNSUPPORTED_CLAIM_LANGUAGE, _URGENCY_LANGUAGE


_STOP_WORDS = frozenset({
    "about", "after", "against", "also", "and", "are", "can", "cited", "could", "discuss",
    "for", "from", "health", "identified", "information", "is", "it", "may", "of", "or",
    "review", "source", "support", "that", "the", "this", "to", "with", "your",
})


class Stage4GroundingValidator:
    """Prune invalid content and attach research-paper-style references.

    This class has no model, network, or database dependency. It validates only
    the already bounded graph/PageIndex/PDF bundle supplied for the request.
    """

    def validate(self, response: RecommendationResponse, bundle: Stage4EvidenceBundle) -> RecommendationResponse:
        citations = {item.citation_id: item for item in bundle.citations}
        excerpts = defaultdict(list)
        for excerpt in bundle.excerpts:
            excerpts[excerpt.citation_id].append(excerpt)

        valid_insights = [
            item for item in response.educational_insights
            if self._valid_free_prose(item.headline + " " + item.message, item.citation_ids, citations, excerpts)
        ]
        valid_tests = self._valid_tests(response.recommendations, bundle, citations, excerpts)
        valid_care = self._valid_care(response.care_navigation_guidance, bundle, citations, excerpts)
        valid_boundaries = self._valid_boundaries(response.clinical_boundaries, bundle, citations, excerpts)

        # The boundary list should normally be non-empty because it is sourced
        # from the validated bundle. If a malformed upstream response removed
        # it, restore only the deterministic reviewed boundary text.
        if not valid_boundaries:
            fallback_ids = sorted(citations)[:3]
            valid_boundaries = [
                ClinicalBoundary(message=message, citationIds=fallback_ids)
                for message in bundle.clinical_boundaries[:4]
                if self._valid_citation_ids(fallback_ids, citations, excerpts)
            ]

        no_supported_items = not (valid_insights or valid_tests or valid_care)
        summary_ids = self._citation_ids_in_display_order(
            valid_insights, valid_tests, valid_care, valid_boundaries, fallback=sorted(citations)[:1]
        )[:3]
        references, number_by_id = self._build_references(summary_ids, valid_insights, valid_tests, valid_care, valid_boundaries, citations, excerpts)

        if no_supported_items:
            summary = "No citation-supported recommendation is available from the retrieved evidence for this review."
        else:
            summary = "This educational review uses only the cited, clinician-reviewed source excerpts and is not a diagnosis."

        return RecommendationResponse(
            summary=summary,
            summaryCitationIds=summary_ids,
            summaryCitationNumbers=[number_by_id[citation_id] for citation_id in summary_ids],
            summaryCitationMarkers=[f"[{number_by_id[citation_id]}]" for citation_id in summary_ids],
            recommendations=[self._with_numbers(item, number_by_id) for item in valid_tests],
            educationalInsights=[self._with_numbers(item, number_by_id) for item in valid_insights],
            careNavigationGuidance=[self._with_numbers(item, number_by_id) for item in valid_care],
            clinicalBoundaries=[self._with_numbers(item, number_by_id) for item in valid_boundaries],
            references=references,
            noCitationSupportedRecommendationAvailable=no_supported_items,
        )

    def _valid_tests(self, items: list[TestRecommendation], bundle: Stage4EvidenceBundle, citations: dict[str, EvidenceCitation], excerpts: dict) -> list[TestRecommendation]:
        assets = {asset.test_key: asset for asset in bundle.allowed_basic_tests}
        valid: list[TestRecommendation] = []
        used: set[str] = set()
        for item in items:
            if not item.test_key or item.test_key in used:
                continue
            asset = assets.get(item.test_key)
            if asset is None or not asset.requires_clinician_review:
                continue
            if (item.test_name, item.category, item.priority, item.reason_from_rules) != (
                asset.display_name, asset.test_type or "Basic investigation", asset.priority or "medium", asset.why,
            ):
                continue
            if not self._valid_asset_citations(item.citation_ids, asset.citation_ids, asset.condition_id, asset.evidence_id, citations, excerpts):
                continue
            if not self._valid_free_prose(item.personalized_explanation, item.citation_ids, citations, excerpts, require_overlap=False):
                continue
            used.add(item.test_key)
            valid.append(item)
        return valid

    def _valid_care(self, items: list[CareNavigationRecommendation], bundle: Stage4EvidenceBundle, citations: dict[str, EvidenceCitation], excerpts: dict) -> list[CareNavigationRecommendation]:
        assets = {asset.recommendation_key: asset for asset in bundle.allowed_health_recommendations}
        valid: list[CareNavigationRecommendation] = []
        used: set[str] = set()
        for item in items:
            if item.recommendation_key in used:
                continue
            asset = assets.get(item.recommendation_key)
            if asset is None:
                continue
            if (item.headline, item.message, item.action, item.priority) != (
                asset.headline, asset.message, asset.action, asset.priority,
            ):
                continue
            if not self._valid_asset_citations(item.citation_ids, asset.citation_ids, asset.condition_id, asset.evidence_id, citations, excerpts):
                continue
            used.add(item.recommendation_key)
            valid.append(item)
        return valid

    def _valid_boundaries(self, items: list[ClinicalBoundary], bundle: Stage4EvidenceBundle, citations: dict[str, EvidenceCitation], excerpts: dict) -> list[ClinicalBoundary]:
        valid: list[ClinicalBoundary] = []
        used: set[str] = set()
        for item in items:
            if item.message in used or item.message not in bundle.clinical_boundaries:
                continue
            if not self._valid_citation_ids(item.citation_ids, citations, excerpts):
                continue
            used.add(item.message)
            valid.append(item)
        return valid

    def _valid_asset_citations(self, citation_ids: list[str], asset_citation_ids: list[str], condition_id: str, evidence_id: str, citations: dict[str, EvidenceCitation], excerpts: dict) -> bool:
        return (
            self._valid_citation_ids(citation_ids, citations, excerpts)
            and set(citation_ids).issubset(set(asset_citation_ids))
            and all(any(excerpt.condition_id == condition_id and excerpt.evidence_id == evidence_id for excerpt in excerpts[citation_id]) for citation_id in citation_ids)
        )

    @staticmethod
    def _valid_citation_ids(citation_ids: list[str], citations: dict[str, EvidenceCitation], excerpts: dict) -> bool:
        if not citation_ids or len(citation_ids) != len(set(citation_ids)) or not set(citation_ids).issubset(citations):
            return False
        return all(
            any(
                excerpt.condition_id in citations[citation_id].condition_ids
                and excerpt.evidence_id in citations[citation_id].evidence_ids
                for excerpt in excerpts[citation_id]
            )
            for citation_id in citation_ids
        )

    def _valid_free_prose(self, text: str, citation_ids: list[str], citations: dict[str, EvidenceCitation], excerpts: dict, *, require_overlap: bool = True) -> bool:
        if _URGENCY_LANGUAGE.search(text) or _UNSUPPORTED_CLAIM_LANGUAGE.search(text):
            return False
        if not self._valid_citation_ids(citation_ids, citations, excerpts):
            return False
        if not require_overlap:
            return True
        claim_terms = self._terms(text)
        source_terms = set().union(*(self._terms(excerpt.source_excerpt) for citation_id in citation_ids for excerpt in excerpts[citation_id]))
        return len(claim_terms & source_terms) >= 1

    @staticmethod
    def _terms(text: str) -> set[str]:
        return {
            token for token in re.findall(r"[a-z]{4,}", text.lower())
            if token not in _STOP_WORDS
        }

    @staticmethod
    def _citation_ids_in_display_order(*groups: list[object], fallback: list[str]) -> list[str]:
        ordered: list[str] = []
        for group in groups:
            for item in group:
                for citation_id in getattr(item, "citation_ids", []):
                    if citation_id not in ordered:
                        ordered.append(citation_id)
        return ordered or fallback

    def _build_references(self, summary_ids: list[str], *groups: object) -> tuple[list[CitationReference], dict[str, int]]:
        *item_groups, citations, excerpts = groups
        citation_ids = list(summary_ids)
        for group in item_groups:
            for item in group:
                for citation_id in item.citation_ids:
                    if citation_id not in citation_ids:
                        citation_ids.append(citation_id)
        number_by_id = {citation_id: index for index, citation_id in enumerate(citation_ids, start=1)}
        references: list[CitationReference] = []
        for citation_id in citation_ids:
            citation = citations[citation_id]
            page_ranges = sorted({
                (excerpt.original_page_range.start_page, excerpt.original_page_range.end_page)
                for excerpt in excerpts[citation_id]
            })
            references.append(CitationReference(
                referenceNumber=number_by_id[citation_id], citationId=citation_id, title=citation.title,
                marker=f"[{number_by_id[citation_id]}]",
                publisher=citation.publisher, publishedYear=citation.published_year, url=citation.url,
                sectionTitle=citation.section_title,
                pageRanges=[{"startPage": start, "endPage": end} for start, end in page_ranges],
            ))
        return references, number_by_id

    @staticmethod
    def _with_numbers(item: object, number_by_id: dict[str, int]):
        numbers = [number_by_id[value] for value in item.citation_ids]
        return item.model_copy(update={
            "citation_numbers": numbers,
            "citation_markers": [f"[{value}]" for value in numbers],
        })
