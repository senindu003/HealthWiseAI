"""Presidio-based Markdown anonymization for laboratory reports."""

import logging
import re
from functools import lru_cache

import tldextract
from presidio_analyzer import AnalyzerEngine, Pattern, PatternRecognizer
from presidio_analyzer.nlp_engine import NlpEngineProvider
from presidio_anonymizer import AnonymizerEngine
from presidio_anonymizer.entities import OperatorConfig

logger = logging.getLogger(__name__)

_TARGET_ENTITIES = ["PERSON", "PHONE_NUMBER", "EMAIL_ADDRESS", "LOCATION", "NIC", "PASSPORT", "DOCTOR", "HOSPITAL"]
# Presidio's email recognizer calls the module-level extractor.  Using its bundled suffix
# snapshot avoids an unnecessary network request during a privacy-critical local operation.
tldextract.extract = tldextract.TLDExtract(suffix_list_urls=())


def _custom_recognizers() -> list[PatternRecognizer]:
    """Create recognizers for regional IDs and report-specific organisations."""

    return [
        PatternRecognizer(
            supported_entity="NIC",
            patterns=[Pattern("sri_lankan_nic", r"\b(?:\d{9}[VvXx]|\d{12})\b", 0.85)],
        ),
        PatternRecognizer(
            supported_entity="PASSPORT",
            patterns=[Pattern("passport", r"\b[A-Z]{1,2}\d{6,8}\b", 0.65)],
        ),
        PatternRecognizer(
            supported_entity="DOCTOR",
            patterns=[Pattern("doctor_name", r"\b(?:Dr\.?|Doctor)\s+[A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,3}", 0.8)],
        ),
        PatternRecognizer(
            supported_entity="HOSPITAL",
            patterns=[Pattern("hospital_name", r"\b[A-Z][A-Za-z&,' -]{2,70}\s+(?:Hospital|Clinic|Medical Centre|Medical Center|Laboratory|Lab)\b", 0.75)],
        ),
    ]


@lru_cache
def _get_analyzer() -> AnalyzerEngine:
    """Build the cached Presidio analyzer with report-specific PII recognizers."""

    try:
        import spacy

        # Fail immediately if the model is not installed.
        spacy.load("en_core_web_sm")

    except OSError as exc:
        raise RuntimeError(
            "spaCy model 'en_core_web_sm' is not installed.\n"
            "Run:\n"
            "python -m spacy download en_core_web_sm"
        ) from exc

    provider = NlpEngineProvider(
        nlp_configuration={
            "nlp_engine_name": "spacy",
            "models": [
                {
                    "lang_code": "en",
                    "model_name": "en_core_web_sm",
                }
            ],
        }
    )

    analyzer = AnalyzerEngine(
        nlp_engine=provider.create_engine()
    )

    for recognizer in _custom_recognizers():
        analyzer.registry.add_recognizer(recognizer)

    return analyzer


@lru_cache
def _get_anonymizer() -> AnonymizerEngine:
    """Build the cached Presidio anonymizer."""

    return AnonymizerEngine()


def anonymize_report_markdown(markdown: str) -> str:
    """Replace PII in report Markdown while retaining laboratory data and dates.

    Dates are intentionally excluded from the entity list because report dates are clinically
    relevant to interpretation. The function never sends unredacted text to an LLM.
    """

    if not isinstance(markdown, str) or not markdown.strip():
        raise ValueError("markdown must be non-empty text")
    try:
        findings = _get_analyzer().analyze(text=markdown, entities=_TARGET_ENTITIES, language="en")
        result = _get_anonymizer().anonymize(
            text=markdown,
            analyzer_results=findings,
            operators={entity: OperatorConfig("replace", {"new_value": f"<{entity}>"}) for entity in _TARGET_ENTITIES},
        )
    except Exception as exc:
        raise RuntimeError("Presidio anonymization failed; report was not sent to the LLM") from exc
    # Mask labelled identities which can evade a generic NER model, without touching result rows.
    sanitized = re.sub(r"(?im)^(patient|name|address|doctor|hospital)\s*:\s*[^\n]+", r"\1: <PII>", result.text)
    logger.info("Anonymized laboratory report before LLM processing; %d PII entities replaced", len(findings))
    return sanitized
