"""
ScamShield AI — Google Gemini AI Engine
Uses Gemini 1.5 Flash as the primary AI analysis engine when configured.
Gracefully falls back to the HF/heuristic chain when not available.
"""

import json
import logging
from typing import Optional

from app.config import settings
from app.schemas import AnalysisResult, RiskScore

logger = logging.getLogger("scamshield.gemini")

GEMINI_AVAILABLE = False

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    logger.info("google-generativeai not installed — Gemini engine disabled")


GEMINI_SYSTEM_PROMPT = """You are ScamShield AI, an expert fraud detection system protecting Indian citizens from digital scams.
Analyze the provided text and output a JSON response with this EXACT structure:
{
  "overall_score": <float 0-100, scam probability>,
  "coercion_score": <float 0-100>,
  "urgency_score": <float 0-100>,
  "phishing_score": <float 0-100>,
  "financial_fraud_score": <float 0-100>,
  "risk_level": <"low"|"medium"|"high"|"critical">,
  "threat_labels": [<list of: "scam","coercion","urgency","phishing","financial_fraud","impersonation">],
  "verdict": "<2-3 sentence human-readable verdict, direct and authoritative>",
  "is_scam": <true|false>,
  "url_risk": <float 0-100, URL threat score if URLs present>
}

Rules:
- overall_score >= 75 → critical, >= 50 → high, >= 30 → medium, else low
- Indian scam types to detect: digital arrest, CBI/police impersonation, KYC fraud, UPI scams, customs duty scams, lottery, investment Ponzi
- Be aware of Hindi/Hinglish scam phrases mixed with English
- Output ONLY the JSON, no markdown, no explanation outside JSON
"""


class GeminiEngine:
    """Google Gemini-powered scam analysis engine."""

    def __init__(self) -> None:
        self._model = None
        self._available = False

    def initialize(self) -> None:
        """Initialize the Gemini model."""
        if not GEMINI_AVAILABLE or not settings.has_gemini:
            logger.info("GeminiEngine: Not initialized (no API key or package missing)")
            return
        try:
            genai.configure(api_key=settings.gemini_api_key)
            self._model = genai.GenerativeModel(
                model_name="gemini-1.5-flash",
                generation_config=genai.GenerationConfig(
                    temperature=0.1,
                    top_p=0.95,
                    max_output_tokens=512,
                    response_mime_type="application/json",
                ),
                system_instruction=GEMINI_SYSTEM_PROMPT,
            )
            self._available = True
            logger.info("GeminiEngine: Initialized with gemini-1.5-flash")
        except Exception as e:
            logger.warning(f"GeminiEngine: Initialization failed — {e}")

    @property
    def is_available(self) -> bool:
        return self._available and self._model is not None

    async def analyze(self, text: str, context: Optional[str] = None) -> Optional[dict]:
        """
        Analyze text with Gemini. Returns parsed dict or None on failure.
        """
        if not self.is_available:
            return None

        input_text = f"Context:\n{context}\n\nMessage to analyze:\n{text[:2000]}" if context else f"Message to analyze:\n{text[:2000]}"

        try:
            response = self._model.generate_content(input_text)
            raw = response.text.strip()

            # Strip markdown code fences if present
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            raw = raw.strip()

            data = json.loads(raw)

            # Validate required fields
            required = ["overall_score", "risk_level", "verdict", "is_scam"]
            if not all(k in data for k in required):
                logger.warning("GeminiEngine: Response missing required fields")
                return None

            # Clamp scores
            for key in ["overall_score", "coercion_score", "urgency_score", "phishing_score", "financial_fraud_score", "url_risk"]:
                if key in data:
                    data[key] = max(0.0, min(100.0, float(data[key])))

            return data

        except json.JSONDecodeError as e:
            logger.warning(f"GeminiEngine: JSON parse error — {e}")
            return None
        except Exception as e:
            logger.warning(f"GeminiEngine: Analysis failed — {type(e).__name__}: {e}")
            return None

    def parse_to_risk_score(self, data: dict) -> RiskScore:
        """Convert Gemini response dict to a RiskScore object."""
        threat_labels = data.get("threat_labels", [])
        # Validate labels
        allowed = {"scam", "coercion", "urgency", "phishing", "financial_fraud", "impersonation"}
        threat_labels = [l for l in threat_labels if l in allowed]

        return RiskScore(
            overall_score=round(float(data.get("overall_score", 0.0)), 1),
            coercion_score=round(float(data.get("coercion_score", 0.0)), 1),
            urgency_score=round(float(data.get("urgency_score", 0.0)), 1),
            phishing_score=round(float(data.get("phishing_score", 0.0)), 1),
            threat_labels=threat_labels,
            risk_level=data.get("risk_level", "low"),
            explanation=f"Gemini AI analysis. {data.get('verdict', '')[:300]}",
        )


# Singleton
gemini_engine = GeminiEngine()
