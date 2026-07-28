-- Align notification audit channels with the deployed delivery architecture:
-- EMAIL is delivered by the backend, SMS_DEVICE by ESP32/SIM800, and
-- SMS_CLOUD is reserved for a future optional backend provider.
BEGIN;

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_channel_check;
UPDATE notifications SET channel='SMS_DEVICE' WHERE channel='SMS';
ALTER TABLE notifications ADD CONSTRAINT notifications_channel_check
  CHECK (channel IN ('EMAIL','IN_APP','SMS_DEVICE','SMS_CLOUD'));

COMMIT;
