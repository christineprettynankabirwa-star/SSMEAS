import { pool } from "../config/database";
import type { CreateMaintenanceRequest, MaintenanceRecord, UpdateMaintenanceRequest } from "../types/maintenance.types";

const maintenanceColumns = `maintenance.id, maintenance.tank_id, tank.tank_name,
  maintenance.task, maintenance.scheduled_for, maintenance.status, maintenance.priority,
  maintenance.assigned_to, officer.full_name AS assigned_officer, maintenance.completed_at,
  maintenance.notes, maintenance.created_at`;

export const getAllMaintenance = async (): Promise<MaintenanceRecord[]> => {
  const result = await pool.query<MaintenanceRecord>(
    `SELECT ${maintenanceColumns}
     FROM maintenance AS maintenance
     INNER JOIN tanks AS tank ON tank.id = maintenance.tank_id
     LEFT JOIN users AS officer ON officer.id = maintenance.assigned_to
     ORDER BY maintenance.scheduled_for ASC`,
  );
  return result.rows;
};

export const createMaintenance = async (
  maintenance: CreateMaintenanceRequest,
): Promise<MaintenanceRecord> => {
  const result = await pool.query<MaintenanceRecord>(
    `WITH inserted_maintenance AS (
       INSERT INTO maintenance (tank_id, task, scheduled_for, status, priority, assigned_to, notes)
       VALUES ($1, $2, $3, COALESCE($4, 'SCHEDULED'), COALESCE($5, 'MEDIUM'), $6, $7)
       RETURNING *
     )
     SELECT ${maintenanceColumns}
     FROM inserted_maintenance AS maintenance
     INNER JOIN tanks AS tank ON tank.id = maintenance.tank_id
     LEFT JOIN users AS officer ON officer.id = maintenance.assigned_to`,
    [maintenance.tank_id, maintenance.task, maintenance.scheduled_for, maintenance.status ?? null,
      maintenance.priority ?? null, maintenance.assigned_to ?? null, maintenance.notes ?? null],
  );
  const createdMaintenance = result.rows[0];
  if (!createdMaintenance) throw new Error("Maintenance record could not be created.");
  return createdMaintenance;
};

export const updateMaintenance = async (id: string, update: UpdateMaintenanceRequest): Promise<MaintenanceRecord | null> => {
  const result = await pool.query<MaintenanceRecord>(
    `WITH updated AS (UPDATE maintenance SET
       status = COALESCE($2, status), priority = COALESCE($3, priority),
       assigned_to = CASE WHEN $4::boolean THEN $5::uuid ELSE assigned_to END,
       scheduled_for = COALESCE($6::timestamptz, scheduled_for),
       notes = CASE WHEN $7::boolean THEN $8::text ELSE notes END,
       completed_at = CASE WHEN $2 = 'COMPLETED' THEN COALESCE(completed_at, NOW()) WHEN $2 IS NOT NULL THEN NULL ELSE completed_at END
     WHERE id = $1 RETURNING *)
     SELECT ${maintenanceColumns} FROM updated maintenance
     JOIN tanks tank ON tank.id = maintenance.tank_id LEFT JOIN users officer ON officer.id = maintenance.assigned_to`,
    [id, update.status ?? null, update.priority ?? null,
      Object.prototype.hasOwnProperty.call(update, "assigned_to"), update.assigned_to ?? null,
      update.scheduled_for ?? null, Object.prototype.hasOwnProperty.call(update, "notes"), update.notes ?? null],
  );
  return result.rows[0] ?? null;
};

export const createMaintenanceUnlessOpen = async (
  maintenance: CreateMaintenanceRequest,
): Promise<void> => {
  await pool.query(
    `INSERT INTO maintenance (tank_id, task, scheduled_for, status)
     VALUES ($1, $2, $3, 'SCHEDULED')
     ON CONFLICT (tank_id, task)
       WHERE status IN ('SCHEDULED', 'ASSIGNED', 'IN_PROGRESS')
     DO NOTHING`,
    [maintenance.tank_id, maintenance.task, maintenance.scheduled_for],
  );
};
