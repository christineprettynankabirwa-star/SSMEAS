import { pool } from "../config/database";

export interface PredictionReading {
  level: number;
  recorded_at: Date;
}

export const getPredictionReadings = async (tankId: string): Promise<PredictionReading[]> => {
  const result = await pool.query<PredictionReading>(
    `SELECT level, recorded_at
     FROM sensor_readings
     WHERE tank_id = $1 AND level IS NOT NULL
     ORDER BY recorded_at DESC
     LIMIT 100`,
    [tankId],
  );
  return result.rows.reverse();
};
