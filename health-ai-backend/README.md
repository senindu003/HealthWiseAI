# Health AI Backend

FastAPI backend for structured, non-diagnostic laboratory test recommendations. It runs the fixed LangGraph sequence: DeepSeek evaluator → Gemini critic → OpenAI optimizer.

It also provides a separate report-analysis pipeline: PDF upload → Docling Markdown → Presidio anonymization → extractor → interpreter → verifier. FastAPI does not communicate with MongoDB; report persistence remains the responsibility of the Spring Boot service.

## Setup

1. Create and activate a Python 3.12+ virtual environment.
2. Run `pip install -r requirements.txt`.
3. Install Presidio's English NLP model with `python -m spacy download en_core_web_sm`.
4. Set `GOOGLE_API_KEY` in `.env`.
5. Start the API with `uvicorn app.main:app --host 0.0.0.0 --port 8000`.

## Curated Neo4j knowledge graph

Neo4j is optional and is reserved for the versioned, citation-linked clinical
knowledge bundle at the repository root. It must **never** receive MongoDB
patient records, uploaded reports, authentication data, names, or chat text.

Set these environment variables only in your local secret store or deployment
platform:

```env
NEO4J_ENABLED=true
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=replace-with-a-secret
NEO4J_DATABASE=neo4j
KNOWLEDGE_GRAPH_RUNTIME_ENABLED=false
```

First validate the three JSON files without contacting Neo4j:

```bash
python scripts/import_knowledge_graph.py --dry-run
```

Then import idempotently (safe to rerun):

```bash
python scripts/import_knowledge_graph.py
```

The importer creates only terminology, conditions, citations, and draft evidence
nodes. It rejects direct legacy symptom-to-condition mappings and marks all
draft tests/recommendations `runtimeEligible=false`. They remain unavailable to
patient-facing recommendation flows until qualified clinical review approves a
future release. `GET /api/v1/knowledge-graph/status` reports connectivity and
aggregate counts only.

The active client output limits are configurable through `GEMINI_MAX_OUTPUT_TOKENS`
(default `4096`), `GROQ_MAX_TOKENS` (default `2048`), and
`OPENAI_MAX_TOKENS` (default `4096`). These limits cap generated completion
tokens; they do not limit the size of the incoming questionnaire or PDF.

DeepSeek is configured as the structured-output fallback for every LLM stage.
The primary provider receives `LLM_MAX_RETRIES` attempts first; only then does
the service try `DEEPSEEK_MODEL` with `DEEPSEEK_API_KEY` and
`DEEPSEEK_MAX_TOKENS` (default `2048`). Configure a valid DeepSeek key and a
model available to that key, otherwise fallback cannot recover a primary outage.

## API

`POST /api/v1/recommendations` accepts the three-stage frontend questionnaire and returns:

```json
{"summary":"...","recommendations":[{"test_name":"...","category":"...","priority":"medium","reason_from_rules":"...","personalized_explanation":"..."}]}
```

Before the LangGraph evaluator is called, FastAPI applies a deterministic
questionnaire safety gate. It rejects impossible or unsupported biometric
values, implausible sleep/exercise values, contradictory answers, oversized
free text, and prompt-injection-like content with a `422` response. The
frontend displays this message and lets the user return to the assessment.

`GET /api/v1/health` provides a liveness check.

`POST /api/v1/report-analysis` accepts `multipart/form-data`: one or more `report_files` PDFs and a `questionnaire` JSON string. Every uploaded report is independently validated and anonymized before the combined, recommendation-set analysis is generated. Docling conversion, Markdown, and Presidio anonymization are internal backend operations and are never returned to the frontend. The endpoint returns the fixed report-analysis JSON contract and does not persist the reports itself; Spring Boot stores the authenticated user's reports and analysis record.

The service provides informational laboratory recommendations only; it does not diagnose conditions or replace a qualified clinician.
