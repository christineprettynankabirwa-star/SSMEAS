-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS tanks (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    tank_name VARCHAR(100) NOT NULL,

    owner_name VARCHAR(100) NOT NULL,

    location VARCHAR(255) NOT NULL,

    latitude DOUBLE PRECISION NOT NULL,

    longitude DOUBLE PRECISION NOT NULL,

    capacity_liters INTEGER NOT NULL CHECK (capacity_liters > 0),

    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    thingspeak_channel_id BIGINT UNIQUE,

    thingspeak_read_api_key VARCHAR(100),
    hardware_id VARCHAR(100),
    warning_fill_threshold DOUBLE PRECISION NOT NULL DEFAULT 80,
    critical_fill_threshold DOUBLE PRECISION NOT NULL DEFAULT 95,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CHECK (status IN (
        'ACTIVE',
        'INACTIVE',
        'MAINTENANCE'
    )),
    CHECK (
        warning_fill_threshold >= 0
        AND warning_fill_threshold < critical_fill_threshold
        AND critical_fill_threshold <= 100
    )
);
