-- Phase 2 maintenance workflow fields. Safe to run repeatedly.
BEGIN;
ALTER TABLE maintenance ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM';
ALTER TABLE maintenance ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE maintenance ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE maintenance ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE maintenance DROP CONSTRAINT IF EXISTS maintenance_status_check;
ALTER TABLE maintenance ADD CONSTRAINT maintenance_status_check CHECK (status IN ('SCHEDULED','ASSIGNED','IN_PROGRESS','COMPLETED','CANCELLED'));
ALTER TABLE maintenance DROP CONSTRAINT IF EXISTS maintenance_priority_check;
ALTER TABLE maintenance ADD CONSTRAINT maintenance_priority_check CHECK (priority IN ('LOW','MEDIUM','HIGH','CRITICAL'));
DROP INDEX IF EXISTS maintenance_one_open_task_per_tank_idx;
CREATE UNIQUE INDEX maintenance_one_open_task_per_tank_idx ON maintenance (tank_id, task)
WHERE status IN ('SCHEDULED','ASSIGNED','IN_PROGRESS');
COMMIT;
