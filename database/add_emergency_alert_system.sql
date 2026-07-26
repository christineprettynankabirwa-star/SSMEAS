BEGIN;

CREATE TABLE IF NOT EXISTS overflow_predictions (
    tank_id UUID PRIMARY KEY REFERENCES tanks(id) ON DELETE CASCADE,
    predicted_minutes_to_full DOUBLE PRECISION,
    predicted_overflow_at TIMESTAMPTZ,
    average_increase_per_minute DOUBLE PRECISION NOT NULL DEFAULT 0,
    current_level DOUBLE PRECISION,
    sample_count INTEGER NOT NULL DEFAULT 0,
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE maintenance
    ADD COLUMN IF NOT EXISTS alert_id UUID REFERENCES alerts(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS maintenance_one_open_emergency_per_tank_idx
    ON maintenance (tank_id, task)
    WHERE task = 'Emergency Tank Inspection'
      AND status IN ('SCHEDULED', 'ASSIGNED', 'IN_PROGRESS');

CREATE INDEX IF NOT EXISTS maintenance_alert_id_idx ON maintenance(alert_id);

COMMIT;
