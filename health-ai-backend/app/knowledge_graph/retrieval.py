"""Read-only retrieval bridge between curated Neo4j evidence and PageIndex trees.

This module deliberately does not accept patient records, report contents, or
free-text symptom chat. A caller must provide an already-selected curated
condition ID (or a condition-name query for offline review). It returns only
graph-supported citations and source-tree navigation metadata; it neither
retrieves PDF text nor produces clinical recommendations.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

from neo4j import Driver, GraphDatabase

from app.config import Settings


PROJECT_ROOT = Path(__file__).resolve().parents[3]
FULL_TREE_MANIFEST_PATH = PROJECT_ROOT / "knowledge-sources" / "wave1" / "pageindex-trees" / "normalized" / "normalized-tree-manifest.json"
NEXT_BATCH_TREE_MANIFEST_PATH = PROJECT_ROOT / "knowledge-sources" / "wave1" / "pageindex-trees" / "normalized" / "next-batch" / "normalized-tree-manifest.json"
FINAL_BATCH_TREE_MANIFEST_PATH = PROJECT_ROOT / "knowledge-sources" / "wave1" / "pageindex-trees" / "normalized" / "final-batch" / "normalized-tree-manifest.json"
# Backward-compatible name for callers that only need the original full-tree manifest.
TREE_MANIFEST_PATH = FULL_TREE_MANIFEST_PATH
# The final manifest is absent until the user completes its PageIndex build and
# normalization. A new runtime process includes it automatically once present.
TREE_MANIFEST_PATHS = tuple(path for path in (FULL_TREE_MANIFEST_PATH, NEXT_BATCH_TREE_MANIFEST_PATH, FINAL_BATCH_TREE_MANIFEST_PATH) if path.is_file())
MAX_NODES_PER_CITATION = 4
STOP_WORDS = frozenset({"and", "are", "assessment", "care", "condition", "for", "from", "health", "in", "management", "of", "or", "the", "to", "with"})


@dataclass(frozen=True)
class GraphCitation:
    condition_id: str
    condition_display_name: str
    evidence_id: str
    citation_id: str
    citation_title: str
    publisher: str | None
    source_url: str | None
    section_title: str | None
    source_type: str | None
    published_year: int | None
    supported_claims: list[str]
    clinical_boundary_json: str | None = None


@dataclass(frozen=True)
class RuntimeSymptom:
    """A graph symptom eligible for exact Stage 4 terminology selection."""

    symptom_id: str
    display_name: str
    aliases: list[str]


def _read_json(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"{path.name} must contain a JSON object")
    return payload


def _terms(text: str) -> set[str]:
    return {
        item for item in re.findall(r"[a-z0-9]{2,}", text.lower())
        if item not in STOP_WORDS
    }


def _walk_nodes(nodes: Iterable[dict[str, Any]], ancestors: tuple[str, ...] = ()) -> Iterable[tuple[dict[str, Any], tuple[str, ...]]]:
    for node in nodes:
        title = str(node.get("title", ""))
        path = ancestors + (title,)
        yield node, path
        children = node.get("children", [])
        if isinstance(children, list):
            yield from _walk_nodes(children, path)


def _score_node(node: dict[str, Any], query_terms: set[str]) -> tuple[int, list[str]]:
    title_terms = _terms(str(node.get("title", "")))
    key_item_terms = _terms(" ".join(str(item) for item in node.get("keyItems", [])))
    summary_terms = _terms(str(node.get("summary", "")))
    matches = sorted(query_terms & (title_terms | key_item_terms | summary_terms))
    score = (4 * len(query_terms & title_terms)) + (2 * len(query_terms & key_item_terms)) + len(query_terms & summary_terms)
    return score, matches


class CuratedEvidenceRetriever:
    """Queries reviewed evidence in Neo4j and maps citations to local PageIndex trees."""

    def __init__(self, settings: Settings, tree_manifest_paths: tuple[Path, ...] = TREE_MANIFEST_PATHS) -> None:
        if not settings.neo4j_enabled:
            raise ValueError("Set NEO4J_ENABLED=true before using evidence retrieval")
        if not settings.neo4j_uri.strip() or not settings.neo4j_password.get_secret_value():
            raise ValueError("NEO4J_URI and NEO4J_PASSWORD are required for evidence retrieval")
        missing_manifests = [path for path in tree_manifest_paths if not path.is_file()]
        if missing_manifests:
            raise FileNotFoundError(f"Normalized PageIndex tree manifest is missing: {missing_manifests[0]}")
        self.database = settings.neo4j_database
        self.driver: Driver = GraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_username, settings.neo4j_password.get_secret_value()),
        )
        self.tree_manifest_paths = tree_manifest_paths

    def close(self) -> None:
        self.driver.close()

    def list_runtime_symptoms(self) -> list[RuntimeSymptom]:
        """Return only nodes with an approved reviewed runtime relationship.

        Candidate legacy edges are intentionally absent from this query. This
        makes an unreviewed CSV association unusable even if a caller knows its
        symptom ID.
        """
        cypher = """
        MATCH (symptom:Symptom)-[mapping:REVIEWED_SYMPTOM_EVIDENCE]->(evidence:EvidenceRecord)
        WHERE mapping.runtimeEligible = true
          AND mapping.clinicalReviewStatus = 'approved'
          AND evidence.clinicalReviewStatus = 'completed'
        RETURN DISTINCT symptom.symptomId AS symptomId,
               symptom.displayName AS displayName,
               coalesce(symptom.aliases, []) AS aliases
        ORDER BY displayName, symptomId
        """
        with self.driver.session(database=self.database) as session:
            return [
                RuntimeSymptom(
                    symptom_id=row["symptomId"],
                    display_name=row["displayName"],
                    aliases=list(row["aliases"] or []),
                )
                for row in session.run(cypher)
            ]

    def find_reviewed_graph_citations_for_symptom_ids(self, symptom_ids: list[str]) -> list[GraphCitation]:
        """Traverse *only* approved ``REVIEWED_SYMPTOM_EVIDENCE`` edges."""
        normalized_ids = sorted({value.strip() for value in symptom_ids if value and value.strip()})
        if not normalized_ids:
            raise ValueError("At least one approved symptom ID is required.")
        cypher = """
        MATCH (symptom:Symptom)-[mapping:REVIEWED_SYMPTOM_EVIDENCE]->(evidence:EvidenceRecord)
              -[:ABOUT_CONDITION]->(condition:Condition)
        WHERE symptom.symptomId IN $symptomIds
          AND mapping.runtimeEligible = true
          AND mapping.clinicalReviewStatus = 'approved'
          AND evidence.clinicalReviewStatus = 'completed'
        MATCH (evidence)-[relation:CITES]->(citation:Citation)
        RETURN DISTINCT condition.conditionId AS conditionId,
               condition.displayName AS conditionDisplayName,
               evidence.evidenceId AS evidenceId,
               citation.citationId AS citationId,
               coalesce(citation.title, citation.citationId) AS citationTitle,
               citation.publisher AS publisher,
               citation.url AS sourceUrl,
               citation.sectionTitle AS sectionTitle,
               citation.sourceType AS sourceType,
               citation.publishedYear AS publishedYear,
               relation.supportedClaims AS supportedClaims,
               evidence.clinicalBoundaryJson AS clinicalBoundaryJson
        ORDER BY condition.displayName, citation.citationId
        """
        with self.driver.session(database=self.database) as session:
            rows = session.run(cypher, symptomIds=normalized_ids)
            return [self._graph_citation_from_row(row) for row in rows]

    @staticmethod
    def _graph_citation_from_row(row: Any) -> GraphCitation:
        return GraphCitation(
            condition_id=row["conditionId"],
            condition_display_name=row["conditionDisplayName"],
            evidence_id=row["evidenceId"],
            citation_id=row["citationId"],
            citation_title=row["citationTitle"],
            publisher=row["publisher"],
            source_url=row["sourceUrl"],
            section_title=row["sectionTitle"],
            source_type=row["sourceType"],
            published_year=row["publishedYear"],
            supported_claims=list(row["supportedClaims"] or []),
            clinical_boundary_json=row["clinicalBoundaryJson"],
        )

    def find_graph_citations(self, condition_ids: list[str], condition_query: str = "") -> list[GraphCitation]:
        """Return only completed EvidenceRecord-to-Citation graph relationships."""
        normalized_ids = sorted({value.strip() for value in condition_ids if value.strip()})
        query = condition_query.strip().lower()
        if not normalized_ids and not query:
            raise ValueError("Provide at least one curated condition ID or a condition query.")
        cypher = """
        MATCH (condition:Condition)<-[:ABOUT_CONDITION]-(evidence:EvidenceRecord)-[relation:CITES]->(citation:Citation)
        WHERE evidence.clinicalReviewStatus = 'completed'
          AND (
            size($conditionIds) > 0 AND condition.conditionId IN $conditionIds
            OR ($conditionQuery <> '' AND (
                toLower(condition.conditionId) CONTAINS $conditionQuery
                OR toLower(condition.displayName) CONTAINS $conditionQuery
            ))
          )
        RETURN condition.conditionId AS conditionId,
               condition.displayName AS conditionDisplayName,
               evidence.evidenceId AS evidenceId,
               citation.citationId AS citationId,
               coalesce(citation.title, citation.citationId) AS citationTitle,
               citation.publisher AS publisher,
               citation.url AS sourceUrl,
               citation.sectionTitle AS sectionTitle,
               citation.sourceType AS sourceType,
               citation.publishedYear AS publishedYear,
               relation.supportedClaims AS supportedClaims,
               evidence.clinicalBoundaryJson AS clinicalBoundaryJson
        ORDER BY condition.displayName, citation.citationId
        """
        with self.driver.session(database=self.database) as session:
            rows = session.run(cypher, conditionIds=normalized_ids, conditionQuery=query)
            return [self._graph_citation_from_row(row) for row in rows]

    def select_tree_nodes(self, citations: list[GraphCitation], retrieval_query: str = "") -> dict[str, Any]:
        """Rank tree nodes only within PageIndex documents linked to graph citations."""
        tree_by_citation: dict[str, list[dict[str, Any]]] = {}
        for manifest_path in self.tree_manifest_paths:
            manifest = _read_json(manifest_path)
            for entry in manifest.get("trees", []):
                citation_ids = entry.get("citationIds") or [entry.get("citationId")]
                for citation_id in citation_ids:
                    if isinstance(citation_id, str) and citation_id:
                        tree_by_citation.setdefault(citation_id, []).append({
                            **entry,
                            "manifestPath": manifest_path.relative_to(PROJECT_ROOT).as_posix(),
                        })
        query_terms = _terms(retrieval_query + " " + " ".join(item.condition_display_name for item in citations))
        selected_sources: list[dict[str, Any]] = []
        unindexed_citations: list[dict[str, str]] = []

        for citation in citations:
            entries = tree_by_citation.get(citation.citation_id, [])
            if not entries:
                unindexed_citations.append({"citationId": citation.citation_id, "reason": "No normalized PageIndex tree is available for this citation."})
                continue
            for entry in entries:
                tree_path = PROJECT_ROOT / entry["normalizedTreePath"]
                tree_document = _read_json(tree_path)
                ranked: list[dict[str, Any]] = []
                for node, path in _walk_nodes(tree_document["tree"]):
                    score, matches = _score_node(node, query_terms)
                    ranked.append({
                        "nodeId": node["nodeId"], "title": node["title"], "pageLocator": node["pageLocator"],
                        "path": list(path), "summary": node.get("summary"), "keyItems": node["keyItems"],
                        "score": score, "matchedTerms": matches,
                    })
                ranked.sort(key=lambda item: (-item["score"], item["pageLocator"]["startPage"], item["nodeId"]))
                selected_sources.append({
                    "conditionId": citation.condition_id,
                    "conditionDisplayName": citation.condition_display_name,
                    "evidenceId": citation.evidence_id,
                    "citation": {
                        "citationId": citation.citation_id, "title": citation.citation_title, "url": citation.source_url,
                        "sectionTitle": citation.section_title, "sourceType": citation.source_type,
                        "publishedYear": citation.published_year, "supportedClaims": citation.supported_claims,
                    },
                    "tree": {
                        "documentId": tree_document["document"]["documentId"],
                        "contentHash": tree_document["document"]["contentHash"],
                        "pageCount": tree_document["document"]["pageCount"],
                        "sourceTier": tree_document["document"]["sourceTier"],
                        "normalizedTreePath": entry["normalizedTreePath"],
                        "manifestPath": entry["manifestPath"],
                        # A section slice has local PageIndex page numbers.  Keep
                        # the original selection so downstream extraction can
                        # provide an auditable source-page mapping.
                        "sourceSelection": tree_document["document"].get("sourceSelection"),
                    },
                    "selectedNodes": ranked[:MAX_NODES_PER_CITATION],
                })
        return {"selectedSources": selected_sources, "unindexedCitations": unindexed_citations}

    def find_grounded_assets(self, condition_ids: list[str]) -> dict[str, list[dict[str, Any]]]:
        """Return only graph assets that have an explicit SUPPORTED_BY citation.

        This is deliberately separate from tree ranking. Stage 4 can offer a
        basic test or health recommendation only when the graph has an explicit
        asset-to-citation relationship which will later be cross-checked against
        page-local source excerpts.
        """
        normalized_ids = sorted({value.strip() for value in condition_ids if value.strip()})
        if not normalized_ids:
            raise ValueError("At least one condition ID is required for grounded assets.")
        # Keep these as two simple, explicit queries rather than a Cypher UNION
        # subquery. In addition to being easier to audit, this avoids variable
        # shadowing across Neo4j versions.
        basic_tests_cypher = """
        MATCH (e:EvidenceRecord)-[:ABOUT_CONDITION]->(condition:Condition)
              -[:HAS_CITATION]->(:Citation)
        WHERE e.clinicalReviewStatus = 'completed' AND condition.conditionId IN $conditionIds
        MATCH (e)-[:HAS_BASIC_STARTING_TEST]->(asset:BasicTest)-[:SUPPORTED_BY]->(citation:Citation)
        RETURN condition.conditionId AS conditionId, e.evidenceId AS evidenceId,
               properties(asset) AS asset, collect(DISTINCT citation.citationId) AS citationIds
        ORDER BY conditionId, asset.displayName
        """
        recommendation_cypher = """
        MATCH (e:EvidenceRecord)-[:ABOUT_CONDITION]->(condition:Condition)
              -[:HAS_CITATION]->(:Citation)
        WHERE e.clinicalReviewStatus = 'completed' AND condition.conditionId IN $conditionIds
        MATCH (e)-[:HAS_HEALTH_RECOMMENDATION]->(asset:HealthRecommendation)-[:SUPPORTED_BY]->(citation:Citation)
        RETURN condition.conditionId AS conditionId, e.evidenceId AS evidenceId,
               properties(asset) AS asset, collect(DISTINCT citation.citationId) AS citationIds
        ORDER BY conditionId, asset.headline
        """
        result: dict[str, list[dict[str, Any]]] = {"basicTests": [], "healthRecommendations": []}
        with self.driver.session(database=self.database) as session:
            for key, cypher in (("basicTests", basic_tests_cypher), ("healthRecommendations", recommendation_cypher)):
                for row in session.run(cypher, conditionIds=normalized_ids):
                    asset = dict(row["asset"] or {})
                    result[key].append({
                        **asset,
                        "conditionId": row["conditionId"],
                        "evidenceId": row["evidenceId"],
                        "citationIds": sorted(row["citationIds"] or []),
                    })
        return result

    def create_retrieval_plan(self, condition_ids: list[str], retrieval_query: str = "", condition_query: str = "") -> dict[str, Any]:
        citations = self.find_graph_citations(condition_ids, condition_query)
        selection = self.select_tree_nodes(citations, retrieval_query)
        return {
            "schemaVersion": "1.0",
            "purpose": "Read-only curated evidence and PageIndex navigation plan; not clinical advice or a diagnosis.",
            "input": {"conditionIds": sorted(set(condition_ids)), "conditionQuery": condition_query, "retrievalQuery": retrieval_query},
            "graph": {
                "matchedCitationCount": len(citations),
                "matchedConditions": sorted({item.condition_id for item in citations}),
            },
            **selection,
        }

    def create_retrieval_plan_for_citations(self, citations: list[GraphCitation], retrieval_query: str = "") -> dict[str, Any]:
        """Build a plan without widening an approved symptom-to-evidence scope."""
        if not citations:
            raise ValueError("At least one graph citation is required.")
        selection = self.select_tree_nodes(citations, retrieval_query)
        return {
            "schemaVersion": "1.0",
            "purpose": "Read-only reviewed-symptom evidence and PageIndex navigation plan; not clinical advice or a diagnosis.",
            "input": {
                "symptomEvidenceOnly": True,
                "retrievalQuery": retrieval_query,
            },
            "graph": {
                "matchedCitationCount": len(citations),
                "matchedConditions": sorted({item.condition_id for item in citations}),
                "matchedEvidenceIds": sorted({item.evidence_id for item in citations}),
            },
            **selection,
        }

    def find_grounded_assets_for_evidence_ids(self, evidence_ids: list[str]) -> dict[str, list[dict[str, Any]]]:
        """Return assets belonging only to the exact reviewed evidence records."""
        normalized_ids = sorted({value.strip() for value in evidence_ids if value and value.strip()})
        if not normalized_ids:
            raise ValueError("At least one evidence ID is required for grounded assets.")
        basic_tests_cypher = """
        MATCH (e:EvidenceRecord)-[:ABOUT_CONDITION]->(condition:Condition)
        WHERE e.clinicalReviewStatus = 'completed' AND e.evidenceId IN $evidenceIds
        MATCH (e)-[:HAS_BASIC_STARTING_TEST]->(asset:BasicTest)-[:SUPPORTED_BY]->(citation:Citation)
        RETURN condition.conditionId AS conditionId, e.evidenceId AS evidenceId,
               properties(asset) AS asset, collect(DISTINCT citation.citationId) AS citationIds
        ORDER BY conditionId, asset.displayName
        """
        recommendation_cypher = """
        MATCH (e:EvidenceRecord)-[:ABOUT_CONDITION]->(condition:Condition)
        WHERE e.clinicalReviewStatus = 'completed' AND e.evidenceId IN $evidenceIds
        MATCH (e)-[:HAS_HEALTH_RECOMMENDATION]->(asset:HealthRecommendation)-[:SUPPORTED_BY]->(citation:Citation)
        RETURN condition.conditionId AS conditionId, e.evidenceId AS evidenceId,
               properties(asset) AS asset, collect(DISTINCT citation.citationId) AS citationIds
        ORDER BY conditionId, asset.headline
        """
        result: dict[str, list[dict[str, Any]]] = {"basicTests": [], "healthRecommendations": []}
        with self.driver.session(database=self.database) as session:
            for key, cypher in (("basicTests", basic_tests_cypher), ("healthRecommendations", recommendation_cypher)):
                for row in session.run(cypher, evidenceIds=normalized_ids):
                    result[key].append({
                        **dict(row["asset"] or {}),
                        "conditionId": row["conditionId"],
                        "evidenceId": row["evidenceId"],
                        "citationIds": sorted(row["citationIds"] or []),
                    })
        return result
