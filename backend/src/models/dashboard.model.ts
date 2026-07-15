import { pool } from "../config/database";
import type { DashboardSummary } from "../types/dashboard.types";

interface DashboardSummaryRow {
  total_tanks: string | number;
  online_tanks: string | number;
  active_alerts: string | number;
  average_fill_level: string | number | null;
}

export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  const result = await pool.query<DashboardSummaryRow>(
    `WITH latest_readings AS (
       SELECT DISTINCT ON (tank_id) tank_id, level, recorded_at
       FROM sensor_readings
       ORDER BY tank_id, recorded_at DESC
     )
     SELECT
       (SELECT COUNT(*) FROM tanks) AS total_tanks,
       (SELECT COUNT(*)
        FROM tanks AS tank
        INNER JOIN latest_readings AS reading ON reading.tank_id = tank.id
        WHERE tank.status = 'ACTIVE'
          AND reading.recorded_at >= CURRENT_TIMESTAMP - INTERVAL '15 minutes') AS online_tanks,
       (SELECT COUNT(*) FROM alerts WHERE status = 'ACTIVE') AS active_alerts,
       (SELECT AVG(level) FROM latest_readings WHERE level IS NOT NULL) AS average_fill_level`,
  );
  const row = result.rows[0];
  if (!row) throw new Error("Dashboard summary query returned no result.");
  return {
    totalTanks: Number(row.total_tanks),
    onlineTanks: Number(row.online_tanks),
    activeAlerts: Number(row.active_alerts),
    averageFillLevel: row.average_fill_level === null ? 0 : Number(row.average_fill_level),
  };
};
