import { pool } from "../config/database";

export const countOpenAlerts = async (tankId: string): Promise<number> =>
  (await pool.query<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM alerts
     WHERE tank_id=$1 AND status IN ('ACTIVE','ACKNOWLEDGED')`,
    [tankId],
  )).rows[0]?.count ?? 0;

export const getUnsafeTestTankIds = async (): Promise<string[]> =>
  (await pool.query<{ id: string }>(
    `WITH latest AS (
       SELECT DISTINCT ON (tank_id) tank_id, level, gas_level
       FROM sensor_readings ORDER BY tank_id, recorded_at DESC
     )
     SELECT tank.id FROM tanks tank JOIN latest ON latest.tank_id=tank.id
     WHERE tank.id::text LIKE 'd0000000-0000-4000-8000-00000000000_'
       AND (COALESCE(latest.level,0) >= 80 OR COALESCE(latest.gas_level,0) >= 200)
     ORDER BY tank.tank_name`,
  )).rows.map(({ id }) => id);

export const recordSimulationAudit = async (input: {
  actorId: string; tankId: string; readingId: string; action: string;
  condition: string; resolvedAlerts: number; cancelledMaintenance: number;
}): Promise<void> => {
  await pool.query(
    `INSERT INTO simulation_audit_logs(
       actor_id,tank_id,reading_id,action,condition,resolved_alerts,cancelled_maintenance
     ) VALUES($1,$2,$3,$4,$5,$6,$7)`,
    [
      input.actorId, input.tankId, input.readingId, input.action, input.condition,
      input.resolvedAlerts, input.cancelledMaintenance,
    ],
  );
};
