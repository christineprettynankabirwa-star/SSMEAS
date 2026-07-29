import * as predictionModel from "../models/prediction.model";
import * as tankModel from "../models/tank.model";
import type {
  OverflowPrediction, OverflowRisk, PredictionApiResponse, PredictionStatus, ThresholdProjection,
} from "../types/prediction.types";
import { alertThresholdConfig } from "../config/alert-thresholds";

export class PredictionValidationError extends Error {}
export class PredictionTankNotFoundError extends Error {}
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;

export interface TimedLevel { level: number; gasLevel?: number | null; recordedAt: Date }

const projection = (
  thresholdPercent: 65 | 85 | 100,
  currentLevel: number | null,
  slopePercentPerHour: number,
  sampleCount: number,
  now: Date,
): ThresholdProjection => {
  let status: PredictionStatus;
  let remainingHours: number | null = null;
  if (currentLevel === null || sampleCount < 2) status = "INSUFFICIENT_DATA";
  else if (currentLevel >= thresholdPercent) {
    status = "THRESHOLD_REACHED";
    remainingHours = 0;
  } else if (slopePercentPerHour <= 0) status = "STABLE_OR_FALLING";
  else {
    status = "PROJECTED";
    remainingHours = Math.max(0, (thresholdPercent - currentLevel) / slopePercentPerHour);
  }
  return {
    thresholdPercent,
    remainingHours: remainingHours === null ? null : Number(remainingHours.toFixed(2)),
    estimatedArrivalAt: remainingHours === null
      ? null
      : new Date(now.getTime() + remainingHours * 3_600_000).toISOString(),
    status,
  };
};

// Predictive Analytics & Risk Engine. Operational forecasts use only timestamp-aware OLS regression.
export const calculateOverflowPrediction = (
  tankId: string,
  capacityLiters: number,
  readings: TimedLevel[],
  now: Date = new Date(),
  recentAlertCount = 0,
): OverflowPrediction => {
  const valid = readings
    .filter(({ level, recordedAt }) =>
      Number.isFinite(level) && level >= 0 && level <= 100 && !Number.isNaN(recordedAt.getTime()))
    .sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
  const currentLevel = valid.at(-1)?.level ?? null;
  let slope = 0;
  let fit = 0;

  if (valid.length >= 2) {
    const origin = valid[0]!.recordedAt.getTime();
    const points = valid.map(({ level, recordedAt }) => ({
      x: (recordedAt.getTime() - origin) / 3_600_000,
      y: level,
    }));
    const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
    const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
    const denominator = points.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0);
    if (denominator > 0) {
      slope = points.reduce(
        (sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0,
      ) / denominator;
      const totalVariation = points.reduce((sum, point) => sum + (point.y - meanY) ** 2, 0);
      const residualVariation = points.reduce(
        (sum, point) => sum + (point.y - (meanY + slope * (point.x - meanX))) ** 2, 0,
      );
      fit = totalVariation > 0 ? Math.max(0, 1 - residualVariation / totalVariation) : 1;
    }
  }

  const elapsedHours = valid.length >= 2
    ? (valid.at(-1)!.recordedAt.getTime() - valid[0]!.recordedAt.getTime()) / 3_600_000
    : 0;
  const diagnosticEndpointRatePercentPerHour = elapsedHours > 0
    ? (valid.at(-1)!.level - valid[0]!.level) / elapsedHours
    : 0;
  const warningProjection = projection(65, currentLevel, slope, valid.length, now);
  const dangerProjection = projection(85, currentLevel, slope, valid.length, now);
  const overflowProjection = projection(100, currentLevel, slope, valid.length, now);
  const remainingCapacityPercent = currentLevel === null ? null : Math.max(0, 100 - currentLevel);
  const remainingCapacityCubicMeters = remainingCapacityPercent === null
    ? null
    : Math.max(0, capacityLiters) * remainingCapacityPercent / 100 / 1_000;

  const gasValues = valid.map(({ gasLevel }) => gasLevel)
    .filter((value): value is number => value !== null && value !== undefined && Number.isFinite(value));
  const highestGas = gasValues.length ? Math.max(...gasValues) : 0;
  const levelRisk = Math.max(0, Math.min(100, currentLevel ?? 0));
  const dangerHours = dangerProjection.remainingHours;
  const timeRisk = dangerHours === null ? 0 : Math.max(0, Math.min(100, 100 - dangerHours * (100 / 72)));
  const trendRisk = Math.max(0, Math.min(100, Math.max(0, slope) * 20));
  const hazardousGasThreshold = Number(process.env.GAS_LEVEL_THRESHOLD ?? 300);
  const gasRisk = Math.max(0, Math.min(100, highestGas / Math.max(1, hazardousGasThreshold) * 100));
  const alertRisk = Math.min(100, recentAlertCount * 15);
  const riskPercentage = Math.round(
    Math.max(levelRisk, timeRisk, gasRisk, alertRisk, levelRisk * 0.7 + trendRisk * 0.3),
  );
  let risk: OverflowRisk = riskPercentage >= 90 ? "CRITICAL"
    : riskPercentage >= 75 ? "HIGH" : riskPercentage >= 60 ? "MEDIUM" : "LOW";
  if ((currentLevel ?? 0) >= alertThresholdConfig.sewageLevel.dangerMinimum) risk = "CRITICAL";

  const latestAgeHours = valid.length === 0
    ? Number.POSITIVE_INFINITY
    : Math.max(0, (now.getTime() - valid.at(-1)!.recordedAt.getTime()) / 3_600_000);
  const sampleScore = Math.min(1, valid.length / 20);
  const recencyScore = Math.max(0, 1 - latestAgeHours / 24);
  const confidence = Math.round(100 * (sampleScore * 0.45 + fit * 0.4 + recencyScore * 0.15));
  const recommendedMaintenanceAt = dangerProjection.estimatedArrivalAt
    ? new Date(Math.max(now.getTime(), new Date(dangerProjection.estimatedArrivalAt).getTime() - 6 * 3_600_000)).toISOString()
    : gasRisk >= 100 || recentAlertCount >= 3 ? now.toISOString()
      : riskPercentage >= 60 ? new Date(now.getTime() + 24 * 3_600_000).toISOString() : null;

  return {
    tankId, currentLevel,
    fillVelocityPercentPerHour: Number(slope.toFixed(3)),
    historicalAverageDailyIncrease: Number((slope * 24).toFixed(3)),
    diagnosticEndpointRatePercentPerHour: Number(diagnosticEndpointRatePercentPerHour.toFixed(3)),
    remainingCapacityPercent: remainingCapacityPercent === null ? null : Number(remainingCapacityPercent.toFixed(2)),
    remainingCapacityCubicMeters: remainingCapacityCubicMeters === null ? null : Number(remainingCapacityCubicMeters.toFixed(3)),
    warningProjection, dangerProjection, overflowProjection,
    recommendedMaintenanceAt, risk, riskPercentage, confidence,
    samples: valid.length, generatedAt: now.toISOString(),
  };
};

const toApiResponse = (prediction: OverflowPrediction): PredictionApiResponse => ({
  tank_id: prediction.tankId,
  current_level: prediction.currentLevel,
  fill_velocity_percent_per_hour: prediction.fillVelocityPercentPerHour,
  historical_average_daily_increase: prediction.historicalAverageDailyIncrease,
  remaining_capacity_percent: prediction.remainingCapacityPercent,
  remaining_capacity_cubic_meters: prediction.remainingCapacityCubicMeters,
  warning_projection: prediction.warningProjection,
  danger_projection: prediction.dangerProjection,
  overflow_projection: prediction.overflowProjection,
  risk: prediction.riskPercentage,
  risk_level: prediction.risk,
  confidence: prediction.confidence,
  recommended_maintenance_date: prediction.recommendedMaintenanceAt,
  samples: prediction.samples,
  generated_at: prediction.generatedAt,
});

const persist = (prediction: OverflowPrediction) => predictionModel.storePrediction({
  tankId: prediction.tankId,
  fillVelocityPercentPerHour: prediction.fillVelocityPercentPerHour,
  currentLevel: prediction.currentLevel,
  warning: prediction.warningProjection,
  danger: prediction.dangerProjection,
  overflow: prediction.overflowProjection,
  predictionStatus: prediction.overflowProjection.status,
  confidence: prediction.confidence,
  sampleCount: prediction.samples,
  calculatedAt: prediction.generatedAt,
});

export const predictAllOverflows = async (): Promise<PredictionApiResponse[]> => {
  const [readings, alertCounts, tanks] = await Promise.all([
    predictionModel.getAllPredictionReadings(), predictionModel.getRecentAlertCounts(), tankModel.getAllTanks(),
  ]);
  const grouped = new Map<string, TimedLevel[]>();
  readings.forEach((reading) => {
    if (!reading.tank_id) return;
    const values = grouped.get(reading.tank_id) ?? [];
    values.push({
      level: Number(reading.level),
      gasLevel: reading.gas_level === null ? null : Number(reading.gas_level),
      recordedAt: new Date(reading.recorded_at),
    });
    grouped.set(reading.tank_id, values);
  });
  const now = new Date();
  const predictions = tanks.map((tank) => calculateOverflowPrediction(
    tank.id, Number(tank.capacity_liters), grouped.get(tank.id) ?? [], now, alertCounts.get(tank.id) ?? 0,
  ));
  await Promise.all(predictions.map(persist));
  return predictions.map(toApiResponse);
};

export const predictOverflow = async (tankId: string): Promise<OverflowPrediction> => {
  if (!uuidPattern.test(tankId)) throw new PredictionValidationError("tankId must be a valid UUID.");
  const tank = await tankModel.getTankById(tankId);
  if (!tank) throw new PredictionTankNotFoundError("Tank not found.");
  const [readings, alertCounts] = await Promise.all([
    predictionModel.getPredictionReadings(tankId), predictionModel.getRecentAlertCounts(),
  ]);
  const prediction = calculateOverflowPrediction(
    tankId, Number(tank.capacity_liters),
    readings.map(({ level, gas_level, recorded_at }) => ({
      level: Number(level), gasLevel: gas_level === null ? null : Number(gas_level),
      recordedAt: new Date(recorded_at),
    })),
    new Date(), alertCounts.get(tankId) ?? 0,
  );
  await persist(prediction);
  return prediction;
};
