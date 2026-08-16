"""Robust JSON extraction and Pydantic validation for LLM responses."""

import json
from typing import TypeVar

from pydantic import BaseModel, ValidationError

ModelT = TypeVar("ModelT", bound=BaseModel)


class LLMOutputError(ValueError):
    """Raised when a model response cannot be decoded into its expected contract."""


def parse_model_output(content: object, schema: type[ModelT]) -> ModelT:
    """Extract a JSON object from a model response and validate it with ``schema``."""

    if isinstance(content, list):
        content = "".join(str(part.get("text", "")) if isinstance(part, dict) else str(part) for part in content)
    if not isinstance(content, str):
        raise LLMOutputError("Model response was not textual JSON")
    candidate = content.strip()
    if candidate.startswith("```"):
        candidate = candidate.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
    start, end = candidate.find("{"), candidate.rfind("}")
    if start < 0 or end < start:
        raise LLMOutputError("Model response did not include a JSON object")
    try:
        payload = json.loads(candidate[start : end + 1])

        print("\n========== RAW LLM RESPONSE ==========")
        print(json.dumps(payload, indent=2))
        print("=========================================\n")

        return schema.model_validate(payload)
    except (json.JSONDecodeError, ValidationError) as exc:
        print("\n========== VALIDATION ERRORS ==========")
        print(exc.json(indent=2))
        print("=======================================\n")
        raise LLMOutputError(f"Model response failed {schema.__name__} validation") from exc
