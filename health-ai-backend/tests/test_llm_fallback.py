"""Regression tests for primary-provider retries and DeepSeek fallback behavior."""

import asyncio
from types import SimpleNamespace
import unittest
from unittest.mock import AsyncMock, patch

from pydantic import BaseModel

from app.llm.client import invoke_structured


class Result(BaseModel):
    value: str


class FailingModel:
    def __init__(self) -> None:
        self.calls = 0

    async def ainvoke(self, _: str) -> object:
        self.calls += 1
        raise RuntimeError("primary unavailable")


class SuccessfulModel:
    def __init__(self, payload: str) -> None:
        self.payload = payload
        self.calls = 0

    async def ainvoke(self, _: str) -> object:
        self.calls += 1
        return SimpleNamespace(content=self.payload)


class LlmFallbackTests(unittest.TestCase):
    def test_uses_deepseek_factory_after_primary_retries_are_exhausted(self) -> None:
        primary = FailingModel()
        fallback = SuccessfulModel('{"value":"from fallback"}')
        with patch("app.llm.client.get_settings", return_value=SimpleNamespace(llm_max_retries=2)), patch(
            "app.llm.client.sleep", new=AsyncMock()
        ):
            result = asyncio.run(
                invoke_structured("Return JSON.", Result, lambda: primary, lambda: fallback)
            )
        self.assertEqual(result.value, "from fallback")
        self.assertEqual(primary.calls, 2)
        self.assertEqual(fallback.calls, 1)

    def test_does_not_call_fallback_when_primary_succeeds(self) -> None:
        primary = SuccessfulModel('{"value":"from primary"}')
        fallback = SuccessfulModel('{"value":"from fallback"}')
        with patch("app.llm.client.get_settings", return_value=SimpleNamespace(llm_max_retries=2)):
            result = asyncio.run(
                invoke_structured("Return JSON.", Result, lambda: primary, lambda: fallback)
            )
        self.assertEqual(result.value, "from primary")
        self.assertEqual(primary.calls, 1)
        self.assertEqual(fallback.calls, 0)


if __name__ == "__main__":
    unittest.main()
