"""Idempotent importer for HealthWise's curated JSON knowledge-graph bundle.

The importer rejects direct legacy symptom-to-condition mappings. Evidence is
imported as draft, non-runtime content until a qualified clinical review changes
that status outside this tool.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

try:
    from neo4j import Driver, GraphDatabase
except ModuleNotFoundError:  # Allows JSON dry-run validation before dependencies are installed.
    Driver = Any  # type: ignore[misc,assignment]
    GraphDatabase = None  # type: ignore[assignment]

from app.config import Settings


@dataclass(frozen=True)
class Bundle:
    catalogue: dict[str, Any]
    registry: dict[str, Any]
    evidence: dict[str, Any]


def _read_json(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as source:
        value = json.load(source)
    if not isinstance(value, dict):
        raise ValueError(f"{path.name} must contain a JSON object")
    return value


def load_and_validate_bundle(data_dir: Path) -> Bundle:
    """Load the three curated files and validate their cross-file references."""

    catalogue = _read_json(data_dir / "symptom-catalogue.v1.json")
    registry = _read_json(data_dir / "citation-registry.wave1.nice-who.json")
    evidence = _read_json(data_dir / "condition-evidence.wave1.json")

    if evidence.get("sourceCitationRegistry") != "citation-registry.wave1.nice-who.json":
        raise ValueError("condition evidence must reference citation-registry.wave1.nice-who.json")

    symptom_ids = [item.get("symptomId") for item in catalogue.get("symptoms", [])]
    if not symptom_ids or len(symptom_ids) != len(set(symptom_ids)) or any(not item for item in symptom_ids):
        raise ValueError("symptom catalogue must contain unique non-empty symptomId values")

    registry_conditions = {
        _slug(item.get("normalizedCondition", "")): item
        for item in registry.get("conditions", [])
    }
    registry_citations = {
        citation.get("citationId")
        for condition in registry.get("conditions", [])
        for citation in condition.get("citations", [])
    }
    evidence_ids: set[str] = set()
    for record in evidence.get("records", []):
        evidence_id = record.get("evidenceId")
        condition_id = record.get("conditionId")
        if not evidence_id or evidence_id in evidence_ids:
            raise ValueError("evidence records must have unique non-empty evidenceId values")
        evidence_ids.add(evidence_id)
        if condition_id not in registry_conditions:
            raise ValueError(f"evidence {evidence_id} has an unknown conditionId: {condition_id}")
        if record.get("supportedPattern", {}).get("symptomIds"):
            raise ValueError(
                f"evidence {evidence_id} declares symptom links; direct legacy symptom mappings are prohibited"
            )
        for ref in record.get("citationRefs", []):
            if ref.get("citationId") not in registry_citations:
                raise ValueError(f"evidence {evidence_id} references an unknown citation")
        for content_type, items in (
            ("basic starting test", record.get("basicStartingTests", [])),
            ("health recommendation", record.get("healthRecommendations", [])),
        ):
            for item in items:
                for citation_id in item.get("citationRefs", []):
                    if citation_id not in registry_citations:
                        raise ValueError(
                            f"evidence {evidence_id} {content_type} references an unknown citation"
                        )
    if set(registry_conditions) != {record.get("conditionId") for record in evidence.get("records", [])}:
        raise ValueError("registry and evidence must cover exactly the same condition IDs")
    return Bundle(catalogue=catalogue, registry=registry, evidence=evidence)


def _slug(value: str) -> str:
    import re

    return re.sub(r"_+", "_", re.sub(r"[^a-z0-9]+", "_", value.lower())).strip("_")


class KnowledgeGraphImporter:
    """Imports static, reviewed-input JSON only; never reads patient stores."""

    def __init__(self, settings: Settings) -> None:
        if not settings.neo4j_enabled:
            raise ValueError("Set NEO4J_ENABLED=true before importing")
        if not settings.neo4j_uri.strip() or not settings.neo4j_password.get_secret_value():
            raise ValueError("NEO4J_URI and NEO4J_PASSWORD are required")
        if GraphDatabase is None:
            raise RuntimeError("Neo4j driver is not installed; run pip install -r requirements.txt")
        self.database = settings.neo4j_database
        self.driver: Driver = GraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_username, settings.neo4j_password.get_secret_value()),
        )

    def close(self) -> None:
        self.driver.close()

    def import_bundle(self, bundle: Bundle) -> dict[str, int]:
        self.driver.verify_connectivity()
        with self.driver.session(database=self.database) as session:
            self._create_constraints(session)
            self._import_symptoms(session, bundle.catalogue)
            self._import_separate_terms(session, bundle.catalogue)
            self._import_registry(session, bundle.registry)
            self._import_evidence(session, bundle.evidence)
        return {
            "symptoms": len(bundle.catalogue.get("symptoms", [])),
            "separateTerms": len(bundle.catalogue.get("termsRequiringSeparateModeling", [])),
            "conditions": len(bundle.registry.get("conditions", [])),
            "citations": sum(len(c.get("citations", [])) for c in bundle.registry.get("conditions", [])),
            "evidenceRecords": len(bundle.evidence.get("records", [])),
        }

    @staticmethod
    def _create_constraints(session: Any) -> None:
        for statement in (
            "CREATE CONSTRAINT symptom_id_unique IF NOT EXISTS FOR (n:Symptom) REQUIRE n.symptomId IS UNIQUE",
            "CREATE CONSTRAINT condition_id_unique IF NOT EXISTS FOR (n:Condition) REQUIRE n.conditionId IS UNIQUE",
            "CREATE CONSTRAINT citation_id_unique IF NOT EXISTS FOR (n:Citation) REQUIRE n.citationId IS UNIQUE",
            "CREATE CONSTRAINT evidence_id_unique IF NOT EXISTS FOR (n:EvidenceRecord) REQUIRE n.evidenceId IS UNIQUE",
            "CREATE CONSTRAINT terminology_key_unique IF NOT EXISTS FOR (n:TerminologyTerm) REQUIRE n.termKey IS UNIQUE",
            "CREATE CONSTRAINT basic_test_key_unique IF NOT EXISTS FOR (n:BasicTest) REQUIRE n.testKey IS UNIQUE",
            "CREATE CONSTRAINT health_recommendation_key_unique IF NOT EXISTS FOR (n:HealthRecommendation) REQUIRE n.recommendationKey IS UNIQUE",
        ):
            session.run(statement).consume()

    @staticmethod
    def _import_symptoms(session: Any, catalogue: dict[str, Any]) -> None:
        rows = []
        for symptom in catalogue.get("symptoms", []):
            rows.append(
                {
                    "symptomId": symptom["symptomId"],
                    "displayName": symptom["displayName"],
                    "aliases": symptom.get("aliases", []),
                    "bodySystem": symptom.get("bodySystem"),
                    "reviewStatus": symptom.get("reviewStatus"),
                    "provenanceJson": json.dumps(symptom.get("provenance", {}), sort_keys=True),
                    "runtimeEligible": False,
                }
            )
        session.run(
            """
            UNWIND $rows AS row
            MERGE (s:Symptom {symptomId: row.symptomId})
            SET s += row
            """,
            rows=rows,
        ).consume()

    @staticmethod
    def _import_separate_terms(session: Any, catalogue: dict[str, Any]) -> None:
        rows = []
        for term in catalogue.get("termsRequiringSeparateModeling", []):
            source_term = term["sourceTerm"]
            rows.append(
                {
                    "termKey": _slug(source_term),
                    "displayName": source_term,
                    "targetType": term.get("targetType"),
                    "reason": term.get("reason"),
                    "reviewStatus": term.get("reviewStatus"),
                    "provenanceJson": json.dumps(term.get("provenance", {}), sort_keys=True),
                    "runtimeEligible": False,
                }
            )
        session.run(
            """
            UNWIND $rows AS row
            MERGE (t:TerminologyTerm {termKey: row.termKey})
            SET t += row
            """,
            rows=rows,
        ).consume()

    @staticmethod
    def _import_registry(session: Any, registry: dict[str, Any]) -> None:
        rows = []
        for condition in registry.get("conditions", []):
            condition_id = _slug(condition["normalizedCondition"])
            for citation in condition.get("citations", []):
                rows.append(
                    {
                        "conditionId": condition_id,
                        "conditionDisplayName": condition["normalizedCondition"],
                        "conditionStatus": condition.get("status"),
                        "citationId": citation["citationId"],
                        "citation": citation,
                    }
                )
        session.run(
            """
            UNWIND $rows AS row
            MERGE (condition:Condition {conditionId: row.conditionId})
            SET condition.displayName = row.conditionDisplayName,
                condition.registryStatus = row.conditionStatus,
                condition.runtimeEligible = false
            MERGE (citation:Citation {citationId: row.citationId})
            SET citation += row.citation
            MERGE (condition)-[:HAS_CITATION]->(citation)
            """,
            rows=rows,
        ).consume()

    @staticmethod
    def _import_evidence(session: Any, evidence: dict[str, Any]) -> None:
        evidence_rows = []
        citation_rows = []
        test_rows = []
        test_citation_rows = []
        recommendation_rows = []
        recommendation_citation_rows = []
        for record in evidence.get("records", []):
            evidence_rows.append(
                {
                    "evidenceId": record["evidenceId"],
                    "conditionId": record["conditionId"],
                    "recordStatus": record.get("recordStatus"),
                    "clinicalReviewStatus": record.get("review", {}).get("clinicalReviewStatus"),
                    "applicabilityJson": json.dumps(record.get("applicability", {}), sort_keys=True),
                    "careDispositionJson": json.dumps(record.get("careDisposition", {}), sort_keys=True),
                    "clinicalBoundaryJson": json.dumps(record.get("clinicalBoundary", {}), sort_keys=True),
                    "reviewJson": json.dumps(record.get("review", {}), sort_keys=True),
                    "runtimeEligible": False,
                }
            )
            for citation_ref in record.get("citationRefs", []):
                citation_rows.append(
                    {
                        "evidenceId": record["evidenceId"],
                        "citationId": citation_ref["citationId"],
                        "supportedClaims": citation_ref.get("supportedClaims", []),
                    }
                )
            for test in record.get("basicStartingTests", []):
                test_key = f"{record['evidenceId']}:{test['testId']}"
                test_rows.append(
                    {
                        "testKey": test_key,
                        "evidenceId": record["evidenceId"],
                        "testId": test["testId"],
                        "displayName": test["displayName"],
                        "testType": test.get("testType"),
                        "priority": test.get("priority"),
                        "why": test.get("why"),
                        "requiresClinicianReview": test.get("requiresClinicianReview", True),
                        "citationRefs": test.get("citationRefs", []),
                        "runtimeEligible": False,
                    }
                )
                test_citation_rows.extend(
                    {"testKey": test_key, "citationId": citation_id}
                    for citation_id in test.get("citationRefs", [])
                )
            for recommendation in record.get("healthRecommendations", []):
                recommendation_key = f"{record['evidenceId']}:{recommendation['recommendationId']}"
                recommendation_rows.append(
                    {
                        "recommendationKey": recommendation_key,
                        "evidenceId": record["evidenceId"],
                        **recommendation,
                        "runtimeEligible": False,
                    }
                )
                recommendation_citation_rows.extend(
                    {"recommendationKey": recommendation_key, "citationId": citation_id}
                    for citation_id in recommendation.get("citationRefs", [])
                )
        session.run(
            """
            UNWIND $rows AS row
            MERGE (e:EvidenceRecord {evidenceId: row.evidenceId})
            SET e += row
            WITH e, row
            MATCH (c:Condition {conditionId: row.conditionId})
            MERGE (e)-[:ABOUT_CONDITION]->(c)
            """,
            rows=evidence_rows,
        ).consume()
        session.run(
            """
            UNWIND $rows AS row
            MATCH (e:EvidenceRecord {evidenceId: row.evidenceId})
            MATCH (c:Citation {citationId: row.citationId})
            MERGE (e)-[r:CITES]->(c)
            SET r.supportedClaims = row.supportedClaims
            """,
            rows=citation_rows,
        ).consume()
        session.run(
            """
            UNWIND $rows AS row
            MERGE (t:BasicTest {testKey: row.testKey})
            SET t += row
            WITH t, row
            MATCH (e:EvidenceRecord {evidenceId: row.evidenceId})
            MERGE (e)-[:HAS_BASIC_STARTING_TEST]->(t)
            """,
            rows=test_rows,
        ).consume()
        session.run(
            """
            UNWIND $rows AS row
            MATCH (t:BasicTest {testKey: row.testKey})
            MATCH (c:Citation {citationId: row.citationId})
            MERGE (t)-[:SUPPORTED_BY]->(c)
            """,
            rows=test_citation_rows,
        ).consume()
        session.run(
            """
            UNWIND $rows AS row
            MERGE (r:HealthRecommendation {recommendationKey: row.recommendationKey})
            SET r += row
            WITH r, row
            MATCH (e:EvidenceRecord {evidenceId: row.evidenceId})
            MERGE (e)-[:HAS_HEALTH_RECOMMENDATION]->(r)
            """,
            rows=recommendation_rows,
        ).consume()
        session.run(
            """
            UNWIND $rows AS row
            MATCH (r:HealthRecommendation {recommendationKey: row.recommendationKey})
            MATCH (c:Citation {citationId: row.citationId})
            MERGE (r)-[:SUPPORTED_BY]->(c)
            """,
            rows=recommendation_citation_rows,
        ).consume()
