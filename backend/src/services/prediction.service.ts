import * as predictionModel from "../models/prediction.model";
import * as tankModel from "../models/tank.model";
import type { OverflowPrediction, OverflowRisk, PredictionApiResponse } from "../types/prediction.types";

export class PredictionValidationError extends Error {}
export class PredictionTankNotFoundError extends Error {}
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface TimedLevel { level: number; gasLevel?: number | null; recordedAt: Date }

export const calculateOverflowPrediction = (
  tankId: string,
  readings: TimedLevel[],
  now: Date = new Date(),
  recentAlertCount = 0,
): OverflowPrediction => {
  const valid = readings
    .filter(({ level, recordedAt }) => Number.isFinite(level) && !Number.isNaN(recordedAt.getTime()))
    .sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
  const currentLevel = valid.at(-1)?.level ?? null;
  const gasValues = valid.map(({ gasLevel }) => gasLevel).filter((value): value is number => value !== null && value !== undefined && Number.isFinite(value));
  const highestGas = gasValues.length ? Math.max(...gasValues) : 0;
  let slope = 0;
  let fit = 0;

  if (valid.length >= 2) {
    const origin = valid[0]!.recordedAt.getTime();
    const points = valid.map(({ level, recordedAt }) => ({ x: (recordedAt.getTime() - origin) / 3_600_000, y: level }));
    const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
    const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
    const denominator = points.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0);
    if (denominator > 0) {
      const numerator = points.reduce((sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0);
      slope = numerator / denominator;
      const totalVariation = points.reduce((sum, point) => sum + (point.y - meanY) ** 2, 0);
      const residualVariation = points.reduce((sum, point) => sum + (point.y - (meanY + slope * (point.x - meanX))) ** 2, 0);
      fit = totalVariation > 0 ? Math.max(0, 1 - residualVariation / totalVariation) : 1;
    }
  }

  const hoursUntilOverflow = currentLevel !== null && slope > 0
    ? Math.max(0, (100 - currentLevel) / slope)
    : null;
  const predictedOverflowAt = hoursUntilOverflow === null
    ? null
    : new Date(now.getTime() + hoursUntilOverflow * 3_600_000).toISOString();
  let risk: OverflowRisk = "LOW";
  if (currentLevel !== null && currentLevel >= 95) risk = "CRITICAL";
  else if (hoursUntilOverflow !== null && hoursUntilOverflow <= 6) risk = "CRITICAL";
  else if ((currentLevel ?? 0) >= 80 || (hoursUntilOverflow !== null && hoursUntilOverflow <= 24)) risk = "HIGH";
  else if ((currentLevel ?? 0) >= 60 || (hoursUntilOverflow !== null && hoursUntilOverflow <= 72)) risk = "MEDIUM";

  const levelRisk = Math.max(0, Math.min(100, currentLevel ?? 0));
  const timeRisk = hoursUntilOverflow === null ? 0 : Math.max(0, Math.min(100, 100 - hoursUntilOverflow * (100 / 72)));
  const trendRisk = Math.max(0, Math.min(100, slope * 20));
  const hazardousGasThreshold = Number(process.env.GAS_LEVEL_THRESHOLD ?? 300);
  const gasRisk = Math.max(0, Math.min(100, highestGas / Math.max(1, hazardousGasThreshold) * 100));
  const alertRisk = Math.min(100, recentAlertCount * 15);
  const riskPercentage = Math.round(Math.max(levelRisk, timeRisk, gasRisk, alertRisk, levelRisk * 0.7 + trendRisk * 0.3));
  if (riskPercentage >= 90) risk = "CRITICAL";
  else if (riskPercentage >= 75) risk = "HIGH";
  else if (riskPercentage >= 60) risk = "MEDIUM";
  else risk = "LOW";
  const latestAgeHours = valid.length === 0 ? Number.POSITIVE_INFINITY : Math.max(0, (now.getTime() - valid.at(-1)!.recordedAt.getTime()) / 3_600_000);
  const sampleScore = Math.min(1, valid.length / 20);
  const recencyScore = Math.max(0, 1 - latestAgeHours / 24);
  const confidence = Math.round(100 * (sampleScore * 0.45 + fit * 0.4 + recencyScore * 0.15));
  const recommendedMaintenanceAt = predictedOverflowAt
    ? new Date(Math.max(now.getTime(), new Date(predictedOverflowAt).getTime() - 6 * 3_600_000)).toISOString()
    : gasRisk >= 100 || recentAlertCount >= 3
      ? now.toISOString()
      : riskPercentage >= 60
        ? new Date(now.getTime() + 24 * 3_600_000).toISOString()
        : null;

  return {
    tankId,
    currentLevel,
    trendPercentPerHour: Number(slope.toFixed(3)),
    predictedOverflowAt,
    recommendedMaintenanceAt,
    hoursUntilOverflow: hoursUntilOverflow === null ? null : Number(hoursUntilOverflow.toFixed(2)),
    risk,
    riskPercentage,
    confidence,
    samples: valid.length,
    generatedAt: now.toISOString(),
  };
};

const toApiResponse = (prediction: OverflowPrediction): PredictionApiResponse => ({
  tank_id: prediction.tankId,
  predicted_overflow_time: prediction.predictedOverflowAt,
  hours_remaining: prediction.hoursUntilOverflow,
  risk: prediction.riskPercentage,
  confidence: prediction.confidence,
  recommended_maintenance_date: prediction.recommendedMaintenanceAt,
});

export const predictAllOverflows = async (): Promise<PredictionApiResponse[]> => {
  const [readings, alertCounts] = await Promise.all([predictionModel.getAllPredictionReadings(), predictionModel.getRecentAlertCounts()]);
  const grouped = new Map<string, TimedLevel[]>();
  readings.forEach((reading) => {
    if (!reading.tank_id) return;
    const values = grouped.get(reading.tank_id) ?? [];
    values.push({ level: Number(reading.level), gasLevel: reading.gas_level === null ? null : Number(reading.gas_level), recordedAt: new Date(reading.recorded_at) });
    grouped.set(reading.tank_id, values);
  });
  const tanks = await tankModel.getAllTanks();
  const now = new Date();
  return tanks.map((tank) => toApiResponse(calculateOverflowPrediction(tank.id, grouped.get(tank.id) ?? [], now, alertCounts.get(tank.id) ?? 0)));
};

export const predictOverflow = async (tankId: string): Promise<OverflowPrediction> => {
  if (!uuidPattern.test(tankId)) throw new PredictionValidationError("tankId must be a valid UUID.");
  if (!(await tankModel.getTankById(tankId))) throw new PredictionTankNotFoundError("Tank not found.");
  const [readings, alertCounts] = await Promise.all([predictionModel.getPredictionReadings(tankId), predictionModel.getRecentAlertCounts()]);
  return calculateOverflowPrediction(
    tankId,
    readings.map(({ level, gas_level, recorded_at }) => ({ level: Number(level), gasLevel: gas_level === null ? null : Number(gas_level), recordedAt: new Date(recorded_at) })),
    new Date(),
    alertCounts.get(tankId) ?? 0,
  );
};
