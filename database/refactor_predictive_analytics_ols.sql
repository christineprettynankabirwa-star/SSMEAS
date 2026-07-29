BEGIN;

ALTER TABLE overflow_predictions
  ADD COLUMN IF NOT EXISTS fill_velocity_percent_per_hour DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS warning_arrival_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS warning_hours_remaining DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS danger_arrival_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS danger_hours_remaining DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS overflow_hours_remaining DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS prediction_status VARCHAR(32) NOT NULL DEFAULT 'INSUFFICIENT_DATA',
  ADD COLUMN IF NOT EXISTS confidence DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Remove the former endpoint-rate forecast fields so no downstream subsystem can
-- accidentally use a second operational forecasting method.
ALTER TABLE overflow_predictions
  DROP COLUMN IF EXISTS predicted_minutes_to_full,
  DROP COLUMN IF EXISTS average_increase_per_minute;

ALTER TABLE overflow_predictions
  DROP CONSTRAINT IF EXISTS overflow_predictions_prediction_status_check;
ALTER TABLE overflow_predictions
  ADD CONSTRAINT overflow_predictions_prediction_status_check
  CHECK (prediction_status IN (
    'PROJECTED', 'THRESHOLD_REACHED', 'STABLE_OR_FALLING', 'INSUFFICIENT_DATA'
  ));

COMMENT ON TABLE overflow_predictions IS
  'Predictive Analytics & Risk Engine results produced by timestamp-aware OLS linear regression; no AI or machine learning is used.';

COMMIT;
