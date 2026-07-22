"""
ScamShield AI — Data Models
In-memory data structures for demo mode when no database is available.
These mirror the PostgreSQL tables and provide fallback seed data.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field


@dataclass
class FraudReport:
    """In-memory fraud report record."""
    id: str
    reporter_name: str
    report_type: str
    suspect_contact: Optional[str]
    description: str
    ai_verdict: Optional[str]
    risk_score: float
    status: str
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "reporter_name": self.reporter_name,
            "report_type": self.report_type,
            "suspect_contact": self.suspect_contact,
            "description": self.description,
            "ai_verdict": self.ai_verdict,
            "risk_score": self.risk_score,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
        }


@dataclass
class TransactionNode:
    """In-memory graph node."""
    node_id: str
    label: str
    node_type: str
    risk_level: str
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.node_id,
            "label": self.label,
            "node_type": self.node_type,
            "risk_level": self.risk_level,
            "metadata": self.metadata,
        }


@dataclass
class TransactionEdge:
    """In-memory graph edge."""
    edge_id: str
    source_node_id: str
    target_node_id: str
    edge_type: str
    amount: Optional[float] = None
    description: Optional[str] = None
    flagged: bool = False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.edge_id,
            "source": self.source_node_id,
            "target": self.target_node_id,
            "edge_type": self.edge_type,
            "amount": self.amount,
            "description": self.description,
            "flagged": self.flagged,
        }


def get_demo_nodes() -> List[TransactionNode]:
    """Return seed data nodes for demo mode."""
    return [
        TransactionNode("S001", "Rajesh Kumar (Fake CBI Officer)", "suspect", "critical",
                         {"phone": "+91-9876XXXXXX", "aliases": ["Inspector Verma", "ACP Singh"], "cases_linked": 14}),
        TransactionNode("S002", "Unknown Caller - VoIP", "suspect", "high",
                         {"phone": "+1-555-0199", "voip": True, "location": "Unknown", "cases_linked": 7}),
        TransactionNode("S003", "Digital Arrest Syndicate HQ", "suspect", "critical",
                         {"type": "organization", "estimated_members": 25, "total_fraud_amount": 45000000}),
        TransactionNode("M001", "Mule Account - HDFC ****4521", "money_mule", "high",
                         {"bank": "HDFC", "account_last4": "4521", "total_received": 2850000}),
        TransactionNode("M002", "Mule Account - SBI ****8837", "money_mule", "high",
                         {"bank": "SBI", "account_last4": "8837", "total_received": 1200000}),
        TransactionNode("M003", "Crypto Wallet - 0xA3f...9d2", "money_mule", "critical",
                         {"type": "crypto", "wallet_prefix": "0xA3f", "total_received": 8900000}),
        TransactionNode("V001", "Victim - Anita Sharma", "victim", "low",
                         {"age": 62, "city": "Delhi", "amount_lost": 450000, "scam_type": "digital_arrest"}),
        TransactionNode("V002", "Victim - Pradeep Gupta", "victim", "low",
                         {"age": 55, "city": "Mumbai", "amount_lost": 780000, "scam_type": "digital_arrest"}),
        TransactionNode("V003", "Victim - Sunita Patel", "victim", "low",
                         {"age": 48, "city": "Bangalore", "amount_lost": 320000, "scam_type": "impersonation"}),
        TransactionNode("V004", "Victim - Ramesh Iyer", "victim", "low",
                         {"age": 70, "city": "Chennai", "amount_lost": 1200000, "scam_type": "financial_fraud"}),
        TransactionNode("P001", "Spoofed: +91-11-2309XXXX (CBI)", "phone_number", "critical",
                         {"spoofed_identity": "CBI Headquarters", "times_used": 47}),
        TransactionNode("P002", "Burner: +91-70XX-XXXXXX", "phone_number", "high",
                         {"type": "prepaid_burner", "active_days": 3}),
        TransactionNode("P003", "VoIP: +44-20-XXXX-XXXX", "phone_number", "high",
                         {"type": "voip", "provider": "unknown", "country": "UK"}),
    ]


def get_demo_edges() -> List[TransactionEdge]:
    """Return seed data edges for demo mode."""
    return [
        TransactionEdge("E001", "P001", "V001", "call", None, "Spoofed CBI call to victim, 45 min duration", True),
        TransactionEdge("E002", "P001", "V002", "call", None, "Spoofed CBI call, threatened with arrest warrant", True),
        TransactionEdge("E003", "P002", "V003", "call", None, "Impersonation call claiming to be bank manager", True),
        TransactionEdge("E004", "P003", "V004", "call", None, "International VoIP call, fake Interpol officer", True),
        TransactionEdge("E005", "S001", "P001", "linked_account", None, "Suspect operates this spoofed number", True),
        TransactionEdge("E006", "S002", "P002", "linked_account", None, "Suspect uses this burner phone", True),
        TransactionEdge("E007", "S002", "P003", "linked_account", None, "Suspect also uses international VoIP", True),
        TransactionEdge("E008", "V001", "M001", "transaction", 450000.00, 'Victim transferred under duress - "security deposit"', True),
        TransactionEdge("E009", "V002", "M001", "transaction", 780000.00, "Multiple transfers over 2 days", True),
        TransactionEdge("E010", "V003", "M002", "transaction", 320000.00, "Single large transfer to mule account", True),
        TransactionEdge("E011", "V004", "M002", "transaction", 500000.00, "First installment of fraud", True),
        TransactionEdge("E012", "V004", "M003", "transaction", 700000.00, "Crypto transfer demanded by scammer", True),
        TransactionEdge("E013", "M001", "M003", "transaction", 1100000.00, "Mule forwards to crypto wallet", True),
        TransactionEdge("E014", "M002", "M003", "transaction", 750000.00, "Mule consolidates to crypto", True),
        TransactionEdge("E015", "M003", "S003", "transaction", 3500000.00, "Final extraction to syndicate", True),
        TransactionEdge("E016", "V001", "S001", "reported_by", None, "Victim identified suspect voice", False),
        TransactionEdge("E017", "V002", "S001", "reported_by", None, "Victim reported same modus operandi", False),
    ]


def get_demo_reports() -> List[FraudReport]:
    """Return seed fraud reports for demo mode."""
    return [
        FraudReport(
            id="demo-001",
            reporter_name="Anonymous",
            report_type="digital_arrest",
            suspect_contact="+91-9876XXXXXX",
            description="Received call from someone claiming to be CBI officer. Said my Aadhaar was used in money laundering. Demanded I stay on video call and transfer money to a secure account.",
            ai_verdict="HIGH RISK: This is a classic digital arrest scam. No law enforcement agency conducts arrests over phone or demands money transfers.",
            risk_score=94.5,
            status="confirmed_fraud",
        ),
        FraudReport(
            id="demo-002",
            reporter_name="Anonymous",
            report_type="phishing",
            suspect_contact="support@paytm-secure.xyz",
            description="Got SMS saying my PayTM KYC expired and account will be blocked. Link goes to a fake login page.",
            ai_verdict="HIGH RISK: Phishing attempt. The domain paytm-secure.xyz is not affiliated with PayTM. Never click links in unsolicited SMS.",
            risk_score=88.0,
            status="confirmed_fraud",
        ),
        FraudReport(
            id="demo-003",
            reporter_name="Anonymous",
            report_type="impersonation",
            suspect_contact="+91-70XX-XXXXXX",
            description="Someone called pretending to be my bank manager. Asked for OTP to verify my account. I gave the OTP and lost Rs 50,000.",
            ai_verdict="CONFIRMED FRAUD: Bank employees never ask for OTP over phone. This is a social engineering attack.",
            risk_score=96.0,
            status="confirmed_fraud",
        ),
        FraudReport(
            id="demo-004",
            reporter_name="Anonymous",
            report_type="financial_fraud",
            suspect_contact="invest-returns@gmail.com",
            description="Was promised 30% monthly returns on crypto investment. Initially got small returns, then asked to invest more. Now they are not responding.",
            ai_verdict="HIGH RISK: Ponzi scheme characteristics detected. Unrealistic returns promise is a classic fraud indicator.",
            risk_score=91.0,
            status="investigating",
        ),
        FraudReport(
            id="demo-005",
            reporter_name="Anonymous",
            report_type="other",
            suspect_contact="Unknown WhatsApp",
            description="Received WhatsApp message about a parcel stuck at customs. Asked to pay customs duty via UPI. The tracking number does not exist on any courier website.",
            ai_verdict="MEDIUM-HIGH RISK: Customs duty scam. Legitimate customs never collect payments via UPI or WhatsApp.",
            risk_score=79.0,
            status="pending",
        ),
    ]
