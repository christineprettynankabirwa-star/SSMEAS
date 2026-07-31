-- Adds statuses carried by ESP32 readings and the acknowledged alert workflow.
-- This migration is safe to apply repeatedly.
BEGIN;

ALTER TABLE sensor_readings
    ADD COLUMN IF NOT EXISTS status VARCHAR(20);

ALTER TABLE sensor_readings
    DROP CONSTRAINT IF EXISTS sensor_readings_status_check;
ALTER TABLE sensor_readings
    ADD CONSTRAINT sensor_readings_status_check
    CHECK (status IS NULL OR status IN ('SAFE', 'WARNING', 'CRITICAL'));

ALTER TABLE alerts
    DROP CONSTRAINT IF EXISTS alerts_status_check;
ALTER TABLE alerts
    ADD CONSTRAINT alerts_status_check
    CHECK (status IN ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'));

COMMIT;
