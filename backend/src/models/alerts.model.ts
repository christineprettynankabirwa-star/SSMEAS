import { pool } from "../config/database";
import type { Alert, CreateAlertRequest } from "../types/alerts.types";

const alertColumns = `alert.id, alert.tank_id, tank.tank_name, alert.alert_type,
  alert.severity, alert.status, alert.message, alert.created_at`;

export const getAllAlerts = async (): Promise<Alert[]> => {
  const result = await pool.query<Alert>(
    `SELECT ${alertColumns}
     FROM alerts AS alert
     INNER JOIN tanks AS tank ON tank.id = alert.tank_id
     ORDER BY alert.created_at DESC`,
  );
  return result.rows;
};

export const createAlert = async (alert: CreateAlertRequest): Promise<Alert> => {
  const result = await pool.query<Alert>(
    `WITH inserted_alert AS (
       INSERT INTO alerts (tank_id, alert_type, severity, message)
       VALUES ($1, $2, COALESCE($3, 'warning'), $4)
       RETURNING *
     )
     SELECT ${alertColumns}
     FROM inserted_alert AS alert
     INNER JOIN tanks AS tank ON tank.id = alert.tank_id`,
    [alert.tank_id, alert.alert_type, alert.severity ?? null, alert.message],
  );
  const createdAlert = result.rows[0];
  if (!createdAlert) throw new Error("Alert could not be created.");
  return createdAlert;
};

export const createAlertUnlessActive = async (alert: CreateAlertRequest): Promise<void> => {
  await pool.query(
    `INSERT INTO alerts (tank_id, alert_type, severity, message)
     SELECT $1::uuid, $2::varchar, COALESCE($3::varchar, 'warning'), $4::text
     WHERE NOT EXISTS (
       SELECT 1 FROM alerts
       WHERE tank_id = $1 AND alert_type = $2 AND status = 'ACTIVE'
     )
     ON CONFLICT DO NOTHING`,
    [alert.tank_id, alert.alert_type, alert.severity ?? null, alert.message],
  );
};

export const acknowledgeAlert = async (id: string): Promise<Alert | null> => {
  const result = await pool.query<Alert>(
    `WITH updated AS (UPDATE alerts SET status = 'ACKNOWLEDGED' WHERE id = $1 AND status = 'ACTIVE' RETURNING *)
     SELECT ${alertColumns} FROM updated alert JOIN tanks tank ON tank.id = alert.tank_id`, [id],
  );
  return result.rows[0] ?? null;
};
