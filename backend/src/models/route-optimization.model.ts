import { pool } from "../config/database";
import type { RouteCandidate } from "../types/route-optimization.types";

interface RouteRow {
  tank_id: string; tank_name: string; location: string; latitude: number;
  longitude: number; task: string; scheduled_for: Date;
}

export const getOpenMaintenanceStops = async (): Promise<RouteCandidate[]> => {
  const result = await pool.query<RouteRow>(
    `SELECT DISTINCT ON (maintenance.tank_id)
       maintenance.tank_id, tank.tank_name, tank.location, tank.latitude, tank.longitude,
       maintenance.task, maintenance.scheduled_for
     FROM maintenance
     INNER JOIN tanks AS tank ON tank.id = maintenance.tank_id
     WHERE maintenance.status IN ('SCHEDULED', 'IN_PROGRESS')
     ORDER BY maintenance.tank_id, maintenance.scheduled_for ASC`,
  );
  return result.rows.map((row) => ({
    tankId: row.tank_id, tankName: row.tank_name, location: row.location,
    latitude: Number(row.latitude), longitude: Number(row.longitude),
    task: row.task, scheduledFor: new Date(row.scheduled_for),
  }));
};
