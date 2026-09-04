"""Small, read-only operational client for the curated Neo4j graph."""

from __future__ import annotations

from typing import Any

try:  # Keep the normal API available until the optional graph dependency is installed.
    from neo4j import GraphDatabase
    from neo4j.exceptions import Neo4jError
except ModuleNotFoundError:  # pragma: no cover - exercised by deployment configuration
    GraphDatabase = None  # type: ignore[assignment]
    Neo4jError = Exception  # type: ignore[misc,assignment]

from app.config import get_settings


def _configured() -> tuple[bool, str]:
    settings = get_settings()
    if not settings.neo4j_enabled:
        return False, "NEO4J_ENABLED is false"
    if not settings.neo4j_uri.strip() or not settings.neo4j_password.get_secret_value():
        return False, "NEO4J_URI and NEO4J_PASSWORD are required when Neo4j is enabled"
    return True, "configured"


def get_knowledge_graph_status() -> dict[str, Any]:
    """Check connectivity and return label counts without exposing graph content."""

    settings = get_settings()
    configured, detail = _configured()
    response: dict[str, Any] = {
        "enabled": settings.neo4j_enabled,
        "configured": configured,
        "runtimeEnabled": settings.knowledge_graph_runtime_enabled,
        "patientDataStored": False,
    }
    if not configured:
        response.update({"connected": False, "detail": detail})
        return response
    if GraphDatabase is None:
        response.update(
            {
                "configured": False,
                "connected": False,
                "detail": "Neo4j driver is not installed; run pip install -r requirements.txt",
            }
        )
        return response

    driver = GraphDatabase.driver(
        settings.neo4j_uri,
        auth=(settings.neo4j_username, settings.neo4j_password.get_secret_value()),
    )
    try:
        driver.verify_connectivity()
        with driver.session(database=settings.neo4j_database) as session:
            counts = session.run(
                """
                MATCH (n)
                WHERE n:Symptom OR n:Condition OR n:Citation OR n:EvidenceRecord
                RETURN count(CASE WHEN n:Symptom THEN 1 END) AS symptoms,
                       count(CASE WHEN n:Condition THEN 1 END) AS conditions,
                       count(CASE WHEN n:Citation THEN 1 END) AS citations,
                       count(CASE WHEN n:EvidenceRecord THEN 1 END) AS evidenceRecords
                """
            ).single()
        response.update(
            {
                "connected": True,
                "counts": {
                    "symptoms": counts["symptoms"],
                    "conditions": counts["conditions"],
                    "citations": counts["citations"],
                    "evidenceRecords": counts["evidenceRecords"],
                },
            }
        )
    except Neo4jError as exc:
        response.update({"connected": False, "detail": f"Neo4j unavailable: {exc.code}"})
    finally:
        driver.close()
    return response
