import * as predictionModel from "../models/prediction.model";
import * as tankModel from "../models/tank.model";
import type { OverflowPrediction, OverflowRisk, PredictionApiResponse } from "../types/prediction.types";

export class PredictionValidationError extends Error {}
export class PredictionTankNotFoundError extends Error {}
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface TimedLevel { level: number; recordedAt: Date }

export const calculateOverflowPrediction = (
  tankId: string,
  readings: TimedLevel[],
  now: Date = new Date(),
): OverflowPrediction => {
  const valid = readings
    .filter(({ level, recordedAt }) => Number.isFinite(level) && !Number.isNaN(recordedAt.getTime()))
    .sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
  const currentLevel = valid.at(-1)?.level ?? null;
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
  const riskPercentage = Math.round(Math.max(levelRisk, timeRisk, levelRisk * 0.7 + trendRisk * 0.3));
  const latestAgeHours = valid.length === 0 ? Number.POSITIVE_INFINITY : Math.max(0, (now.getTime() - valid.at(-1)!.recordedAt.getTime()) / 3_600_000);
  const sampleScore = Math.min(1, valid.length / 20);
  const recencyScore = Math.max(0, 1 - latestAgeHours / 24);
  const confidence = Math.round(100 * (sampleScore * 0.45 + fit * 0.4 + recencyScore * 0.15));

  return {
    tankId,
    currentLevel,
    trendPercentPerHour: Number(slope.toFixed(3)),
    predictedOverflowAt,
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
});

export const predictAllOverflows = async (): Promise<PredictionApiResponse[]> => {
  const readings = await predictionModel.getAllPredictionReadings();
  const grouped = new Map<string, TimedLevel[]>();
  readings.forEach((reading) => {
    if (!reading.tank_id) return;
    const values = grouped.get(reading.tank_id) ?? [];
    values.push({ level: Number(reading.level), recordedAt: new Date(reading.recorded_at) });
    grouped.set(reading.tank_id, values);
  });
  const tanks = await tankModel.getAllTanks();
  const now = new Date();
  return tanks.map((tank) => toApiResponse(calculateOverflowPrediction(tank.id, grouped.get(tank.id) ?? [], now)));
};

export const predictOverflow = async (tankId: string): Promise<OverflowPrediction> => {
  if (!uuidPattern.test(tankId)) throw new PredictionValidationError("tankId must be a valid UUID.");
  if (!(await tankModel.getTankById(tankId))) throw new PredictionTankNotFoundError("Tank not found.");
  const readings = await predictionModel.getPredictionReadings(tankId);
  return calculateOverflowPrediction(
    tankId,
    readings.map(({ level, recorded_at }) => ({ level: Number(level), recordedAt: new Date(recorded_at) })),
  );
};
