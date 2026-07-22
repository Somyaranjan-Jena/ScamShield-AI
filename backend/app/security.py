"""
ScamShield AI — Security Utilities
Shared rate limiter instance and security helpers.
Separated to avoid circular imports between main.py and routers.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import settings

# ============================================================
# Global Rate Limiter (slowapi)
# ============================================================

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[f"{settings.rate_limit_per_minute}/minute"],
    storage_uri="memory://",
)
