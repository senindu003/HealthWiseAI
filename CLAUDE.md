# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Architecture

HealthWise AI is three independently-run services with a strict, one-directional call graph. **This boundary must never be violated:**

```
React Frontend  --->  FastAPI AI Backend
      |
      +----(optional save)---->  Spring Boot Backend  ---->  MongoDB
```

- **FastAPI must never call Spring Boot.** It has no MongoDB client and never persists data.
- **Spring Boot must never call FastAPI.** It contains no AI/Gemini/LangGraph/Docling code — only auth, JWT, and MongoDB CRUD.
- **React is the only orchestrator.** It calls FastAPI to get AI results, renders them, and — only if the user is authenticated — separately calls Spring Boot to persist the questionnaire/recommendation/report/analysis.

The three services live in separate top-level directories, each with a duplicated inner folder name (note the doubled path segments):

- `frontend_updated/frontend_/` — React 19 + Vite + Tailwind v4 (JavaScript, not TypeScript)
- `health-ai-backend/health-ai-backend/` — FastAPI + LangGraph + Gemini (Python 3.12+)
- `healthwise-spring-backend/healthwise-spring-backend/` — Spring Boot 3 / Java 21 + MongoDB

None of these are git repositories at the root; there is no top-level `.git`.

### FastAPI AI backend (`health-ai-backend/health-ai-backend/`)

Two fixed (non-branching) LangGraph pipelines, both built in `app/graph/`:

- **Recommendation pipeline** (`workflow.py`): `evaluator → critic → optimizer`, over `RecommendationState` (`app/graph/state.py`). Entry point: `app/services/recommendation_service.py`.
- **Report analysis pipeline** (`report_workflow.py`): `extractor → interpreter → verifier`, over `ReportAnalysisState` (`app/graph/report_state.py`). Entry point: `app/services/report_analysis_service.py`.

Both pipelines call Gemini via `ChatGoogleGenerativeAI` (`app/llm/client.py`). Report analysis additionally does: PDF bytes → PyMuPDF text extraction → Presidio anonymization (`app/llm/anonymizer.py`, PII stripped **before** anything reaches Gemini) → extractor/interpreter/verifier. The intermediate Markdown/anonymized text is never returned to the client — only the final fixed JSON contract is.

All routes live in one file, `app/api/routes.py`, mounted at prefix `/api/v1`:
- `GET /api/v1/health` — liveness only, does not touch Gemini.
- `POST /api/v1/recommendations` — JSON body, three-stage questionnaire in, `{summary, recommendations[]}` out.
- `POST /api/v1/report-analysis` — `multipart/form-data` with a `report_file` PDF and a `questionnaire` JSON string field (not JSON body).

Config is env-only via `pydantic-settings` (`app/config.py`), loaded from `.env` in this backend's own directory, with `get_settings()` memoized via `lru_cache`. Never hardcode `GOOGLE_API_KEY`, model name, or CORS origins — they come from env vars (see `.env` for the current, already-configured values, including a live `GOOGLE_API_KEY` — treat this file as containing a real secret).

### Spring Boot backend (`healthwise-spring-backend/healthwise-spring-backend/`)

Feature-package structure under `src/main/java/com/healthwise/`, one package per domain, each following the same `controller/dto/entity/repository/service` sub-package shape: `auth`, `user`, `questionnaire`, `recommendation`, `report`, `analysis`, `dashboard`, `timeline`. Shared code lives in `common/`, `config/`, `exception/`, `security/`, `util/`.

- Auth is stateless JWT (`security/JwtService.java`, `security/JwtAuthenticationFilter.java`), with refresh tokens persisted via `auth/entity/RefreshToken.java`. Only `/api/v1/auth/**` and CORS preflight `OPTIONS` are public (`security/SecurityConfig.java`); every other endpoint requires `Authorization: Bearer <accessToken>`.
- `dashboard/service/DashboardService.java` aggregates the latest questionnaire/recommendation/report/analysis plus a timeline (`timeline/service/TimelineService.java`) into one `DashboardResponse` for the frontend.
- Persistence is MongoDB only, configured via `MONGODB_URI` (default `mongodb://localhost:27017/healthwise`) in `application.yml`. `JWT_SECRET` must be 32+ characters; the default in `application.yml` is a placeholder, not for real use.
- There is no `src/test` directory currently — no existing Java test suite to run or extend against.

### React frontend (`frontend_updated/frontend_/`)

All backend calls are centralized in `src/lib/api.js` — this is the only file that knows both backend base URLs (`VITE_AI_API_URL`, `VITE_SPRING_API_URL`, both read from `.env`). Route pages live directly in `src/pages/` (no nested feature folders): `Welcome`, `SignIn`, `Dashboard`, `HealthAssessment_10` (the questionnaire), `LabRecommendations`, `ReportAnalysis`, `AIAnalysis`. Routing is defined in `src/App.jsx`; authenticated pages sit inside a shared `WorkspaceLayout` (`TopNav` + `BottomNav` + `Footer`).

Flow pattern used throughout the pages: call FastAPI first to get AI output, render it, and only call Spring Boot save endpoints (`saveQuestionnaire`, `saveRecommendation`, `saveReport`) afterward and only when the user chooses to save — save calls are not required for the AI result to display. `accessToken` is read from `sessionStorage` (see `authHeaders()` in `api.js`), not `localStorage`.

## Commands

### Frontend (`frontend_updated/frontend_/`)
```
npm install
npm run dev      # Vite dev server on :5173
npm run build
npm run lint      # oxlint
npm run preview
```

### FastAPI backend (`health-ai-backend/health-ai-backend/`)
```
pip install -r requirements.txt
python -m spacy download en_core_web_sm   # required once for Presidio
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
A `.venv` already exists in this directory. `GOOGLE_API_KEY` must be set in `.env` for anything beyond `/api/v1/health` to work.

### Spring Boot backend (`healthwise-spring-backend/healthwise-spring-backend/`)
Requires Java 21 and MongoDB running locally. `mvn` is not guaranteed to be on `PATH` in this environment; a Maven distribution is bundled at `tools/apache-maven-3.9.16/bin/mvn.cmd` (and duplicated under this backend's own `maven/` folder) if the system `mvn`/wrapper is unavailable.
```
mvn spring-boot:run
mvn test
mvn package
```
Requires env vars `MONGODB_URI` and `JWT_SECRET` (32+ chars) — see `application.yml` for defaults/placeholders.

## Known environment gaps in this workspace

The environment this repo currently runs in does not fully match the project's requirements: `java -version` reports Java 11 (project needs 21), and `node`/`mvn` are not on `PATH` (a local Maven is bundled under `tools/`). See `HEALTHWISE_AI_ISSUE_PLAN.md` at the repo root for the full, current list of outstanding setup/runtime/quality issues across all three services — check it before assuming a piece of the stack is runnable.
