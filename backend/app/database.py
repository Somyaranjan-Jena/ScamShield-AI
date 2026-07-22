"""
ScamShield AI — Database Connection Manager
Manages asyncpg connection pool for PostgreSQL.
Falls back gracefully when no database is available.
"""

import logging
from typing import Optional

import asyncpg

from app.config import settings

logger = logging.getLogger("scamshield.database")


class Database:
    """Async PostgreSQL connection pool manager."""

    def __init__(self) -> None:
        self.pool: Optional[asyncpg.Pool] = None
        self.is_connected: bool = False

    async def connect(self) -> None:
        """Initialize the database connection pool."""
        try:
            self.pool = await asyncpg.create_pool(
                dsn=settings.database_url,
                min_size=2,
                max_size=10,
                command_timeout=30,
            )
            self.is_connected = True
            logger.info("Database connection pool established successfully.")
        except Exception as e:
            logger.warning(
                f"Could not connect to database: {e}. "
                "Running in demo mode with in-memory data."
            )
            self.pool = None
            self.is_connected = False

    async def disconnect(self) -> None:
        """Close the database connection pool."""
        if self.pool:
            await self.pool.close()
            self.is_connected = False
            logger.info("Database connection pool closed.")

    async def fetch(self, query: str, *args) -> list:
        """Execute a SELECT query and return all rows."""
        if not self.pool:
            return []
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query, *args)
            return [dict(row) for row in rows]

    async def fetchrow(self, query: str, *args) -> Optional[dict]:
        """Execute a SELECT query and return a single row."""
        if not self.pool:
            return None
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(query, *args)
            return dict(row) if row else None

    async def execute(self, query: str, *args) -> str:
        """Execute an INSERT/UPDATE/DELETE query."""
        if not self.pool:
            return "DEMO_MODE"
        async with self.pool.acquire() as conn:
            return await conn.execute(query, *args)

    async def fetchval(self, query: str, *args):
        """Execute a query and return a single value."""
        if not self.pool:
            return None
        async with self.pool.acquire() as conn:
            return await conn.fetchval(query, *args)


db = Database()
