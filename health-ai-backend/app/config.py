"""Application configuration loaded exclusively from environment variables."""

from functools import lru_cache
from pathlib import Path

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

# Project root directory (health-ai-backend/)
BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Runtime settings for the API and its configured LLM providers."""

    model_config = SettingsConfigDict(
        env_file=BASE_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = Field(
        default="Health AI Backend",
        validation_alias="APP_NAME",
    )

    environment: str = Field(
        default="development",
        validation_alias="ENVIRONMENT",
    )

    host: str = Field(
        default="0.0.0.0",
        validation_alias="HOST",
    )

    port: int = Field(
        default=8000,
        ge=1,
        le=65535,
        validation_alias="PORT",
    )

    log_level: str = Field(
        default="INFO",
        validation_alias="LOG_LEVEL",
    )

    google_api_key: SecretStr = Field(
        default=SecretStr(""),
        validation_alias="GOOGLE_API_KEY",
    )

    gemini_model: str = Field(
        default="gemini-2.5-flash-lite",
        validation_alias="GEMINI_MODEL",
    )

    gemini_temperature: float = Field(
        default=0.2,
        ge=0.0,
        le=2.0,
        validation_alias="GEMINI_TEMPERATURE",
    )

    gemini_timeout_seconds: float = Field(
        default=45.0,
        gt=0,
        validation_alias="GEMINI_TIMEOUT_SECONDS",
    )

    deepseek_api_key: SecretStr = Field(
        default=SecretStr(""),
        validation_alias="DEEPSEEK_API_KEY",
    )

    deepseek_model: str = Field(
        default="deepseek-v4-flash",
        validation_alias="DEEPSEEK_MODEL",
    )

    deepseek_temperature: float = Field(
        default=0.2,
        ge=0.0,
        le=2.0,
        validation_alias="DEEPSEEK_TEMPERATURE",
    )

    deepseek_timeout_seconds: float = Field(
        default=45.0,
        gt=0,
        validation_alias="DEEPSEEK_TIMEOUT_SECONDS",
    )

    openai_api_key: SecretStr = Field(
        default=SecretStr(""),
        validation_alias="OPENAI_API_KEY",
    )

    openai_model: str = Field(
        default="gpt-4o-mini",
        validation_alias="OPENAI_MODEL",
    )

    openai_temperature: float = Field(
        default=0.2,
        ge=0.0,
        le=2.0,
        validation_alias="OPENAI_TEMPERATURE",
    )

    openai_timeout_seconds: float = Field(
        default=45.0,
        gt=0,
        validation_alias="OPENAI_TIMEOUT_SECONDS",
    )
    
    groq_api_key: SecretStr = Field(
            default=SecretStr(""),
            validation_alias="GROQ_API_KEY",
        )
    
    groq_model: str = Field(
        default="llama-3.1-8b-instant",
        validation_alias="GROQ_MODEL",
    )

    groq_temperature: float = Field(
        default=0.2,
        ge=0.0,
        le=2.0,
        validation_alias="GROQ_TEMPERATURE",
    )

    groq_timeout_seconds: float = Field(
        default=45.0,
        gt=0,
        validation_alias="GROQ_TIMEOUT_SECONDS",
    )


    llm_max_retries: int = Field(
        default=3,
        ge=1,
        le=5,
        validation_alias="LLM_MAX_RETRIES",
    )

    report_max_file_size_bytes: int = Field(
        default=20_000_000,
        ge=1_000_000,
        le=100_000_000,
        validation_alias="REPORT_MAX_FILE_SIZE_BYTES",
    )

    report_upload_chunk_size_bytes: int = Field(
        default=1_048_576,
        ge=65_536,
        le=8_388_608,
        validation_alias="REPORT_UPLOAD_CHUNK_SIZE_BYTES",
    )

    cors_origins: list[str] = Field(
        default=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
        validation_alias="CORS_ORIGINS",
    )


@lru_cache
def get_settings() -> Settings:
    """Return the process-wide validated settings singleton."""
    return Settings()
