"""
ScamShield AI — Application Configuration
Loads settings from environment variables with sensible defaults.
Includes security-hardened defaults for production deployment.
"""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Application settings loaded from .env file or environment variables."""

    # Hugging Face
    hf_api_token: str = ""

    # Google Gemini (optional — used as primary AI if configured)
    gemini_api_key: str = ""

    # VirusTotal (optional — used for URL threat intelligence)
    virustotal_api_key: str = ""

    # Cloudflare Turnstile (optional — bot protection on citizen shield)
    turnstile_secret_key: str = ""

    # Redis (optional — used for caching and persistent WS sessions)
    redis_url: str = "redis://localhost:6379"

    # WebSocket authentication secret
    ws_secret_key: str = "change-me-in-production-scamshield-ws-secret"
    ws_token_ttl_seconds: int = 300  # 5 minutes

    # Database
    database_url: str = "postgresql://postgres:password@localhost:5432/scamshield"

    # CORS — strict origin allowlist (no wildcards in production)
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    # Environment flag — controls debug endpoints and error verbosity
    environment: str = "development"

    # Rate limiting configuration
    rate_limit_per_minute: int = 30
    rate_limit_burst: int = 10
    ws_max_connections: int = 50
    ws_max_message_size: int = 4096

    @property
    def cors_origin_list(self) -> List[str]:
        """Parse comma-separated CORS origins into a list.

        Rejects wildcard '*' in production to prevent open CORS.
        """
        origins = [
            origin.strip()
            for origin in self.cors_origins.split(",")
            if origin.strip()
        ]
        # Block wildcard origins in production
        if self.environment == "production":
            origins = [o for o in origins if o != "*"]
        return origins

    @property
    def has_hf_token(self) -> bool:
        """Check if a Hugging Face API token is configured."""
        return bool(self.hf_api_token and self.hf_api_token.strip())

    @property
    def has_gemini(self) -> bool:
        """Check if Google Gemini API key is configured."""
        return bool(self.gemini_api_key and self.gemini_api_key.strip())

    @property
    def has_virustotal(self) -> bool:
        """Check if VirusTotal API key is configured."""
        return bool(self.virustotal_api_key and self.virustotal_api_key.strip())

    @property
    def has_turnstile(self) -> bool:
        """Check if Cloudflare Turnstile secret is configured."""
        return bool(self.turnstile_secret_key and self.turnstile_secret_key.strip())

    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.environment == "production"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


settings = Settings()
