BEGIN;

ALTER TABLE alerts
    ADD COLUMN IF NOT EXISTS acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE alerts SET
    last_seen_at=COALESCE(last_seen_at,created_at),
    updated_at=COALESCE(updated_at,created_at),
    resolved_at=CASE WHEN status='RESOLVED' THEN COALESCE(resolved_at,created_at) ELSE resolved_at END;

ALTER TABLE alerts ALTER COLUMN last_seen_at SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE alerts ALTER COLUMN last_seen_at SET NOT NULL;
ALTER TABLE alerts ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE alerts ALTER COLUMN updated_at SET NOT NULL;

CREATE TABLE IF NOT EXISTS alert_lifecycle_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE RESTRICT,
    tank_id UUID NOT NULL REFERENCES tanks(id) ON DELETE RESTRICT,
    action VARCHAR(30) NOT NULL CHECK (action IN (
        'CREATED','INCIDENT_UPDATED','ACKNOWLEDGED','RESOLVED'
    )),
    status VARCHAR(20) NOT NULL,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS alert_lifecycle_alert_recorded_idx
    ON alert_lifecycle_history(alert_id,recorded_at DESC);

CREATE OR REPLACE FUNCTION record_alert_lifecycle() RETURNS TRIGGER AS $$
DECLARE lifecycle_action VARCHAR(30);
BEGIN
    IF TG_OP='INSERT' THEN
        lifecycle_action := 'CREATED';
    ELSIF NEW.status='ACKNOWLEDGED' AND OLD.status='ACTIVE' THEN
        lifecycle_action := 'ACKNOWLEDGED';
    ELSIF NEW.status='RESOLVED' AND OLD.status IN ('ACTIVE','ACKNOWLEDGED') THEN
        lifecycle_action := 'RESOLVED';
    ELSIF NEW.last_seen_at IS DISTINCT FROM OLD.last_seen_at THEN
        lifecycle_action := 'INCIDENT_UPDATED';
    ELSE
        RETURN NEW;
    END IF;
    INSERT INTO alert_lifecycle_history(
        alert_id,tank_id,action,status,actor_id,message
    ) VALUES(
        NEW.id,NEW.tank_id,lifecycle_action,NEW.status,
        CASE WHEN lifecycle_action='ACKNOWLEDGED' THEN NEW.acknowledged_by ELSE NULL END,
        NEW.message
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS alerts_lifecycle_history_trigger ON alerts;
CREATE TRIGGER alerts_lifecycle_history_trigger
AFTER INSERT OR UPDATE ON alerts
FOR EACH ROW EXECUTE FUNCTION record_alert_lifecycle();

COMMIT;
