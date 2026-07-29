import { pool } from "../config/database";
import type { RouteCandidate, UrgencyFactor } from "../types/route-optimization.types";
import { alertThresholdConfig } from "../config/alert-thresholds";

interface RouteRow {
  tank_id: string; tank_name: string; location: string; latitude: number; longitude: number;
  capacity_liters: number; task: string; scheduled_for: Date; fill_level: number | null;
  alert_severity: "critical" | "warning" | null; alert_created_at: Date | null;
  danger_hours_remaining: number | null; overflow_hours_remaining: number | null;
  prediction_quality_status: "GOOD" | "LIMITED" | "POOR" | "INSUFFICIENT_DATA" | null;
  assigned_to: string | null; assigned_officer: string | null;
}

const urgency = (row: RouteRow, fillLevel: number | null, now: Date) => {
  const factors: UrgencyFactor[] = [];
  if (row.alert_severity) {
    factors.push({
      label: `${row.alert_severity === "critical" ? "Critical" : "Warning"} unresolved alert`,
      points: row.alert_severity === "critical" ? 35 : 18,
      detail: row.alert_created_at
        ? `Open for ${Math.max(0, Math.floor((now.getTime() - row.alert_created_at.getTime()) / 3_600_000))} hours`
        : "Open incident",
    });
  }
  if (fillLevel !== null) {
    const points = fillLevel >= alertThresholdConfig.sewageLevel.dangerMinimum ? 30
      : fillLevel >= alertThresholdConfig.sewageLevel.warningMinimum ? 18
        : Math.min(10, Math.round(fillLevel * 0.15));
    factors.push({ label: "Sewage level", points, detail: `${fillLevel.toFixed(0)}% full` });
  }
  if (row.danger_hours_remaining !== null
    && (row.prediction_quality_status === "GOOD" || row.prediction_quality_status === "LIMITED")) {
    const hours = Number(row.danger_hours_remaining);
    const points = hours <= 2 ? 25 : hours <= 6 ? 18 : hours <= 24 ? 10 : 3;
    factors.push({ label: "85% threshold projection", points, detail: `Approximately ${Math.max(0, hours).toFixed(1)} hours to danger` });
  }
  if (row.alert_created_at) {
    const hours = Math.max(0, (now.getTime() - row.alert_created_at.getTime()) / 3_600_000);
    factors.push({ label: "Incident age", points: Math.min(15, Math.round(hours * 2)), detail: `${hours.toFixed(1)} hours unresolved` });
  }
  const deadlineHours = (row.scheduled_for.getTime() - now.getTime()) / 3_600_000;
  const deadlinePoints = deadlineHours <= 0 ? 15 : deadlineHours <= 4 ? 10 : deadlineHours <= 24 ? 5 : 0;
  if (deadlinePoints) factors.push({ label: "Maintenance deadline", points: deadlinePoints, detail: deadlineHours <= 0 ? "Task is overdue" : `Due in ${Math.ceil(deadlineHours)} hours` });
  if (/emergency|empty|pump|overflow/i.test(row.task)) {
    factors.push({ label: "Task type", points: /emergency/i.test(row.task) ? 10 : 6, detail: row.task });
  }
  const score = Math.min(100, factors.reduce((sum, factor) => sum + factor.points, 0));
  return { factors, score };
};

export const getOpenMaintenanceStops = async (now = new Date()): Promise<RouteCandidate[]> => {
  const result = await pool.query<RouteRow>(
    `WITH latest_reading AS (
       SELECT DISTINCT ON (tank_id) tank_id, level
       FROM sensor_readings ORDER BY tank_id, recorded_at DESC, created_at DESC
     ), open_work AS (
       SELECT DISTINCT ON (maintenance.tank_id)
         maintenance.tank_id, maintenance.task, maintenance.scheduled_for,
         maintenance.assigned_to, officer.full_name AS assigned_officer
       FROM maintenance
       LEFT JOIN users officer ON officer.id=maintenance.assigned_to
       WHERE maintenance.status IN ('SCHEDULED','ASSIGNED','IN_PROGRESS')
       ORDER BY maintenance.tank_id, maintenance.scheduled_for ASC
     ), unresolved_alert AS (
       SELECT tank_id,
         CASE WHEN BOOL_OR(severity='critical') THEN 'critical' ELSE 'warning' END AS severity,
         MIN(created_at) AS created_at
       FROM alerts
       WHERE status IN ('ACTIVE','ACKNOWLEDGED') AND severity IN ('critical','warning')
       GROUP BY tank_id
     )
     SELECT tank.id AS tank_id, tank.tank_name, tank.location, tank.latitude, tank.longitude,
       tank.capacity_liters, COALESCE(open_work.task,'Priority tank collection') AS task,
       COALESCE(open_work.scheduled_for,NOW()) AS scheduled_for, latest_reading.level AS fill_level,
       unresolved_alert.severity AS alert_severity, unresolved_alert.created_at AS alert_created_at,
       prediction.danger_hours_remaining, prediction.overflow_hours_remaining,
       prediction.prediction_quality_status,
       open_work.assigned_to, open_work.assigned_officer
     FROM tanks tank
     LEFT JOIN latest_reading ON latest_reading.tank_id=tank.id
     LEFT JOIN open_work ON open_work.tank_id=tank.id
     LEFT JOIN unresolved_alert ON unresolved_alert.tank_id=tank.id
     LEFT JOIN overflow_predictions prediction ON prediction.tank_id=tank.id
     WHERE open_work.tank_id IS NOT NULL
        OR latest_reading.level >= $1
        OR unresolved_alert.tank_id IS NOT NULL
        OR (
          prediction.prediction_status IN ('PROJECTED','THRESHOLD_REACHED')
          AND prediction.prediction_quality_status IN ('GOOD','LIMITED')
          AND prediction.danger_hours_remaining <= 24
          AND prediction.calculated_at >= NOW() - INTERVAL '15 minutes'
        )`,
    [alertThresholdConfig.sewageLevel.warningMinimum],
  );
  return result.rows.map((row) => {
    const fillLevel = row.fill_level === null ? null : Number(row.fill_level);
    const { factors, score } = urgency(row, fillLevel, now);
    const priority = row.alert_severity === "critical"
      || (fillLevel ?? 0) >= alertThresholdConfig.sewageLevel.dangerMinimum || score >= 75
      ? "CRITICAL" as const : score >= 45 ? "HIGH" as const : "MEDIUM" as const;
    return {
      tankId: row.tank_id, tankName: row.tank_name, location: row.location,
      latitude: Number(row.latitude), longitude: Number(row.longitude),
      capacityLiters: Number(row.capacity_liters), task: row.task,
      scheduledFor: new Date(row.scheduled_for), fillLevel,
      alertSeverity: row.alert_severity, alertCreatedAt: row.alert_created_at ? new Date(row.alert_created_at) : null,
      predictedHoursToDanger: row.danger_hours_remaining === null ? null : Number(row.danger_hours_remaining),
      predictedHoursToOverflow: row.overflow_hours_remaining === null ? null : Number(row.overflow_hours_remaining),
      assignedTo: row.assigned_to, assignedOfficer: row.assigned_officer,
      priority, priorityScore: score, urgencyFactors: factors,
      estimatedCollectionLiters: Math.max(0, Math.round(Number(row.capacity_liters) * (fillLevel ?? 0) / 100)),
    };
  });
};

export const getAvailableDrivers = async (): Promise<Array<{ id: string; name: string }>> =>
  (await pool.query<{ id: string; name: string }>(
    `SELECT id, full_name AS name FROM users
     WHERE role='MAINTENANCE_OFFICER' ORDER BY full_name`,
  )).rows;
