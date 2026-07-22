-- ============================================================
-- ScamShield AI — Security Policies (Supabase RLS Hardening)
--
-- This script REPLACES the permissive RLS policies from the
-- initial migration with strict, principle-of-least-privilege
-- policies suitable for a public-facing safety application.
--
-- Roles:
--   anon            → Unauthenticated public users (citizens)
--   authenticated   → Logged-in users (future feature)
--   service_role    → Backend API / admin (full access)
--
-- Run this AFTER migration.sql via the Supabase SQL Editor.
-- ============================================================

-- ============================================================
-- 0. Ensure RLS is enabled on all tables
-- ============================================================

ALTER TABLE fraud_reports       ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_analysis_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_nodes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_edges   ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 1. DROP all permissive default policies from migration.sql
-- ============================================================

DROP POLICY IF EXISTS "Allow public read on fraud_reports"      ON fraud_reports;
DROP POLICY IF EXISTS "Allow public insert on fraud_reports"     ON fraud_reports;
DROP POLICY IF EXISTS "Allow public read on transaction_nodes"   ON transaction_nodes;
DROP POLICY IF EXISTS "Allow public read on transaction_edges"   ON transaction_edges;
DROP POLICY IF EXISTS "Allow public read on call_analysis_logs"  ON call_analysis_logs;
DROP POLICY IF EXISTS "Allow public insert on call_analysis_logs" ON call_analysis_logs;


-- ============================================================
-- 2. fraud_reports — Citizen-facing table
-- ============================================================
-- Anon users can ONLY INSERT (submit a scam report).
-- They CANNOT read, update, or delete any reports.
-- Only service_role (backend API) and authenticated admins
-- can read/modify reports.
-- ============================================================

-- Anon: INSERT only, with content restrictions
CREATE POLICY "anon_insert_fraud_reports"
    ON fraud_reports
    FOR INSERT
    TO anon
    WITH CHECK (
        -- Enforce that anonymous inserts must have status = 'pending'
        status = 'pending'
        -- Enforce that risk_score starts at 0 (backend AI sets the real score)
        AND risk_score = 0
    );

-- Authenticated users: can read their own reports (future: add user_id column)
CREATE POLICY "authenticated_select_fraud_reports"
    ON fraud_reports
    FOR SELECT
    TO authenticated
    USING (true);

-- Service role (backend API): full access for CRUD operations
CREATE POLICY "service_role_all_fraud_reports"
    ON fraud_reports
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- 3. call_analysis_logs — Internal analytics table
-- ============================================================
-- Anon users have ZERO access to call analysis logs.
-- Only the backend service_role can insert and read.
-- ============================================================

-- Service role: full access
CREATE POLICY "service_role_all_call_logs"
    ON call_analysis_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Authenticated admins: read-only access for dashboards
CREATE POLICY "authenticated_select_call_logs"
    ON call_analysis_logs
    FOR SELECT
    TO authenticated
    USING (true);

-- NOTE: No policy for 'anon' role = implicit DENY on all operations.


-- ============================================================
-- 4. transaction_nodes (fraud_nodes equivalent)
-- ============================================================
-- Anon users: read-only access to visualize the fraud network
-- graph (this is public safety data intended for transparency).
-- No insert/update/delete for anon.
-- ============================================================

-- Anon: read-only for fraud network visualization
CREATE POLICY "anon_select_transaction_nodes"
    ON transaction_nodes
    FOR SELECT
    TO anon
    USING (true);

-- Authenticated: read-only
CREATE POLICY "authenticated_select_transaction_nodes"
    ON transaction_nodes
    FOR SELECT
    TO authenticated
    USING (true);

-- Service role: full access
CREATE POLICY "service_role_all_transaction_nodes"
    ON transaction_nodes
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- 5. transaction_edges
-- ============================================================
-- Same policy as transaction_nodes — public read for graph
-- visualization, write restricted to service_role.
-- ============================================================

-- Anon: read-only
CREATE POLICY "anon_select_transaction_edges"
    ON transaction_edges
    FOR SELECT
    TO anon
    USING (true);

-- Authenticated: read-only
CREATE POLICY "authenticated_select_transaction_edges"
    ON transaction_edges
    FOR SELECT
    TO authenticated
    USING (true);

-- Service role: full access
CREATE POLICY "service_role_all_transaction_edges"
    ON transaction_edges
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);


-- ============================================================
-- 6. Force RLS on table owners (prevents bypass by table owner)
-- ============================================================
-- By default, the table owner can bypass RLS. This ensures
-- even the owner is subject to policies.
-- ============================================================

ALTER TABLE fraud_reports       FORCE ROW LEVEL SECURITY;
ALTER TABLE call_analysis_logs  FORCE ROW LEVEL SECURITY;
ALTER TABLE transaction_nodes   FORCE ROW LEVEL SECURITY;
ALTER TABLE transaction_edges   FORCE ROW LEVEL SECURITY;


-- ============================================================
-- 7. Revoke dangerous direct permissions from anon
-- ============================================================
-- Defense in depth: even if RLS fails, raw table permissions
-- prevent anon from UPDATE/DELETE.
-- ============================================================

REVOKE UPDATE, DELETE ON fraud_reports      FROM anon;
REVOKE ALL ON call_analysis_logs            FROM anon;
GRANT  INSERT ON fraud_reports              TO anon;
GRANT  SELECT ON transaction_nodes          TO anon;
GRANT  SELECT ON transaction_edges          TO anon;


-- ============================================================
-- 8. Audit trigger — log admin modifications to reports
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_log (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name  VARCHAR(100) NOT NULL,
    record_id   UUID NOT NULL,
    action      VARCHAR(20) NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    changed_by  TEXT DEFAULT current_user,
    changed_at  TIMESTAMPTZ DEFAULT NOW(),
    old_data    JSONB,
    new_data    JSONB
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;

-- Only service_role can access audit logs
CREATE POLICY "service_role_all_audit_log"
    ON audit_log
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Audit function
CREATE OR REPLACE FUNCTION fn_audit_fraud_reports()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_data, new_data)
        VALUES ('fraud_reports', OLD.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (table_name, record_id, action, old_data, new_data)
        VALUES ('fraud_reports', OLD.id, 'DELETE', to_jsonb(OLD), NULL);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach audit trigger to fraud_reports
DROP TRIGGER IF EXISTS trg_audit_fraud_reports ON fraud_reports;
CREATE TRIGGER trg_audit_fraud_reports
    AFTER UPDATE OR DELETE ON fraud_reports
    FOR EACH ROW
    EXECUTE FUNCTION fn_audit_fraud_reports();
