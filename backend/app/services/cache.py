"""
ScamShield AI — Redis Cache Service
Provides async caching with graceful no-op fallback when Redis is unavailable.
Also manages persistent WebSocket session contexts.
"""

import hashlib
import json
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger("scamshield.cache")

# Try to import redis; graceful fallback if not installed/running
try:
    from redis import asyncio as aioredis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    logger.info("redis package not found — running without cache")


class AsyncCache:
    """
    Async Redis cache with graceful no-op fallback.
    All public methods are safe to call even when Redis is unavailable.
    """

    def __init__(self) -> None:
        self._client: Optional[Any] = None
        self._enabled = False

    async def connect(self, redis_url: str) -> None:
        """Try to connect to Redis. Silently degrades if unavailable."""
        if not REDIS_AVAILABLE:
            return
        try:
            self._client = aioredis.from_url(
                redis_url,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=3,
                socket_timeout=3,
            )
            # Ping to verify connectivity
            await self._client.ping()
            self._enabled = True
            logger.info("Redis cache: Connected")
        except Exception as e:
            self._client = None
            self._enabled = False
            logger.info(f"Redis cache: Unavailable ({e}) — using in-memory fallback")

    async def disconnect(self) -> None:
        if self._client:
            await self._client.aclose()

    @property
    def is_enabled(self) -> bool:
        return self._enabled

    # ── Analysis Result Cache ──────────────────────────────────

    def _analysis_key(self, text: str) -> str:
        """Hash the first 500 chars of text as cache key."""
        return "analysis:" + hashlib.sha256(text[:500].encode()).hexdigest()

    async def get_analysis(self, text: str) -> Optional[Dict]:
        """Return cached analysis result dict, or None."""
        if not self._enabled or not self._client:
            return None
        try:
            raw = await self._client.get(self._analysis_key(text))
            return json.loads(raw) if raw else None
        except Exception:
            return None

    async def set_analysis(self, text: str, result: Dict, ttl: int = 300) -> None:
        """Cache an analysis result for `ttl` seconds (default 5 min)."""
        if not self._enabled or not self._client:
            return
        try:
            await self._client.setex(
                self._analysis_key(text),
                ttl,
                json.dumps(result, default=str),
            )
        except Exception:
            pass

    # ── WebSocket Session Context ──────────────────────────────

    def _session_key(self, session_id: str) -> str:
        return f"ws_session:{session_id}"

    async def get_session_chunks(self, session_id: str) -> List[str]:
        """Retrieve stored transcript chunks for a WS session."""
        if not self._enabled or not self._client:
            return []
        try:
            raw = await self._client.get(self._session_key(session_id))
            return json.loads(raw) if raw else []
        except Exception:
            return []

    async def set_session_chunks(
        self, session_id: str, chunks: List[str], ttl: int = 1800
    ) -> None:
        """Persist WS session chunks (default TTL 30 min)."""
        if not self._enabled or not self._client:
            return
        try:
            await self._client.setex(
                self._session_key(session_id),
                ttl,
                json.dumps(chunks),
            )
        except Exception:
            pass

    async def delete_session(self, session_id: str) -> None:
        """Remove session data on disconnect."""
        if not self._enabled or not self._client:
            return
        try:
            await self._client.delete(self._session_key(session_id))
        except Exception:
            pass


# Singleton
cache = AsyncCache()
