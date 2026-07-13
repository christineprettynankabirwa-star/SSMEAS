CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tank_id UUID NOT NULL REFERENCES tanks(id) ON DELETE RESTRICT,
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'warning',
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (severity IN ('critical', 'warning', 'info')),
    CHECK (status IN ('ACTIVE', 'RESOLVED'))
);

CREATE INDEX IF NOT EXISTS alerts_status_created_at_idx
    ON alerts (status, created_at DESC);
