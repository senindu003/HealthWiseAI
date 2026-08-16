# HealthWise AI Issue Plan

This plan tracks the remaining integration, runtime, and quality work for the complete HealthWise AI system.

Architecture must remain:

React Frontend -> FastAPI AI Backend -> React Frontend -> optional save -> Spring Boot Backend -> MongoDB

Spring Boot must not call FastAPI. FastAPI must not call Spring Boot. React remains the only client/orchestrator.

## Phase 1 - Runtime Prerequisites

1. [ ] Install Node.js and npm
   - Severity: Critical
   - Area: Frontend
   - Reason: React/Vite cannot be installed, built, or run without Node/npm.
   - Check: `node -v` and `npm -v`
   - Completion: frontend can run `npm install` and `npm run dev`.

2. [ ] Install Java 21
   - Severity: Critical
   - Area: Spring Boot
   - Reason: Spring Boot 3 project expects modern Java. Current environment showed Java 11.
   - Check: `java -version`
   - Completion: Java reports version 21 or at least 17.

3. [ ] Install Maven
   - Severity: Critical
   - Area: Spring Boot
   - Reason: No `mvn` command and no Maven wrapper were available, so Spring cannot run.
   - Check: `mvn -v`
   - Completion: Spring can run `mvn spring-boot:run`.

4. [ ] Install and start MongoDB
   - Severity: Critical
   - Area: Database
   - Reason: Spring Boot owns persistence and requires MongoDB.
   - Check: MongoDB is reachable at `mongodb://localhost:27017/healthwise`.
   - Completion: Spring starts without MongoDB connection errors.

5. [ ] Install FastAPI Python dependencies
   - Severity: Critical
   - Area: FastAPI
   - Reason: Active Python environment was missing `fastapi`.
   - Check: `python -c "import fastapi, uvicorn"`
   - Completion: FastAPI can run with `uvicorn app.main:app --host 0.0.0.0 --port 8000`.

## Phase 2 - Environment Configuration

6. [ ] Configure FastAPI `.env`
   - Severity: Critical
   - Area: FastAPI
   - File: `health-ai-backend/health-ai-backend/.env`
   - Reason: Gemini integration requires `GOOGLE_API_KEY`, and CORS must include the frontend origin.
   - Required values:
     - `GOOGLE_API_KEY`
     - `GEMINI_MODEL=gemini-2.5-flash-lite`
     - `CORS_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173"]`
   - Completion: `/api/v1/health` responds from browser and PowerShell.

7. [ ] Configure frontend environment
   - Severity: Critical
   - Area: Frontend
   - File: `frontend_updated/frontend_/.env`
   - Reason: React must call the correct FastAPI and Spring URLs.
   - Required values:
     - `VITE_AI_API_URL=http://127.0.0.1:8000/api/v1`
     - `VITE_SPRING_API_URL=http://127.0.0.1:8080/api/v1`
   - Completion: frontend network calls target `/api/v1` for both backends.

8. [ ] Configure Spring environment variables
   - Severity: Critical
   - Area: Spring Boot
   - Reason: Spring requires MongoDB URI and a secure JWT secret.
   - Required values:
     - `MONGODB_URI=mongodb://localhost:27017/healthwise`
     - `JWT_SECRET=<32+ character secure secret>`
   - Completion: Spring starts and authentication endpoints work.

## Phase 3 - Backend Startup Checks

9. [ ] Start MongoDB
   - Severity: Critical
   - Area: Database
   - Command: start local MongoDB service
   - Completion: MongoDB accepts connections.

10. [ ] Start Spring Boot backend
    - Severity: Critical
    - Area: Spring Boot
    - Path: `healthwise-spring-backend/healthwise-spring-backend`
    - Command: `mvn spring-boot:run`
    - Completion: server runs on `http://127.0.0.1:8080`.

11. [ ] Start FastAPI backend
    - Severity: Critical
    - Area: FastAPI
    - Path: `health-ai-backend/health-ai-backend`
    - Command: `uvicorn app.main:app --host 0.0.0.0 --port 8000`
    - Completion: server runs on `http://127.0.0.1:8000`.

12. [ ] Start React frontend
    - Severity: Critical
    - Area: Frontend
    - Path: `frontend_updated/frontend_`
    - Command: `npm run dev`
    - Completion: app runs on `http://localhost:5173`.

## Phase 4 - Authentication Flow

13. [ ] Register or seed a test user
    - Severity: Critical
    - Area: Spring Boot / Frontend
    - Reason: The UI shows a demo account, but Spring may not automatically create it.
    - Endpoint: `POST /api/v1/auth/register`
    - Completion: user can register and receive tokens.

14. [ ] Verify login
    - Severity: Critical
    - Area: Frontend / Spring Boot
    - Endpoint: `POST /api/v1/auth/login`
    - Expected response: `accessToken`, `refreshToken`, `tokenType`
    - Completion: frontend stores token and navigates to dashboard.

15. [ ] Verify authenticated user lookup
    - Severity: High
    - Area: Frontend / Spring Boot
    - Endpoint: `GET /api/v1/users/me`
    - Header: `Authorization: Bearer <accessToken>`
    - Completion: frontend stores current user ID.

16. [ ] Verify protected Spring calls include JWT
    - Severity: Critical
    - Area: Frontend
    - Files:
      - `frontend_updated/frontend_/src/lib/api.js`
    - Completion: dashboard, save recommendation, save report, and save analysis all send `Authorization`.

## Phase 5 - Recommendation Flow

17. [ ] Complete questionnaire UI flow
    - Severity: High
    - Area: Frontend
    - File: `frontend_updated/frontend_/src/pages/HealthAssessment_10.jsx`
    - Completion: questionnaire is saved in `sessionStorage` as `healthwise_questionnaire`.

18. [ ] Verify FastAPI recommendation request
    - Severity: Critical
    - Area: Frontend / FastAPI
    - Endpoint: `POST /api/v1/recommendations`
    - Payload: questionnaire with `stage1`, `stage2`, `stage3`
    - Completion: FastAPI returns `summary` and `recommendations`.

19. [ ] Verify recommendation response rendering
    - Severity: High
    - Area: Frontend
    - File: `frontend_updated/frontend_/src/pages/LabRecommendations.jsx`
    - Completion: cards render `test_name`, `category`, `priority`, `reason_from_rules`, `personalized_explanation`.

20. [ ] Verify optional recommendation save
    - Severity: Critical
    - Area: Frontend / Spring Boot / MongoDB
    - Expected sequence:
      - `POST /api/v1/questionnaires`
      - `POST /api/v1/recommendations`
    - Completion: MongoDB contains questionnaire and recommendation history linked by `questionnaireId`.

## Phase 6 - Report Analysis Flow

21. [ ] Verify PDF upload UI
    - Severity: High
    - Area: Frontend
    - File: `frontend_updated/frontend_/src/pages/ReportAnalysis.jsx`
    - Completion: only PDF files are accepted.

22. [ ] Verify FastAPI multipart report request
    - Severity: Critical
    - Area: Frontend / FastAPI
    - Endpoint: `POST /api/v1/report-analysis`
    - Content-Type: multipart form data
    - Fields:
      - `report_file`
      - `questionnaire`
    - Completion: FastAPI accepts file and questionnaire.

23. [ ] Verify PDF extraction and anonymization
    - Severity: Critical
    - Area: FastAPI
    - Files:
      - `health-ai-backend/health-ai-backend/app/services/report_analysis_service.py`
      - `health-ai-backend/health-ai-backend/app/llm/anonymizer.py`
    - Completion: PyMuPDF extracts text and Presidio anonymizes before Gemini.

24. [ ] Verify report analysis rendering
    - Severity: High
    - Area: Frontend
    - File: `frontend_updated/frontend_/src/pages/ReportAnalysis.jsx`
    - Completion: UI renders `overall_status`, `summary`, findings, lifestyle guidance, doctor consultation, disclaimer.

25. [ ] Verify optional report analysis save
    - Severity: Critical
    - Area: Frontend / Spring Boot / MongoDB
    - Expected sequence:
      - `POST /api/v1/reports`
      - `POST /api/v1/analysis`
    - Completion: MongoDB contains report metadata and analysis history linked by `reportId`.

## Phase 7 - Dashboard Flow

26. [ ] Verify dashboard API
    - Severity: High
    - Area: Spring Boot
    - Endpoint: `GET /api/v1/dashboard`
    - Header: `Authorization: Bearer <accessToken>`
    - Completion: API returns latest questionnaire, recommendation, report, analysis, counts, and timeline.

27. [ ] Verify dashboard UI contract
    - Severity: High
    - Area: Frontend
    - File: `frontend_updated/frontend_/src/pages/Dashboard.jsx`
    - Completion: dashboard renders Spring `DashboardResponse` fields correctly.

28. [ ] Verify dashboard timeline
    - Severity: Medium
    - Area: Spring Boot / Frontend
    - Files:
      - `healthwise-spring-backend/healthwise-spring-backend/src/main/java/com/healthwise/timeline/service/TimelineService.java`
      - `frontend_updated/frontend_/src/pages/Dashboard.jsx`
    - Completion: saved questionnaire, recommendation, report, and analysis appear in timeline order.

## Phase 8 - API Contract Tests

29. [ ] Test all FastAPI endpoints manually
    - Severity: High
    - Endpoints:
      - `GET /api/v1/health`
      - `POST /api/v1/recommendations`
      - `POST /api/v1/report-analysis`
    - Completion: all return expected status codes and response shapes.

30. [ ] Test all Spring auth endpoints manually
    - Severity: High
    - Endpoints:
      - `POST /api/v1/auth/register`
      - `POST /api/v1/auth/login`
      - `POST /api/v1/auth/refresh`
      - `POST /api/v1/auth/logout`
    - Completion: token lifecycle works.

31. [ ] Test all Spring CRUD/history endpoints manually
    - Severity: High
    - Endpoints:
      - `/api/v1/questionnaires`
      - `/api/v1/recommendations`
      - `/api/v1/reports`
      - `/api/v1/analysis`
      - `/api/v1/dashboard`
      - `/api/v1/users/me`
    - Completion: protected endpoints require JWT and work with valid JWT.

32. [ ] Add automated contract tests
    - Severity: Medium
    - Area: Full system
    - Suggested coverage:
      - frontend service payload builders
      - FastAPI schema validation
      - Spring DTO validation
      - dashboard response mapping
    - Completion: repeatable tests catch future contract drift.

## Phase 9 - Security Hardening

33. [ ] Replace development JWT secret
    - Severity: High
    - Area: Spring Boot
    - File: `healthwise-spring-backend/healthwise-spring-backend/src/main/resources/application.yml`
    - Reason: default secret is predictable.
    - Completion: production/local env always provides a secure secret.

34. [ ] Confirm password policy in UI and API
    - Severity: Medium
    - Area: Frontend / Spring Boot
    - Reason: Spring register requires password min length 12, while UI text may show shorter sample credentials.
    - Completion: UI sample and validation match Spring requirements.

35. [ ] Confirm CORS origins for deployment
    - Severity: Medium
    - Area: FastAPI / Spring Boot
    - Reason: current origins are local development only.
    - Completion: production frontend origin is explicitly configured.

36. [ ] Protect sensitive environment files
    - Severity: High
    - Area: Repository hygiene
    - Reason: `.env` may contain API keys.
    - Completion: secrets are not committed or shared.

37. [ ] Validate uploaded report size and file type end to end
    - Severity: High
    - Area: Frontend / FastAPI
    - Completion: invalid type, unsafe filename, oversize file, and non-PDF bytes are rejected.

## Phase 10 - Performance and Reliability

38. [ ] Optimize dashboard count queries
    - Severity: Medium
    - Area: Spring Boot
    - File: `healthwise-spring-backend/healthwise-spring-backend/src/main/java/com/healthwise/dashboard/service/DashboardService.java`
    - Reason: analysis count currently loads records and calls `.size()`.
    - Suggested fix: add repository count method.
    - Completion: dashboard counts use database count queries.

39. [ ] Add loading and retry states for AI calls
    - Severity: Medium
    - Area: Frontend
    - Reason: Gemini/report analysis can take time.
    - Completion: user sees clear loading, failure, and retry options.

40. [ ] Confirm no duplicate API calls during navigation
    - Severity: Medium
    - Area: Frontend
    - Completion: React pages do not repeatedly call AI or dashboard endpoints unnecessarily.

41. [ ] Test large PDF handling
    - Severity: Medium
    - Area: FastAPI
    - Completion: large but valid PDFs process within limits and failures return useful errors.

## Phase 11 - Code Quality Cleanup

42. [ ] Format Spring Java files
    - Severity: Low
    - Area: Spring Boot
    - Reason: many classes are compressed into single-line files, making maintenance harder.
    - Completion: Java files are formatted consistently.

43. [ ] Remove generated frontend `dist` from source tracking
    - Severity: Low
    - Area: Frontend
    - Reason: generated build output should not usually live in source.
    - Completion: `dist` is ignored unless intentionally deployed from repo.

44. [ ] Normalize mojibake/encoded UI text
    - Severity: Low
    - Area: Frontend
    - Reason: several UI icons/text strings display corrupted characters.
    - Completion: visible UI copy and icons render cleanly.

45. [ ] Split large questionnaire component later
    - Severity: Low
    - Area: Frontend
    - File: `frontend_updated/frontend_/src/pages/HealthAssessment_10.jsx`
    - Reason: very large component is harder to maintain.
    - Completion: split only after integration is stable.

## Phase 12 - Final End-to-End Acceptance

46. [ ] Full questionnaire recommendation test
    - Severity: Critical
    - Flow: login -> questionnaire -> FastAPI recommendations -> render -> save -> dashboard
    - Completion: recommendation appears in MongoDB and dashboard.

47. [ ] Full report analysis test
    - Severity: Critical
    - Flow: login -> upload PDF -> FastAPI analysis -> render -> save -> dashboard
    - Completion: report and analysis appear in MongoDB and dashboard.

48. [ ] Verify responsibility boundaries
    - Severity: Critical
    - Checks:
      - FastAPI has no MongoDB writes.
      - FastAPI has no Spring calls.
      - Spring has no FastAPI calls.
      - React orchestrates AI and persistence.
    - Completion: architecture matches the required design.

49. [ ] Final build verification
    - Severity: Critical
    - Commands:
      - `npm run build`
      - `python -m compileall app`
      - `mvn test`
    - Completion: all builds/tests pass.

50. [ ] Final manual browser verification
    - Severity: Critical
    - Browser URL: `http://localhost:5173`
    - Completion: no console errors, no failed CORS preflights, no broken navigation, and all expected flows work.

