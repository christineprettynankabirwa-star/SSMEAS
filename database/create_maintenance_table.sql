CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS maintenance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tank_id UUID NOT NULL REFERENCES tanks(id) ON DELETE RESTRICT,
    task VARCHAR(255) NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED'))
);

CREATE INDEX IF NOT EXISTS maintenance_scheduled_for_idx
    ON maintenance (scheduled_for ASC);

CREATE UNIQUE INDEX IF NOT EXISTS maintenance_one_open_task_per_tank_idx
    ON maintenance (tank_id, task)
    WHERE status IN ('SCHEDULED', 'IN_PROGRESS');
