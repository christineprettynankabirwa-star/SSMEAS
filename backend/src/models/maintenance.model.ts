import { pool } from "../config/database";
import type { CreateMaintenanceRequest, MaintenanceRecord } from "../types/maintenance.types";

const maintenanceColumns = `maintenance.id, maintenance.tank_id, tank.tank_name,
  maintenance.task, maintenance.scheduled_for, maintenance.status, maintenance.created_at`;

export const getAllMaintenance = async (): Promise<MaintenanceRecord[]> => {
  const result = await pool.query<MaintenanceRecord>(
    `SELECT ${maintenanceColumns}
     FROM maintenance AS maintenance
     INNER JOIN tanks AS tank ON tank.id = maintenance.tank_id
     ORDER BY maintenance.scheduled_for ASC`,
  );
  return result.rows;
};

export const createMaintenance = async (
  maintenance: CreateMaintenanceRequest,
): Promise<MaintenanceRecord> => {
  const result = await pool.query<MaintenanceRecord>(
    `WITH inserted_maintenance AS (
       INSERT INTO maintenance (tank_id, task, scheduled_for, status)
       VALUES ($1, $2, $3, COALESCE($4, 'SCHEDULED'))
       RETURNING *
     )
     SELECT ${maintenanceColumns}
     FROM inserted_maintenance AS maintenance
     INNER JOIN tanks AS tank ON tank.id = maintenance.tank_id`,
    [maintenance.tank_id, maintenance.task, maintenance.scheduled_for, maintenance.status ?? null],
  );
  const createdMaintenance = result.rows[0];
  if (!createdMaintenance) throw new Error("Maintenance record could not be created.");
  return createdMaintenance;
};

export const createMaintenanceUnlessOpen = async (
  maintenance: CreateMaintenanceRequest,
): Promise<void> => {
  await pool.query(
    `INSERT INTO maintenance (tank_id, task, scheduled_for, status)
     VALUES ($1, $2, $3, 'SCHEDULED')
     ON CONFLICT (tank_id, task)
       WHERE status IN ('SCHEDULED', 'IN_PROGRESS')
     DO NOTHING`,
    [maintenance.tank_id, maintenance.task, maintenance.scheduled_for],
  );
};
