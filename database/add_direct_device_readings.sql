BEGIN;

ALTER TABLE sensor_readings
    ALTER COLUMN thingspeak_channel_id DROP NOT NULL,
    ALTER COLUMN thingspeak_entry_id DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS device_reading_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS sensor_readings_device_reading_id_unique_idx
    ON sensor_readings (device_reading_id)
    WHERE device_reading_id IS NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'sensor_readings_source_required'
          AND conrelid = 'sensor_readings'::regclass
    ) THEN
        ALTER TABLE sensor_readings
            ADD CONSTRAINT sensor_readings_source_required
            CHECK (
                device_reading_id IS NOT NULL
                OR (thingspeak_channel_id IS NOT NULL AND thingspeak_entry_id IS NOT NULL)
            ) NOT VALID;
    END IF;
END $$;

ALTER TABLE sensor_readings VALIDATE CONSTRAINT sensor_readings_source_required;

COMMIT;
