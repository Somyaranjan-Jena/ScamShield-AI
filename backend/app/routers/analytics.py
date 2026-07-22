"""
ScamShield AI — Analytics Router (Security-Hardened)
Rate-limited fraud network graph data and platform statistics.
"""

import logging
from typing import List

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from app.database import db
from app.models import get_demo_edges, get_demo_nodes, get_demo_reports
from app.schemas import GraphData, GraphEdge, GraphNode, PlatformStats
from app.security import limiter

logger = logging.getLogger("scamshield.analytics")

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/graph", response_model=GraphData)
@limiter.limit("30/minute")
async def get_fraud_graph(request: Request):
    """
    Return the fraud network graph data (nodes and edges).
    Used by the NetworkGraph component for visualization.

    Rate limit: 30 requests/minute per IP.
    """
    if db.is_connected:
        # Fetch from database
        node_rows = await db.fetch(
            "SELECT node_id, label, node_type, risk_level, metadata FROM transaction_nodes ORDER BY created_at"
        )
        edge_rows = await db.fetch(
            "SELECT edge_id, source_node_id, target_node_id, edge_type, amount, description, flagged FROM transaction_edges ORDER BY created_at"
        )

        nodes = [
            GraphNode(
                id=row["node_id"],
                label=row["label"],
                node_type=row["node_type"],
                risk_level=row["risk_level"],
                metadata=row.get("metadata", {}),
            )
            for row in node_rows
        ]

        edges = [
            GraphEdge(
                id=row["edge_id"],
                source=row["source_node_id"],
                target=row["target_node_id"],
                edge_type=row["edge_type"],
                amount=float(row["amount"]) if row.get("amount") else None,
                description=row.get("description"),
                flagged=row.get("flagged", False),
            )
            for row in edge_rows
        ]
    else:
        # Demo mode fallback
        demo_nodes = get_demo_nodes()
        demo_edges = get_demo_edges()

        nodes = [
            GraphNode(
                id=n.node_id,
                label=n.label,
                node_type=n.node_type,
                risk_level=n.risk_level,
                metadata=n.metadata,
            )
            for n in demo_nodes
        ]

        edges = [
            GraphEdge(
                id=e.edge_id,
                source=e.source_node_id,
                target=e.target_node_id,
                edge_type=e.edge_type,
                amount=e.amount,
                description=e.description,
                flagged=e.flagged,
            )
            for e in demo_edges
        ]

    return GraphData(
        nodes=nodes,
        edges=edges,
        total_nodes=len(nodes),
        total_edges=len(edges),
    )


@router.get("/stats", response_model=PlatformStats)
@limiter.limit("30/minute")
async def get_platform_stats(request: Request):
    """
    Return aggregate platform statistics for the dashboard.

    Rate limit: 30 requests/minute per IP.
    """
    if db.is_connected:
        row = await db.fetchrow("SELECT * FROM platform_stats")
        if row:
            return PlatformStats(
                total_reports=row.get("total_reports", 0),
                confirmed_frauds=row.get("confirmed_frauds", 0),
                reports_today=row.get("reports_today", 0),
                flagged_calls=row.get("flagged_calls", 0),
                avg_risk_score=float(row.get("avg_risk_score", 0)),
                high_risk_nodes=row.get("high_risk_nodes", 0),
                scams_prevented=row.get("confirmed_frauds", 0),
                total_amount_saved=3200000.0,
            )

    # Demo mode fallback
    demo_reports = get_demo_reports()
    confirmed = sum(1 for r in demo_reports if r.status == "confirmed_fraud")
    avg_risk = sum(r.risk_score for r in demo_reports) / len(demo_reports) if demo_reports else 0

    return PlatformStats(
        total_reports=len(demo_reports),
        confirmed_frauds=confirmed,
        reports_today=2,
        flagged_calls=7,
        avg_risk_score=round(avg_risk, 1),
        high_risk_nodes=5,
        scams_prevented=confirmed,
        total_amount_saved=3200000.0,
    )


@router.get("/reports")
@limiter.limit("30/minute")
async def get_analytics_reports(request: Request):
    """
    Return recent fraud reports for the analytics view.

    Rate limit: 30 requests/minute per IP.
    """
    if db.is_connected:
        rows = await db.fetch(
            """
            SELECT id, reporter_name, report_type, suspect_contact, description,
                   ai_verdict, risk_score, status, created_at
            FROM fraud_reports
            ORDER BY created_at DESC
            LIMIT 50
            """
        )
        return {"reports": rows, "total": len(rows)}

    # Demo mode fallback
    demo_reports = get_demo_reports()
    return {
        "reports": [r.to_dict() for r in demo_reports],
        "total": len(demo_reports),
    }


@router.get("/graph/export")
@limiter.limit("10/minute")
async def export_fraud_graph(
    request: Request,
    format: str = "json",
):
    """
    Export the fraud network graph as JSON or CSV.
    Rate limit: 10/minute per IP.
    """
    import csv
    import io
    import json as jsonlib

    # Get graph data
    from app.models import get_demo_nodes, get_demo_edges

    if db.is_connected:
        node_rows = await db.fetch(
            "SELECT node_id, label, node_type, risk_level FROM transaction_nodes"
        )
        edge_rows = await db.fetch(
            "SELECT edge_id, source_node_id, target_node_id, edge_type, amount, description, flagged FROM transaction_edges"
        )
        nodes = [dict(r) for r in node_rows]
        edges = [dict(r) for r in edge_rows]
    else:
        nodes = [n.to_dict() for n in get_demo_nodes()]
        edges = [e.to_dict() for e in get_demo_edges()]

    if format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Type", "ID", "Label/Source", "NodeType/Target", "RiskLevel/EdgeType", "Amount", "Description", "Flagged"])
        for n in nodes:
            writer.writerow(["node", n.get("id", n.get("node_id")), n.get("label"), n.get("node_type"), n.get("risk_level"), "", "", ""])
        for e in edges:
            writer.writerow(["edge", e.get("id", e.get("edge_id")), e.get("source", e.get("source_node_id")), e.get("target", e.get("target_node_id")), e.get("edge_type"), e.get("amount", ""), e.get("description", ""), e.get("flagged", False)])
        output.seek(0)
        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=scamshield_graph.csv"},
        )

    # Default: JSON
    payload = jsonlib.dumps({"nodes": nodes, "edges": edges}, default=str, indent=2)
    return StreamingResponse(
        iter([payload]),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=scamshield_graph.json"},
    )

