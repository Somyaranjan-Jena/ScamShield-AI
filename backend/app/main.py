"""
ScamShield AI — FastAPI Application Entry Point (Security-Hardened)
Rate limiting, strict CORS, security headers, and safe error handling.
"""

import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings
from app.database import db
from app.routers import analytics, live_analysis
from app.routers.auth import router as auth_router
from app.routers.trends import router as trends_router
from app.security import limiter
from app.services.ai_engine import scam_analyzer

# Configure logging — suppress stack traces in production
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(name)s | %(levelname)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("scamshield")


# ============================================================
# Security Headers Middleware
# ============================================================

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Inject security headers into every HTTP response."""

    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time

        # Core security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=(), payment=()"
        )
        response.headers["X-Permitted-Cross-Domain-Policies"] = "none"

        # Strict-Transport-Security — only in production (requires HTTPS)
        if settings.is_production:
            response.headers["Strict-Transport-Security"] = (
                "max-age=63072000; includeSubDomains; preload"
            )

        # Server timing (non-sensitive)
        response.headers["X-Process-Time"] = f"{process_time:.4f}"

        # Remove server identification header
        try:
            del response.headers["server"]
        except KeyError:
            pass

        return response


# ============================================================
# Global Exception Handler
# ============================================================

async def global_exception_handler(request: Request, exc: Exception):
    """Catch unhandled exceptions and return safe error responses.
    Never leak stack traces or internal details to clients.
    """
    logger.error(f"Unhandled exception on {request.method} {request.url.path}: {exc}")

    if settings.is_production:
        return JSONResponse(
            status_code=500,
            content={
                "error": "internal_server_error",
                "message": "An unexpected error occurred. Please try again later.",
            },
        )

    return JSONResponse(
        status_code=500,
        content={
            "error": "internal_server_error",
            "message": str(exc),
            "type": type(exc).__name__,
        },
    )


# ============================================================
# Application Lifespan
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown tasks."""
    # Startup
    logger.info("=" * 60)
    logger.info("  ScamShield AI — Starting up...")
    logger.info(f"  Environment: {settings.environment}")
    logger.info("=" * 60)

    await db.connect()
    if db.is_connected:
        logger.info("Database: Connected to PostgreSQL")
    else:
        logger.info("Database: Running in DEMO mode (no database)")

    await scam_analyzer.initialize()
    if settings.has_gemini:
        logger.info("AI Engine: Google Gemini mode (primary)")
    elif settings.has_hf_token:
        logger.info("AI Engine: Hugging Face API mode")
    else:
        logger.info("AI Engine: Local heuristic fallback mode")

    logger.info("=" * 60)
    logger.info("  ScamShield AI — Ready!")
    if not settings.is_production:
        logger.info(f"  Docs: http://{settings.host}:{settings.port}/docs")
    logger.info("=" * 60)

    yield

    # Shutdown
    logger.info("ScamShield AI — Shutting down...")
    await scam_analyzer.shutdown()
    await db.disconnect()
    logger.info("ScamShield AI — Shutdown complete.")


# ============================================================
# Create FastAPI Application
# ============================================================

app = FastAPI(
    title="ScamShield AI",
    description=(
        "Digital Public Safety Intelligence Platform — "
        "Defeating digital arrest scams, communication fraud, "
        "and financial scams with AI-powered real-time analysis."
    ),
    version="1.0.0",
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url=None if settings.is_production else "/openapi.json",
    lifespan=lifespan,
)

# ============================================================
# Register Middleware (order matters — last added runs first)
# ============================================================

# 1. Security headers on every response
app.add_middleware(SecurityHeadersMiddleware)

# 2. CORS — strict origin allowlist, explicit methods
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Request-ID"],
    max_age=600,
)

# 3. Rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# 4. Global exception handler
app.add_exception_handler(Exception, global_exception_handler)

# ============================================================
# Mount Routers
# ============================================================

app.include_router(auth_router)
app.include_router(live_analysis.router)
app.include_router(analytics.router)
app.include_router(trends_router)


# ============================================================
# Health Endpoints
# ============================================================

@app.get("/", tags=["Health"])
@limiter.limit("60/minute")
async def root(request: Request):
    """Health check and API info endpoint."""
    return {
        "name": "ScamShield AI",
        "version": "2.0.0",
        "status": "operational",
        "database": "connected" if db.is_connected else "demo_mode",
        "ai_engine": (
            "gemini" if settings.has_gemini
            else "huggingface" if settings.has_hf_token
            else "heuristic_fallback"
        ),
        "features": {
            "multilingual": True,
            "url_threat_intel": settings.has_virustotal,
            "redis_cache": bool(settings.redis_url),
            "turnstile": settings.has_turnstile,
            "ws_auth": settings.ws_secret_key != "change-me-in-production-scamshield-ws-secret",
        },
        "endpoints": {
            "docs": "/docs" if not settings.is_production else "disabled",
            "ws_token": "POST /api/auth/ws-token",
            "analyze": "POST /api/analyze",
            "report": "POST /api/report",
            "live_call": "WS /api/ws/live-call?token=<token>",
            "graph": "GET /api/analytics/graph",
            "stats": "GET /api/analytics/stats",
            "trends": "GET /api/analytics/trends",
        },
    }


@app.get("/health", tags=["Health"])
@limiter.limit("120/minute")
async def health_check(request: Request):
    """Detailed health check."""
    return {
        "status": "healthy",
        "database": db.is_connected,
        "ai_engine": "active",
        "hf_api": settings.has_hf_token,
    }
