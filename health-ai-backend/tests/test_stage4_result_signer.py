"""Integrity checks for FastAPI-to-Spring validated-result persistence tokens."""

import base64
import json
import unittest

from app.services.stage4_grounding_validator import Stage4GroundingValidator
from app.services.stage4_result_signer import Stage4ResultSigner
from tests.test_stage4_grounding_validator import _response
from tests.test_stage4_grounded_generator import _bundle


class Stage4ResultSignerTests(unittest.TestCase):
    def test_token_contains_the_validated_result_not_browser_input(self) -> None:
        validated = Stage4GroundingValidator().validate(_response(), _bundle())
        encoded, signature = Stage4ResultSigner().sign(validated).split(".", 1)
        claims = json.loads(base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4)))
        self.assertTrue(signature)
        self.assertEqual(claims["purpose"], "validated_stage4_result")
        self.assertEqual(claims["result"]["references"][0]["marker"], "[1]")
        self.assertNotIn("validationToken", claims["result"])


if __name__ == "__main__":
    unittest.main()
