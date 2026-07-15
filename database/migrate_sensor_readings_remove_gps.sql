-- Safely links legacy readings to registered tanks before GPS data is removed.
-- This migration intentionally aborts if any legacy reading cannot be identified by its ThingSpeak channel.
BEGIN;

ALTER TABLE sensor_readings
    ADD COLUMN IF NOT EXISTS tank_id UUID;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM tanks
        WHERE thingspeak_channel_id IS NOT NULL
        GROUP BY thingspeak_channel_id
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION
            'Migration aborted: multiple tanks use the same thingspeak_channel_id. Configure one unique channel per tank before rerunning.';
    END IF;
END $$;

-- The backfill is only deterministic when a ThingSpeak channel belongs to one tank.
CREATE UNIQUE INDEX IF NOT EXISTS tanks_thingspeak_channel_id_unique_idx
    ON tanks (thingspeak_channel_id)
    WHERE thingspeak_channel_id IS NOT NULL;

UPDATE sensor_readings AS reading
SET tank_id = tank.id
FROM tanks AS tank
WHERE reading.tank_id IS NULL
  AND tank.thingspeak_channel_id = reading.thingspeak_channel_id;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM sensor_readings WHERE tank_id IS NULL) THEN
        RAISE EXCEPTION
            'Migration aborted: one or more sensor_readings cannot be linked to a tank. Configure unique thingspeak_channel_id values on tanks, or update tank_id manually before rerunning.';
    END IF;
END $$;

ALTER TABLE sensor_readings
    ALTER COLUMN tank_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'sensor_readings_tank_id_fkey'
    ) THEN
        ALTER TABLE sensor_readings
            ADD CONSTRAINT sensor_readings_tank_id_fkey
            FOREIGN KEY (tank_id) REFERENCES tanks(id) ON DELETE RESTRICT;
    END IF;
END $$;

ALTER TABLE sensor_readings
    DROP COLUMN IF EXISTS latitude,
    DROP COLUMN IF EXISTS longitude;

ALTER TABLE sensor_readings
    DROP CONSTRAINT IF EXISTS sensor_readings_thingspeak_timestamp_unique;

CREATE INDEX IF NOT EXISTS sensor_readings_tank_recorded_at_idx
    ON sensor_readings (tank_id, recorded_at DESC);

COMMIT;
