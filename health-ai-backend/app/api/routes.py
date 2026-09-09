"""FastAPI endpoints for health questionnaire recommendations."""

import logging
import json
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.schemas.questionnaire import QuestionnaireRequest
from app.schemas.response import RecommendationResponse
from app.schemas.report import ReportAnalysisResponse, ReportAnalysisUploadRequest
from app.schemas.symptom_chat import SymptomChatTurnRequest, SymptomChatTurnResponse
from app.config import get_settings
from app.knowledge_graph.client import get_knowledge_graph_status
from app.knowledge_graph.safety_evaluator import SafetyRuleMatched
from app.services.report_analysis_service import ReportAnalysisService, get_report_analysis_service
from app.services.recommendation_service import RecommendationService, get_recommendation_service
from app.services.symptom_chat_service import SymptomChatService, get_symptom_chat_service
from app.services.stage4_result_signer import Stage4ResultSigner
from app.services.stage4_evidence_bundle_service import GroundedEvidenceUnavailableError

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1", tags=["recommendations"])


async def _read_report_pdf(upload: UploadFile) -> bytes:
    """Read a PDF upload with a configured limit before retaining it in memory."""

    settings = get_settings()
    chunks: list[bytes] = []
    total_size = 0
    while chunk := await upload.read(settings.report_upload_chunk_size_bytes):
        total_size += len(chunk)
        if total_size > settings.report_max_file_size_bytes:
            raise ValueError("report_file exceeds the configured maximum upload size")
        chunks.append(chunk)
    return b"".join(chunks)


@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check() -> dict[str, str]:
    """Return a lightweight liveness response without contacting any LLM."""

    return {"status": "ok"}


@router.get("/knowledge-graph/status", status_code=status.HTTP_200_OK)
async def knowledge_graph_status() -> dict[str, object]:
    """Return only operational metadata for the curated evidence graph.

    It deliberately exposes no patient data and does not make draft clinical
    evidence eligible for the recommendation workflow.
    """

    return get_knowledge_graph_status()


@router.post("/symptom-chat/turn", response_model=SymptomChatTurnResponse, status_code=status.HTTP_200_OK)
async def symptom_chat_turn(
    request: SymptomChatTurnRequest,
    service: Annotated[SymptomChatService, Depends(get_symptom_chat_service)],
) -> SymptomChatTurnResponse:
    """Clarify Stage 3 symptoms under server-controlled safety and turn limits."""

    try:
        return await service.respond(request)
    except ValueError as exc:
        logger.warning("Invalid symptom-chat input: %s", exc)
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except RuntimeError as exc:
        logger.exception("Symptom chat generation failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to continue the symptom clarification chat at this time.",
        ) from exc


@router.post("/recommendations", response_model=RecommendationResponse, status_code=status.HTTP_200_OK)
async def create_recommendations(
    questionnaire: QuestionnaireRequest,
    service: Annotated[RecommendationService, Depends(get_recommendation_service)],
) -> RecommendationResponse:
    """Evaluate a questionnaire and return structured lab-test recommendations."""

    try:
        result = await service.recommend(questionnaire)
        return result.model_copy(update={"validation_token": Stage4ResultSigner().sign(result)})
    except SafetyRuleMatched as exc:
        logger.warning("Recommendation generation blocked by safety rule(s): %s", [match.safety_rule_id for match in exc.result.matched_rules])
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=exc.result.as_api_detail(),
        ) from exc
    except GroundedEvidenceUnavailableError as exc:
        logger.warning("Stage 4 evidence unavailable: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"code": "EVIDENCE_UNAVAILABLE", "message": "Citation-supported evidence is unavailable for this review. No recommendation was generated."},
        ) from exc
    except (ValueError, TypeError) as exc:
        logger.warning("Invalid recommendation workflow input: %s", exc)
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Recommendation generation failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to generate recommendations at this time.",
        ) from exc


@router.post("/report-analysis", response_model=ReportAnalysisResponse, status_code=status.HTTP_200_OK)
async def analyze_report(
    report_files: Annotated[list[UploadFile], File(...)],
    questionnaire: Annotated[str, Form(...)],
    service: Annotated[ReportAnalysisService, Depends(get_report_analysis_service)],
) -> ReportAnalysisResponse:
    """Accept a report PDF and questionnaire; Markdown remains an internal backend detail."""

    try:
        if not report_files:
            raise ValueError("Upload at least one PDF laboratory report")
        allowed_content_types = {"application/pdf", "application/x-pdf", "application/octet-stream"}
        if any(report_file.content_type not in allowed_content_types for report_file in report_files):
            raise ValueError("Every report file must have a PDF content type")
        filenames = [report_file.filename or "" for report_file in report_files]
        pdf_bytes = [await _read_report_pdf(report_file) for report_file in report_files]
        try:
            questionnaire_payload = json.loads(questionnaire)
        except json.JSONDecodeError as exc:
            raise ValueError("questionnaire must be valid JSON") from exc
        request = ReportAnalysisUploadRequest(
            report_filenames=filenames,
            report_pdfs=pdf_bytes,
            questionnaire=QuestionnaireRequest.model_validate(questionnaire_payload),
        )
        return await service.analyze(request)
    except (ValueError, TypeError) as exc:
        logger.warning("Invalid report-analysis input: %s", exc)
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except RuntimeError as exc:
        logger.exception("Report analysis infrastructure or validation failure")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to analyze the report at this time.",
        ) from exc
    except Exception as exc:
        logger.exception("Unexpected report analysis failure")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred while analyzing the report.",
        ) from exc
