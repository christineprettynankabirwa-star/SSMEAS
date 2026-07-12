-- Stores normalized historical sensor readings retrieved by the backend from ThingSpeak.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS sensor_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thingspeak_channel_id BIGINT NOT NULL,
    thingspeak_entry_id BIGINT NOT NULL,
    level DOUBLE PRECISION,
    gas_level DOUBLE PRECISION,
    temperature DOUBLE PRECISION,
    battery DOUBLE PRECISION,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    recorded_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT sensor_readings_thingspeak_entry_unique
        UNIQUE (thingspeak_channel_id, thingspeak_entry_id),
    CONSTRAINT sensor_readings_thingspeak_timestamp_unique
        UNIQUE (thingspeak_channel_id, recorded_at)
);

CREATE INDEX IF NOT EXISTS sensor_readings_recorded_at_idx
    ON sensor_readings (recorded_at DESC);
