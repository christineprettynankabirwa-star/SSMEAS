import { pool } from "../config/database";

export interface PredictionReading {
  tank_id?: string;
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

export const getAllPredictionReadings = async (): Promise<PredictionReading[]> => {
  const result = await pool.query<PredictionReading>(
    `SELECT tank_id, level, recorded_at
     FROM (
       SELECT tank_id, level, recorded_at,
              ROW_NUMBER() OVER (PARTITION BY tank_id ORDER BY recorded_at DESC) AS position
       FROM sensor_readings
       WHERE level IS NOT NULL
     ) recent
     WHERE position <= 100
     ORDER BY tank_id, recorded_at ASC`,
  );
  return result.rows;
};
