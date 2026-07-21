-- Stores normalized historical sensor readings retrieved by the backend from ThingSpeak.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS sensor_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tank_id UUID NOT NULL REFERENCES tanks(id) ON DELETE RESTRICT,
    thingspeak_channel_id BIGINT NOT NULL,
    thingspeak_entry_id BIGINT NOT NULL,
    level DOUBLE PRECISION,
    gas_level DOUBLE PRECISION,
    recorded_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT sensor_readings_thingspeak_entry_unique
        UNIQUE (thingspeak_channel_id, thingspeak_entry_id)
);

CREATE INDEX IF NOT EXISTS sensor_readings_recorded_at_idx
    ON sensor_readings (recorded_at DESC);

CREATE INDEX IF NOT EXISTS sensor_readings_tank_recorded_at_idx
    ON sensor_readings (tank_id, recorded_at DESC);
