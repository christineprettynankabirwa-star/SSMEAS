import { pool } from "../config/database";
import type { RouteCandidate } from "../types/route-optimization.types";

interface RouteRow {
  tank_id: string; tank_name: string; location: string; latitude: number;
  longitude: number; task: string; scheduled_for: Date; fill_level: number | null;
  alert_severity: "critical" | "warning" | null;
}

export const getOpenMaintenanceStops = async (): Promise<RouteCandidate[]> => {
  const result = await pool.query<RouteRow>(
    `WITH latest_reading AS (
       SELECT DISTINCT ON (tank_id) tank_id, level
       FROM sensor_readings
       ORDER BY tank_id, recorded_at DESC, created_at DESC
     ), open_work AS (
       SELECT DISTINCT ON (tank_id) tank_id, task, scheduled_for
       FROM maintenance
       WHERE status IN ('SCHEDULED', 'ASSIGNED', 'IN_PROGRESS')
       ORDER BY tank_id, scheduled_for ASC
     ), active_alert AS (
       SELECT tank_id,
         CASE WHEN BOOL_OR(severity = 'critical') THEN 'critical' ELSE 'warning' END AS severity
       FROM alerts
       WHERE status = 'ACTIVE' AND severity IN ('critical', 'warning')
       GROUP BY tank_id
     )
     SELECT tank.id AS tank_id, tank.tank_name, tank.location, tank.latitude, tank.longitude,
       COALESCE(open_work.task, 'Priority tank collection') AS task,
       COALESCE(open_work.scheduled_for, NOW()) AS scheduled_for,
       latest_reading.level AS fill_level, active_alert.severity AS alert_severity
     FROM tanks AS tank
     LEFT JOIN latest_reading ON latest_reading.tank_id = tank.id
     LEFT JOIN open_work ON open_work.tank_id = tank.id
     LEFT JOIN active_alert ON active_alert.tank_id = tank.id
     WHERE open_work.tank_id IS NOT NULL
        OR latest_reading.level >= $1
        OR active_alert.tank_id IS NOT NULL`,
    [Number(process.env.FILL_WARNING_THRESHOLD ?? 80)],
  );
  const criticalThreshold = Number(process.env.FILL_CRITICAL_THRESHOLD ?? 95);
  const warningThreshold = Number(process.env.FILL_WARNING_THRESHOLD ?? 80);
  return result.rows.map((row) => {
    const fillLevel = row.fill_level === null ? null : Number(row.fill_level);
    const priority = row.alert_severity === "critical" || (fillLevel ?? 0) >= criticalThreshold
      ? "CRITICAL" as const
      : row.alert_severity === "warning" || (fillLevel ?? 0) >= warningThreshold
        ? "HIGH" as const
        : "MEDIUM" as const;
    const base = priority === "CRITICAL" ? 90 : priority === "HIGH" ? 65 : 35;
    const weight = priority === "CRITICAL" ? 0.1 : priority === "HIGH" ? 0.25 : 0.2;
    return {
      tankId: row.tank_id, tankName: row.tank_name, location: row.location,
      latitude: Number(row.latitude), longitude: Number(row.longitude),
      task: row.task, scheduledFor: new Date(row.scheduled_for), fillLevel, priority,
      priorityScore: Math.min(100, Math.round(base + (fillLevel ?? 0) * weight)),
    };
  });
};
