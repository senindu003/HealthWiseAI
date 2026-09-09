"""Short-lived integrity token for persisting a validated Stage 4 result."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time

from app.config import get_settings
from app.schemas.response import RecommendationResponse


class Stage4ResultSigner:
    def sign(self, response: RecommendationResponse) -> str:
        settings = get_settings()
        secret = settings.stage4_validation_secret.get_secret_value()
        if settings.environment.lower() == "production" and secret.startswith("development-only-"):
            raise RuntimeError("STAGE4_VALIDATION_SECRET must be configured in production")
        payload = response.model_dump(by_alias=True, mode="json", exclude={"validation_token"})
        claims = {"purpose": "validated_stage4_result", "iat": int(time.time()), "exp": int(time.time()) + 15 * 60, "result": payload}
        encoded = self._b64(json.dumps(claims, ensure_ascii=False, separators=(",", ":")).encode("utf-8"))
        signature = self._b64(hmac.new(secret.encode("utf-8"), encoded.encode("ascii"), hashlib.sha256).digest())
        return f"{encoded}.{signature}"

    @staticmethod
    def _b64(value: bytes) -> str:
        return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")
