BEGIN;

DROP INDEX IF EXISTS maintenance_one_open_task_per_tank_idx;

CREATE UNIQUE INDEX maintenance_one_open_task_per_tank_idx
    ON maintenance (tank_id, task)
    WHERE status IN ('SCHEDULED', 'ASSIGNED', 'IN_PROGRESS');

COMMIT;
