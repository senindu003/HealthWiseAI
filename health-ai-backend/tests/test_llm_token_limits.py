"""Regression checks for explicit, bounded LLM completion-token settings."""

import unittest

from app.config import Settings


class LlmTokenLimitTests(unittest.TestCase):
    def test_defaults_are_explicit_and_sized_for_structured_responses(self) -> None:
        settings = Settings()
        self.assertEqual(settings.gemini_max_output_tokens, 4096)
        self.assertEqual(settings.groq_max_tokens, 2048)
        self.assertEqual(settings.openai_max_tokens, 4096)
        self.assertEqual(settings.deepseek_max_tokens, 2048)


if __name__ == "__main__":
    unittest.main()
