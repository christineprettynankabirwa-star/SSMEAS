// Isolates all PostgreSQL access required by the tank management module.
import { pool } from "../config/database";
import type { CreateTankRequest, Tank, UpdateTankRequest } from "../types/tank";

export const createTank = async (tank: CreateTankRequest): Promise<Tank> => {
  const result = await pool.query<Tank>(
    `INSERT INTO tanks (
      tank_name, owner_name, location, latitude, longitude, capacity_liters, status,
      thingspeak_channel_id, thingspeak_read_api_key, owner_user_id
    ) VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, 'ACTIVE'), $8, $9, $10)
    RETURNING *`,
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
    ],
  );

  return result.rows[0]!;
};

export const getAllTanks = async (): Promise<Tank[]> => {
  const result = await pool.query<Tank>("SELECT * FROM tanks ORDER BY created_at DESC");
  return result.rows;
};

export const getAssignedTanks = async (officerId: string): Promise<Tank[]> =>
  (await pool.query<Tank>(
    `SELECT DISTINCT tank.* FROM tanks tank
     JOIN maintenance ON maintenance.tank_id=tank.id
     WHERE maintenance.assigned_to=$1
       AND maintenance.status IN ('SCHEDULED','ASSIGNED','IN_PROGRESS')
     ORDER BY tank.created_at DESC`,
    [officerId],
  )).rows;

export const getTankById = async (id: string): Promise<Tank | null> => {
  const result = await pool.query<Tank>("SELECT * FROM tanks WHERE id = $1", [id]);
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
     RETURNING *`,
    [...values, id],
  );

  return result.rows[0] ?? null;
};

export const deleteTank = async (id: string): Promise<boolean> => {
  const result = await pool.query("DELETE FROM tanks WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
};
