"""
ScamShield AI — AI Engine Service (v2.0)
Core intelligence layer:
  1. Google Gemini 1.5 Flash (primary, when configured)
  2. Hugging Face Inference API (secondary)
  3. Local multilingual heuristic fallback (always runs)
New: Redis caching, URL threat intel, Hindi/multilingual detection.
"""

import logging
import re
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

import httpx

from app.config import settings
from app.schemas import AnalysisResult, RiskScore

logger = logging.getLogger("scamshield.ai_engine")

# ============================================================
# Scam Detection Keyword Database
# ============================================================

COERCION_KEYWORDS: List[str] = [
    "arrest warrant", "digital arrest", "you will be arrested", "police complaint",
    "fir registered", "cbi investigation", "legal action", "court order",
    "non-bailable warrant", "money laundering", "narcotics", "your aadhaar",
    "stay on the call", "do not disconnect", "do not tell anyone",
    "keep this confidential", "national security", "under surveillance",
    "we are recording", "you are being monitored", "jail time",
    "immediate arrest", "surrender", "cooperate or face consequences",
    "your passport will be revoked", "interpol red notice", "cyber crime branch",
    # Hinglish / transliterated
    "digital giraftari", "giraftari ka warrant", "cbi officer", "aap ko arrest kiya jayega",
    "police station aana hoga", "aapke naam se fir", "cyber crime police",
    "aap surveillance mein hain", "aapka aadhaar", "aapka account band",
]

URGENCY_KEYWORDS: List[str] = [
    "immediately", "right now", "within 1 hour", "last chance",
    "urgent action required", "act now", "time is running out",
    "deadline", "expiring today", "account will be blocked",
    "suspended", "frozen", "final notice", "before it is too late",
    "do it now", "hurry", "emergency", "critical alert",
    "verify within", "respond immediately", "limited time",
    # Hinglish
    "abhi karo", "turant", "ek ghante mein", "aakhri mauka",
    "band ho jayega", "jaldi karo", "aaj hi", "seedha karo",
]

PHISHING_KEYWORDS: List[str] = [
    "click this link", "verify your account", "update kyc",
    "confirm your identity", "enter otp", "share otp",
    "bank account details", "credit card number", "cvv",
    "social security", "pan card", "reset password",
    "unusual activity detected", "unauthorized login",
    "claim your prize", "lottery winner", "inheritance",
    "customs duty", "delivery failed", "parcel stuck",
    # Hinglish / Indian specific
    "kyc update karo", "otp share karo", "otp batao",
    "link pe click karo", "account verify karo", "aapka kyc",
    "pan card details", "aadhaar number dein",
]

FINANCIAL_FRAUD_KEYWORDS: List[str] = [
    "guaranteed returns", "double your money", "risk free investment",
    "transfer to safe account", "rbi secure account",
    "send money", "pay via upi", "bitcoin investment",
    "crypto opportunity", "forex trading", "mlm",
    "processing fee", "advance payment", "insurance claim",
    "refund", "cashback", "scratch card", "lucky draw",
    # Hinglish
    "paisa bhejo", "upi pe bhejo", "safe account mein transfer",
    "double ho jayega", "guaranteed profit", "rbi approved",
    "paise wapas milenge", "processing charge", "advance fees",
]

# Hindi Devanagari scam keywords (direct Hindi script)
HINDI_COERCION_KEYWORDS: List[str] = [
    "गिरफ्तारी", "वारंट", "सीबीआई", "पुलिस", "जेल",
    "कानूनी कार्रवाई", "राष्ट्रीय सुरक्षा", "निगरानी",
    "मनी लॉन्ड्रिंग", "आधार", "गिरफ्तार",
]

HINDI_URGENCY_KEYWORDS: List[str] = [
    "तुरंत", "अभी", "एक घंटे में", "अंतिम मौका",
    "बंद हो जाएगा", "जल्दी करो", "आज ही", "अत्यावश्यक",
]

HINDI_PHISHING_KEYWORDS: List[str] = [
    "ओटीपी", "लिंक पर क्लिक", "केवाईसी", "बैंक खाता",
    "पैन कार्ड", "आधार नंबर", "पासवर्ड", "खाता सत्यापन",
]

HINDI_FINANCIAL_KEYWORDS: List[str] = [
    "पैसे भेजो", "दोगुना", "गारंटीड रिटर्न", "सुरक्षित खाता",
    "यूपीआई", "क्रिप्टो", "प्रोसेसिंग शुल्क", "अग्रिम भुगतान",
]

SAFE_INDICATORS: List[str] = [
    "official website", "visit the branch", "call the official number",
    "take your time", "no rush", "verify independently",
    "consumer helpline", "1930", "cybercrime.gov.in",
    "official helpline", "bank branch", "nearest police station",
]

# HF API endpoints
HF_ZERO_SHOT_URL = "https://api-inference.huggingface.co/models/facebook/bart-large-mnli"
HF_TEXT_GEN_URL = "https://api-inference.huggingface.co/models/Qwen/Qwen2.5-7B-Instruct"

# Classification labels for zero-shot
CLASSIFICATION_LABELS = [
    "scam or fraud attempt",
    "coercion or threat",
    "urgency or pressure tactic",
    "phishing attempt",
    "legitimate communication",
    "financial fraud",
    "impersonation",
]


class ScamAnalyzer:
    """
    Multi-layered scam analysis engine (v2.0).
    Priority chain:
      1. Google Gemini 1.5 Flash (when GEMINI_API_KEY set)
      2. HF Inference API zero-shot (when HF_API_TOKEN set)
      3. Local multilingual keyword heuristics (always)
    Plus: Redis result caching, URL threat intelligence, persistent WS sessions.
    """

    def __init__(self) -> None:
        self.http_client: Optional[httpx.AsyncClient] = None
        self.use_hf_api: bool = settings.has_hf_token
        self._session_contexts: Dict[str, List[str]] = {}  # in-memory fallback
        self._gemini = None
        self._cache = None
        self._url_checker = None

    async def initialize(self) -> None:
        """Initialize the HTTP client, Gemini, Redis cache, and URL checker."""
        # HTTP client for HF API
        self.http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0, connect=10.0),
            headers=(
                {"Authorization": f"Bearer {settings.hf_api_token}"}
                if self.use_hf_api
                else {}
            ),
        )

        # Gemini engine
        from app.services.gemini_engine import gemini_engine
        gemini_engine.initialize()
        self._gemini = gemini_engine

        # Redis cache
        from app.services.cache import cache
        await cache.connect(settings.redis_url)
        self._cache = cache

        # URL checker
        from app.services.url_checker import url_checker
        await url_checker.initialize()
        self._url_checker = url_checker

        mode = (
            "Gemini (primary)" if self._gemini.is_available
            else "Hugging Face API" if self.use_hf_api
            else "Local Heuristic Fallback"
        )
        cache_mode = "Redis" if (self._cache and self._cache.is_enabled) else "In-memory"
        logger.info(f"ScamAnalyzer initialized | AI: {mode} | Cache: {cache_mode}")

    async def shutdown(self) -> None:
        """Close all async clients."""
        if self.http_client:
            await self.http_client.aclose()
        if self._url_checker:
            await self._url_checker.shutdown()
        if self._cache:
            await self._cache.disconnect()

    # ============================================================
    # Primary Analysis Method
    # ============================================================

    async def analyze_text(self, text: str, context: Optional[str] = None) -> AnalysisResult:
        """
        Analyze text for scam indicators.
        Chain: Redis cache → Gemini → HF API → Heuristic fallback.
        """
        text_lower = text.lower()
        combined_text = f"{context}\n{text}" if context else text

        # 0. Check Redis cache
        if self._cache:
            cached = await self._cache.get_analysis(combined_text)
            if cached:
                logger.debug("Cache HIT — returning cached analysis")
                try:
                    risk_score = RiskScore(**cached["risk_score"])
                    return AnalysisResult(
                        risk_score=risk_score,
                        verdict=cached["verdict"],
                        recommendations=cached["recommendations"],
                        is_scam=cached["is_scam"],
                        confidence=cached["confidence"],
                        analyzed_at=datetime.fromisoformat(cached["analyzed_at"]),
                        url_threat_score=cached.get("url_threat_score", 0.0),
                        flagged_urls=cached.get("flagged_urls", []),
                        detected_language=cached.get("detected_language", "en"),
                    )
                except Exception:
                    pass  # Cache miss on parse error

        # 1. Try Gemini (primary)
        gemini_data = None
        if self._gemini and self._gemini.is_available:
            gemini_data = await self._gemini.analyze(text, context)

        # 2. Determine risk_score
        heuristic_result = self._heuristic_analysis(text_lower)

        if gemini_data:
            # Use Gemini result directly
            risk_score = self._gemini.parse_to_risk_score(gemini_data)
            verdict = gemini_data.get("verdict", self._template_verdict(text, risk_score))
            # Blend with heuristics (80/20 — Gemini is trusted)
            risk_score = self._blend_with_heuristic(risk_score, heuristic_result, gemini_weight=0.80)
        else:
            # 3. Try HF API
            hf_result = None
            if self.use_hf_api and self.http_client:
                hf_result = await self._hf_zero_shot_classify(combined_text)

            if hf_result:
                risk_score = self._merge_scores(hf_result, heuristic_result)
            else:
                risk_score = heuristic_result

            verdict = await self._generate_verdict(text, risk_score)

        # 4. URL threat intelligence
        url_threat_score = 0.0
        flagged_urls: List[str] = []
        if self._url_checker:
            url_result = await self._url_checker.check_text(text)
            url_threat_score = url_result.get("threat_score", 0.0)
            flagged_urls = url_result.get("flagged_urls", [])
            # Boost overall score if malicious URLs found
            if url_threat_score > 50:
                risk_score = RiskScore(
                    overall_score=min(100, risk_score.overall_score + url_threat_score * 0.3),
                    coercion_score=risk_score.coercion_score,
                    urgency_score=risk_score.urgency_score,
                    phishing_score=min(100, risk_score.phishing_score + url_threat_score * 0.5),
                    threat_labels=list(set(risk_score.threat_labels + ["phishing"])),
                    risk_level=risk_score.risk_level,
                    explanation=risk_score.explanation + f" Malicious URL detected (score: {url_threat_score:.0f}).",
                )

        # 5. Detect language
        detected_language = self._detect_language(text)

        # 6. Final determination
        is_scam = risk_score.overall_score >= 50.0
        recommendations = self._generate_recommendations(risk_score)

        result = AnalysisResult(
            risk_score=risk_score,
            verdict=verdict,
            recommendations=recommendations,
            is_scam=is_scam,
            confidence=min(risk_score.overall_score / 100.0, 1.0),
            analyzed_at=datetime.now(timezone.utc),
            url_threat_score=round(url_threat_score, 1),
            flagged_urls=flagged_urls,
            detected_language=detected_language,
        )

        # 7. Store in Redis cache
        if self._cache:
            await self._cache.set_analysis(combined_text, {
                "risk_score": result.risk_score.model_dump(),
                "verdict": result.verdict,
                "recommendations": result.recommendations,
                "is_scam": result.is_scam,
                "confidence": result.confidence,
                "analyzed_at": result.analyzed_at.isoformat(),
                "url_threat_score": result.url_threat_score,
                "flagged_urls": result.flagged_urls,
                "detected_language": result.detected_language,
            })

        return result

    # ============================================================
    # Streaming Call Analysis
    # ============================================================

    async def analyze_call_stream(
        self, session_id: str, chunk_text: str, chunk_index: int
    ) -> dict:
        """
        Analyze a streaming call chunk with cumulative context.
        Maintains a rolling window of the conversation for context-aware analysis.
        """
        # Add chunk to session context
        if session_id not in self._session_contexts:
            self._session_contexts[session_id] = []
        self._session_contexts[session_id].append(chunk_text)

        # Keep last 20 chunks for context window
        if len(self._session_contexts[session_id]) > 20:
            self._session_contexts[session_id] = self._session_contexts[session_id][-20:]

        # Build cumulative context
        full_context = " ".join(self._session_contexts[session_id])

        # Analyze current chunk with context
        result = await self.analyze_text(chunk_text, context=full_context)

        # Calculate cumulative risk (weighted average favoring recent chunks)
        cumulative_risk = self._calculate_cumulative_risk(session_id)

        # Detect flagged phrases in current chunk
        flagged_phrases = self._extract_flagged_phrases(chunk_text)

        # Determine alert level
        alert_level = "normal"
        alert_message = None
        if cumulative_risk >= 80:
            alert_level = "critical"
            alert_message = "CRITICAL: High probability of active scam. Recommend immediate call termination."
        elif cumulative_risk >= 60:
            alert_level = "warning"
            alert_message = "WARNING: Multiple scam indicators detected. Exercise extreme caution."
        elif cumulative_risk >= 35:
            alert_level = "elevated"
            alert_message = "ELEVATED: Some suspicious patterns detected. Stay vigilant."

        return {
            "session_id": session_id,
            "chunk_index": chunk_index,
            "risk_score": {
                "overall_score": result.risk_score.overall_score,
                "coercion_score": result.risk_score.coercion_score,
                "urgency_score": result.risk_score.urgency_score,
                "phishing_score": result.risk_score.phishing_score,
                "threat_labels": result.risk_score.threat_labels,
                "risk_level": result.risk_score.risk_level,
                "explanation": result.risk_score.explanation,
            },
            "cumulative_risk": cumulative_risk,
            "alert_level": alert_level,
            "alert_message": alert_message,
            "flagged_phrases": flagged_phrases,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def clear_session(self, session_id: str) -> None:
        """Clear the context for a session."""
        self._session_contexts.pop(session_id, None)

    # ============================================================
    # Hugging Face API Integration
    # ============================================================

    async def _hf_zero_shot_classify(self, text: str) -> Optional[RiskScore]:
        """Call HF zero-shot classification API."""
        if not self.http_client:
            return None

        try:
            payload = {
                "inputs": text[:1024],
                "parameters": {
                    "candidate_labels": CLASSIFICATION_LABELS,
                    "multi_label": True,
                },
            }

            response = await self.http_client.post(HF_ZERO_SHOT_URL, json=payload)

            if response.status_code == 200:
                data = response.json()
                return self._parse_hf_classification(data)
            else:
                logger.warning(f"HF API returned status {response.status_code}: {response.text[:200]}")
                return None

        except Exception as e:
            logger.warning(f"HF API call failed: {e}")
            return None

    def _parse_hf_classification(self, data: dict) -> RiskScore:
        """Parse HF zero-shot classification response into a RiskScore."""
        labels = data.get("labels", [])
        scores = data.get("scores", [])

        label_scores = dict(zip(labels, scores))

        scam_score = label_scores.get("scam or fraud attempt", 0) * 100
        coercion_score = label_scores.get("coercion or threat", 0) * 100
        urgency_score = label_scores.get("urgency or pressure tactic", 0) * 100
        phishing_score = label_scores.get("phishing attempt", 0) * 100
        financial_score = label_scores.get("financial fraud", 0) * 100
        impersonation_score = label_scores.get("impersonation", 0) * 100
        legit_score = label_scores.get("legitimate communication", 0) * 100

        # Weight the overall score
        overall = (
            scam_score * 0.30
            + coercion_score * 0.20
            + urgency_score * 0.15
            + phishing_score * 0.15
            + financial_score * 0.10
            + impersonation_score * 0.10
            - legit_score * 0.15
        )
        overall = max(0, min(100, overall))

        # Collect threat labels
        threat_labels = []
        if scam_score > 40:
            threat_labels.append("scam")
        if coercion_score > 40:
            threat_labels.append("coercion")
        if urgency_score > 40:
            threat_labels.append("urgency")
        if phishing_score > 40:
            threat_labels.append("phishing")
        if financial_score > 40:
            threat_labels.append("financial_fraud")
        if impersonation_score > 40:
            threat_labels.append("impersonation")

        risk_level = "low"
        if overall >= 75:
            risk_level = "critical"
        elif overall >= 50:
            risk_level = "high"
        elif overall >= 30:
            risk_level = "medium"

        return RiskScore(
            overall_score=round(overall, 1),
            coercion_score=round(coercion_score, 1),
            urgency_score=round(urgency_score, 1),
            phishing_score=round(phishing_score, 1),
            threat_labels=threat_labels,
            risk_level=risk_level,
            explanation=f"AI classification detected: {', '.join(threat_labels) if threat_labels else 'no significant threats'}.",
        )

    # ============================================================
    # Local Heuristic Analysis (Fallback)
    # ============================================================

    def _heuristic_analysis(self, text_lower: str) -> RiskScore:
        """
        Multilingual keyword-based heuristic scam analysis.
        Always runs as a baseline. Covers English, Hinglish, and Hindi (Devanagari).
        """
        # English + Hinglish
        coercion_hits = self._count_keyword_hits(text_lower, COERCION_KEYWORDS)
        urgency_hits = self._count_keyword_hits(text_lower, URGENCY_KEYWORDS)
        phishing_hits = self._count_keyword_hits(text_lower, PHISHING_KEYWORDS)
        financial_hits = self._count_keyword_hits(text_lower, FINANCIAL_FRAUD_KEYWORDS)
        safe_hits = self._count_keyword_hits(text_lower, SAFE_INDICATORS)

        # Hindi Devanagari (check original text, not lowercased)
        text_orig = text_lower  # Devanagari is case-insensitive
        coercion_hits += self._count_keyword_hits(text_orig, HINDI_COERCION_KEYWORDS)
        urgency_hits += self._count_keyword_hits(text_orig, HINDI_URGENCY_KEYWORDS)
        phishing_hits += self._count_keyword_hits(text_orig, HINDI_PHISHING_KEYWORDS)
        financial_hits += self._count_keyword_hits(text_orig, HINDI_FINANCIAL_KEYWORDS)

        # Calculate sub-scores (each keyword hit adds weight, capped at 100)
        coercion_score = min(coercion_hits * 18, 100)
        urgency_score = min(urgency_hits * 20, 100)
        phishing_score = min(phishing_hits * 22, 100)
        financial_score = min(financial_hits * 20, 100)

        # Safe indicators reduce the score
        safe_reduction = safe_hits * 12

        # Overall weighted score
        overall = (
            coercion_score * 0.30
            + urgency_score * 0.20
            + phishing_score * 0.25
            + financial_score * 0.25
            - safe_reduction
        )
        overall = max(0, min(100, overall))

        # Collect threat labels
        threat_labels = []
        matched_phrases = []
        if coercion_hits > 0:
            threat_labels.append("coercion")
            matched_phrases.extend(self._get_matched_keywords(text_lower, COERCION_KEYWORDS))
        if urgency_hits > 0:
            threat_labels.append("urgency")
            matched_phrases.extend(self._get_matched_keywords(text_lower, URGENCY_KEYWORDS))
        if phishing_hits > 0:
            threat_labels.append("phishing")
            matched_phrases.extend(self._get_matched_keywords(text_lower, PHISHING_KEYWORDS))
        if financial_hits > 0:
            threat_labels.append("financial_fraud")
            matched_phrases.extend(self._get_matched_keywords(text_lower, FINANCIAL_FRAUD_KEYWORDS))

        risk_level = "low"
        if overall >= 75:
            risk_level = "critical"
        elif overall >= 50:
            risk_level = "high"
        elif overall >= 30:
            risk_level = "medium"

        explanation_parts = []
        if matched_phrases:
            explanation_parts.append(f"Detected keywords: {', '.join(matched_phrases[:5])}")
        if safe_hits > 0:
            explanation_parts.append(f"Found {safe_hits} safety indicator(s)")
        explanation = ". ".join(explanation_parts) if explanation_parts else "No significant threat indicators detected."

        return RiskScore(
            overall_score=round(overall, 1),
            coercion_score=round(coercion_score, 1),
            urgency_score=round(urgency_score, 1),
            phishing_score=round(phishing_score, 1),
            threat_labels=threat_labels,
            risk_level=risk_level,
            explanation=explanation,
        )

    def _count_keyword_hits(self, text: str, keywords: List[str]) -> int:
        """Count how many keywords from the list appear in the text."""
        return sum(1 for kw in keywords if kw in text)

    def _get_matched_keywords(self, text: str, keywords: List[str]) -> List[str]:
        """Return the actual keywords that matched."""
        return [kw for kw in keywords if kw in text]

    # ============================================================
    # Score Merging
    # ============================================================

    def _merge_scores(self, hf_score: RiskScore, heuristic_score: RiskScore) -> RiskScore:
        """Merge HF API results with heuristic results (weighted blend)."""
        return self._blend_with_heuristic(hf_score, heuristic_score, gemini_weight=0.60)

    def _blend_with_heuristic(
        self, primary: RiskScore, heuristic: RiskScore, gemini_weight: float = 0.60
    ) -> RiskScore:
        """Blend primary (Gemini or HF) score with heuristic score."""
        hw = 1.0 - gemini_weight
        overall = primary.overall_score * gemini_weight + heuristic.overall_score * hw
        coercion = primary.coercion_score * gemini_weight + heuristic.coercion_score * hw
        urgency = primary.urgency_score * gemini_weight + heuristic.urgency_score * hw
        phishing = primary.phishing_score * gemini_weight + heuristic.phishing_score * hw
        all_labels = list(set(primary.threat_labels + heuristic.threat_labels))

        risk_level = "low"
        if overall >= 75:
            risk_level = "critical"
        elif overall >= 50:
            risk_level = "high"
        elif overall >= 30:
            risk_level = "medium"

        return RiskScore(
            overall_score=round(overall, 1),
            coercion_score=round(coercion, 1),
            urgency_score=round(urgency, 1),
            phishing_score=round(phishing, 1),
            threat_labels=all_labels,
            risk_level=risk_level,
            explanation=f"{primary.explanation} {heuristic.explanation}".strip(),
        )

    # ============================================================
    # Verdict Generation
    # ============================================================

    async def _generate_verdict(self, text: str, risk_score: RiskScore) -> str:
        """
        Generate a human-readable verdict.
        Tries HF text generation, falls back to template-based verdict.
        """
        # Try HF text generation
        if self.use_hf_api and self.http_client and risk_score.overall_score > 20:
            hf_verdict = await self._hf_generate_verdict(text, risk_score)
            if hf_verdict:
                return hf_verdict

        # Fallback: template-based verdict
        return self._template_verdict(text, risk_score)

    async def _hf_generate_verdict(self, text: str, risk_score: RiskScore) -> Optional[str]:
        """Generate verdict using HF text generation API."""
        if not self.http_client:
            return None

        try:
            prompt = (
                f"<|im_start|>system\n"
                f"You are ScamShield AI, a fraud detection expert. Analyze the following message and provide a clear, "
                f"concise verdict in 2-3 sentences. State whether it is a scam, the type of scam, and one key action "
                f"the recipient should take. Be direct and authoritative.\n"
                f"<|im_end|>\n"
                f"<|im_start|>user\n"
                f"Analyze this message (Risk Score: {risk_score.overall_score}/100, "
                f"Detected threats: {', '.join(risk_score.threat_labels) if risk_score.threat_labels else 'none'}):\n\n"
                f'"{text[:500]}"\n'
                f"<|im_end|>\n"
                f"<|im_start|>assistant\n"
            )

            payload = {
                "inputs": prompt,
                "parameters": {
                    "max_new_tokens": 200,
                    "temperature": 0.3,
                    "return_full_text": False,
                },
            }

            response = await self.http_client.post(HF_TEXT_GEN_URL, json=payload)

            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    generated = data[0].get("generated_text", "").strip()
                    # Clean up any remaining special tokens
                    generated = generated.split("<|im_end|>")[0].strip()
                    generated = generated.split("<|im_start|>")[0].strip()
                    if len(generated) > 20:
                        return generated
            return None

        except Exception as e:
            logger.warning(f"HF text generation failed: {e}")
            return None

    def _template_verdict(self, text: str, risk_score: RiskScore) -> str:
        """Generate a template-based verdict when HF API is unavailable."""
        level = risk_score.risk_level
        score = risk_score.overall_score
        labels = risk_score.threat_labels

        if level == "critical":
            prefix = "🚨 CRITICAL ALERT"
            severity = "extremely dangerous"
        elif level == "high":
            prefix = "⚠️ HIGH RISK"
            severity = "highly suspicious"
        elif level == "medium":
            prefix = "⚡ MODERATE RISK"
            severity = "potentially suspicious"
        else:
            prefix = "✅ LOW RISK"
            severity = "likely safe"

        # Build specific findings
        findings = []
        if "coercion" in labels:
            findings.append("coercive language and threats designed to intimidate")
        if "urgency" in labels:
            findings.append("artificial urgency creating pressure to act immediately")
        if "phishing" in labels:
            findings.append("phishing tactics attempting to steal personal information")
        if "financial_fraud" in labels:
            findings.append("financial fraud indicators such as unrealistic promises or payment demands")
        if "impersonation" in labels:
            findings.append("impersonation of authority figures or organizations")
        if "scam" in labels:
            findings.append("general scam patterns consistent with known fraud schemes")

        if findings:
            finding_text = f"This message is {severity}. Analysis detected: {'; '.join(findings)}."
        else:
            finding_text = f"This message appears {severity} based on our analysis."

        # Recommendations
        if score >= 50:
            action = "Do NOT respond, click links, or share any personal/financial information. Report this to cybercrime.gov.in or call 1930."
        elif score >= 30:
            action = "Verify this communication through official channels before taking any action."
        else:
            action = "No immediate action required, but always verify unexpected communications independently."

        return f"{prefix} (Score: {score}/100): {finding_text} {action}"

    # ============================================================
    # Helper Methods
    # ============================================================

    def _calculate_cumulative_risk(self, session_id: str) -> float:
        """Calculate weighted cumulative risk for a call session."""
        chunks = self._session_contexts.get(session_id, [])
        if not chunks:
            return 0.0

        # Analyze each chunk and weight recent chunks more heavily
        total_weight = 0.0
        weighted_score = 0.0

        for i, chunk in enumerate(chunks):
            weight = 1.0 + (i * 0.3)  # More recent chunks get higher weight
            chunk_result = self._heuristic_analysis(chunk.lower())
            weighted_score += chunk_result.overall_score * weight
            total_weight += weight

        return round(weighted_score / total_weight, 1) if total_weight > 0 else 0.0

    def _extract_flagged_phrases(self, text: str) -> List[str]:
        """Extract specific flagged phrases from text."""
        text_lower = text.lower()
        all_keywords = COERCION_KEYWORDS + URGENCY_KEYWORDS + PHISHING_KEYWORDS + FINANCIAL_FRAUD_KEYWORDS
        all_keywords += HINDI_COERCION_KEYWORDS + HINDI_URGENCY_KEYWORDS + HINDI_PHISHING_KEYWORDS + HINDI_FINANCIAL_KEYWORDS
        return [kw for kw in all_keywords if kw in text_lower or kw in text]

    def _detect_language(self, text: str) -> str:
        """Detect the primary language of the text."""
        # Count Devanagari characters
        devanagari = sum(1 for c in text if '\u0900' <= c <= '\u097F')
        total_alpha = sum(1 for c in text if c.isalpha())
        if total_alpha == 0:
            return "en"
        ratio = devanagari / total_alpha
        if ratio > 0.5:
            return "hi"  # Hindi
        elif ratio > 0.1:
            return "hi-en"  # Hinglish
        return "en"  # English

    def _generate_recommendations(self, risk_score: RiskScore) -> List[str]:
        """Generate actionable recommendations based on risk analysis."""
        recommendations = []

        if risk_score.overall_score >= 70:
            recommendations.append("Immediately disconnect and do not respond to this communication.")
            recommendations.append("Report to National Cyber Crime Portal: cybercrime.gov.in")
            recommendations.append("Call the Cyber Crime Helpline: 1930")
            recommendations.append("Block the sender's number/email immediately.")
        elif risk_score.overall_score >= 40:
            recommendations.append("Do not share any personal or financial information.")
            recommendations.append("Verify the sender's identity through official channels.")
            recommendations.append("Do not click any links or download attachments.")
        else:
            recommendations.append("This appears relatively safe, but always verify unexpected communications.")
            recommendations.append("Never share OTP, passwords, or financial details over call/text.")

        if "coercion" in risk_score.threat_labels:
            recommendations.append("Remember: No legitimate authority threatens arrest over phone calls.")
        if "phishing" in risk_score.threat_labels:
            recommendations.append("Check the sender's email domain carefully for spoofing.")
        if "financial_fraud" in risk_score.threat_labels:
            recommendations.append("Legitimate investments never guarantee fixed high returns.")

        return recommendations


    def clear_session(self, session_id: str) -> None:
        """Clear the context for a session (both in-memory and Redis)."""
        self._session_contexts.pop(session_id, None)
        # Schedule Redis delete (non-blocking)
        if self._cache:
            import asyncio
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    loop.create_task(self._cache.delete_session(session_id))
            except Exception:
                pass

    async def _get_session_chunks(self, session_id: str) -> List[str]:
        """Get session chunks from Redis (or in-memory fallback)."""
        if self._cache and self._cache.is_enabled:
            chunks = await self._cache.get_session_chunks(session_id)
            if chunks:
                self._session_contexts[session_id] = chunks  # sync local
                return chunks
        return self._session_contexts.get(session_id, [])

    async def _set_session_chunks(self, session_id: str, chunks: List[str]) -> None:
        """Persist session chunks to Redis and in-memory."""
        self._session_contexts[session_id] = chunks
        if self._cache and self._cache.is_enabled:
            await self._cache.set_session_chunks(session_id, chunks)


# Singleton instance
scam_analyzer = ScamAnalyzer()
