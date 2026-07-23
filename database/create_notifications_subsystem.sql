CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN (
    'ADMINISTRATOR', 'MAINTENANCE_OFFICER', 'SUPERVISOR', 'CLIENT'
));

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(40);
ALTER TABLE tanks ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS tanks_owner_user_id_idx ON tanks(owner_user_id);

CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    sms_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    dashboard_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    critical_only BOOLEAN NOT NULL DEFAULT FALSE,
    warning_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    daily_summary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('EMAIL', 'SMS', 'DASHBOARD')),
    status VARCHAR(20) NOT NULL DEFAULT 'QUEUED'
        CHECK (status IN ('QUEUED', 'SENT', 'FAILED', 'READ')),
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT notifications_one_delivery_per_alert_user_channel
        UNIQUE (alert_id, user_id, channel)
);

CREATE INDEX IF NOT EXISTS notifications_user_created_at_idx
    ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
    ON notifications(user_id, created_at DESC)
    WHERE channel = 'DASHBOARD' AND read_at IS NULL;

INSERT INTO notification_preferences(user_id)
SELECT id FROM users
ON CONFLICT (user_id) DO NOTHING;

