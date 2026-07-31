ALTER TABLE tanks
  ADD COLUMN IF NOT EXISTS hardware_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS warning_fill_threshold DOUBLE PRECISION NOT NULL DEFAULT 80,
  ADD COLUMN IF NOT EXISTS critical_fill_threshold DOUBLE PRECISION NOT NULL DEFAULT 95;

ALTER TABLE tanks DROP CONSTRAINT IF EXISTS tanks_fill_thresholds_check;
ALTER TABLE tanks ADD CONSTRAINT tanks_fill_thresholds_check CHECK (
  warning_fill_threshold >= 0
  AND warning_fill_threshold < critical_fill_threshold
  AND critical_fill_threshold <= 100
);
