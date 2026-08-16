"""FastAPI endpoints for health questionnaire recommendations."""

import logging
import json
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.schemas.questionnaire import QuestionnaireRequest
from app.schemas.response import RecommendationResponse
from app.schemas.report import ReportAnalysisResponse, ReportAnalysisUploadRequest
from app.config import get_settings
from app.services.report_analysis_service import ReportAnalysisService, get_report_analysis_service
from app.services.recommendation_service import RecommendationService, get_recommendation_service

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


@router.post("/recommendations", response_model=RecommendationResponse, status_code=status.HTTP_200_OK)
async def create_recommendations(
    questionnaire: QuestionnaireRequest,
    service: Annotated[RecommendationService, Depends(get_recommendation_service)],
) -> RecommendationResponse:
    """Evaluate a questionnaire and return structured lab-test recommendations."""

    try:
        return await service.recommend(questionnaire)
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
    report_file: Annotated[UploadFile, File(...)],
    questionnaire: Annotated[str, Form(...)],
    service: Annotated[ReportAnalysisService, Depends(get_report_analysis_service)],
) -> ReportAnalysisResponse:
    """Accept a report PDF and questionnaire; Markdown remains an internal backend detail."""

    try:
        allowed_content_types = {"application/pdf", "application/x-pdf", "application/octet-stream"}
        if report_file.content_type not in allowed_content_types:
            raise ValueError("report_file must have a PDF content type")
        filename = report_file.filename or ""
        pdf_bytes = await _read_report_pdf(report_file)
        try:
            questionnaire_payload = json.loads(questionnaire)
        except json.JSONDecodeError as exc:
            raise ValueError("questionnaire must be valid JSON") from exc
        request = ReportAnalysisUploadRequest(
            report_filename=filename,
            report_pdf=pdf_bytes,
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
