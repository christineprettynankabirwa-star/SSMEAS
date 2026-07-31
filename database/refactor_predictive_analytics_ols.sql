BEGIN;

ALTER TABLE overflow_predictions
  ADD COLUMN IF NOT EXISTS fill_velocity_percent_per_hour DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_volume_cubic_meters DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS remaining_volume_cubic_meters DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS warning_arrival_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS warning_hours_remaining DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS danger_arrival_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS danger_hours_remaining DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS overflow_hours_remaining DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS prediction_status VARCHAR(32) NOT NULL DEFAULT 'INSUFFICIENT_DATA',
  ADD COLUMN IF NOT EXISTS prediction_quality_status VARCHAR(32) NOT NULL DEFAULT 'INSUFFICIENT_DATA',
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

ALTER TABLE overflow_predictions
  DROP CONSTRAINT IF EXISTS overflow_predictions_quality_status_check;
ALTER TABLE overflow_predictions
  ADD CONSTRAINT overflow_predictions_quality_status_check
  CHECK (prediction_quality_status IN ('GOOD', 'LIMITED', 'POOR', 'INSUFFICIENT_DATA'));

COMMENT ON TABLE overflow_predictions IS
  'Predictive Analytics & Risk Engine results produced by timestamp-aware OLS linear regression; no AI or machine learning is used.';

CREATE TABLE IF NOT EXISTS prediction_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tank_id UUID NOT NULL REFERENCES tanks(id) ON DELETE CASCADE,
  prediction_time TIMESTAMPTZ NOT NULL,
  threshold_percent SMALLINT NOT NULL CHECK (threshold_percent IN (65,85,100)),
  forecast_at TIMESTAMPTZ,
  actual_arrival_at TIMESTAMPTZ,
  regression_slope DOUBLE PRECISION NOT NULL,
  regression_r_squared DOUBLE PRECISION NOT NULL,
  interval_earliest_at TIMESTAMPTZ,
  interval_latest_at TIMESTAMPTZ,
  forecast_error_hours DOUBLE PRECISION,
  prediction_quality_status VARCHAR(32) NOT NULL,
  sample_count INTEGER NOT NULL,
  filling_cycle_started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS prediction_history_tank_time_idx
  ON prediction_history(tank_id, prediction_time DESC);
CREATE INDEX IF NOT EXISTS prediction_history_evaluation_idx
  ON prediction_history(tank_id, threshold_percent, actual_arrival_at)
  WHERE forecast_at IS NOT NULL;

COMMENT ON TABLE prediction_history IS
  'Append-only, reproducible OLS threshold forecasts and their later observed arrival times.';

COMMIT;
