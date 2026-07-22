-- SSMEAS deterministic demonstration dataset.
-- Reserved UUIDs make this script idempotent and let reset-db remove demo data only.
BEGIN;

-- The seed expects database/add_demo_status_support.sql to have been applied.
INSERT INTO tanks (
    id, tank_name, owner_name, location, latitude, longitude, capacity_liters,
    thingspeak_channel_id, thingspeak_read_api_key, status
)
VALUES
    ('d0000000-0000-4000-8000-000000000001', 'Main Campus Central Tank', 'Makerere University Estates', 'Makerere Main Campus', 0.33472, 32.56742, 120000, 910001, 'DEMO_READ_KEY_01', 'ACTIVE'),
    ('d0000000-0000-4000-8000-000000000002', 'Mitchell Hall Tank', 'Makerere University Estates', 'Mitchell Hall', 0.33285, 32.56837, 85000, 910002, 'DEMO_READ_KEY_02', 'ACTIVE'),
    ('d0000000-0000-4000-8000-000000000003', 'Lumumba Hall Tank', 'Makerere University Estates', 'Lumumba Hall', 0.33634, 32.56645, 90000, 910003, 'DEMO_READ_KEY_03', 'ACTIVE'),
    ('d0000000-0000-4000-8000-000000000004', 'Africa Hall Tank', 'Makerere University Estates', 'Africa Hall', 0.33086, 32.57015, 75000, 910004, 'DEMO_READ_KEY_04', 'ACTIVE'),
    ('d0000000-0000-4000-8000-000000000005', 'Mary Stuart Hall Tank', 'Makerere University Estates', 'Mary Stuart Hall', 0.33364, 32.56493, 95000, 910005, 'DEMO_READ_KEY_05', 'ACTIVE'),
    ('d0000000-0000-4000-8000-000000000006', 'CEDAT Engineering Tank', 'College of Engineering, Design, Art and Technology', 'CEDAT', 0.32877, 32.57080, 70000, 910006, 'DEMO_READ_KEY_06', 'ACTIVE'),
    ('d0000000-0000-4000-8000-000000000007', 'Senate Building Tank', 'Makerere University Administration', 'Senate Building', 0.33420, 32.56876, 65000, 910007, 'DEMO_READ_KEY_07', 'ACTIVE'),
    ('d0000000-0000-4000-8000-000000000008', 'University Hospital Tank', 'Makerere University Hospital', 'University Hospital', 0.33723, 32.57202, 80000, 910008, 'DEMO_READ_KEY_08', 'ACTIVE')
ON CONFLICT DO NOTHING;

-- Generate 48 readings per tank (384 total), spaced over the previous seven days.
-- The five profiles model filling, gas fluctuation, emptying, warning, and normal operation.
WITH demo_tanks AS (
    SELECT id, thingspeak_channel_id, RIGHT(id::text, 1)::integer AS profile
    FROM tanks WHERE id::text LIKE 'd0000000-0000-4000-8000-00000000000_'
), generated AS (
    SELECT tank.id AS tank_id, tank.thingspeak_channel_id, tank.profile, sample.i,
           CURRENT_TIMESTAMP - INTERVAL '7 days' + (INTERVAL '7 days' * sample.i / 47.0) AS observed_at
    FROM demo_tanks tank CROSS JOIN generate_series(0, 47) AS sample(i)
), values_to_store AS (
    SELECT *,
      ROUND((CASE profile
        WHEN 1 THEN 60 + i * 38.0 / 47                         -- steadily filling, critical
        WHEN 2 THEN 67 + i * 8.0 / 47 + 2 * SIN(i / 3.0)       -- gas-critical
        WHEN 3 THEN 54 + i * 32.0 / 47                         -- steadily filling, warning
        WHEN 4 THEN 62 + i * 10.0 / 47 + 3 * SIN(i / 4.0)      -- gas-warning
        WHEN 5 THEN CASE WHEN i < 30 THEN 58 + i ELSE 24 + (i - 30) * 0.7 END -- emptied
        WHEN 6 THEN 43 + i * 12.0 / 47 + 2 * SIN(i / 5.0)
        WHEN 7 THEN 35 + i * 20.0 / 47 + 4 * SIN(i / 4.0)
        WHEN 8 THEN CASE WHEN i < 25 THEN 64 + i * 1.1 ELSE 28 + (i - 25) * 0.8 END
      END)::numeric, 2) AS level_value,
      ROUND((CASE profile
        WHEN 1 THEN 135 + i * 1.5 + 12 * SIN(i / 3.0)
        WHEN 2 THEN 205 + i * 2.9 + 55 * SIN(i / 2.2)           -- fluctuating, ends critical
        WHEN 3 THEN 125 + i * 1.1 + 10 * SIN(i / 4.0)
        WHEN 4 THEN 185 + i * 1.2 + 28 * SIN(i / 2.7)           -- fluctuating warning gas
        WHEN 5 THEN 120 + 18 * SIN(i / 3.0)
        WHEN 6 THEN 105 + 16 * SIN(i / 4.0)
        WHEN 7 THEN 115 + 35 * SIN(i / 2.5)
        WHEN 8 THEN 110 + 20 * SIN(i / 3.5)
      END)::numeric, 2) AS gas_value
    FROM generated
)
INSERT INTO sensor_readings (
    id, tank_id, device_reading_id, thingspeak_channel_id, thingspeak_entry_id,
    level, gas_level, status, recorded_at, created_at
)
SELECT md5('ssmeas-demo-reading-' || profile || '-' || i)::uuid,
       tank_id, md5('ssmeas-demo-device-reading-' || profile || '-' || i)::uuid,
       thingspeak_channel_id, 10000 + profile * 100 + i,
       level_value, gas_value,
       CASE WHEN level_value >= 95 OR gas_value >= 300 THEN 'CRITICAL'
            WHEN level_value >= 80 OR gas_value >= 200 THEN 'WARNING'
            ELSE 'SAFE' END,
       observed_at, observed_at
FROM values_to_store
ON CONFLICT (id) DO UPDATE SET
    level = EXCLUDED.level, gas_level = EXCLUDED.gas_level, status = EXCLUDED.status,
    recorded_at = EXCLUDED.recorded_at, created_at = EXCLUDED.created_at;

-- Alerts are selected from actual threshold crossings in the generated history.
WITH alert_candidates (seed_key, tank_id, sample_no, alert_type, severity, status, message) AS (
  VALUES
    ('a1', 'd0000000-0000-4000-8000-000000000001'::uuid, 47, 'OVERFLOW_RISK', 'critical', 'ACTIVE', 'Tank is at 98% and requires immediate emptying.'),
    ('a2', 'd0000000-0000-4000-8000-000000000001'::uuid, 44, 'HIGH_LEVEL', 'warning', 'ACKNOWLEDGED', 'High fill trend acknowledged by the control room.'),
    ('a3', 'd0000000-0000-4000-8000-000000000002'::uuid, 47, 'GAS_CRITICAL', 'critical', 'ACTIVE', 'Hazardous sewer gas concentration requires urgent vent inspection.'),
    ('a4', 'd0000000-0000-4000-8000-000000000002'::uuid, 39, 'GAS_WARNING', 'warning', 'RESOLVED', 'Earlier gas spike subsided after ventilation.'),
    ('a5', 'd0000000-0000-4000-8000-000000000003'::uuid, 47, 'HIGH_LEVEL', 'warning', 'ACTIVE', 'Tank fill has crossed the warning threshold.'),
    ('a6', 'd0000000-0000-4000-8000-000000000004'::uuid, 47, 'GAS_WARNING', 'warning', 'ACTIVE', 'Gas is elevated and should be monitored.'),
    ('a7', 'd0000000-0000-4000-8000-000000000005'::uuid, 29, 'HIGH_LEVEL', 'warning', 'RESOLVED', 'Tank was emptied after reaching the high-level threshold.'),
    ('a8', 'd0000000-0000-4000-8000-000000000006'::uuid, 22, 'GAS_WARNING', 'info', 'RESOLVED', 'Transient gas increase returned to normal.'),
    ('a9', 'd0000000-0000-4000-8000-000000000007'::uuid, 34, 'GAS_WARNING', 'info', 'ACKNOWLEDGED', 'Fluctuating gas reading is under observation.'),
    ('a10', 'd0000000-0000-4000-8000-000000000008'::uuid, 24, 'HIGH_LEVEL', 'warning', 'RESOLVED', 'Scheduled emptying resolved the elevated fill level.')
), matched AS (
  SELECT candidate.*, reading.recorded_at
  FROM alert_candidates candidate
  JOIN sensor_readings reading
    ON reading.id = md5('ssmeas-demo-reading-' || RIGHT(candidate.tank_id::text, 1) || '-' || candidate.sample_no)::uuid
)
INSERT INTO alerts (id, tank_id, alert_type, severity, status, message, created_at)
SELECT md5('ssmeas-demo-alert-' || seed_key)::uuid, tank_id, alert_type, severity, status, message, recorded_at
FROM matched
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, severity = EXCLUDED.severity,
    message = EXCLUDED.message, created_at = EXCLUDED.created_at;

-- Past and future jobs populate history and provide several route destinations.
WITH jobs (seed_key, tank_id, task, scheduled_for, status) AS (
  VALUES
    ('m01','d0000000-0000-4000-8000-000000000001'::uuid,'Empty sewage tank',CURRENT_TIMESTAMP + INTERVAL '30 minutes','IN_PROGRESS'),
    ('m02','d0000000-0000-4000-8000-000000000001'::uuid,'General inspection',CURRENT_TIMESTAMP - INTERVAL '20 days','COMPLETED'),
    ('m03','d0000000-0000-4000-8000-000000000002'::uuid,'Inspect gas vent',CURRENT_TIMESTAMP + INTERVAL '2 hours','SCHEDULED'),
    ('m04','d0000000-0000-4000-8000-000000000002'::uuid,'Clean inlet',CURRENT_TIMESTAMP - INTERVAL '12 days','COMPLETED'),
    ('m05','d0000000-0000-4000-8000-000000000003'::uuid,'Empty sewage tank',CURRENT_TIMESTAMP + INTERVAL '1 day','SCHEDULED'),
    ('m06','d0000000-0000-4000-8000-000000000003'::uuid,'Inspect ultrasonic sensor',CURRENT_TIMESTAMP - INTERVAL '8 days','COMPLETED'),
    ('m07','d0000000-0000-4000-8000-000000000004'::uuid,'Inspect gas vent',CURRENT_TIMESTAMP + INTERVAL '6 hours','SCHEDULED'),
    ('m08','d0000000-0000-4000-8000-000000000004'::uuid,'General inspection',CURRENT_TIMESTAMP - INTERVAL '16 days','COMPLETED'),
    ('m09','d0000000-0000-4000-8000-000000000005'::uuid,'Empty sewage tank',CURRENT_TIMESTAMP - INTERVAL '2 days','COMPLETED'),
    ('m10','d0000000-0000-4000-8000-000000000005'::uuid,'Clean inlet',CURRENT_TIMESTAMP + INTERVAL '5 days','SCHEDULED'),
    ('m11','d0000000-0000-4000-8000-000000000006'::uuid,'General inspection',CURRENT_TIMESTAMP + INTERVAL '3 days','SCHEDULED'),
    ('m12','d0000000-0000-4000-8000-000000000006'::uuid,'Inspect ultrasonic sensor',CURRENT_TIMESTAMP - INTERVAL '5 days','COMPLETED'),
    ('m13','d0000000-0000-4000-8000-000000000007'::uuid,'Inspect ultrasonic sensor',CURRENT_TIMESTAMP + INTERVAL '7 days','SCHEDULED'),
    ('m14','d0000000-0000-4000-8000-000000000007'::uuid,'Clean inlet',CURRENT_TIMESTAMP - INTERVAL '9 days','COMPLETED'),
    ('m15','d0000000-0000-4000-8000-000000000008'::uuid,'Empty sewage tank',CURRENT_TIMESTAMP - INTERVAL '3 days','COMPLETED'),
    ('m16','d0000000-0000-4000-8000-000000000008'::uuid,'General inspection',CURRENT_TIMESTAMP + INTERVAL '10 days','SCHEDULED')
)
INSERT INTO maintenance (id, tank_id, task, scheduled_for, status, created_at)
SELECT md5('ssmeas-demo-maintenance-' || seed_key)::uuid, tank_id, task, scheduled_for, status,
       LEAST(scheduled_for, CURRENT_TIMESTAMP)
FROM jobs
ON CONFLICT (id) DO UPDATE SET scheduled_for = EXCLUDED.scheduled_for, status = EXCLUDED.status;

-- Password for every account: ChangeMe123! (bcrypt cost factor 12).
WITH demo_users (id, full_name, email, role) AS (
  VALUES
    ('e0000000-0000-4000-8000-000000000001'::uuid,'System Administrator','admin@ssmeas.local','ADMINISTRATOR'),
    ('e0000000-0000-4000-8000-000000000002'::uuid,'David Kato','david.kato@ssmeas.local','MAINTENANCE_OFFICER'),
    ('e0000000-0000-4000-8000-000000000003'::uuid,'Grace Nansubuga','grace.nansubuga@ssmeas.local','MAINTENANCE_OFFICER'),
    ('e0000000-0000-4000-8000-000000000004'::uuid,'Michael Okello','michael.okello@ssmeas.local','MAINTENANCE_OFFICER'),
    ('e0000000-0000-4000-8000-000000000005'::uuid,'Sarah Namusoke','sarah.namusoke@ssmeas.local','SUPERVISOR'),
    ('e0000000-0000-4000-8000-000000000006'::uuid,'James Mugisha','james.mugisha@ssmeas.local','SUPERVISOR')
)
INSERT INTO users (id, full_name, email, password_hash, role)
SELECT id, full_name, email, '$2b$12$uFj4a3jBC4053ZH551mh2O4KUPizUZW1e.Kw4qfE/MQs3JcvVPj9G', role
FROM demo_users
ON CONFLICT DO NOTHING;

-- Enrich demo jobs after users exist; resolve officers by email to coexist with prior demo accounts.
UPDATE maintenance job SET
  priority = CASE WHEN job.task LIKE 'Emergency%' OR job.tank_id IN ('d0000000-0000-4000-8000-000000000001','d0000000-0000-4000-8000-000000000002') THEN 'CRITICAL'
                  WHEN job.status IN ('IN_PROGRESS','SCHEDULED') THEN 'HIGH' ELSE 'MEDIUM' END,
  assigned_to = officer.id,
  completed_at = CASE WHEN job.status = 'COMPLETED' THEN job.scheduled_for + INTERVAL '3 hours' ELSE NULL END,
  notes = CASE WHEN job.status = 'COMPLETED' THEN 'Field team completed the work and verified normal operation.'
               ELSE 'Coordinate access with the campus estates office before arrival.' END
FROM users officer
WHERE job.tank_id::text LIKE 'd0000000-0000-4000-8000-00000000000_'
  AND officer.email = CASE (RIGHT(job.tank_id::text, 1)::integer % 3)
    WHEN 1 THEN 'david.kato@ssmeas.local' WHEN 2 THEN 'grace.nansubuga@ssmeas.local'
    ELSE 'michael.okello@ssmeas.local' END;

COMMIT;
