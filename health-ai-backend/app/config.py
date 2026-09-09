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

    gemini_max_output_tokens: int = Field(
        default=4096,
        ge=256,
        le=8192,
        validation_alias="GEMINI_MAX_OUTPUT_TOKENS",
    )

    symptom_chat_gemini_model: str = Field(
        default="gemini-3.1-flash-lite",
        validation_alias="SYMPTOM_CHAT_GEMINI_MODEL",
    )

    symptom_chat_max_output_tokens: int = Field(
        default=700,
        ge=256,
        le=2048,
        validation_alias="SYMPTOM_CHAT_MAX_OUTPUT_TOKENS",
    )

    # HMAC key for short-lived, tamper-evident Stage 3 plan and completion
    # tokens. Set this to a high-entropy secret outside source control for any
    # deployed environment. The development default is intentionally unusable
    # when ENVIRONMENT is production (enforced by the symptom-chat service).
    symptom_chat_token_secret: SecretStr = Field(
        default=SecretStr("development-only-change-before-production"),
        validation_alias="SYMPTOM_CHAT_TOKEN_SECRET",
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

    deepseek_max_tokens: int = Field(
        default=2048,
        ge=256,
        le=8192,
        validation_alias="DEEPSEEK_MAX_TOKENS",
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

    openai_max_tokens: int = Field(
        default=4096,
        ge=256,
        le=8192,
        validation_alias="OPENAI_MAX_TOKENS",
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

    groq_max_tokens: int = Field(
        default=2048,
        ge=256,
        le=8192,
        validation_alias="GROQ_MAX_TOKENS",
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

    # Curated clinical-evidence graph. This graph must never contain patient,
    # report, authentication, or free-text session data.
    neo4j_enabled: bool = Field(default=False, validation_alias="NEO4J_ENABLED")
    neo4j_uri: str = Field(default="", validation_alias="NEO4J_URI")
    neo4j_username: str = Field(default="neo4j", validation_alias="NEO4J_USERNAME")
    neo4j_password: SecretStr = Field(default=SecretStr(""), validation_alias="NEO4J_PASSWORD")
    neo4j_database: str = Field(default="neo4j", validation_alias="NEO4J_DATABASE")

    # Kept false until each evidence record has passed a qualified clinical review.
    knowledge_graph_runtime_enabled: bool = Field(
        default=False,
        validation_alias="KNOWLEDGE_GRAPH_RUNTIME_ENABLED",
    )

    # Shared only with the Spring persistence service. It signs the already
    # validated Stage 4 JSON so the browser cannot alter it before storage.
    stage4_validation_secret: SecretStr = Field(
        default=SecretStr("development-only-stage4-secret-change-before-production"),
        validation_alias="STAGE4_VALIDATION_SECRET",
    )


@lru_cache
def get_settings() -> Settings:
    """Return the process-wide validated settings singleton."""
    return Settings()
