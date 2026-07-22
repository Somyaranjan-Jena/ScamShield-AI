"""
ScamShield AI — Trends Router
Time-series scam detection analytics. Works in both DB and demo mode.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import List

from fastapi import APIRouter, Query, Request
from fastapi.responses import StreamingResponse

from app.database import db
from app.models import get_demo_reports
from app.security import limiter

logger = logging.getLogger("scamshield.trends")

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

PERIOD_DAYS = {"7d": 7, "30d": 30, "90d": 90}


@router.get("/trends")
@limiter.limit("30/minute")
async def get_trends(
    request: Request,
    period: str = Query(default="7d", pattern=r"^(7d|30d|90d)$"),
):
    """
    Return bucketed scam report counts by type over time.
    7d → daily buckets, 30d/90d → weekly buckets.

    Rate limit: 30/minute per IP.
    """
    days = PERIOD_DAYS.get(period, 7)
    bucket_size = 1 if days <= 7 else 7  # days per bucket
    now = datetime.now(timezone.utc)

    if db.is_connected:
        # Build SQL time-series query
        rows = await db.fetch(
            """
            SELECT
                date_trunc($1, created_at) AS bucket,
                report_type,
                COUNT(*) AS count
            FROM fraud_reports
            WHERE created_at >= NOW() - ($2 || ' days')::INTERVAL
            GROUP BY bucket, report_type
            ORDER BY bucket ASC
            """,
            "week" if bucket_size > 1 else "day",
            str(days),
        )
        # Group by bucket
        buckets: dict = {}
        for row in rows:
            label = row["bucket"].strftime("%d %b" if days <= 7 else "%d %b")
            if label not in buckets:
                buckets[label] = {
                    "label": label,
                    "digital_arrest": 0,
                    "phishing": 0,
                    "financial_fraud": 0,
                    "impersonation": 0,
                    "other": 0,
                }
            rtype = row["report_type"]
            if rtype in buckets[label]:
                buckets[label][rtype] = int(row["count"])

        return {"period": period, "data": list(buckets.values())}

    # Demo mode — generate realistic synthetic trend data
    data = []
    report_types = ["digital_arrest", "phishing", "financial_fraud", "impersonation", "other"]
    base_counts = {"digital_arrest": 20, "phishing": 14, "financial_fraud": 10, "impersonation": 7, "other": 4}
    num_buckets = days // bucket_size

    import random
    random.seed(42)  # Deterministic for demo

    for i in range(num_buckets):
        bucket_date = now - timedelta(days=(num_buckets - 1 - i) * bucket_size)
        label = bucket_date.strftime("%a" if days <= 7 else "%d %b")
        entry: dict = {"label": label}
        weekend_boost = 1.4 if bucket_date.weekday() >= 5 else 1.0
        for rtype in report_types:
            noise = random.uniform(0.7, 1.4)
            trend = 1.0 + (i / num_buckets) * 0.3  # upward trend
            entry[rtype] = max(0, round(base_counts[rtype] * noise * trend * weekend_boost))
        data.append(entry)

    return {"period": period, "data": data}
