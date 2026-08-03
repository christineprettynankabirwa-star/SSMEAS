-- SSMEAS live-presentation demo data.
--
-- Run with the deployed database URL (PowerShell):
--   psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f database/seed_live_presentation_demo.sql
--
-- This file intentionally does not run schema migrations.  It fails before
-- writing if the deployed database is missing a required SSMEAS table.  Every
-- tanks and users use a reserved d100.../e100... demo namespace (and tanks
-- use a DEMO-SSMEAS-* hardware ID).  Script-generated associated rows use
-- deterministic IDs and reference only those marked demo tanks, so it is safe to run
-- repeatedly without changing ordinary production records.

BEGIN;

DO $$
DECLARE
  required_table text;
  required_column text;
BEGIN
  FOREACH required_table IN ARRAY ARRAY[
    'tanks', 'sensor_readings', 'alerts', 'maintenance', 'users',
    'notifications', 'overflow_predictions', 'prediction_history',
    'alert_lifecycle_history'
  ] LOOP
    IF to_regclass('public.' || required_table) IS NULL THEN
      RAISE EXCEPTION
        'Required SSMEAS table public.% is missing. Apply production migrations before seeding.',
        required_table;
    END IF;
  END LOOP;

  FOREACH required_column IN ARRAY ARRAY[
    'tanks.hardware_id', 'sensor_readings.status', 'maintenance.priority',
    'maintenance.alert_id', 'alerts.acknowledged_at', 'alerts.resolved_at',
    'notifications.title', 'overflow_predictions.fill_velocity_percent_per_hour'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = split_part(required_column, '.', 1)
        AND column_name = split_part(required_column, '.', 2)
    ) THEN
      RAISE EXCEPTION
        'Required SSMEAS column public.% is missing. Apply production migrations before seeding.',
        required_column;
    END IF;
  END LOOP;
END $$;

CREATE TEMP TABLE presentation_demo_tanks (
  id uuid PRIMARY KEY,
  sort_order integer NOT NULL UNIQUE,
  tank_name varchar(100) NOT NULL,
  owner_name varchar(100) NOT NULL,
  location varchar(255) NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  capacity_liters integer NOT NULL,
  thingspeak_channel_id bigint NOT NULL UNIQUE,
  hardware_id varchar(100) NOT NULL UNIQUE,
  start_level double precision NOT NULL,
  pre_recent_level double precision NOT NULL,
  target_level double precision NOT NULL,
  gas_start double precision NOT NULL,
  gas_target double precision NOT NULL
) ON COMMIT DROP;

-- Coordinates are deliberately close to the named Makerere campus landmarks,
-- rather than sharing a single campus-centre location.  Levels are in percent;
-- gas values are ppm-equivalent sensor readings.
INSERT INTO presentation_demo_tanks VALUES
  ('d1000000-0000-4000-8000-000000000001', 1, 'Makerere Main Tank',
   'Makerere University Estates', 'Makerere Main Campus', 0.33472, 32.56742,
   120000, 9901001, 'DEMO-SSMEAS-MKR-01', 58, 87, 96, 170, 245),
  ('d1000000-0000-4000-8000-000000000002', 2, 'CEDAT Engineering Tank',
   'Makerere University Estates', 'CEDAT Engineering Complex', 0.32877, 32.57080,
   70000, 9901002, 'DEMO-SSMEAS-MKR-02', 39, 49, 55, 108, 138),
  ('d1000000-0000-4000-8000-000000000003', 3, 'University Hospital Tank',
   'Makerere University Hospital', 'Makerere University Hospital', 0.33723, 32.57202,
   80000, 9901003, 'DEMO-SSMEAS-MKR-03', 49, 45, 42, 132, 128),
  ('d1000000-0000-4000-8000-000000000004', 4, 'Mitchell Hall Tank',
   'Makerere University Estates', 'Mitchell Hall', 0.33285, 32.56837,
   85000, 9901004, 'DEMO-SSMEAS-MKR-04', 36, 47, 46, 142, 160),
  ('d1000000-0000-4000-8000-000000000005', 5, 'Mary Stuart Hall Tank',
   'Makerere University Estates', 'Mary Stuart Hall', 0.33364, 32.56493,
   95000, 9901005, 'DEMO-SSMEAS-MKR-05', 27, 33, 35, 98, 118),
  ('d1000000-0000-4000-8000-000000000006', 6, 'Lumumba Hall Tank',
   'Makerere University Estates', 'Lumumba Hall', 0.33634, 32.56645,
   90000, 9901006, 'DEMO-SSMEAS-MKR-06', 41, 53, 58, 150, 188),
  ('d1000000-0000-4000-8000-000000000007', 7, 'Africa Hall Tank',
   'Makerere University Estates', 'Africa Hall', 0.33086, 32.57015,
   75000, 9901007, 'DEMO-SSMEAS-MKR-07', 22, 27, 28, 92, 110),
  ('d1000000-0000-4000-8000-000000000008', 8, 'Senate Building Tank',
   'Makerere University Administration', 'Senate Building', 0.33420, 32.56876,
   65000, 9901008, 'DEMO-SSMEAS-MKR-08', 52, 68, 74, 158, 182);

-- Refuse to adopt an occupied reserved ID unless it is plainly one of these
-- tanks.  A unique ThingSpeak-channel collision also aborts the transaction.
DO $$
DECLARE conflicting_record text;
BEGIN
  SELECT t.id::text INTO conflicting_record
  FROM tanks t
  JOIN presentation_demo_tanks d ON d.id = t.id
  WHERE t.hardware_id IS DISTINCT FROM d.hardware_id
  LIMIT 1;
  IF conflicting_record IS NOT NULL THEN
    RAISE EXCEPTION
      'Reserved presentation-demo tank ID % is occupied by a non-demo tank; no data was changed.',
      conflicting_record;
  END IF;

  SELECT u.id::text INTO conflicting_record
  FROM users u
  WHERE u.id = 'e1000000-0000-4000-8000-000000000001'::uuid
    AND u.email <> 'presentation-operator@demo.invalid'
  LIMIT 1;
  IF conflicting_record IS NOT NULL THEN
    RAISE EXCEPTION
      'Reserved presentation-demo user ID % is occupied by a non-demo user; no data was changed.',
      conflicting_record;
  END IF;
END $$;

INSERT INTO tanks (
  id, tank_name, owner_name, location, latitude, longitude, capacity_liters,
  status, thingspeak_channel_id, thingspeak_read_api_key, hardware_id,
  warning_fill_threshold, critical_fill_threshold, created_at, updated_at
)
SELECT id, tank_name, owner_name, location, latitude, longitude, capacity_liters,
  'ACTIVE', thingspeak_channel_id, NULL, hardware_id, 65, 85,
  CURRENT_TIMESTAMP - INTERVAL '14 days', CURRENT_TIMESTAMP
FROM presentation_demo_tanks
ON CONFLICT (id) DO UPDATE SET
  tank_name = EXCLUDED.tank_name,
  owner_name = EXCLUDED.owner_name,
  location = EXCLUDED.location,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  capacity_liters = EXCLUDED.capacity_liters,
  status = EXCLUDED.status,
  thingspeak_channel_id = EXCLUDED.thingspeak_channel_id,
  hardware_id = EXCLUDED.hardware_id,
  warning_fill_threshold = EXCLUDED.warning_fill_threshold,
  critical_fill_threshold = EXCLUDED.critical_fill_threshold,
  updated_at = CURRENT_TIMESTAMP;

-- A non-advertised account is used only as the recipient/assignee for demo
-- history.  Its random password is never printed or retained by this script.
INSERT INTO users (id, full_name, email, password_hash, role, created_at, updated_at)
VALUES (
  'e1000000-0000-4000-8000-000000000001',
  'SSMEAS Presentation Operator', 'presentation-operator@demo.invalid',
  crypt('presentation-demo-' || gen_random_uuid()::text, gen_salt('bf', 12)),
  'MAINTENANCE_OFFICER', CURRENT_TIMESTAMP - INTERVAL '14 days', CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  updated_at = CURRENT_TIMESTAMP;

-- 84 readings per tank: 64 readings cover the first 13 days and the newest
-- 20 arrive every ~72 minutes.  The recent cadence keeps the application OLS
-- prediction quality GOOD while the whole set supplies a 14-day chart.
-- The second, denser segment allows natural minor fluctuations without jumps.
WITH generated AS (
  SELECT d.*, sample_no,
    CASE WHEN sample_no <= 63
      THEN CURRENT_TIMESTAMP - INTERVAL '14 days'
        + INTERVAL '12 days 21 hours' * sample_no / 63.0
      ELSE CURRENT_TIMESTAMP - INTERVAL '22 hours 52 minutes'
        + INTERVAL '22 hours 50 minutes' * (sample_no - 64) / 19.0
    END AS recorded_at
  FROM presentation_demo_tanks d
  CROSS JOIN generate_series(0, 83) AS samples(sample_no)
), measured AS (
  SELECT *,
    CASE WHEN sample_no <= 63
      THEN start_level + (pre_recent_level - start_level) * sample_no / 63.0
      ELSE pre_recent_level + (target_level - pre_recent_level) * (sample_no - 63) / 20.0
    END
      + 0.65 * sin(sample_no * 0.73) * sin(pi() * sample_no / 83.0) AS raw_level,
    gas_start + (gas_target - gas_start) * sample_no / 83.0
      + 10.0 * sin(sample_no * 0.51) * sin(pi() * sample_no / 83.0) AS raw_gas
  FROM generated
)
INSERT INTO sensor_readings (
  id, tank_id, thingspeak_channel_id, thingspeak_entry_id,
  level, gas_level, status, recorded_at, created_at
)
SELECT
  md5('ssmeas-live-demo-reading:' || sort_order || ':' || sample_no)::uuid,
  id, thingspeak_channel_id, 9900000 + sort_order * 1000 + sample_no,
  ROUND(raw_level::numeric, 2)::double precision,
  ROUND(raw_gas::numeric, 2)::double precision,
  CASE WHEN raw_level >= 85 THEN 'CRITICAL'
       WHEN raw_level >= 65 THEN 'WARNING'
       ELSE 'SAFE' END,
  recorded_at, recorded_at
FROM measured
ON CONFLICT (id) DO UPDATE SET
  level = EXCLUDED.level,
  gas_level = EXCLUDED.gas_level,
  status = EXCLUDED.status,
  recorded_at = EXCLUDED.recorded_at,
  created_at = EXCLUDED.created_at;

-- Current alert picture: one critical sewage incident and one warning.  The
-- other two entries give the presentation a truthful resolved/acknowledged
-- alert history without making any safe tank appear currently unsafe.
WITH demo_alerts (
  id, tank_id, alert_type, severity, status, message, created_at,
  acknowledged_at, resolved_at
) AS (
  VALUES
    (md5('ssmeas-live-demo-alert:main-warning')::uuid,
      'd1000000-0000-4000-8000-000000000001'::uuid, 'High sewage level', 'warning', 'RESOLVED',
      'Fill level crossed the 65% warning threshold and was later superseded by the critical incident.',
      CURRENT_TIMESTAMP - INTERVAL '30 hours', CURRENT_TIMESTAMP - INTERVAL '29 hours', CURRENT_TIMESTAMP - INTERVAL '3 hours'),
    (md5('ssmeas-live-demo-alert:main-critical')::uuid,
      'd1000000-0000-4000-8000-000000000001'::uuid, 'Critical sewage level', 'critical', 'ACTIVE',
      'Fill level is 96%, above the 85% critical threshold. Dispatch an emptying crew immediately.',
      CURRENT_TIMESTAMP - INTERVAL '3 hours', NULL, NULL),
    (md5('ssmeas-live-demo-alert:senate-warning')::uuid,
      'd1000000-0000-4000-8000-000000000008'::uuid, 'High sewage level', 'warning', 'ACKNOWLEDGED',
      'Fill level is 74%, above the 65% warning threshold. Plan collection before the projected danger threshold.',
      CURRENT_TIMESTAMP - INTERVAL '90 minutes', CURRENT_TIMESTAMP - INTERVAL '70 minutes', NULL),
    (md5('ssmeas-live-demo-alert:africa-inspection')::uuid,
      'd1000000-0000-4000-8000-000000000007'::uuid, 'Sensor calibration reminder', 'info', 'RESOLVED',
      'Routine calibration inspection was completed; subsequent readings remained stable.',
      CURRENT_TIMESTAMP - INTERVAL '6 days', CURRENT_TIMESTAMP - INTERVAL '5 days 23 hours', CURRENT_TIMESTAMP - INTERVAL '5 days 22 hours')
)
INSERT INTO alerts (
  id, tank_id, alert_type, severity, status, message, created_at,
  acknowledged_by, acknowledged_at, resolved_at, last_seen_at, updated_at
)
SELECT id, tank_id, alert_type, severity, status, message, created_at,
  CASE WHEN acknowledged_at IS NULL THEN NULL ELSE 'e1000000-0000-4000-8000-000000000001'::uuid END,
  acknowledged_at, resolved_at, COALESCE(resolved_at, acknowledged_at, created_at), CURRENT_TIMESTAMP
FROM demo_alerts
ON CONFLICT (id) DO UPDATE SET
  severity = EXCLUDED.severity, status = EXCLUDED.status, message = EXCLUDED.message,
  created_at = EXCLUDED.created_at, acknowledged_by = EXCLUDED.acknowledged_by,
  acknowledged_at = EXCLUDED.acknowledged_at, resolved_at = EXCLUDED.resolved_at,
  updated_at = EXCLUDED.updated_at;

-- Explicit lifecycle rows make the alert-history view useful even if these
-- rows are seeded after the alert lifecycle trigger has been installed.
WITH events (id, alert_id, tank_id, action, status, message, recorded_at) AS (
  VALUES
    (md5('ssmeas-live-demo-lifecycle:main-warning:ack')::uuid, md5('ssmeas-live-demo-alert:main-warning')::uuid, 'd1000000-0000-4000-8000-000000000001'::uuid, 'ACKNOWLEDGED', 'ACKNOWLEDGED', 'Control room acknowledged the warning and monitored the tank.', CURRENT_TIMESTAMP - INTERVAL '29 hours'),
    (md5('ssmeas-live-demo-lifecycle:main-warning:resolve')::uuid, md5('ssmeas-live-demo-alert:main-warning')::uuid, 'd1000000-0000-4000-8000-000000000001'::uuid, 'RESOLVED', 'RESOLVED', 'Warning was superseded by a critical sewage incident.', CURRENT_TIMESTAMP - INTERVAL '3 hours'),
    (md5('ssmeas-live-demo-lifecycle:senate:ack')::uuid, md5('ssmeas-live-demo-alert:senate-warning')::uuid, 'd1000000-0000-4000-8000-000000000008'::uuid, 'ACKNOWLEDGED', 'ACKNOWLEDGED', 'Collection team notified; preventive service scheduled.', CURRENT_TIMESTAMP - INTERVAL '70 minutes'),
    (md5('ssmeas-live-demo-lifecycle:africa:resolve')::uuid, md5('ssmeas-live-demo-alert:africa-inspection')::uuid, 'd1000000-0000-4000-8000-000000000007'::uuid, 'RESOLVED', 'RESOLVED', 'Calibration completed and telemetry verified stable.', CURRENT_TIMESTAMP - INTERVAL '5 days 22 hours')
)
INSERT INTO alert_lifecycle_history (id, alert_id, tank_id, action, status, actor_id, message, recorded_at)
SELECT id, alert_id, tank_id, action, status,
  CASE WHEN action IN ('ACKNOWLEDGED', 'RESOLVED') THEN 'e1000000-0000-4000-8000-000000000001'::uuid ELSE NULL END,
  message, recorded_at
FROM events
ON CONFLICT (id) DO UPDATE SET
  action = EXCLUDED.action, status = EXCLUDED.status, actor_id = EXCLUDED.actor_id,
  message = EXCLUDED.message, recorded_at = EXCLUDED.recorded_at;

-- Open jobs provide meaningful route stops; completed work demonstrates the
-- maintenance history.  No production user is assigned to demo work.
WITH jobs (id, tank_id, alert_id, task, scheduled_for, status, priority, completed_at, notes) AS (
  VALUES
    (md5('ssmeas-live-demo-maintenance:main')::uuid, 'd1000000-0000-4000-8000-000000000001'::uuid, md5('ssmeas-live-demo-alert:main-critical')::uuid, 'Demo emergency sewage collection', CURRENT_TIMESTAMP - INTERVAL '20 minutes', 'IN_PROGRESS', 'CRITICAL', NULL, 'Presentation scenario: dispatch vacuum tanker and verify the inlet is clear.'),
    (md5('ssmeas-live-demo-maintenance:senate')::uuid, 'd1000000-0000-4000-8000-000000000008'::uuid, md5('ssmeas-live-demo-alert:senate-warning')::uuid, 'Demo preventive sewage collection', CURRENT_TIMESTAMP + INTERVAL '6 hours', 'SCHEDULED', 'HIGH', NULL, 'Collect before the predicted 85% danger threshold.'),
    (md5('ssmeas-live-demo-maintenance:lumumba')::uuid, 'd1000000-0000-4000-8000-000000000006'::uuid, NULL, 'Demo inlet inspection', CURRENT_TIMESTAMP + INTERVAL '20 hours', 'ASSIGNED', 'MEDIUM', NULL, 'Inspect inlet restriction during the planned campus route.'),
    (md5('ssmeas-live-demo-maintenance:africa')::uuid, 'd1000000-0000-4000-8000-000000000007'::uuid, md5('ssmeas-live-demo-alert:africa-inspection')::uuid, 'Demo sensor calibration', CURRENT_TIMESTAMP - INTERVAL '5 days 23 hours', 'COMPLETED', 'LOW', CURRENT_TIMESTAMP - INTERVAL '5 days 22 hours', 'Calibration completed; stable telemetry confirmed.'),
    (md5('ssmeas-live-demo-maintenance:hospital')::uuid, 'd1000000-0000-4000-8000-000000000003'::uuid, NULL, 'Demo preventive cleaning', CURRENT_TIMESTAMP - INTERVAL '8 days', 'COMPLETED', 'MEDIUM', CURRENT_TIMESTAMP - INTERVAL '8 days' + INTERVAL '2 hours', 'Routine cleaning completed; fill trend is now falling.')
)
INSERT INTO maintenance (
  id, tank_id, alert_id, task, scheduled_for, status, priority, assigned_to,
  completed_at, notes, created_at
)
SELECT id, tank_id, alert_id, task, scheduled_for, status, priority,
  'e1000000-0000-4000-8000-000000000001'::uuid, completed_at, notes,
  LEAST(scheduled_for, CURRENT_TIMESTAMP)
FROM jobs
ON CONFLICT (id) DO UPDATE SET
  alert_id = EXCLUDED.alert_id, task = EXCLUDED.task, scheduled_for = EXCLUDED.scheduled_for,
  status = EXCLUDED.status, priority = EXCLUDED.priority, assigned_to = EXCLUDED.assigned_to,
  completed_at = EXCLUDED.completed_at, notes = EXCLUDED.notes;

-- Notification history is audit data only: recipients use .invalid addresses,
-- and inserting these rows never invokes the application's delivery providers.
WITH deliveries (id, alert_id, tank_id, channel, title, message, status, created_at, sent_at, read_at) AS (
  VALUES
    (md5('ssmeas-live-demo-notification:main:inapp')::uuid, md5('ssmeas-live-demo-alert:main-critical')::uuid, 'd1000000-0000-4000-8000-000000000001'::uuid, 'IN_APP', 'CRITICAL ALERT — Makerere Main Tank', 'Makerere Main Tank is at 96%. Emergency sewage collection is required.', 'SENT', CURRENT_TIMESTAMP - INTERVAL '3 hours', CURRENT_TIMESTAMP - INTERVAL '3 hours', NULL),
    (md5('ssmeas-live-demo-notification:main:email')::uuid, md5('ssmeas-live-demo-alert:main-critical')::uuid, 'd1000000-0000-4000-8000-000000000001'::uuid, 'EMAIL', 'Critical sewage level — Makerere Main Tank', 'Dispatch a vacuum tanker immediately and confirm access with Estates.', 'SENT', CURRENT_TIMESTAMP - INTERVAL '3 hours', CURRENT_TIMESTAMP - INTERVAL '2 hours 59 minutes', NULL),
    (md5('ssmeas-live-demo-notification:senate:inapp')::uuid, md5('ssmeas-live-demo-alert:senate-warning')::uuid, 'd1000000-0000-4000-8000-000000000008'::uuid, 'IN_APP', 'Warning alert — Senate Building Tank', 'Senate Building Tank is at 74%. Preventive collection is scheduled.', 'SENT', CURRENT_TIMESTAMP - INTERVAL '90 minutes', CURRENT_TIMESTAMP - INTERVAL '89 minutes', CURRENT_TIMESTAMP - INTERVAL '65 minutes'),
    (md5('ssmeas-live-demo-notification:africa:inapp')::uuid, md5('ssmeas-live-demo-alert:africa-inspection')::uuid, 'd1000000-0000-4000-8000-000000000007'::uuid, 'IN_APP', 'Resolved — Africa Hall Tank', 'Routine sensor calibration was completed and telemetry is stable.', 'SENT', CURRENT_TIMESTAMP - INTERVAL '5 days 22 hours', CURRENT_TIMESTAMP - INTERVAL '5 days 22 hours', CURRENT_TIMESTAMP - INTERVAL '5 days 21 hours')
)
INSERT INTO notifications (
  id, alert_id, tank_id, user_id, channel, recipient, title, message,
  status, created_at, sent_at, read_at, error_message
)
SELECT id, alert_id, tank_id, 'e1000000-0000-4000-8000-000000000001'::uuid,
  channel, 'presentation-operator@demo.invalid', title, message, status,
  created_at, sent_at, read_at, NULL
FROM deliveries
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title, message = EXCLUDED.message, status = EXCLUDED.status,
  recipient = EXCLUDED.recipient, created_at = EXCLUDED.created_at,
  sent_at = EXCLUDED.sent_at, read_at = EXCLUDED.read_at, error_message = NULL;

-- Store the current regression-like snapshot used by route optimisation.  The
-- formula mirrors the seeded recent trend; a later API prediction safely
-- replaces it with a live calculation from the same readings.
WITH live AS (
  SELECT d.*, (target_level - pre_recent_level) / 24.0 AS slope
  FROM presentation_demo_tanks d
)
INSERT INTO overflow_predictions (
  tank_id, fill_velocity_percent_per_hour, current_level,
  current_volume_cubic_meters, remaining_volume_cubic_meters,
  warning_arrival_at, warning_hours_remaining,
  danger_arrival_at, danger_hours_remaining,
  predicted_overflow_at, overflow_hours_remaining,
  prediction_status, prediction_quality_status, confidence, sample_count, calculated_at
)
SELECT id, slope, target_level,
  capacity_liters / 1000.0 * target_level / 100.0,
  capacity_liters / 1000.0 * (100 - target_level) / 100.0,
  CASE WHEN target_level >= 65 THEN CURRENT_TIMESTAMP
       WHEN slope > 0 THEN CURRENT_TIMESTAMP + ((65 - target_level) / slope) * INTERVAL '1 hour'
       ELSE NULL END,
  CASE WHEN target_level >= 65 THEN 0
       WHEN slope > 0 THEN ROUND(((65 - target_level) / slope)::numeric, 2)::double precision
       ELSE NULL END,
  CASE WHEN target_level >= 85 THEN CURRENT_TIMESTAMP WHEN slope > 0 THEN CURRENT_TIMESTAMP + ((85 - target_level) / slope) * INTERVAL '1 hour' ELSE NULL END,
  CASE WHEN target_level >= 85 THEN 0 WHEN slope > 0 THEN ROUND(((85 - target_level) / slope)::numeric, 2)::double precision ELSE NULL END,
  CASE WHEN slope > 0 THEN CURRENT_TIMESTAMP + ((100 - target_level) / slope) * INTERVAL '1 hour' ELSE NULL END,
  CASE WHEN slope > 0 THEN ROUND(((100 - target_level) / slope)::numeric, 2)::double precision ELSE NULL END,
  CASE WHEN slope > 0 THEN 'PROJECTED' ELSE 'STABLE_OR_FALLING' END,
  'GOOD', CASE WHEN slope > 0 THEN 92 ELSE 88 END, 20, CURRENT_TIMESTAMP
FROM live
ON CONFLICT (tank_id) DO UPDATE SET
  fill_velocity_percent_per_hour = EXCLUDED.fill_velocity_percent_per_hour,
  current_level = EXCLUDED.current_level,
  current_volume_cubic_meters = EXCLUDED.current_volume_cubic_meters,
  remaining_volume_cubic_meters = EXCLUDED.remaining_volume_cubic_meters,
  warning_arrival_at = EXCLUDED.warning_arrival_at,
  warning_hours_remaining = EXCLUDED.warning_hours_remaining,
  danger_arrival_at = EXCLUDED.danger_arrival_at,
  danger_hours_remaining = EXCLUDED.danger_hours_remaining,
  predicted_overflow_at = EXCLUDED.predicted_overflow_at,
  overflow_hours_remaining = EXCLUDED.overflow_hours_remaining,
  prediction_status = EXCLUDED.prediction_status,
  prediction_quality_status = EXCLUDED.prediction_quality_status,
  confidence = EXCLUDED.confidence, sample_count = EXCLUDED.sample_count,
  calculated_at = EXCLUDED.calculated_at;

-- Four forecast snapshots per tank and threshold make the historical
-- prediction/evaluation chart immediately useful.  Actual arrivals are drawn
-- from the seeded telemetry when a threshold was later observed.
WITH forecast_times AS (
  SELECT sample_no, CURRENT_TIMESTAMP - offset_interval AS prediction_time
  FROM (VALUES
    (1, INTERVAL '10 days'), (2, INTERVAL '7 days'),
    (3, INTERVAL '4 days'), (4, INTERVAL '1 day')
  ) AS times(sample_no, offset_interval)
), forecasts AS (
  SELECT d.*, f.sample_no, f.prediction_time, threshold_percent,
    (d.target_level - d.pre_recent_level) / 24.0 AS slope,
    (SELECT r.level FROM sensor_readings r
     WHERE r.tank_id = d.id AND r.recorded_at <= f.prediction_time
     ORDER BY r.recorded_at DESC LIMIT 1) AS observed_level
  FROM presentation_demo_tanks d
  CROSS JOIN forecast_times f
  CROSS JOIN (VALUES (65::smallint), (85::smallint), (100::smallint)) thresholds(threshold_percent)
)
INSERT INTO prediction_history (
  id, tank_id, prediction_time, threshold_percent, forecast_at,
  actual_arrival_at, regression_slope, regression_r_squared,
  interval_earliest_at, interval_latest_at, forecast_error_hours,
  prediction_quality_status, sample_count, filling_cycle_started_at, created_at
)
SELECT
  md5('ssmeas-live-demo-prediction:' || sort_order || ':' || sample_no || ':' || threshold_percent)::uuid,
  id, prediction_time, threshold_percent,
  CASE WHEN observed_level >= threshold_percent THEN prediction_time
       WHEN slope > 0 THEN prediction_time + ((threshold_percent - observed_level) / slope) * INTERVAL '1 hour'
       ELSE NULL END,
  (SELECT MIN(r.recorded_at) FROM sensor_readings r
   WHERE r.tank_id = forecasts.id AND r.recorded_at >= forecasts.prediction_time
     AND r.level >= forecasts.threshold_percent),
  slope, 0.93,
  CASE WHEN observed_level >= threshold_percent THEN prediction_time
       WHEN slope > 0 THEN prediction_time + ((threshold_percent - observed_level) / (slope * 1.12)) * INTERVAL '1 hour'
       ELSE NULL END,
  CASE WHEN observed_level >= threshold_percent THEN prediction_time
       WHEN slope > 0 THEN prediction_time + ((threshold_percent - observed_level) / (slope * 0.88)) * INTERVAL '1 hour'
       ELSE NULL END,
  NULL, 'GOOD', 20, prediction_time - INTERVAL '24 hours', prediction_time
FROM forecasts
ON CONFLICT (id) DO UPDATE SET
  prediction_time = EXCLUDED.prediction_time, forecast_at = EXCLUDED.forecast_at,
  actual_arrival_at = EXCLUDED.actual_arrival_at, regression_slope = EXCLUDED.regression_slope,
  regression_r_squared = EXCLUDED.regression_r_squared,
  interval_earliest_at = EXCLUDED.interval_earliest_at, interval_latest_at = EXCLUDED.interval_latest_at,
  forecast_error_hours = EXCLUDED.forecast_error_hours,
  prediction_quality_status = EXCLUDED.prediction_quality_status,
  sample_count = EXCLUDED.sample_count, filling_cycle_started_at = EXCLUDED.filling_cycle_started_at,
  created_at = EXCLUDED.created_at;

-- Fill in evaluation errors after the upsert, using the actual threshold
-- crossing now stored above.  This is restricted to the demo UUID namespace.
UPDATE prediction_history history
SET forecast_error_hours = EXTRACT(EPOCH FROM (history.actual_arrival_at - history.forecast_at)) / 3600.0
WHERE history.id IN (
    SELECT md5('ssmeas-live-demo-prediction:' || d.sort_order || ':' || sample_no || ':' || threshold_percent)::uuid
    FROM presentation_demo_tanks d
    CROSS JOIN generate_series(1, 4) sample_no
    CROSS JOIN (VALUES (65), (85), (100)) thresholds(threshold_percent)
  )
  AND history.actual_arrival_at IS NOT NULL
  AND history.forecast_at IS NOT NULL;

COMMIT;
