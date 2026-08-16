"""Provider-specific LangChain clients and safe structured-output invocation."""

import logging
from asyncio import sleep
from collections.abc import Callable
from functools import lru_cache
from typing import Any, TypeVar

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
    """Return Gemini's ``gemini-2.5-flash-lite`` critic client."""

    settings: Settings = get_settings()
    api_key = _required_secret(settings.google_api_key.get_secret_value(), "GOOGLE_API_KEY")
    logger.info("Initializing Gemini critic model '%s'", settings.gemini_model)
    return ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        api_key=api_key,
        temperature=settings.gemini_temperature,
        request_timeout=settings.gemini_timeout_seconds,
        retries=settings.llm_max_retries,
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
        timeout=settings.openai_timeout_seconds,
        max_retries=settings.llm_max_retries,
    )


async def invoke_structured(prompt: str, schema: type[ModelT], llm_factory: LLMFactory) -> ModelT:
    """Invoke the selected provider with retries and validate its JSON response."""

    if not isinstance(prompt, str) or not prompt.strip():
        raise ValueError("prompt must be non-empty text")
    settings = get_settings()
    last_error: Exception | None = None
    for attempt in range(1, settings.llm_max_retries + 1):
        try:
            response = await llm_factory().ainvoke(prompt)
            return parse_model_output(response.content, schema)  # type: ignore[arg-type, return-value]
        except Exception as exc:
            last_error = exc
            logger.warning("Structured request failed (attempt %d/%d): %s", attempt, settings.llm_max_retries, exc)
            if attempt < settings.llm_max_retries:
                await sleep(attempt)
    raise RuntimeError("Selected LLM did not produce valid structured output") from last_error
