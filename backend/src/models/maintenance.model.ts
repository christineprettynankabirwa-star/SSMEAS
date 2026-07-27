import { pool } from "../config/database";
import type { CreateMaintenanceRequest, MaintenanceRecord, UpdateMaintenanceRequest } from "../types/maintenance.types";

const maintenanceColumns = `maintenance.id, maintenance.tank_id, tank.tank_name,
  maintenance.task, maintenance.scheduled_for, maintenance.status, maintenance.priority,
  maintenance.assigned_to, officer.full_name AS assigned_officer, maintenance.completed_at,
  maintenance.alert_id, maintenance.notes, maintenance.created_at`;

export const getAllMaintenance = async (assignedTo?: string): Promise<MaintenanceRecord[]> => {
  const result = await pool.query<MaintenanceRecord>(
    `SELECT ${maintenanceColumns}
     FROM maintenance AS maintenance
     INNER JOIN tanks AS tank ON tank.id = maintenance.tank_id
     LEFT JOIN users AS officer ON officer.id = maintenance.assigned_to
     WHERE ($1::uuid IS NULL OR maintenance.assigned_to=$1)
     ORDER BY maintenance.scheduled_for ASC`,
    [assignedTo ?? null],
  );
  return result.rows;
};

export const updateAssignedMaintenanceStatus = async (
  id: string, officerId: string, status: "ASSIGNED" | "IN_PROGRESS" | "COMPLETED",
): Promise<MaintenanceRecord | null> => {
  const result = await pool.query<MaintenanceRecord>(
    `WITH updated AS (
       UPDATE maintenance SET status=$3,
         completed_at=CASE WHEN $3='COMPLETED' THEN COALESCE(completed_at,NOW()) ELSE NULL END
       WHERE id=$1 AND assigned_to=$2 RETURNING *
     )
     SELECT ${maintenanceColumns} FROM updated maintenance
     JOIN tanks tank ON tank.id=maintenance.tank_id
     LEFT JOIN users officer ON officer.id=maintenance.assigned_to`,
    [id, officerId, status],
  );
  return result.rows[0] ?? null;
};

export const deleteMaintenance = async (id: string): Promise<boolean> =>
  ((await pool.query("DELETE FROM maintenance WHERE id=$1", [id])).rowCount ?? 0) > 0;

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
    `INSERT INTO maintenance (tank_id, task, scheduled_for, status, priority, assigned_to, notes)
     VALUES ($1, $2, $3, 'SCHEDULED', COALESCE($4, 'HIGH'), $5, $6)
     ON CONFLICT (tank_id, task)
       WHERE status IN ('SCHEDULED', 'ASSIGNED', 'IN_PROGRESS')
     DO NOTHING`,
    [maintenance.tank_id, maintenance.task, maintenance.scheduled_for,
      maintenance.priority ?? null, maintenance.assigned_to ?? null, maintenance.notes ?? null],
  );
};

export const cancelUnstartedAutomaticMaintenance = async (tankId: string): Promise<number> =>
  (await pool.query(
    `UPDATE maintenance
     SET status='CANCELLED',
       notes=CONCAT_WS(E'\n', NULLIF(notes, ''),
         'Cancelled automatically after an administrator restored the test tank to SAFE.')
     WHERE tank_id=$1 AND status IN ('SCHEDULED','ASSIGNED')
       AND (
         task LIKE 'Emergency response:%'
         OR (task='Emergency Tank Inspection'
           AND notes LIKE 'Automatically created for a critical sewer alert.%')
       )`,
    [tankId],
  )).rowCount ?? 0;

export const completeAutomaticMaintenanceForTank = async (tankId: string): Promise<number> =>
  (await pool.query(
    `UPDATE maintenance SET status='COMPLETED', completed_at=COALESCE(completed_at,NOW()),
       notes=CONCAT_WS(E'\n', NULLIF(notes, ''),
         'Completed automatically after live readings returned to SAFE.')
     WHERE tank_id=$1 AND status IN ('SCHEDULED','ASSIGNED','IN_PROGRESS')
       AND (
         task LIKE 'Emergency response:%'
         OR (task='Emergency Tank Inspection'
           AND notes LIKE 'Automatically created for a critical sewer alert.%')
       )`,
    [tankId],
  )).rowCount ?? 0;

export const getOfficerForTank = async (tankId: string): Promise<string | null> =>
  (await pool.query<{ id: string }>(
    `SELECT user_account.id
     FROM users user_account
     LEFT JOIN maintenance ON maintenance.assigned_to=user_account.id
       AND maintenance.tank_id=$1
       AND maintenance.status IN ('SCHEDULED','ASSIGNED','IN_PROGRESS')
     WHERE user_account.role='MAINTENANCE_OFFICER'
     ORDER BY (maintenance.id IS NOT NULL) DESC, user_account.created_at ASC
     LIMIT 1`,
    [tankId],
  )).rows[0]?.id ?? null;

export const createEmergencyInspectionUnlessOpen = async (
  alertId: string,
  tankId: string,
  assignedTo: string | null,
): Promise<void> => {
  await pool.query(
    `INSERT INTO maintenance(
       tank_id, alert_id, task, scheduled_for, status, priority, assigned_to, notes
     ) VALUES($1,$2,'Emergency Tank Inspection',NOW(),'SCHEDULED','HIGH',$3,
       'Automatically created for a critical sewer alert.')
     ON CONFLICT (tank_id, task)
       WHERE status IN ('SCHEDULED','ASSIGNED','IN_PROGRESS')
     DO UPDATE SET alert_id=EXCLUDED.alert_id,
       priority='HIGH',
       assigned_to=COALESCE(maintenance.assigned_to, EXCLUDED.assigned_to)`,
    [tankId, alertId, assignedTo],
  );
};
