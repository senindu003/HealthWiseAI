"""Provider-specific LangChain clients and safe structured-output invocation."""

import logging
from asyncio import sleep
from collections.abc import Callable
from functools import lru_cache
from typing import Any, TypeVar

from pydantic import BaseModel

from langchain_deepseek import ChatDeepSeek
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from langchain_groq import ChatGroq

from app.config import Settings, get_settings
from app.llm.parser import parse_model_output

logger = logging.getLogger(__name__)
ModelT = TypeVar("ModelT")
LLMFactory = Callable[[], Any]


def _required_secret(value: str, variable: str) -> str:
    if not value:
        raise RuntimeError(f"{variable} must be configured before generating recommendations")
    return value



@lru_cache
def get_evaluator_llm() -> ChatGoogleGenerativeAI:
    """Return Gemini's ``gemini-2.5-flash-lite`` evaluator client."""

    settings: Settings = get_settings()
    api_key = _required_secret(settings.google_api_key.get_secret_value(), "GOOGLE_API_KEY")
    logger.info("Initializing Gemini critic model '%s'", settings.gemini_model)
    return ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        api_key=api_key,
        temperature=settings.gemini_temperature,
        max_output_tokens=settings.gemini_max_output_tokens,
        request_timeout=settings.gemini_timeout_seconds,
        retries=settings.llm_max_retries,
    )


@lru_cache
def get_symptom_chat_llm() -> ChatGoogleGenerativeAI:
    """Return the constrained Gemini client used only for Stage 3 clarification."""

    settings: Settings = get_settings()
    api_key = _required_secret(settings.google_api_key.get_secret_value(), "GOOGLE_API_KEY")
    logger.info("Initializing Gemini symptom-chat model '%s'", settings.symptom_chat_gemini_model)
    return ChatGoogleGenerativeAI(
        model=settings.symptom_chat_gemini_model,
        api_key=api_key,
        temperature=0.1,
        max_output_tokens=settings.symptom_chat_max_output_tokens,
        request_timeout=settings.gemini_timeout_seconds,
        retries=settings.llm_max_retries,
    )
    

@lru_cache
def get_deepseek_llm() -> ChatDeepSeek:
    """Return the DeepSeek structured-output fallback client."""

    settings: Settings = get_settings()
    api_key = _required_secret(
        settings.deepseek_api_key.get_secret_value(), "DEEPSEEK_API_KEY"
    )
    logger.info("Initializing DeepSeek fallback model '%s'", settings.deepseek_model)
    return ChatDeepSeek(
        model=settings.deepseek_model,
        api_key=api_key,
        temperature=settings.deepseek_temperature,
        max_tokens=settings.deepseek_max_tokens,
        timeout=settings.deepseek_timeout_seconds,
        max_retries=settings.llm_max_retries,
    )

    

@lru_cache
def get_criticizer_llm() -> ChatGroq:
    """Return Groq's Llama 3.1 8B Instant evaluator client."""

    settings: Settings = get_settings()

    api_key = _required_secret(
        settings.groq_api_key.get_secret_value(),
        "GROQ_API_KEY"
    )

    logger.info(
        "Initializing Groq evaluator model '%s'",
        settings.groq_model
    )

    return ChatGroq(
        model=settings.groq_model,
        api_key=api_key,
        temperature=settings.groq_temperature,
        max_tokens=settings.groq_max_tokens,
        timeout=settings.groq_timeout_seconds,
        max_retries=settings.llm_max_retries,
    )


@lru_cache
def get_optimizer_llm() -> ChatOpenAI:
    """Return OpenAI's ``gpt-4o-mini`` optimizer client."""

    settings: Settings = get_settings()
    api_key = _required_secret(settings.openai_api_key.get_secret_value(), "OPENAI_API_KEY")
    logger.info("Initializing OpenAI optimizer model '%s'", settings.openai_model)
    return ChatOpenAI(
        model=settings.openai_model,
        api_key=api_key,
        temperature=settings.openai_temperature,
        max_tokens=settings.openai_max_tokens,
        timeout=settings.openai_timeout_seconds,
        max_retries=settings.llm_max_retries,
    )


async def invoke_structured(
    prompt: str,
    schema: type[ModelT],
    llm_factory: LLMFactory,
    fallback_llm_factory: LLMFactory | None = get_deepseek_llm,
) -> ModelT:
    """Return validated structured output, falling back to DeepSeek after primary retries.

    The fallback is invoked only after the primary provider exhausts all retries,
    including failures caused by invalid JSON or schema validation.  It is never
    used as a silent replacement when the primary succeeds.
    """

    if not isinstance(prompt, str) or not prompt.strip():
        raise ValueError("prompt must be non-empty text")
    settings = get_settings()
    try:
        return await _invoke_with_retries(prompt, schema, llm_factory, settings.llm_max_retries)
    except Exception as primary_error:
        if fallback_llm_factory is None or llm_factory is fallback_llm_factory:
            raise RuntimeError("Selected LLM did not produce valid structured output") from primary_error
        logger.warning(
            "Primary LLM '%s' exhausted %d attempts; trying DeepSeek fallback.",
            getattr(llm_factory, "__name__", "primary"),
            settings.llm_max_retries,
        )
        try:
            return await _invoke_with_retries(prompt, schema, fallback_llm_factory, settings.llm_max_retries)
        except Exception as fallback_error:
            logger.error("DeepSeek fallback also failed after %d attempts.", settings.llm_max_retries)
            raise RuntimeError("No configured LLM could produce valid structured output") from fallback_error


async def invoke_structured_once(
    prompt: str,
    schema: type[ModelT],
    llm_factory: LLMFactory,
) -> ModelT:
    """Make one native structured-output call and validate it with Pydantic.

    This is intentionally separate from ``invoke_structured``. It is for flows
    such as Stage 3 where product behaviour requires exactly one LLM request,
    with no parser retry and no provider fallback.
    """

    if not isinstance(prompt, str) or not prompt.strip():
        raise ValueError("prompt must be non-empty text")
    if not isinstance(schema, type) or not issubclass(schema, BaseModel):
        raise TypeError("schema must be a Pydantic model class")

    model = llm_factory()
    structured_model = model.with_structured_output(schema, method="json_schema")
    result = await structured_model.ainvoke(prompt)
    if isinstance(result, schema):
        return result
    return schema.model_validate(result)


async def _invoke_with_retries(
    prompt: str, schema: type[ModelT], llm_factory: LLMFactory, max_attempts: int
) -> ModelT:
    """Invoke one provider repeatedly without leaking prompt content to logs."""

    last_error: Exception | None = None
    for attempt in range(1, max_attempts + 1):
        try:
            response = await llm_factory().ainvoke(prompt)
            return parse_model_output(response.content, schema)  # type: ignore[arg-type, return-value]
        except Exception as exc:
            last_error = exc
            logger.warning(
                "Structured request to '%s' failed (attempt %d/%d): %s",
                getattr(llm_factory, "__name__", "provider"),
                attempt,
                max_attempts,
                exc,
            )
            if attempt < max_attempts:
                await sleep(attempt)
    raise RuntimeError("Selected LLM did not produce valid structured output") from last_error
