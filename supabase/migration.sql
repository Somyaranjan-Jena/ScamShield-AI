-- ============================================================
-- ScamShield AI — Database Migration
-- PostgreSQL schema for fraud detection platform
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. Fraud Reports Table
-- ============================================================
CREATE TABLE IF NOT EXISTS fraud_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_name VARCHAR(255) DEFAULT 'Anonymous',
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('digital_arrest', 'phishing', 'financial_fraud', 'impersonation', 'other')),
    suspect_contact VARCHAR(255),
    description TEXT NOT NULL,
    ai_verdict TEXT,
    risk_score NUMERIC(5, 2) DEFAULT 0.0 CHECK (risk_score >= 0 AND risk_score <= 100),
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'confirmed_fraud', 'dismissed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fraud_reports_type ON fraud_reports(report_type);
CREATE INDEX idx_fraud_reports_status ON fraud_reports(status);
CREATE INDEX idx_fraud_reports_created ON fraud_reports(created_at DESC);

-- ============================================================
-- 2. Call Analysis Logs Table
-- ============================================================
CREATE TABLE IF NOT EXISTS call_analysis_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(100) NOT NULL,
    transcript_chunk TEXT NOT NULL,
    chunk_index INTEGER NOT NULL DEFAULT 0,
    risk_score NUMERIC(5, 2) DEFAULT 0.0 CHECK (risk_score >= 0 AND risk_score <= 100),
    coercion_score NUMERIC(5, 2) DEFAULT 0.0,
    urgency_score NUMERIC(5, 2) DEFAULT 0.0,
    threat_labels JSONB DEFAULT '[]'::jsonb,
    flagged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_call_logs_session ON call_analysis_logs(session_id);
CREATE INDEX idx_call_logs_flagged ON call_analysis_logs(flagged) WHERE flagged = TRUE;

-- ============================================================
-- 3. Transaction Network Nodes
-- ============================================================
CREATE TABLE IF NOT EXISTS transaction_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id VARCHAR(100) UNIQUE NOT NULL,
    label VARCHAR(255) NOT NULL,
    node_type VARCHAR(50) NOT NULL CHECK (node_type IN ('suspect', 'victim', 'money_mule', 'phone_number', 'bank_account')),
    risk_level VARCHAR(20) DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_nodes_type ON transaction_nodes(node_type);
CREATE INDEX idx_nodes_risk ON transaction_nodes(risk_level);

-- ============================================================
-- 4. Transaction Network Edges
-- ============================================================
CREATE TABLE IF NOT EXISTS transaction_edges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    edge_id VARCHAR(100) UNIQUE NOT NULL,
    source_node_id VARCHAR(100) NOT NULL REFERENCES transaction_nodes(node_id) ON DELETE CASCADE,
    target_node_id VARCHAR(100) NOT NULL REFERENCES transaction_nodes(node_id) ON DELETE CASCADE,
    edge_type VARCHAR(50) NOT NULL CHECK (edge_type IN ('transaction', 'call', 'sms', 'linked_account', 'reported_by')),
    amount NUMERIC(15, 2),
    currency VARCHAR(10) DEFAULT 'INR',
    description TEXT,
    flagged BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_edges_source ON transaction_edges(source_node_id);
CREATE INDEX idx_edges_target ON transaction_edges(target_node_id);
CREATE INDEX idx_edges_flagged ON transaction_edges(flagged) WHERE flagged = TRUE;

-- ============================================================
-- 5. Platform Statistics (Materialized View)
-- ============================================================
CREATE OR REPLACE VIEW platform_stats AS
SELECT
    (SELECT COUNT(*) FROM fraud_reports) AS total_reports,
    (SELECT COUNT(*) FROM fraud_reports WHERE status = 'confirmed_fraud') AS confirmed_frauds,
    (SELECT COUNT(*) FROM fraud_reports WHERE created_at > NOW() - INTERVAL '24 hours') AS reports_today,
    (SELECT COUNT(*) FROM call_analysis_logs WHERE flagged = TRUE) AS flagged_calls,
    (SELECT COALESCE(AVG(risk_score), 0) FROM fraud_reports) AS avg_risk_score,
    (SELECT COUNT(*) FROM transaction_nodes WHERE risk_level IN ('high', 'critical')) AS high_risk_nodes;

-- ============================================================
-- 6. Row Level Security Policies
-- ============================================================
ALTER TABLE fraud_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_analysis_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_edges ENABLE ROW LEVEL SECURITY;

-- Public read access for reports (anonymous users can view)
CREATE POLICY "Allow public read on fraud_reports"
    ON fraud_reports FOR SELECT
    USING (true);

-- Public insert for fraud_reports (anyone can submit)
CREATE POLICY "Allow public insert on fraud_reports"
    ON fraud_reports FOR INSERT
    WITH CHECK (true);

-- Public read on graph data
CREATE POLICY "Allow public read on transaction_nodes"
    ON transaction_nodes FOR SELECT
    USING (true);

CREATE POLICY "Allow public read on transaction_edges"
    ON transaction_edges FOR SELECT
    USING (true);

-- Public read on call logs
CREATE POLICY "Allow public read on call_analysis_logs"
    ON call_analysis_logs FOR SELECT
    USING (true);

CREATE POLICY "Allow public insert on call_analysis_logs"
    ON call_analysis_logs FOR INSERT
    WITH CHECK (true);

-- ============================================================
-- 7. Seed Data — Demo Fraud Network
-- ============================================================

-- Nodes: Suspects
INSERT INTO transaction_nodes (node_id, label, node_type, risk_level, metadata) VALUES
('S001', 'Rajesh Kumar (Fake CBI Officer)', 'suspect', 'critical', '{"phone": "+91-9876XXXXXX", "aliases": ["Inspector Verma", "ACP Singh"], "cases_linked": 14}'),
('S002', 'Unknown Caller - VoIP', 'suspect', 'high', '{"phone": "+1-555-0199", "voip": true, "location": "Unknown", "cases_linked": 7}'),
('S003', 'Digital Arrest Syndicate HQ', 'suspect', 'critical', '{"type": "organization", "estimated_members": 25, "total_fraud_amount": 45000000}');

-- Nodes: Money Mules
INSERT INTO transaction_nodes (node_id, label, node_type, risk_level, metadata) VALUES
('M001', 'Mule Account - HDFC ****4521', 'money_mule', 'high', '{"bank": "HDFC", "account_last4": "4521", "total_received": 2850000}'),
('M002', 'Mule Account - SBI ****8837', 'money_mule', 'high', '{"bank": "SBI", "account_last4": "8837", "total_received": 1200000}'),
('M003', 'Crypto Wallet - 0xA3f...9d2', 'money_mule', 'critical', '{"type": "crypto", "wallet_prefix": "0xA3f", "total_received": 8900000}');

-- Nodes: Victims
INSERT INTO transaction_nodes (node_id, label, node_type, risk_level, metadata) VALUES
('V001', 'Victim - Anita Sharma', 'victim', 'low', '{"age": 62, "city": "Delhi", "amount_lost": 450000, "scam_type": "digital_arrest"}'),
('V002', 'Victim - Pradeep Gupta', 'victim', 'low', '{"age": 55, "city": "Mumbai", "amount_lost": 780000, "scam_type": "digital_arrest"}'),
('V003', 'Victim - Sunita Patel', 'victim', 'low', '{"age": 48, "city": "Bangalore", "amount_lost": 320000, "scam_type": "impersonation"}'),
('V004', 'Victim - Ramesh Iyer', 'victim', 'low', '{"age": 70, "city": "Chennai", "amount_lost": 1200000, "scam_type": "financial_fraud"}');

-- Nodes: Phone Numbers
INSERT INTO transaction_nodes (node_id, label, node_type, risk_level, metadata) VALUES
('P001', 'Spoofed: +91-11-2309XXXX (CBI)', 'phone_number', 'critical', '{"spoofed_identity": "CBI Headquarters", "times_used": 47}'),
('P002', 'Burner: +91-70XX-XXXXXX', 'phone_number', 'high', '{"type": "prepaid_burner", "active_days": 3}'),
('P003', 'VoIP: +44-20-XXXX-XXXX', 'phone_number', 'high', '{"type": "voip", "provider": "unknown", "country": "UK"}');

-- Edges: Call connections
INSERT INTO transaction_edges (edge_id, source_node_id, target_node_id, edge_type, description, flagged) VALUES
('E001', 'P001', 'V001', 'call', 'Spoofed CBI call to victim, 45 min duration', true),
('E002', 'P001', 'V002', 'call', 'Spoofed CBI call, threatened with arrest warrant', true),
('E003', 'P002', 'V003', 'call', 'Impersonation call claiming to be bank manager', true),
('E004', 'P003', 'V004', 'call', 'International VoIP call, fake Interpol officer', true),
('E005', 'S001', 'P001', 'linked_account', 'Suspect operates this spoofed number', true),
('E006', 'S002', 'P002', 'linked_account', 'Suspect uses this burner phone', true),
('E007', 'S002', 'P003', 'linked_account', 'Suspect also uses international VoIP', true);

-- Edges: Money flow
INSERT INTO transaction_edges (edge_id, source_node_id, target_node_id, edge_type, amount, description, flagged) VALUES
('E008', 'V001', 'M001', 'transaction', 450000.00, 'Victim transferred under duress - "security deposit"', true),
('E009', 'V002', 'M001', 'transaction', 780000.00, 'Multiple transfers over 2 days', true),
('E010', 'V003', 'M002', 'transaction', 320000.00, 'Single large transfer to mule account', true),
('E011', 'V004', 'M002', 'transaction', 500000.00, 'First installment of fraud', true),
('E012', 'V004', 'M003', 'transaction', 700000.00, 'Crypto transfer demanded by scammer', true),
('E013', 'M001', 'M003', 'transaction', 1100000.00, 'Mule forwards to crypto wallet', true),
('E014', 'M002', 'M003', 'transaction', 750000.00, 'Mule consolidates to crypto', true),
('E015', 'M003', 'S003', 'transaction', 3500000.00, 'Final extraction to syndicate', true);

-- Edges: Reporting connections
INSERT INTO transaction_edges (edge_id, source_node_id, target_node_id, edge_type, description, flagged) VALUES
('E016', 'V001', 'S001', 'reported_by', 'Victim identified suspect voice', false),
('E017', 'V002', 'S001', 'reported_by', 'Victim reported same modus operandi', false);

-- Seed fraud reports
INSERT INTO fraud_reports (report_type, suspect_contact, description, ai_verdict, risk_score, status) VALUES
('digital_arrest', '+91-9876XXXXXX', 'Received call from someone claiming to be CBI officer. Said my Aadhaar was used in money laundering. Demanded I stay on video call and transfer money to "secure account".', 'HIGH RISK: This is a classic digital arrest scam. No law enforcement agency conducts arrests over phone or demands money transfers.', 94.5, 'confirmed_fraud'),
('phishing', 'support@paytm-secure.xyz', 'Got SMS saying my PayTM KYC expired and account will be blocked. Link goes to a fake login page.', 'HIGH RISK: Phishing attempt. The domain paytm-secure.xyz is not affiliated with PayTM. Never click links in unsolicited SMS.', 88.0, 'confirmed_fraud'),
('impersonation', '+91-70XX-XXXXXX', 'Someone called pretending to be my bank manager. Asked for OTP to "verify" my account. I gave the OTP and lost Rs 50,000.', 'CONFIRMED FRAUD: Bank employees never ask for OTP over phone. This is a social engineering attack.', 96.0, 'confirmed_fraud'),
('financial_fraud', 'invest-returns@gmail.com', 'Was promised 30% monthly returns on crypto investment. Initially got small returns, then asked to invest more. Now they are not responding.', 'HIGH RISK: Ponzi scheme characteristics detected. Unrealistic returns promise is a classic fraud indicator.', 91.0, 'investigating'),
('other', 'Unknown WhatsApp', 'Received WhatsApp message about a parcel stuck at customs. Asked to pay customs duty via UPI. The tracking number does not exist on any courier website.', 'MEDIUM-HIGH RISK: Customs duty scam. Legitimate customs never collect payments via UPI or WhatsApp.', 79.0, 'pending');

-- ============================================================
-- v2.0 Additions — Audit Log & Analytics
-- ============================================================

-- Analysis audit log (privacy-preserving: text is hashed, IP is hashed)
CREATE TABLE IF NOT EXISTS analysis_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    text_hash VARCHAR(64) NOT NULL,          -- SHA-256 of first 500 chars
    ip_hash VARCHAR(64),                      -- SHA-256 of client IP
    verdict VARCHAR(20) NOT NULL,             -- 'scam' | 'safe' | 'uncertain'
    risk_level VARCHAR(20),                   -- 'low' | 'medium' | 'high' | 'critical'
    risk_score NUMERIC(5, 2),
    detected_language VARCHAR(10) DEFAULT 'en',
    url_threat_score NUMERIC(5, 2) DEFAULT 0.0,
    ai_engine VARCHAR(30),                    -- 'gemini' | 'huggingface' | 'heuristic'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_log_created ON analysis_audit_log(created_at DESC);
CREATE INDEX idx_audit_log_verdict ON analysis_audit_log(verdict);
CREATE INDEX idx_audit_log_risk ON analysis_audit_log(risk_level);

-- Scam trends materialized view — refreshed hourly via pg_cron or manually
CREATE MATERIALIZED VIEW IF NOT EXISTS scam_trends_daily AS
SELECT
    DATE_TRUNC('day', created_at) AS day,
    report_type,
    COUNT(*) AS report_count,
    AVG(risk_score) AS avg_risk_score
FROM fraud_reports
WHERE created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE_TRUNC('day', created_at), report_type
ORDER BY day ASC, report_type;

CREATE UNIQUE INDEX IF NOT EXISTS idx_scam_trends_daily
    ON scam_trends_daily (day, report_type);

-- Helper function: refresh trends view (call after batch inserts)
CREATE OR REPLACE FUNCTION refresh_scam_trends()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY scam_trends_daily;
END;
$$ LANGUAGE plpgsql;

