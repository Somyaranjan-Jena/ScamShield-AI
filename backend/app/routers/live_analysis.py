"""
ScamShield AI — Live Analysis Router (Security-Hardened)
Rate-limited REST endpoints, WebSocket abuse prevention with
connection caps, message throttling, and payload size limits.
"""

import json
import logging
import hashlib
import time
import uuid
from typing import Dict, List, Optional
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Request, WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from app.config import settings
from app.database import db
from app.security import limiter
from app.models import FraudReport, get_demo_reports
from app.routers.auth import verify_ws_token
from app.schemas import (
    AnalysisResult,
    CallChunk,
    FraudReportCreate,
    FraudReportResponse,
    TextAnalysisRequest,
    sanitize_text,
)
from app.services.ai_engine import scam_analyzer

logger = logging.getLogger("scamshield.live_analysis")

router = APIRouter(prefix="/api", tags=["Live Analysis"])


# ============================================================
# WebSocket Connection Tracker — abuse prevention
# ============================================================

class WebSocketGuard:
    """Track active WebSocket connections to enforce global limits."""

    def __init__(self, max_connections: int = 50) -> None:
        self.max_connections = max_connections
        self._active: dict[str, float] = {}  # session_id -> connect_time

    @property
    def count(self) -> int:
        return len(self._active)

    def can_accept(self) -> bool:
        return self.count < self.max_connections

    def register(self, session_id: str) -> None:
        self._active[session_id] = time.time()

    def unregister(self, session_id: str) -> None:
        self._active.pop(session_id, None)

    def is_stale(self, session_id: str, max_idle_seconds: int = 300) -> bool:
        """Check if a connection has been idle too long."""
        connect_time = self._active.get(session_id)
        if connect_time is None:
            return True
        return (time.time() - connect_time) > max_idle_seconds


ws_guard = WebSocketGuard(max_connections=settings.ws_max_connections)

# Per-IP WebSocket rate limiting (messages per second)
_ws_rate_tracker: dict[str, list[float]] = {}

WS_MAX_MESSAGES_PER_SECOND = 5
WS_MAX_SESSION_DURATION = 600  # 10 minutes max per session
WS_MAX_MESSAGE_BYTES = settings.ws_max_message_size


def _ws_rate_check(client_ip: str) -> bool:
    """Return True if the client is within rate limits, False if throttled."""
    now = time.time()
    if client_ip not in _ws_rate_tracker:
        _ws_rate_tracker[client_ip] = []

    # Purge timestamps older than 1 second
    _ws_rate_tracker[client_ip] = [
        t for t in _ws_rate_tracker[client_ip] if now - t < 1.0
    ]

    if len(_ws_rate_tracker[client_ip]) >= WS_MAX_MESSAGES_PER_SECOND:
        return False

    _ws_rate_tracker[client_ip].append(now)
    return True


# ============================================================
# REST Endpoints — Rate Limited
# ============================================================


@router.post("/analyze", response_model=AnalysisResult)
@limiter.limit("20/minute")
async def analyze_text(request: Request, body: TextAnalysisRequest):
    """
    Analyze a single text message for scam indicators.
    Returns a detailed risk assessment with verdict and recommendations.

    Rate limit: 20 requests/minute per IP.
    """
    result = await scam_analyzer.analyze_text(
        text=body.text,
        context=body.context,
    )

    # Write to audit log (non-blocking, privacy-preserving)
    if db.is_connected:
        try:
            client_ip = request.client.host if request.client else "unknown"
            text_hash = hashlib.sha256(body.text[:500].encode()).hexdigest()
            ip_hash = hashlib.sha256(client_ip.encode()).hexdigest()
            verdict = "scam" if result.is_scam else ("uncertain" if result.risk_score.overall_score >= 30 else "safe")
            ai_engine = (
                "gemini" if settings.has_gemini
                else "huggingface" if settings.has_hf_token
                else "heuristic"
            )
            await db.execute(
                """
                INSERT INTO analysis_audit_log
                    (text_hash, ip_hash, verdict, risk_level, risk_score,
                     detected_language, url_threat_score, ai_engine)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                """,
                text_hash, ip_hash, verdict,
                result.risk_score.risk_level,
                result.risk_score.overall_score,
                result.detected_language,
                result.url_threat_score,
                ai_engine,
            )
        except Exception as e:
            logger.debug(f"Audit log write failed (non-fatal): {e}")

    return result


@router.post("/report", response_model=dict)
@limiter.limit("10/minute")
async def submit_report(request: Request, report: FraudReportCreate):
    """
    Submit a new fraud report. The text is analyzed by AI before storage.

    Rate limit: 10 requests/minute per IP.
    """
    # Analyze the description
    analysis = await scam_analyzer.analyze_text(report.description)

    report_id = str(uuid.uuid4())

    # Try to store in database
    if db.is_connected:
        await db.execute(
            """
            INSERT INTO fraud_reports (id, reporter_name, report_type, suspect_contact, description, ai_verdict, risk_score, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            """,
            report_id,
            report.reporter_name,
            report.report_type,
            report.suspect_contact,
            report.description,
            analysis.verdict,
            analysis.risk_score.overall_score,
            "pending",
        )
    else:
        logger.info(f"Demo mode: Report {report_id} stored in memory.")

    return {
        "id": report_id,
        "status": "submitted",
        "ai_verdict": analysis.verdict,
        "risk_score": analysis.risk_score.overall_score,
        "message": "Report submitted successfully. Our AI has analyzed your submission.",
    }


@router.get("/analyze/similar")
@limiter.limit("20/minute")
async def get_similar_cases(
    request: Request,
    type: str = "digital_arrest",
    limit: int = 3,
):
    """
    Get similar past fraud reports of the same type.
    Used to show context after an analysis.

    Rate limit: 20/minute per IP.
    """
    valid_types = {"digital_arrest", "phishing", "financial_fraud", "impersonation", "other"}
    if type not in valid_types:
        raise HTTPException(status_code=422, detail=f"Invalid type. Must be one of: {', '.join(valid_types)}")
    limit = max(1, min(limit, 10))

    if db.is_connected:
        rows = await db.fetch(
            """
            SELECT id, report_type, ai_verdict, risk_score, status, created_at
            FROM fraud_reports
            WHERE report_type = $1 AND status IN ('confirmed_fraud', 'investigating')
            ORDER BY created_at DESC
            LIMIT $2
            """,
            type, limit,
        )
        return {
            "type": type,
            "cases": [{"id": str(r["id"]), "verdict": r["ai_verdict"], "risk_score": float(r["risk_score"]), "status": r["status"]} for r in rows]
        }

    # Demo fallback
    from app.models import get_demo_reports
    demo = [r for r in get_demo_reports() if r.report_type == type][:limit]
    return {
        "type": type,
        "cases": [{"id": r.id, "verdict": r.ai_verdict, "risk_score": r.risk_score, "status": r.status} for r in demo],
    }


@router.get("/reports")
@limiter.limit("30/minute")
async def get_reports(request: Request):
    """Get recent fraud reports. Rate limit: 30/minute per IP."""
    if db.is_connected:
        rows = await db.fetch(
            "SELECT * FROM fraud_reports ORDER BY created_at DESC LIMIT 20"
        )
        return {"reports": rows}

    # Demo mode fallback
    demo_reports = get_demo_reports()
    return {"reports": [r.to_dict() for r in demo_reports]}


# ============================================================
# WebSocket — Live Call Analysis (Hardened)
# ============================================================


@router.websocket("/ws/live-call")
async def websocket_live_call(websocket: WebSocket):
    """
    WebSocket endpoint for real-time call scam analysis.

    Security controls:
    - Token authentication (HMAC-signed, time-limited)
    - Global connection cap (default 50 concurrent)
    - Per-IP message rate limiting (5 msg/sec)
    - Payload size limit (4KB per message)
    - Session duration cap (10 minutes)
    - Automatic stale connection cleanup

    Protocol:
    - Client first fetches a token from POST /api/auth/ws-token
    - Client connects: ws://host/api/ws/live-call?token=<token>
    - Client sends JSON: {"session_id": "...", "chunk_text": "...", "chunk_index": 0, "speaker": "caller"}
    - Server responds with JSON: StreamRiskUpdate
    - Client sends {"action": "end_session"} to close
    """
    # --- Token Authentication ---
    client_ip = websocket.client.host if websocket.client else "unknown"
    ws_token = websocket.query_params.get("token", "")
    if not verify_ws_token(ws_token, client_ip):
        await websocket.close(code=4401, reason="Unauthorized: invalid or expired token.")
        logger.warning(f"WebSocket rejected: invalid token from IP {client_ip}")
        return

    # --- Pre-accept checks ---
    if not ws_guard.can_accept():
        await websocket.close(code=1013, reason="Server at capacity. Try again later.")
        return

    await websocket.accept()

    session_id = str(uuid.uuid4())
    client_ip = websocket.client.host if websocket.client else "unknown"
    session_start = time.time()
    ws_guard.register(session_id)

    logger.info(
        f"WebSocket connected. Session: {session_id} | IP: {client_ip} | "
        f"Active connections: {ws_guard.count}"
    )

    try:
        # Send initial session info
        await websocket.send_json({
            "type": "session_start",
            "session_id": session_id,
            "message": "Live call analysis session started. Send text chunks for real-time analysis.",
            "max_duration_seconds": WS_MAX_SESSION_DURATION,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

        while True:
            # --- Session duration check ---
            elapsed = time.time() - session_start
            if elapsed > WS_MAX_SESSION_DURATION:
                await websocket.send_json({
                    "type": "session_timeout",
                    "session_id": session_id,
                    "message": f"Session exceeded maximum duration of {WS_MAX_SESSION_DURATION}s.",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
                break

            # Receive text chunk from client
            raw_data = await websocket.receive_text()

            # --- Payload size check ---
            if len(raw_data.encode("utf-8")) > WS_MAX_MESSAGE_BYTES:
                await websocket.send_json({
                    "type": "error",
                    "message": f"Message exceeds maximum size of {WS_MAX_MESSAGE_BYTES} bytes.",
                })
                continue

            # --- Per-IP rate limiting ---
            if not _ws_rate_check(client_ip):
                await websocket.send_json({
                    "type": "error",
                    "message": "Rate limit exceeded. Slow down message frequency.",
                })
                continue

            # --- JSON parse ---
            try:
                data = json.loads(raw_data)
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "message": "Invalid JSON format.",
                })
                continue

            # --- Validate data is a dict ---
            if not isinstance(data, dict):
                await websocket.send_json({
                    "type": "error",
                    "message": "Expected a JSON object.",
                })
                continue

            # Check for end session command
            if data.get("action") == "end_session":
                scam_analyzer.clear_session(data.get("session_id", session_id))
                await websocket.send_json({
                    "type": "session_end",
                    "session_id": data.get("session_id", session_id),
                    "message": "Session ended. Analysis complete.",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                })
                break

            # --- Extract and sanitize chunk data ---
            chunk_session = str(data.get("session_id", session_id))[:100]
            chunk_text = str(data.get("chunk_text", ""))[:2000]
            chunk_index = data.get("chunk_index", 0)

            # Sanitize chunk_text
            chunk_text = sanitize_text(chunk_text)

            # Validate chunk_index is a reasonable integer
            if not isinstance(chunk_index, int) or chunk_index < 0 or chunk_index > 10000:
                chunk_index = 0

            if not chunk_text.strip():
                continue

            # Analyze the chunk
            result = await scam_analyzer.analyze_call_stream(
                session_id=chunk_session,
                chunk_text=chunk_text,
                chunk_index=chunk_index,
            )

            # Send analysis result
            await websocket.send_json({
                "type": "analysis_update",
                **result,
            })

            # Log flagged chunks to database
            if result.get("alert_level") in ("warning", "critical") and db.is_connected:
                await db.execute(
                    """
                    INSERT INTO call_analysis_logs (session_id, transcript_chunk, chunk_index, risk_score, coercion_score, urgency_score, threat_labels, flagged)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    """,
                    chunk_session,
                    chunk_text,
                    chunk_index,
                    result["risk_score"]["overall_score"],
                    result["risk_score"]["coercion_score"],
                    result["risk_score"]["urgency_score"],
                    json.dumps(result["risk_score"]["threat_labels"]),
                    True,
                )

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected. Session: {session_id}")
        scam_analyzer.clear_session(session_id)
    except Exception as e:
        logger.error(f"WebSocket error (session {session_id}): {type(e).__name__}")
        scam_analyzer.clear_session(session_id)
        try:
            # Never expose internal error details to clients
            await websocket.send_json({
                "type": "error",
                "message": "An internal error occurred. The session has been terminated.",
            })
        except Exception:
            pass
    finally:
        ws_guard.unregister(session_id)
        logger.info(
            f"WebSocket cleanup complete. Session: {session_id} | "
            f"Remaining connections: {ws_guard.count}"
        )
