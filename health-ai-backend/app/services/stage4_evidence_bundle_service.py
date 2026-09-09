"""Deterministic assembly of bounded evidence for the future Stage 4 generator.

This service does not inspect patient text, infer a condition, or call an LLM.
It accepts only condition IDs selected by a later approved resolver and fails
closed unless every selected graph citation has PageIndex/PDF evidence.
"""

from __future__ import annotations

import json
from typing import Any, Callable

from app.config import Settings, get_settings
from app.knowledge_graph.page_text_extraction import extract_retrieval_plan
from app.knowledge_graph.retrieval import CuratedEvidenceRetriever, GraphCitation
from app.schemas.stage4_evidence import (
    EvidenceCitation,
    EvidenceExcerpt,
    GroundedBasicTest,
    GroundedHealthRecommendation,
    Stage4EvidenceBundle,
)


class GroundedEvidenceUnavailableError(ValueError):
    """Raised when the complete graph-to-PDF chain cannot be proven."""


class Stage4EvidenceBundleService:
    """Build page-pinned, citation-linked context with no model involvement."""

    def __init__(
        self,
        settings: Settings | None = None,
        retriever_factory: Callable[[Settings], CuratedEvidenceRetriever] = CuratedEvidenceRetriever,
        extractor: Callable[[dict[str, Any]], dict[str, Any]] = extract_retrieval_plan,
    ) -> None:
        self._settings = settings or get_settings()
        self._retriever_factory = retriever_factory
        self._extractor = extractor

    def build_for_condition_ids(self, condition_ids: list[str]) -> Stage4EvidenceBundle:
        """Return only evidence that survives every mandatory provenance check.

        `condition_ids` is intentionally not derived from untrusted symptoms in
        this subtask. A later, reviewed condition-selection component must
        supply it. This prevents legacy symptom labels from becoming diagnosis
        assertions by accident.
        """
        normalized_ids = sorted({value.strip() for value in condition_ids if value and value.strip()})
        if not normalized_ids:
            raise GroundedEvidenceUnavailableError("No reviewed condition IDs were supplied for Stage 4 evidence retrieval.")
        if not self._settings.knowledge_graph_runtime_enabled:
            raise GroundedEvidenceUnavailableError("Curated knowledge-graph runtime retrieval is disabled.")

        retriever = self._retriever_factory(self._settings)
        try:
            citations = retriever.find_graph_citations(normalized_ids)
            if not citations:
                raise GroundedEvidenceUnavailableError("No completed evidence records were found for the selected conditions.")
            found_conditions = {item.condition_id for item in citations}
            missing_conditions = set(normalized_ids) - found_conditions
            if missing_conditions:
                raise GroundedEvidenceUnavailableError(
                    "No completed evidence record was found for: " + ", ".join(sorted(missing_conditions))
                )

            # The query is fixed. It never includes patient free text and is used
            # only for navigation within documents already linked by Neo4j.
            plan = retriever.create_retrieval_plan(
                normalized_ids,
                retrieval_query="basic starting assessment care navigation prevention",
            )
            if plan.get("unindexedCitations"):
                missing = ", ".join(item["citationId"] for item in plan["unindexedCitations"])
                raise GroundedEvidenceUnavailableError(
                    f"Stage 4 cannot use citations without normalized PageIndex trees: {missing}"
                )
            extracted = self._extractor(plan)
            assets = retriever.find_grounded_assets(normalized_ids)
            return self._normalise_bundle(normalized_ids, citations, extracted, assets)
        finally:
            retriever.close()

    def build_for_reviewed_symptom_ids(self, symptom_ids: list[str]) -> Stage4EvidenceBundle:
        """Build a bundle from exact approved symptom-to-evidence traversals.

        This path never calls ``find_graph_citations(condition_ids)``. It uses
        the reviewed relationship as the scope authority throughout retrieval,
        source selection, and asset selection.
        """
        normalized_ids = sorted({value.strip() for value in symptom_ids if value and value.strip()})
        if not normalized_ids:
            raise GroundedEvidenceUnavailableError("No approved symptom IDs were supplied for Stage 4 retrieval.")
        if not self._settings.knowledge_graph_runtime_enabled:
            raise GroundedEvidenceUnavailableError("Curated knowledge-graph runtime retrieval is disabled.")
        retriever = self._retriever_factory(self._settings)
        try:
            citations = retriever.find_reviewed_graph_citations_for_symptom_ids(normalized_ids)
            if not citations:
                raise GroundedEvidenceUnavailableError(
                    "No completed approved evidence records were linked to the selected symptom nodes."
                )
            condition_ids = sorted({item.condition_id for item in citations})
            plan = retriever.create_retrieval_plan_for_citations(
                citations,
                retrieval_query="basic starting assessment care navigation prevention",
            )
            if plan.get("unindexedCitations"):
                missing = ", ".join(item["citationId"] for item in plan["unindexedCitations"])
                raise GroundedEvidenceUnavailableError(
                    f"Stage 4 cannot use citations without normalized PageIndex trees: {missing}"
                )
            extracted = self._extractor(plan)
            assets = retriever.find_grounded_assets_for_evidence_ids(
                sorted({item.evidence_id for item in citations})
            )
            return self._normalise_bundle(condition_ids, citations, extracted, assets)
        finally:
            retriever.close()

    @staticmethod
    def _normalise_bundle(
        condition_ids: list[str],
        graph_citations: list[GraphCitation],
        extracted: dict[str, Any],
        assets: dict[str, list[dict[str, Any]]],
    ) -> Stage4EvidenceBundle:
        source_items = extracted.get("evidence")
        if not isinstance(source_items, list) or not source_items:
            raise GroundedEvidenceUnavailableError("No page-local source excerpts were extracted.")

        citations_by_id: dict[str, dict[str, Any]] = {}
        boundaries: set[str] = set()
        for item in graph_citations:
            entry = citations_by_id.setdefault(
                item.citation_id,
                {
                    "citationId": item.citation_id,
                    "title": item.citation_title,
                    "publisher": item.publisher,
                    "url": item.source_url,
                    "sectionTitle": item.section_title,
                    "sourceType": item.source_type,
                    "publishedYear": item.published_year,
                    "conditionIds": set(),
                    "evidenceIds": set(),
                },
            )
            entry["conditionIds"].add(item.condition_id)
            entry["evidenceIds"].add(item.evidence_id)
            if item.clinical_boundary_json:
                try:
                    message = json.loads(item.clinical_boundary_json).get("message")
                    if isinstance(message, str) and message.strip():
                        boundaries.add(message.strip())
                except (TypeError, json.JSONDecodeError) as exc:
                    raise GroundedEvidenceUnavailableError(
                        f"Evidence {item.evidence_id} has invalid clinical-boundary data."
                    ) from exc

        excerpts: list[dict[str, Any]] = []
        for item in source_items:
            citation = item.get("citation")
            source_document = item.get("sourceDocument")
            nodes = item.get("selectedNodeEvidence")
            if not isinstance(citation, dict) or not isinstance(source_document, dict) or not isinstance(nodes, list):
                raise GroundedEvidenceUnavailableError("Extracted evidence has an invalid provenance structure.")
            citation_id = citation.get("citationId")
            if citation_id not in citations_by_id:
                raise GroundedEvidenceUnavailableError(f"Extracted citation {citation_id!r} is absent from Neo4j evidence.")
            for node in nodes:
                excerpts.append(
                    {
                        "citationId": citation_id,
                        "conditionId": item.get("conditionId"),
                        "evidenceId": item.get("evidenceId"),
                        "documentId": source_document.get("documentId"),
                        "nodeId": node.get("nodeId"),
                        "nodeTitle": node.get("title"),
                        "treePath": node.get("treePath"),
                        "originalPageRange": node.get("originalPageRange"),
                        "sourceExcerpt": node.get("sourceExcerpt"),
                        "excerptTruncated": node.get("excerptTruncated"),
                    }
                )

        citation_payload = [
            {**item, "conditionIds": sorted(item["conditionIds"]), "evidenceIds": sorted(item["evidenceIds"])}
            for _, item in sorted(citations_by_id.items())
        ]
        allowed_citations = set(citations_by_id)
        basic_tests = [
            {
                "testKey": item.get("testKey"), "testId": item.get("testId"),
                "conditionId": item.get("conditionId"), "evidenceId": item.get("evidenceId"),
                "displayName": item.get("displayName"), "testType": item.get("testType"),
                "priority": item.get("priority"), "why": item.get("why"),
                "requiresClinicianReview": item.get("requiresClinicianReview"),
                "citationIds": item.get("citationIds", []),
            }
            for item in assets.get("basicTests", [])
            if set(item.get("citationIds", [])).issubset(allowed_citations)
        ]
        recommendations = [
            {
                "recommendationKey": item.get("recommendationKey"), "recommendationId": item.get("recommendationId"),
                "conditionId": item.get("conditionId"), "evidenceId": item.get("evidenceId"),
                "headline": item.get("headline"), "message": item.get("message"), "action": item.get("action"),
                "priority": item.get("priority"), "citationIds": item.get("citationIds", []),
            }
            for item in assets.get("healthRecommendations", [])
            if set(item.get("citationIds", [])).issubset(allowed_citations)
        ]
        # Pydantic's final cross-reference validator rejects missing excerpts,
        # unlinked assets, empty boundaries, malformed page ranges, and bad IDs.
        try:
            return Stage4EvidenceBundle(
                schemaVersion="1.0",
                purpose="bounded_curated_stage4_evidence",
                conditionIds=condition_ids,
                citations=[EvidenceCitation.model_validate(item) for item in citation_payload],
                excerpts=[EvidenceExcerpt.model_validate(item) for item in excerpts],
                allowedBasicTests=[GroundedBasicTest.model_validate(item) for item in basic_tests],
                allowedHealthRecommendations=[GroundedHealthRecommendation.model_validate(item) for item in recommendations],
                clinicalBoundaries=sorted(boundaries),
            )
        except ValueError as exc:
            raise GroundedEvidenceUnavailableError(f"Stage 4 evidence bundle failed provenance validation: {exc}") from exc
