BEGIN;

CREATE TABLE IF NOT EXISTS simulation_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    tank_id UUID NOT NULL REFERENCES tanks(id) ON DELETE RESTRICT,
    reading_id UUID NOT NULL REFERENCES sensor_readings(id) ON DELETE RESTRICT,
    action VARCHAR(50) NOT NULL,
    condition VARCHAR(20) NOT NULL CHECK (condition IN ('SAFE','WARNING','DANGER')),
    resolved_alerts INTEGER NOT NULL DEFAULT 0,
    cancelled_maintenance INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE notifications
    DROP CONSTRAINT IF EXISTS notifications_one_delivery_per_alert_user_channel;
DROP INDEX IF EXISTS notifications_one_delivery_per_alert_user_channel;
CREATE UNIQUE INDEX IF NOT EXISTS notifications_one_delivery_per_alert_user_channel_title
    ON notifications(alert_id,user_id,channel,title);

COMMIT;
