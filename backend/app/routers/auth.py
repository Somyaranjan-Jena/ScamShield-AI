"""
ScamShield AI — Auth Router
Issues short-lived WebSocket tokens and validates Cloudflare Turnstile.
"""

import hashlib
import hmac
import logging
import time

import httpx
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.config import settings
from app.security import limiter

logger = logging.getLogger("scamshield.auth")

router = APIRouter(prefix="/api/auth", tags=["Auth"])


# ============================================================
# WS Token Generation
# ============================================================

def _generate_ws_token(client_ip: str) -> str:
    """Generate a short-lived HMAC-SHA256 WebSocket token."""
    expires_at = int(time.time()) + settings.ws_token_ttl_seconds
    payload = f"{client_ip}:{expires_at}"
    signature = hmac.new(
        settings.ws_secret_key.encode(),
        payload.encode(),
        hashlib.sha256,
    ).hexdigest()
    return f"{expires_at}:{signature}"


def verify_ws_token(token: str, client_ip: str) -> bool:
    """
    Verify a WebSocket token. Returns True if valid and not expired.
    In demo/dev mode (ws_secret_key == default), always returns True.
    """
    # Allow unauthenticated in dev if using the default key
    if settings.ws_secret_key == "change-me-in-production-scamshield-ws-secret":
        return True

    try:
        parts = token.split(":")
        if len(parts) != 2:
            return False

        expires_at_str, provided_sig = parts
        expires_at = int(expires_at_str)

        # Check expiry
        if time.time() > expires_at:
            return False

        # Recompute HMAC
        payload = f"{client_ip}:{expires_at}"
        expected_sig = hmac.new(
            settings.ws_secret_key.encode(),
            payload.encode(),
            hashlib.sha256,
        ).hexdigest()

        return hmac.compare_digest(expected_sig, provided_sig)
    except Exception:
        return False


# ============================================================
# Schemas
# ============================================================

class WSTokenResponse(BaseModel):
    token: str
    expires_in: int
    mode: str


class TurnstileVerifyRequest(BaseModel):
    token: str


# ============================================================
# Endpoints
# ============================================================

@router.post("/ws-token", response_model=WSTokenResponse)
@limiter.limit("30/minute")
async def get_ws_token(request: Request):
    """
    Issue a short-lived WebSocket authentication token.
    Frontend must call this before opening a WebSocket connection.
    """
    client_ip = request.client.host if request.client else "unknown"
    token = _generate_ws_token(client_ip)
    return WSTokenResponse(
        token=token,
        expires_in=settings.ws_token_ttl_seconds,
        mode="dev" if settings.ws_secret_key == "change-me-in-production-scamshield-ws-secret" else "secure",
    )


@router.post("/verify-turnstile")
@limiter.limit("20/minute")
async def verify_turnstile(request: Request, body: TurnstileVerifyRequest):
    """
    Verify a Cloudflare Turnstile token on behalf of the frontend.
    Returns {"success": true} or {"success": false, "error": "..."}.
    If Turnstile is not configured, always returns success.
    """
    if not settings.has_turnstile:
        return {"success": True, "mode": "turnstile_not_configured"}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                data={
                    "secret": settings.turnstile_secret_key,
                    "response": body.token,
                },
            )
        data = resp.json()
        if data.get("success"):
            return {"success": True}
        else:
            return {"success": False, "error": data.get("error-codes", ["unknown"])[0]}
    except Exception as e:
        logger.warning(f"Turnstile verification failed: {e}")
        raise HTTPException(status_code=503, detail="Turnstile verification service unavailable.")
