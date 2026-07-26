import { pool } from "../config/database";

export interface PredictionReading {
  tank_id?: string;
  level: number;
  gas_level: number | null;
  recorded_at: Date;
}

export const getPredictionReadings = async (tankId: string): Promise<PredictionReading[]> => {
  const result = await pool.query<PredictionReading>(
    `SELECT level, gas_level, recorded_at
     FROM sensor_readings
     WHERE tank_id = $1 AND level IS NOT NULL
     ORDER BY recorded_at DESC
     LIMIT 10`,
    [tankId],
  );
  return result.rows.reverse();
};

export const getAllPredictionReadings = async (): Promise<PredictionReading[]> => {
  const result = await pool.query<PredictionReading>(
    `SELECT tank_id, level, gas_level, recorded_at
     FROM (
       SELECT tank_id, level, gas_level, recorded_at,
              ROW_NUMBER() OVER (PARTITION BY tank_id ORDER BY recorded_at DESC) AS position
       FROM sensor_readings
       WHERE level IS NOT NULL
     ) recent
     WHERE position <= 10
     ORDER BY tank_id, recorded_at ASC`,
  );
  return result.rows;
};

export interface StoredPrediction {
  tankId: string;
  predictedMinutesToFull: number | null;
  predictedOverflowAt: string | null;
  averageIncreasePerMinute: number;
  currentLevel: number | null;
  sampleCount: number;
  calculatedAt: string;
}

export const storePrediction = async (prediction: StoredPrediction): Promise<void> => {
  await pool.query(
    `INSERT INTO overflow_predictions(
       tank_id, predicted_minutes_to_full, predicted_overflow_at,
       average_increase_per_minute, current_level, sample_count, calculated_at
     ) VALUES($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT(tank_id) DO UPDATE SET
       predicted_minutes_to_full=EXCLUDED.predicted_minutes_to_full,
       predicted_overflow_at=EXCLUDED.predicted_overflow_at,
       average_increase_per_minute=EXCLUDED.average_increase_per_minute,
       current_level=EXCLUDED.current_level,
       sample_count=EXCLUDED.sample_count,
       calculated_at=EXCLUDED.calculated_at`,
    [
      prediction.tankId, prediction.predictedMinutesToFull, prediction.predictedOverflowAt,
      prediction.averageIncreasePerMinute, prediction.currentLevel,
      prediction.sampleCount, prediction.calculatedAt,
    ],
  );
};

export const getRecentAlertCounts = async (): Promise<Map<string, number>> => {
  const result = await pool.query<{ tank_id: string; count: number }>(
    `SELECT tank_id, COUNT(*)::int AS count
     FROM alerts
     WHERE created_at >= NOW() - INTERVAL '30 days'
     GROUP BY tank_id`,
  );
  return new Map(result.rows.map((row) => [row.tank_id, row.count]));
};
