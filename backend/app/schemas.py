"""
ScamShield AI — Pydantic Schemas (Security-Hardened)
Request/response models with strict validation, length limits,
regex constraints, and sanitization to prevent injection attacks.
"""

import re
from datetime import datetime
from typing import Any, Dict, List, Optional

import bleach
from pydantic import BaseModel, Field, field_validator


# ============================================================
# Sanitization Helpers
# ============================================================

# Regex to strip dangerous characters that could enable SQL injection
# or XSS when reflected in logs/responses.
_DANGEROUS_PATTERN = re.compile(
    r"[<>{}|\\^~\[\]`]"
)

# Allowed HTML tags: none. We strip everything.
_ALLOWED_TAGS: list = []
_ALLOWED_ATTRS: dict = {}


def sanitize_text(value: str) -> str:
    """Strip HTML tags and dangerous characters from user input."""
    # Step 1: Strip all HTML tags via bleach
    cleaned = bleach.clean(value, tags=_ALLOWED_TAGS, attributes=_ALLOWED_ATTRS, strip=True)
    # Step 2: Remove any remaining angle brackets / dangerous chars
    cleaned = _DANGEROUS_PATTERN.sub("", cleaned)
    # Step 3: Collapse excessive whitespace (anti-buffer-stuffing)
    cleaned = re.sub(r"\s{4,}", "   ", cleaned)
    return cleaned.strip()


# ============================================================
# Fraud Report Schemas
# ============================================================

class FraudReportCreate(BaseModel):
    """Schema for creating a new fraud report — strict input validation."""
    reporter_name: str = Field(
        default="Anonymous",
        min_length=1,
        max_length=100,
        description="Reporter display name. Alphanumeric, spaces, and basic punctuation only.",
    )
    report_type: str = Field(
        ...,
        pattern=r"^(digital_arrest|phishing|financial_fraud|impersonation|other)$",
        description="Must be one of the predefined report categories.",
    )
    suspect_contact: Optional[str] = Field(
        default=None,
        max_length=200,
        description="Phone number, email, or identifier of the suspect.",
    )
    description: str = Field(
        ...,
        min_length=10,
        max_length=5000,
        description="Detailed description of the scam incident.",
    )

    @field_validator("reporter_name")
    @classmethod
    def validate_reporter_name(cls, v: str) -> str:
        v = sanitize_text(v)
        # Only allow letters, numbers, spaces, dots, hyphens, apostrophes
        if not re.match(r"^[\w\s.\-']+$", v, re.UNICODE):
            raise ValueError("Reporter name contains disallowed characters.")
        return v

    @field_validator("suspect_contact")
    @classmethod
    def validate_suspect_contact(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v = sanitize_text(v)
        # Allow phone numbers, emails, and common identifiers
        if not re.match(
            r"^[\w\s@.+\-()#:\/]+$", v, re.UNICODE
        ):
            raise ValueError("Suspect contact contains disallowed characters.")
        return v

    @field_validator("description")
    @classmethod
    def validate_description(cls, v: str) -> str:
        return sanitize_text(v)


class FraudReportResponse(BaseModel):
    """Schema for a fraud report response."""
    id: str = Field(..., max_length=50)
    reporter_name: str = Field(..., max_length=100)
    report_type: str
    suspect_contact: Optional[str] = Field(default=None, max_length=200)
    description: str
    ai_verdict: Optional[str]
    risk_score: float = Field(..., ge=0, le=100)
    status: str
    created_at: datetime


# ============================================================
# AI Analysis Schemas
# ============================================================

class TextAnalysisRequest(BaseModel):
    """Schema for single-shot text analysis — hardened input."""
    text: str = Field(
        ...,
        min_length=5,
        max_length=10000,
        description="The text message to analyze for scam indicators.",
    )
    context: Optional[str] = Field(
        default=None,
        max_length=2000,
        description="Optional conversation context for improved analysis.",
    )

    @field_validator("text")
    @classmethod
    def validate_text(cls, v: str) -> str:
        return sanitize_text(v)

    @field_validator("context")
    @classmethod
    def validate_context(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        return sanitize_text(v)


class RiskScore(BaseModel):
    """Detailed risk assessment result."""
    overall_score: float = Field(..., ge=0, le=100)
    coercion_score: float = Field(default=0.0, ge=0, le=100)
    urgency_score: float = Field(default=0.0, ge=0, le=100)
    phishing_score: float = Field(default=0.0, ge=0, le=100)
    threat_labels: List[str] = Field(default_factory=list)
    risk_level: str = Field(default="low", pattern=r"^(low|medium|high|critical)$")
    explanation: str = Field(default="", max_length=2000)

    @field_validator("threat_labels")
    @classmethod
    def validate_threat_labels(cls, v: List[str]) -> List[str]:
        allowed = {"scam", "coercion", "urgency", "phishing", "financial_fraud", "impersonation"}
        return [label for label in v if label in allowed][:20]


class AnalysisResult(BaseModel):
    """Complete analysis result for a text submission."""
    risk_score: RiskScore
    verdict: str = Field(..., max_length=3000)
    recommendations: List[str] = Field(default_factory=list)
    is_scam: bool
    confidence: float = Field(default=0.0, ge=0, le=1)
    analyzed_at: datetime = Field(default_factory=datetime.utcnow)
    # v2 additions
    url_threat_score: float = Field(default=0.0, ge=0, le=100)
    flagged_urls: List[str] = Field(default_factory=list)
    detected_language: str = Field(default="en", max_length=10)

    @field_validator("recommendations")
    @classmethod
    def cap_recommendations(cls, v: List[str]) -> List[str]:
        # Cap to 15 recommendations max, each max 500 chars
        return [r[:500] for r in v[:15]]

    @field_validator("flagged_urls")
    @classmethod
    def cap_flagged_urls(cls, v: List[str]) -> List[str]:
        return [u[:500] for u in v[:10]]



class ChatMessage(BaseModel):
    """Schema for citizen shield chat messages."""
    role: str = Field(..., pattern=r"^(user|assistant|system)$")
    content: str = Field(..., min_length=1, max_length=5000)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    risk_level: Optional[str] = Field(
        default=None, pattern=r"^(low|medium|high|critical)$"
    )
    metadata: Optional[Dict[str, Any]] = None

    @field_validator("content")
    @classmethod
    def validate_chat_content(cls, v: str) -> str:
        return sanitize_text(v)

    @field_validator("metadata")
    @classmethod
    def validate_metadata(cls, v: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if v is None:
            return v
        # Restrict metadata size to prevent abuse
        import json
        if len(json.dumps(v, default=str)) > 4096:
            raise ValueError("Metadata payload exceeds 4KB limit.")
        return v


# ============================================================
# WebSocket Schemas
# ============================================================

class CallChunk(BaseModel):
    """A single chunk of streaming call text — strict limits."""
    session_id: str = Field(
        ...,
        min_length=1,
        max_length=100,
        pattern=r"^[a-zA-Z0-9\-_]+$",
        description="Session identifier. Alphanumeric, hyphens, underscores only.",
    )
    chunk_text: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="Transcript chunk text.",
    )
    chunk_index: int = Field(default=0, ge=0, le=10000)
    speaker: str = Field(
        default="unknown",
        pattern=r"^(caller|receiver|unknown)$",
    )

    @field_validator("chunk_text")
    @classmethod
    def validate_chunk_text(cls, v: str) -> str:
        return sanitize_text(v)


class StreamRiskUpdate(BaseModel):
    """Real-time risk update sent via WebSocket."""
    session_id: str = Field(..., max_length=100)
    chunk_index: int = Field(..., ge=0, le=10000)
    risk_score: RiskScore
    cumulative_risk: float = Field(..., ge=0, le=100)
    alert_level: str = Field(
        default="normal",
        pattern=r"^(normal|elevated|warning|critical)$",
    )
    alert_message: Optional[str] = Field(default=None, max_length=500)
    flagged_phrases: List[str] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("flagged_phrases")
    @classmethod
    def cap_flagged_phrases(cls, v: List[str]) -> List[str]:
        return [p[:200] for p in v[:50]]


# ============================================================
# Analytics / Graph Schemas
# ============================================================

class GraphNode(BaseModel):
    """A node in the fraud network graph."""
    id: str = Field(..., max_length=100)
    label: str = Field(..., max_length=255)
    node_type: str = Field(
        ...,
        pattern=r"^(suspect|victim|money_mule|phone_number|bank_account)$",
    )
    risk_level: str = Field(
        ...,
        pattern=r"^(low|medium|high|critical)$",
    )
    metadata: Dict[str, Any] = Field(default_factory=dict)


class GraphEdge(BaseModel):
    """An edge in the fraud network graph."""
    id: str = Field(..., max_length=100)
    source: str = Field(..., max_length=100)
    target: str = Field(..., max_length=100)
    edge_type: str = Field(
        ...,
        pattern=r"^(transaction|call|sms|linked_account|reported_by)$",
    )
    amount: Optional[float] = Field(default=None, ge=0, le=999999999999.99)
    description: Optional[str] = Field(default=None, max_length=500)
    flagged: bool = False


class GraphData(BaseModel):
    """Complete fraud network graph data."""
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    total_nodes: int = Field(..., ge=0)
    total_edges: int = Field(..., ge=0)


class PlatformStats(BaseModel):
    """Aggregate platform statistics."""
    total_reports: int = Field(default=0, ge=0)
    confirmed_frauds: int = Field(default=0, ge=0)
    reports_today: int = Field(default=0, ge=0)
    flagged_calls: int = Field(default=0, ge=0)
    avg_risk_score: float = Field(default=0.0, ge=0, le=100)
    high_risk_nodes: int = Field(default=0, ge=0)
    scams_prevented: int = Field(default=0, ge=0)
    total_amount_saved: float = Field(default=0.0, ge=0)
