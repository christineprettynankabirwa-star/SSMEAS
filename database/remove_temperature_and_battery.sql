-- Removes legacy telemetry fields that are no longer produced by SSMEAS.
-- Safe to run repeatedly on both old and newly initialized databases.
BEGIN;

ALTER TABLE sensor_readings
    DROP COLUMN IF EXISTS temperature,
    DROP COLUMN IF EXISTS battery;

COMMIT;
