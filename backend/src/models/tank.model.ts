// Isolates all PostgreSQL access required by the tank management module.
import { pool } from "../config/database";
import type { CreateTankRequest, Tank, UpdateTankRequest } from "../types/tank";

const publicTankColumns = `
  id, tank_name, owner_name, owner_user_id, location, latitude, longitude,
  capacity_liters, status, thingspeak_channel_id, hardware_id,
  warning_fill_threshold, critical_fill_threshold, created_at, updated_at`;

export const createTank = async (tank: CreateTankRequest): Promise<Tank> => {
  const result = await pool.query<Tank>(
    `INSERT INTO tanks (
      tank_name, owner_name, location, latitude, longitude, capacity_liters, status,
      thingspeak_channel_id, thingspeak_read_api_key, owner_user_id, hardware_id,
      warning_fill_threshold, critical_fill_threshold
    ) VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'ACTIVE'), $8, $9, $10, $11, COALESCE($12, 80), COALESCE($13, 95))
    RETURNING ${publicTankColumns}`,
    [
      tank.tank_name,
      tank.owner_name,
      tank.location,
      tank.latitude,
      tank.longitude,
      tank.capacity_liters,
      tank.status ?? null,
      tank.thingspeak_channel_id ?? null,
      tank.thingspeak_read_api_key ?? null,
      tank.owner_user_id ?? null,
      tank.hardware_id ?? null,
      tank.warning_fill_threshold ?? null,
      tank.critical_fill_threshold ?? null,
    ],
  );

  return result.rows[0]!;
};

export const getAllTanks = async (): Promise<Tank[]> => {
  // Keep the newest configured asset when legacy/imported rows share a display
  // name. The outer sort preserves the normal newest-first API ordering.
  const result = await pool.query<Tank>(
    `SELECT * FROM (
       SELECT DISTINCT ON (LOWER(BTRIM(tank_name))) *
       FROM tanks
       ORDER BY LOWER(BTRIM(tank_name)), created_at DESC, id DESC
     ) AS unique_tanks
     ORDER BY created_at DESC, id DESC`,
  );
  return result.rows;
};

export const getAssignedTanks = async (officerId: string): Promise<Tank[]> =>
  (await pool.query<Tank>(
    `SELECT * FROM (
       SELECT DISTINCT ON (LOWER(BTRIM(tank.tank_name))) tank.*
       FROM tanks tank
       WHERE EXISTS (
         SELECT 1 FROM maintenance
         WHERE maintenance.tank_id=tank.id AND maintenance.assigned_to=$1
           AND maintenance.status IN ('SCHEDULED','ASSIGNED','IN_PROGRESS')
       )
       ORDER BY LOWER(BTRIM(tank.tank_name)), tank.created_at DESC, tank.id DESC
     ) AS unique_tanks
     ORDER BY created_at DESC, id DESC`,
    [officerId],
  )).rows;

export const getTankById = async (id: string): Promise<Tank | null> => {
  const result = await pool.query<Tank>(`SELECT ${publicTankColumns} FROM tanks WHERE id = $1`, [id]);
  return result.rows[0] ?? null;
};

export const updateTank = async (
  id: string,
  tank: UpdateTankRequest,
): Promise<Tank | null> => {
  const fields = Object.entries(tank).filter(([, value]) => value !== undefined);
  const setClause = fields
    .map(([field], index) => `"${field}" = $${index + 1}`)
    .join(", ");
  const values = fields.map(([, value]) => value);

  const result = await pool.query<Tank>(
    `UPDATE tanks
     SET ${setClause}, updated_at = CURRENT_TIMESTAMP
     WHERE id = $${values.length + 1}
     RETURNING ${publicTankColumns}`,
    [...values, id],
  );

  return result.rows[0] ?? null;
};

export const deleteTank = async (id: string): Promise<boolean> => {
  const result = await pool.query("DELETE FROM tanks WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
};
