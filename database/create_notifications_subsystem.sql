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
    in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    critical_only BOOLEAN NOT NULL DEFAULT FALSE,
    warning_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    daily_summary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='notification_preferences' AND column_name='dashboard_enabled'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='notification_preferences' AND column_name='in_app_enabled'
    ) THEN
        ALTER TABLE notification_preferences RENAME COLUMN dashboard_enabled TO in_app_enabled;
    END IF;
END $$;
ALTER TABLE notification_preferences ADD COLUMN IF NOT EXISTS in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    tank_id UUID NOT NULL REFERENCES tanks(id) ON DELETE RESTRICT,
    alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE RESTRICT,
    channel VARCHAR(20) NOT NULL CHECK (channel IN ('EMAIL', 'IN_APP', 'SMS_DEVICE', 'SMS_CLOUD')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'SENT', 'FAILED')),
    recipient VARCHAR(255) NOT NULL,
    sent_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT notifications_one_delivery_per_alert_user_channel
        UNIQUE (alert_id, user_id, channel)
);

-- Upgrade databases created by the earlier DASHBOARD/QUEUED schema.
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS tank_id UUID REFERENCES tanks(id) ON DELETE RESTRICT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title VARCHAR(255);
UPDATE notifications notification
SET tank_id = alert.tank_id
FROM alerts alert
WHERE notification.alert_id = alert.id AND notification.tank_id IS NULL;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_channel_check;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_status_check;
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='notifications' AND column_name='subject'
    ) THEN
        EXECUTE 'UPDATE notifications SET title=subject WHERE title IS NULL';
    END IF;
END $$;
UPDATE notifications SET channel='IN_APP' WHERE channel='DASHBOARD';
UPDATE notifications SET channel='SMS_DEVICE' WHERE channel='SMS';
UPDATE notifications SET status='PENDING' WHERE status='QUEUED';
UPDATE notifications SET status='SENT' WHERE status='READ';
ALTER TABLE notifications ADD CONSTRAINT notifications_channel_check
    CHECK (channel IN ('EMAIL', 'IN_APP', 'SMS_DEVICE', 'SMS_CLOUD'));
ALTER TABLE notifications ADD CONSTRAINT notifications_status_check
    CHECK (status IN ('PENDING', 'SENT', 'FAILED'));
ALTER TABLE notifications ALTER COLUMN status SET DEFAULT 'PENDING';
ALTER TABLE notifications ALTER COLUMN tank_id SET NOT NULL;
ALTER TABLE notifications ALTER COLUMN title SET NOT NULL;
ALTER TABLE notifications DROP COLUMN IF EXISTS subject;

CREATE INDEX IF NOT EXISTS notifications_user_created_at_idx
    ON notifications(user_id, created_at DESC);
DROP INDEX IF EXISTS notifications_user_unread_idx;
CREATE INDEX notifications_user_unread_idx
    ON notifications(user_id, created_at DESC)
    WHERE channel = 'IN_APP' AND read_at IS NULL;
CREATE INDEX IF NOT EXISTS notifications_deduplication_idx
    ON notifications(user_id, channel, created_at DESC);

INSERT INTO notification_preferences(user_id)
SELECT id FROM users
ON CONFLICT (user_id) DO NOTHING;
