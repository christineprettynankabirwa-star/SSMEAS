import { pool } from "../config/database";
import type {
  PredictionEvaluation, PredictionHistoryRecord, PredictionQualityStatus,
  PredictionStatus, ThresholdProjection,
} from "../types/prediction.types";

export interface PredictionReading {
  tank_id?: string;
  level: number;
  gas_level: number | null;
  recorded_at: Date;
}

export const getPredictionReadings = async (tankId: string): Promise<PredictionReading[]> => {
  const result = await pool.query<PredictionReading>(
    `SELECT level, gas_level, recorded_at FROM sensor_readings
     WHERE tank_id=$1 AND level IS NOT NULL
     ORDER BY recorded_at DESC LIMIT 20`,
    [tankId],
  );
  return result.rows.reverse();
};

export const getAllPredictionReadings = async (): Promise<PredictionReading[]> =>
  (await pool.query<PredictionReading>(
    `SELECT tank_id, level, gas_level, recorded_at FROM (
       SELECT tank_id, level, gas_level, recorded_at,
         ROW_NUMBER() OVER (PARTITION BY tank_id ORDER BY recorded_at DESC) AS position
       FROM sensor_readings WHERE level IS NOT NULL
     ) recent WHERE position<=20 ORDER BY tank_id, recorded_at ASC`,
  )).rows;

export interface StoredPrediction {
  tankId: string;
  fillVelocityPercentPerHour: number;
  currentLevel: number | null;
  currentVolumeCubicMeters: number | null;
  remainingVolumeCubicMeters: number | null;
  warning: ThresholdProjection;
  danger: ThresholdProjection;
  overflow: ThresholdProjection;
  predictionStatus: PredictionStatus;
  qualityStatus: PredictionQualityStatus;
  regressionRSquared: number;
  fillingCycleStartedAt: string | null;
  confidence: number;
  sampleCount: number;
  calculatedAt: string;
}

export const storePrediction = async (prediction: StoredPrediction): Promise<void> => {
  await pool.query(
    `INSERT INTO overflow_predictions(
       tank_id, fill_velocity_percent_per_hour, current_level,
       current_volume_cubic_meters, remaining_volume_cubic_meters,
       warning_arrival_at, warning_hours_remaining, danger_arrival_at, danger_hours_remaining,
       predicted_overflow_at, overflow_hours_remaining, prediction_status,
       prediction_quality_status, confidence, sample_count, calculated_at
     ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     ON CONFLICT(tank_id) DO UPDATE SET
       fill_velocity_percent_per_hour=EXCLUDED.fill_velocity_percent_per_hour,
       current_level=EXCLUDED.current_level,
       current_volume_cubic_meters=EXCLUDED.current_volume_cubic_meters,
       remaining_volume_cubic_meters=EXCLUDED.remaining_volume_cubic_meters,
       warning_arrival_at=EXCLUDED.warning_arrival_at,
       warning_hours_remaining=EXCLUDED.warning_hours_remaining,
       danger_arrival_at=EXCLUDED.danger_arrival_at,
       danger_hours_remaining=EXCLUDED.danger_hours_remaining,
       predicted_overflow_at=EXCLUDED.predicted_overflow_at,
       overflow_hours_remaining=EXCLUDED.overflow_hours_remaining,
       prediction_status=EXCLUDED.prediction_status,
       prediction_quality_status=EXCLUDED.prediction_quality_status,
       confidence=EXCLUDED.confidence,
       sample_count=EXCLUDED.sample_count,
       calculated_at=EXCLUDED.calculated_at`,
    [
      prediction.tankId, prediction.fillVelocityPercentPerHour, prediction.currentLevel,
      prediction.currentVolumeCubicMeters, prediction.remainingVolumeCubicMeters,
      prediction.warning.estimatedArrivalAt, prediction.warning.remainingHours,
      prediction.danger.estimatedArrivalAt, prediction.danger.remainingHours,
      prediction.overflow.estimatedArrivalAt, prediction.overflow.remainingHours,
      prediction.predictionStatus, prediction.qualityStatus, prediction.confidence,
      prediction.sampleCount, prediction.calculatedAt,
    ],
  );
  await resolveActualArrivals(prediction.tankId);
  await Promise.all([prediction.warning, prediction.danger, prediction.overflow].map((projection) =>
    pool.query(
      `INSERT INTO prediction_history(
         tank_id, prediction_time, threshold_percent, forecast_at,
         regression_slope, regression_r_squared, interval_earliest_at, interval_latest_at,
         prediction_quality_status, sample_count, filling_cycle_started_at
       ) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        prediction.tankId, prediction.calculatedAt, projection.thresholdPercent,
        projection.estimatedArrivalAt, prediction.fillVelocityPercentPerHour,
        prediction.regressionRSquared, projection.predictionInterval95.earliestArrivalAt,
        projection.predictionInterval95.latestArrivalAt, prediction.qualityStatus,
        prediction.sampleCount, prediction.fillingCycleStartedAt,
      ],
    )));
};

export const resolveActualArrivals = async (tankId: string): Promise<void> => {
  await pool.query(
    `UPDATE prediction_history history
     SET actual_arrival_at=(
           SELECT MIN(reading.recorded_at) FROM sensor_readings reading
           WHERE reading.tank_id=history.tank_id
             AND reading.recorded_at>=history.prediction_time
             AND reading.level>=history.threshold_percent
         ),
         forecast_error_hours=EXTRACT(EPOCH FROM ((
           SELECT MIN(reading.recorded_at) FROM sensor_readings reading
           WHERE reading.tank_id=history.tank_id
             AND reading.recorded_at>=history.prediction_time
             AND reading.level>=history.threshold_percent
         )-history.forecast_at))/3600
     WHERE history.tank_id=$1
       AND history.actual_arrival_at IS NULL
       AND history.forecast_at IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM sensor_readings reading
         WHERE reading.tank_id=history.tank_id
           AND reading.recorded_at>=history.prediction_time
           AND reading.level>=history.threshold_percent
       )`,
    [tankId],
  );
};

export const getPredictionHistory = async (
  tankId?: string,
): Promise<PredictionHistoryRecord[]> =>
  (await pool.query<PredictionHistoryRecord>(
    `SELECT * FROM prediction_history
     WHERE ($1::uuid IS NULL OR tank_id=$1)
     ORDER BY prediction_time DESC, threshold_percent ASC
     LIMIT 1000`,
    [tankId ?? null],
  )).rows;

export const getPredictionEvaluation = async (tankId?: string): Promise<PredictionEvaluation> => {
  const row = (await pool.query<{
    evaluated_forecasts: number;
    mean_absolute_error_hours: number | null;
    root_mean_squared_error_hours: number | null;
  }>(
    `SELECT COUNT(*)::int AS evaluated_forecasts,
       AVG(ABS(forecast_error_hours))::float AS mean_absolute_error_hours,
       SQRT(AVG(POWER(forecast_error_hours,2)))::float AS root_mean_squared_error_hours
     FROM prediction_history
     WHERE forecast_error_hours IS NOT NULL
       AND ($1::uuid IS NULL OR tank_id=$1)`,
    [tankId ?? null],
  )).rows[0]!;
  return {
    evaluatedForecasts: row.evaluated_forecasts,
    meanAbsoluteErrorHours: row.mean_absolute_error_hours,
    rootMeanSquaredErrorHours: row.root_mean_squared_error_hours,
  };
};

export const getRecentAlertCounts = async (): Promise<Map<string, number>> => {
  const result = await pool.query<{ tank_id: string; count: number }>(
    `SELECT tank_id, COUNT(*)::int AS count FROM alerts
     WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY tank_id`,
  );
  return new Map(result.rows.map((row) => [row.tank_id, row.count]));
};
