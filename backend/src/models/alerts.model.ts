import { pool } from "../config/database";
import type { Alert, CreateAlertRequest } from "../types/alerts.types";

const alertColumns = `alert.id, alert.tank_id, tank.tank_name, tank.location,
  tank.latitude, tank.longitude, alert.alert_type,
  alert.severity, alert.status, alert.message, alert.created_at, alert.updated_at,
  alert.last_seen_at, alert.acknowledged_by, acknowledger.full_name AS acknowledged_by_name,
  alert.acknowledged_at, alert.resolved_at`;
const alertJoins = `JOIN tanks tank ON tank.id=alert.tank_id
  LEFT JOIN users acknowledger ON acknowledger.id=alert.acknowledged_by`;

export const getAllAlerts = async (assignedTo?: string): Promise<Alert[]> => {
  const result = await pool.query<Alert>(
    `SELECT ${alertColumns}
     FROM alerts AS alert
     ${alertJoins}
     WHERE ($1::uuid IS NULL OR EXISTS (
       SELECT 1 FROM maintenance
       WHERE maintenance.tank_id=alert.tank_id
         AND maintenance.assigned_to=$1
         AND maintenance.status IN ('SCHEDULED','ASSIGNED','IN_PROGRESS')
     ))
     ORDER BY
       CASE alert.status WHEN 'ACTIVE' THEN 0 WHEN 'ACKNOWLEDGED' THEN 1 ELSE 2 END,
       CASE alert.severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,
       alert.created_at DESC`,
    [assignedTo ?? null],
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
     ${alertJoins}`,
    [alert.tank_id, alert.alert_type, alert.severity ?? null, alert.message],
  );
  const createdAlert = result.rows[0];
  if (!createdAlert) throw new Error("Alert could not be created.");
  return createdAlert;
};

export const createAlertUnlessActive = async (alert: CreateAlertRequest): Promise<Alert | null> => {
  const result = await pool.query<Alert>(
    `WITH existing AS (
       UPDATE alerts SET severity=COALESCE($3,'warning'), message=$4,
         last_seen_at=NOW(), updated_at=NOW()
       WHERE tank_id=$1 AND alert_type=$2
         AND status IN ('ACTIVE','ACKNOWLEDGED')
       RETURNING *
     ), inserted_alert AS (
       INSERT INTO alerts (tank_id, alert_type, severity, message)
       SELECT $1::uuid, $2::varchar, COALESCE($3::varchar, 'warning'), $4::text
       WHERE NOT EXISTS (SELECT 1 FROM existing)
       ON CONFLICT DO NOTHING RETURNING *
     ) SELECT ${alertColumns} FROM inserted_alert alert ${alertJoins}`,
    [alert.tank_id, alert.alert_type, alert.severity ?? null, alert.message],
  );
  return result.rows[0] ?? null;
};

export const resolveInactiveReadingAlerts = async (
  tankId: string, hasUnsafeCondition: boolean,
): Promise<Alert[]> => {
  if (hasUnsafeCondition) return [];
  return (await pool.query<Alert>(
    `WITH resolved AS (
       UPDATE alerts SET status='RESOLVED', resolved_at=NOW(), updated_at=NOW()
     WHERE tank_id=$1 AND status IN ('ACTIVE', 'ACKNOWLEDGED')
       AND alert_type IN ('Critical sewage level','High sewage level','Hazardous gas')
       RETURNING *
     ) SELECT ${alertColumns} FROM resolved alert ${alertJoins}`,
    [tankId],
  )).rows;
};

export const acknowledgeAlert = async (id: string, userId: string): Promise<Alert | null> => {
  const result = await pool.query<Alert>(
    `WITH updated AS (
       UPDATE alerts SET status='ACKNOWLEDGED', acknowledged_by=$2,
         acknowledged_at=NOW(), updated_at=NOW()
       WHERE id=$1 AND status='ACTIVE' RETURNING *
     ) SELECT ${alertColumns} FROM updated alert ${alertJoins}`, [id, userId],
  );
  return result.rows[0] ?? null;
};

export const getAlertById = async (id: string): Promise<Alert | null> =>
  (await pool.query<Alert>(
    `SELECT ${alertColumns} FROM alerts alert ${alertJoins} WHERE alert.id=$1`,
    [id],
  )).rows[0] ?? null;

export const resolveAcknowledgedAlert = async (id: string): Promise<Alert | null> =>
  (await pool.query<Alert>(
    `WITH updated AS (
       UPDATE alerts SET status='RESOLVED', resolved_at=NOW(), updated_at=NOW()
       WHERE id=$1 AND status='ACKNOWLEDGED' RETURNING *
     ) SELECT ${alertColumns} FROM updated alert ${alertJoins}`,
    [id],
  )).rows[0] ?? null;

export const resolveSupersededWarningAlerts = async (tankId: string): Promise<Alert[]> =>
  (await pool.query<Alert>(
    `WITH resolved AS (
       UPDATE alerts SET status='RESOLVED', resolved_at=NOW(), updated_at=NOW()
       WHERE tank_id=$1 AND severity='warning'
         AND alert_type='High sewage level'
         AND status IN ('ACTIVE','ACKNOWLEDGED')
       RETURNING *
     ) SELECT ${alertColumns} FROM resolved alert ${alertJoins}`,
    [tankId],
  )).rows;

export const getLatestResolvedAlertForTank = async (tankId: string): Promise<Alert | null> =>
  (await pool.query<Alert>(
    `SELECT ${alertColumns} FROM alerts alert
     ${alertJoins}
     WHERE alert.tank_id=$1 AND alert.status='RESOLVED'
     ORDER BY alert.created_at DESC LIMIT 1`,
    [tankId],
  )).rows[0] ?? null;

export const resolveAllOpenAlertsForTank = async (tankId: string): Promise<number> =>
  (await pool.query(
    `UPDATE alerts SET status='RESOLVED', resolved_at=NOW(), updated_at=NOW()
     WHERE tank_id=$1 AND status IN ('ACTIVE','ACKNOWLEDGED')`,
    [tankId],
  )).rowCount ?? 0;
