# Health AI Backend

FastAPI backend for structured, non-diagnostic laboratory test recommendations. It runs the fixed LangGraph sequence: DeepSeek evaluator → Gemini critic → OpenAI optimizer.

It also provides a separate report-analysis pipeline: PDF upload → Docling Markdown → Presidio anonymization → extractor → interpreter → verifier. FastAPI does not communicate with MongoDB; report persistence remains the responsibility of the Spring Boot service.

## Setup

1. Create and activate a Python 3.12+ virtual environment.
2. Run `pip install -r requirements.txt`.
3. Install Presidio's English NLP model with `python -m spacy download en_core_web_sm`.
4. Set `GOOGLE_API_KEY` in `.env`.
5. Start the API with `uvicorn app.main:app --host 0.0.0.0 --port 8000`.

## API

`POST /api/v1/recommendations` accepts the three-stage frontend questionnaire and returns:

```json
{"summary":"...","recommendations":[{"test_name":"...","category":"...","priority":"medium","reason_from_rules":"...","personalized_explanation":"..."}]}
```

`GET /api/v1/health` provides a liveness check.

`POST /api/v1/report-analysis` accepts `multipart/form-data`: a `report_file` PDF and a `questionnaire` JSON string. Docling conversion, Markdown, and Presidio anonymization are internal backend operations and are never returned to the frontend. The endpoint returns the fixed report-analysis JSON contract and does not persist the report.

The service provides informational laboratory recommendations only; it does not diagnose conditions or replace a qualified clinician.
