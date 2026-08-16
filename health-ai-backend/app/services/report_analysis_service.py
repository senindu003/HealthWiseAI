"""Application service for safe, separated laboratory-report analysis."""

import logging
import os
import pymupdf as fitz
import tempfile
from asyncio import to_thread
from functools import lru_cache
from pathlib import Path

from app.graph.report_workflow import build_report_analysis_graph
from app.llm.anonymizer import anonymize_report_markdown
from app.config import get_settings
from app.schemas.report import ReportAnalysisResponse, ReportAnalysisUploadRequest

logger = logging.getLogger(__name__)


class ReportAnalysisService:
    """Runs Presidio anonymization before the report-specific LangGraph workflow."""

    def __init__(self) -> None:
        """Compile the immutable report-analysis workflow once."""

        self._graph = build_report_analysis_graph()

    async def analyze(self, request: ReportAnalysisUploadRequest) -> ReportAnalysisResponse:
        """Convert an uploaded PDF internally and analyze it without exposing Markdown.

        Raises:
            RuntimeError: If the graph does not produce a validated final response.
        """

        if not isinstance(request, ReportAnalysisUploadRequest):
            raise TypeError("request must be a ReportAnalysisUploadRequest")
        settings = get_settings()
        if len(request.report_pdf) > settings.report_max_file_size_bytes:
            raise ValueError("report_file exceeds the configured maximum upload size")
        markdown = await to_thread(_convert_pdf_to_markdown, request.report_pdf, request.report_filename)
        anonymized_markdown = anonymize_report_markdown(markdown)
        logger.info("Starting anonymized laboratory-report analysis")
        result = await self._graph.ainvoke(
            {
                "anonymized_markdown": anonymized_markdown,
                "questionnaire": request.questionnaire.as_clinical_context(),
            }
        )
        final_response = result.get("final_response")
        if not isinstance(final_response, ReportAnalysisResponse):
            raise RuntimeError("Report analysis workflow returned no valid final response")
        return final_response


@lru_cache
def get_report_analysis_service() -> ReportAnalysisService:
    """Provide a cached report service instance for FastAPI dependency injection."""

    return ReportAnalysisService()


def _convert_pdf_to_markdown(pdf_bytes: bytes, filename: str) -> str:
    """
    Convert an uploaded PDF into Markdown-like text using PyMuPDF.

    The output preserves page boundaries and is intended for downstream
    Presidio anonymization and LLM processing.
    """

    temporary_path: Path | None = None

    try:
        # Save uploaded PDF temporarily
        with tempfile.NamedTemporaryFile(
            suffix=".pdf",
            prefix="healthwise_report_",
            delete=False,
        ) as temporary_file:
            temporary_file.write(pdf_bytes)
            temporary_path = Path(temporary_file.name)

        markdown_parts: list[str] = []

        # Automatically closes the PDF after reading
        with fitz.open(str(temporary_path)) as document:

            for page_number, page in enumerate(document, start=1):

                page_text = page.get_text("text").strip()

                # Skip completely blank pages
                if not page_text:
                    continue

                markdown_parts.append(
                    f"# Page {page_number}\n\n{page_text}"
                )

        markdown = "\n\n".join(markdown_parts).strip()

        if not markdown:
            raise RuntimeError(
                f"PyMuPDF could not extract readable text from '{filename}'."
            )

        logger.info(
            "Successfully converted '%s' to Markdown-like text using PyMuPDF.",
            filename,
        )

        return markdown

    except RuntimeError:
        raise

    except Exception as exc:
        raise RuntimeError(
            f"PyMuPDF failed to convert '{filename}'."
        ) from exc

    finally:
        if temporary_path and temporary_path.exists():
            try:
                temporary_path.unlink()
            except Exception as cleanup_error:
                logger.warning(
                    "Could not delete temporary PDF '%s': %s",
                    temporary_path,
                    cleanup_error,
                )