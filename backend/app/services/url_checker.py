"""
ScamShield AI — URL Threat Intelligence Service
Checks URLs extracted from text against VirusTotal and local heuristics.
Gracefully degrades when no API key is configured.
"""

import logging
import re
from typing import Dict, List, Optional
from urllib.parse import urlparse

import httpx

from app.config import settings

logger = logging.getLogger("scamshield.url_checker")

# Regex to extract URLs from text
URL_PATTERN = re.compile(
    r"https?://[^\s<>\"']+|www\.[^\s<>\"']+",
    re.IGNORECASE,
)

# Known suspicious TLDs and patterns (heuristic)
SUSPICIOUS_TLDS = {
    ".xyz", ".tk", ".ml", ".ga", ".cf", ".gq", ".top", ".click",
    ".link", ".work", ".loan", ".date", ".stream", ".science", ".party",
    ".download", ".racing", ".win", ".bid", ".trade", ".review",
}

# Domains that impersonate legitimate Indian services
IMPERSONATION_PATTERNS = [
    r"paytm[^.]*\.(xyz|tk|top|ml|ga)",
    r"sbi[^.]*\.(xyz|tk|top|click|ml)",
    r"hdfc[^.]*\.(xyz|tk|top|click)",
    r"aadhaar[^.]*\.(xyz|tk|top|click)",
    r"npci[^.]*\.(xyz|tk|top)",
    r"cbi[^.]*\.(xyz|tk|top|info)",
    r"income.?tax[^.]*\.(xyz|tk|top|info)",
    r"gov\.in\.[a-z]+",  # fake .gov.in subdomains
    r"cybercrime[^.]*\.(xyz|tk|top|click)",
]

IMPERSONATION_COMPILED = [re.compile(p, re.IGNORECASE) for p in IMPERSONATION_PATTERNS]

VIRUSTOTAL_URL = "https://www.virustotal.com/api/v3/urls"


class URLChecker:
    """
    Checks URLs for threat indicators.
    Priority: VirusTotal API → local heuristic analysis.
    """

    def __init__(self) -> None:
        self.http_client: Optional[httpx.AsyncClient] = None

    async def initialize(self) -> None:
        if settings.has_virustotal:
            self.http_client = httpx.AsyncClient(
                timeout=httpx.Timeout(15.0, connect=5.0),
                headers={"x-apikey": settings.virustotal_api_key},
            )
            logger.info("URLChecker: VirusTotal mode")
        else:
            logger.info("URLChecker: Heuristic-only mode (no VT key)")

    async def shutdown(self) -> None:
        if self.http_client:
            await self.http_client.aclose()

    def extract_urls(self, text: str) -> List[str]:
        """Extract all URLs from the given text."""
        return list(set(URL_PATTERN.findall(text)))

    async def check_text(self, text: str) -> Dict:
        """
        Extract and check all URLs found in text.
        Returns a dict with threat info.
        """
        urls = self.extract_urls(text)
        if not urls:
            return {
                "urls_found": 0,
                "threat_score": 0.0,
                "flagged_urls": [],
                "threat_details": [],
            }

        flagged = []
        threat_details = []
        max_score = 0.0

        for url in urls[:5]:  # Limit to first 5 URLs per message
            result = await self._check_single_url(url)
            if result["is_suspicious"]:
                flagged.append(url)
                threat_details.append(result)
                max_score = max(max_score, result["threat_score"])

        return {
            "urls_found": len(urls),
            "threat_score": max_score,
            "flagged_urls": flagged,
            "threat_details": threat_details,
        }

    async def _check_single_url(self, url: str) -> Dict:
        """Check a single URL. Tries VT API first, then heuristics."""
        # Try VirusTotal
        if self.http_client and settings.has_virustotal:
            vt_result = await self._virustotal_check(url)
            if vt_result is not None:
                return vt_result

        # Fall back to heuristic
        return self._heuristic_check(url)

    async def _virustotal_check(self, url: str) -> Optional[Dict]:
        """Submit URL to VirusTotal and return threat info."""
        if not self.http_client:
            return None
        try:
            import base64
            url_id = base64.urlsafe_b64encode(url.encode()).decode().rstrip("=")

            resp = await self.http_client.get(
                f"https://www.virustotal.com/api/v3/urls/{url_id}",
                timeout=10.0,
            )
            if resp.status_code == 200:
                data = resp.json()
                stats = data.get("data", {}).get("attributes", {}).get("last_analysis_stats", {})
                malicious = stats.get("malicious", 0)
                suspicious = stats.get("suspicious", 0)
                total = sum(stats.values()) or 1
                threat_ratio = (malicious + suspicious) / total
                return {
                    "url": url,
                    "source": "virustotal",
                    "is_suspicious": threat_ratio > 0.05,
                    "threat_score": min(threat_ratio * 100, 100.0),
                    "malicious_detections": malicious,
                    "suspicious_detections": suspicious,
                }
        except Exception as e:
            logger.debug(f"VirusTotal check failed for {url}: {e}")
        return None

    def _heuristic_check(self, url: str) -> Dict:
        """Local heuristic URL threat assessment."""
        score = 0.0
        reasons = []

        try:
            parsed = urlparse(url if url.startswith("http") else f"http://{url}")
            domain = parsed.netloc.lower()
        except Exception:
            return {"url": url, "source": "heuristic", "is_suspicious": False, "threat_score": 0.0}

        # Check suspicious TLD
        for tld in SUSPICIOUS_TLDS:
            if domain.endswith(tld):
                score += 40.0
                reasons.append(f"suspicious TLD: {tld}")
                break

        # Check impersonation patterns
        for pattern in IMPERSONATION_COMPILED:
            if pattern.search(domain):
                score += 60.0
                reasons.append("impersonates a legitimate domain")
                break

        # Very long domain (obfuscation)
        if len(domain) > 40:
            score += 15.0
            reasons.append("unusually long domain")

        # Many subdomains (phishing pattern)
        if domain.count(".") > 4:
            score += 20.0
            reasons.append("excessive subdomains")

        # IP address as host
        ip_pattern = re.compile(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}")
        if ip_pattern.match(domain):
            score += 35.0
            reasons.append("IP address used as domain")

        score = min(score, 100.0)
        return {
            "url": url,
            "source": "heuristic",
            "is_suspicious": score >= 30.0,
            "threat_score": round(score, 1),
            "reasons": reasons,
        }


# Singleton
url_checker = URLChecker()
