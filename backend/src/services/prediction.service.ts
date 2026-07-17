import * as predictionModel from "../models/prediction.model";
import * as tankModel from "../models/tank.model";
import type { OverflowPrediction, OverflowRisk } from "../types/prediction.types";

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

  if (valid.length >= 2) {
    const origin = valid[0]!.recordedAt.getTime();
    const points = valid.map(({ level, recordedAt }) => ({ x: (recordedAt.getTime() - origin) / 3_600_000, y: level }));
    const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
    const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
    const denominator = points.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0);
    if (denominator > 0) slope = points.reduce((sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0) / denominator;
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

  return {
    tankId,
    currentLevel,
    trendPercentPerHour: Number(slope.toFixed(3)),
    predictedOverflowAt,
    hoursUntilOverflow: hoursUntilOverflow === null ? null : Number(hoursUntilOverflow.toFixed(2)),
    risk,
    confidence: Math.min(100, valid.length * 10),
    samples: valid.length,
    generatedAt: now.toISOString(),
  };
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
