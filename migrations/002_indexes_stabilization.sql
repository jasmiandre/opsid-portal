-- Migration 002: Missing indexes for stabilization
-- Run as superuser: PGPASSWORD=... psql -h 10.34.1.9 -U postgres -d opsid_db -f 002_indexes_stabilization.sql
-- Date: 2026-05-29

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor      ON audit_logs (actor);
CREATE INDEX IF NOT EXISTS idx_tenants_status        ON tenants (status);
