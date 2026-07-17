CREATE UNIQUE INDEX IF NOT EXISTS maintenance_one_open_task_per_tank_idx
    ON maintenance (tank_id, task)
    WHERE status IN ('SCHEDULED', 'IN_PROGRESS');
