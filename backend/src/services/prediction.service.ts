import * as predictionModel from "../models/prediction.model";
import * as tankModel from "../models/tank.model";
import { predictiveAnalyticsConfig } from "../config/predictive-analytics";
import type {
  DataQualityIssue, OverflowPrediction, OverflowRisk, PredictionApiResponse,
  PredictionQualityStatus, PredictionStatus, ThresholdProjection,
} from "../types/prediction.types";

export class PredictionValidationError extends Error {}
export class PredictionTankNotFoundError extends Error {}
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface TimedLevel { level: number; gasLevel?: number | null; recordedAt: Date }

interface RegressionResult {
  slope: number;
  fit: number;
  slopeStandardError: number | null;
}

const median = (values: number[]): number => {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle]! : (ordered[middle - 1]! + ordered[middle]!) / 2;
};

const smoothCycle = (readings: TimedLevel[]): TimedLevel[] => {
  const window = Math.max(1, Math.floor(predictiveAnalyticsConfig.dataQuality.smoothingWindow));
  const radius = Math.floor(window / 2);
  return readings.map((reading, index) => ({
    ...reading,
    level: index < radius || index + radius >= readings.length ? reading.level : median(
      readings.slice(index - radius, index + radius + 1).map(({ level }) => level),
    ),
  }));
};

const prepareCurrentFillingCycle = (
  readings: TimedLevel[], now: Date,
): { cycle: TimedLevel[]; currentLevel: number | null; issues: DataQualityIssue[] } => {
  const issues = new Set<DataQualityIssue>();
  const unique = new Set<string>();
  const accepted: TimedLevel[] = [];
  const ordered = [...readings].sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());

  for (const reading of ordered) {
    const timestamp = reading.recordedAt.getTime();
    if (Number.isNaN(timestamp) || timestamp > now.getTime()) {
      issues.add("FUTURE_TIMESTAMP");
      continue;
    }
    if (!Number.isFinite(reading.level) || reading.level < 0 || reading.level > 100) {
      issues.add("INVALID_LEVEL");
      continue;
    }
    // Sewage forecasting is deliberately level-only. Gas telemetry is a
    // separate signal and must never reject or weight a sewage sample.
    const duplicateKey = `${timestamp}|${reading.level}`;
    if (unique.has(duplicateKey)) {
      issues.add("DUPLICATE_READING");
      continue;
    }
    unique.add(duplicateKey);
    const previous = accepted.at(-1);
    if (previous) {
      const minutes = (timestamp - previous.recordedAt.getTime()) / 60_000;
      if (minutes > predictiveAnalyticsConfig.dataQuality.communicationGapMinutes) {
        issues.add("COMMUNICATION_GAP");
      }
      const change = reading.level - previous.level;
      if (change <= -predictiveAnalyticsConfig.dataQuality.emptyingDropPercent) {
        issues.add("EMPTYING_EVENT");
        accepted.length = 0;
      } else if (minutes > 0
        && Math.abs(change / minutes) > predictiveAnalyticsConfig.dataQuality.maximumLevelChangePercentPerMinute) {
        issues.add("IMPOSSIBLE_OSCILLATION");
        continue;
      }
    }
    accepted.push(reading);
  }

  const latest = accepted.at(-1);
  if (latest && now.getTime() - latest.recordedAt.getTime()
    > predictiveAnalyticsConfig.dataQuality.staleAfterMinutes * 60_000) {
    issues.add("STALE_READING");
  }
  return { cycle: smoothCycle(accepted), currentLevel: latest?.level ?? null, issues: [...issues] };
};

const regress = (readings: TimedLevel[]): RegressionResult => {
  if (readings.length < 2) return { slope: 0, fit: 0, slopeStandardError: null };
  const origin = readings[0]!.recordedAt.getTime();
  const points = readings.map(({ level, recordedAt }) => ({
    x: (recordedAt.getTime() - origin) / 3_600_000, y: level,
  }));
  const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  const denominator = points.reduce((sum, point) => sum + (point.x - meanX) ** 2, 0);
  if (denominator <= 0) return { slope: 0, fit: 0, slopeStandardError: null };
  const slope = points.reduce(
    (sum, point) => sum + (point.x - meanX) * (point.y - meanY), 0,
  ) / denominator;
  const residualVariation = points.reduce(
    (sum, point) => sum + (point.y - (meanY + slope * (point.x - meanX))) ** 2, 0,
  );
  const totalVariation = points.reduce((sum, point) => sum + (point.y - meanY) ** 2, 0);
  return {
    slope,
    fit: totalVariation > 0 ? Math.max(0, 1 - residualVariation / totalVariation) : 1,
    slopeStandardError: points.length > 2
      ? Math.sqrt((residualVariation / (points.length - 2)) / denominator)
      : null,
  };
};

const projection = (
  thresholdPercent: 65 | 85 | 100,
  currentLevel: number | null,
  regression: RegressionResult,
  sampleCount: number,
  now: Date,
): ThresholdProjection => {
  const minimumSamples = predictiveAnalyticsConfig.dataQuality.minimumSamples;
  let status: PredictionStatus;
  let remainingHours: number | null = null;
  if (currentLevel !== null && currentLevel >= thresholdPercent) {
    status = "THRESHOLD_REACHED";
    remainingHours = 0;
  } else if (currentLevel === null || sampleCount < minimumSamples) status = "INSUFFICIENT_DATA";
  else if (regression.slope <= 0) status = "STABLE_OR_FALLING";
  else {
    status = "PROJECTED";
    remainingHours = (thresholdPercent - currentLevel) / regression.slope;
  }

  const distance = currentLevel === null ? null : Math.max(0, thresholdPercent - currentLevel);
  const error = regression.slopeStandardError;
  const fastSlope = error === null ? regression.slope : regression.slope + 1.96 * error;
  const slowSlope = error === null ? regression.slope : regression.slope - 1.96 * error;
  const minimumHours = remainingHours === 0 ? 0
    : distance !== null && fastSlope > 0 && status === "PROJECTED" ? distance / fastSlope : null;
  const maximumHours = remainingHours === 0 ? 0
    : distance !== null && slowSlope > 0 && status === "PROJECTED" ? distance / slowSlope : null;
  const roundedHours = remainingHours === null ? null : Number(Math.max(0, remainingHours).toFixed(2));
  const roundedMinimum = minimumHours === null ? null : Number(Math.max(0, minimumHours).toFixed(2));
  const roundedMaximum = maximumHours === null ? null : Number(Math.max(0, maximumHours).toFixed(2));
  const arrival = (hours: number | null) => hours === null
    ? null : new Date(now.getTime() + hours * 3_600_000).toISOString();
  return {
    thresholdPercent,
    remainingHours: roundedHours,
    estimatedArrivalAt: arrival(roundedHours),
    status,
    predictionInterval95: {
      earliestArrivalAt: arrival(roundedMinimum),
      latestArrivalAt: arrival(roundedMaximum),
      minimumHours: roundedMinimum,
      maximumHours: roundedMaximum,
    },
  };
};

const qualityStatus = (
  samples: number, issues: DataQualityIssue[],
): PredictionQualityStatus => {
  if (samples < predictiveAnalyticsConfig.dataQuality.minimumSamples) return "INSUFFICIENT_DATA";
  if (issues.some((issue) => [
    "INVALID_LEVEL", "FUTURE_TIMESTAMP", "STALE_READING", "IMPOSSIBLE_OSCILLATION",
  ].includes(issue))) return "POOR";
  if (issues.some((issue) => ["DUPLICATE_READING", "COMMUNICATION_GAP"].includes(issue))) return "LIMITED";
  return "GOOD";
};

const riskFromDangerHours = (hours: number | null): OverflowRisk => {
  if (hours === null) return "UNKNOWN";
  const config = predictiveAnalyticsConfig.riskHoursToDanger;
  if (hours <= config.criticalMaximum) return "CRITICAL";
  if (hours <= config.highMaximum) return "HIGH";
  if (hours <= config.moderateMaximum) return "MODERATE";
  return "LOW";
};

// Stored telemetry is read-only here. Validation, cycle selection, and smoothing are in-memory only.
export const calculateOverflowPrediction = (
  tankId: string,
  capacityLiters: number,
  readings: TimedLevel[],
  now: Date = new Date(),
  _recentAlertCount = 0,
): OverflowPrediction => {
  const prepared = prepareCurrentFillingCycle(readings, now);
  const regression = regress(prepared.cycle);
  const currentLevel = prepared.currentLevel;
  const warningProjection = projection(65, currentLevel, regression, prepared.cycle.length, now);
  const dangerProjection = projection(85, currentLevel, regression, prepared.cycle.length, now);
  const overflowProjection = projection(100, currentLevel, regression, prepared.cycle.length, now);
  const remainingCapacityPercent = currentLevel === null ? null : Math.max(0, 100 - currentLevel);
  const capacityCubicMeters = Math.max(0, capacityLiters) / 1_000;
  const currentVolumeCubicMeters = currentLevel === null ? null : capacityCubicMeters * currentLevel / 100;
  const remainingCapacityCubicMeters = remainingCapacityPercent === null
    ? null : capacityCubicMeters * remainingCapacityPercent / 100;
  const elapsedHours = prepared.cycle.length >= 2
    ? (prepared.cycle.at(-1)!.recordedAt.getTime() - prepared.cycle[0]!.recordedAt.getTime()) / 3_600_000
    : 0;
  const diagnosticRate = elapsedHours > 0
    ? (prepared.cycle.at(-1)!.level - prepared.cycle[0]!.level) / elapsedHours : 0;
  const latestAgeHours = prepared.cycle.length
    ? Math.max(0, (now.getTime() - prepared.cycle.at(-1)!.recordedAt.getTime()) / 3_600_000)
    : Number.POSITIVE_INFINITY;
  const sampleScore = Math.min(1, prepared.cycle.length / 20);
  const recencyScore = Math.max(0, 1 - latestAgeHours / 24);
  const confidence = Math.round(100 * (sampleScore * 0.45 + regression.fit * 0.4 + recencyScore * 0.15));
  const predictionQualityStatus = qualityStatus(prepared.cycle.length, prepared.issues);
  const risk = riskFromDangerHours(dangerProjection.remainingHours);
  const safetyBufferHours = predictiveAnalyticsConfig.maintenanceRecommendation.safetyBufferHours;
  const recommendedAt = predictionQualityStatus !== "POOR"
    && predictionQualityStatus !== "INSUFFICIENT_DATA"
    && dangerProjection.estimatedArrivalAt
    ? new Date(Math.max(
      now.getTime(), new Date(dangerProjection.estimatedArrivalAt).getTime() - safetyBufferHours * 3_600_000,
    )).toISOString()
    : null;
  const recommendationReason = recommendedAt
    ? `Service before the projected 85% danger threshold, allowing a ${safetyBufferHours}-hour safety buffer.`
    : predictionQualityStatus === "POOR" || predictionQualityStatus === "INSUFFICIENT_DATA"
      ? "No recommendation issued because prediction quality is not sufficient for maintenance planning."
      : "No rising trend is projected to reach the 85% danger threshold.";

  return {
    tankId, currentLevel,
    currentVolumeCubicMeters: currentVolumeCubicMeters === null ? null : Number(currentVolumeCubicMeters.toFixed(3)),
    fillVelocityPercentPerHour: Number(regression.slope.toFixed(3)),
    historicalAverageDailyIncrease: Number((regression.slope * 24).toFixed(3)),
    diagnosticEndpointRatePercentPerHour: Number(diagnosticRate.toFixed(3)),
    regressionRSquared: Number(regression.fit.toFixed(4)),
    remainingCapacityPercent: remainingCapacityPercent === null ? null : Number(remainingCapacityPercent.toFixed(2)),
    remainingCapacityCubicMeters: remainingCapacityCubicMeters === null ? null : Number(remainingCapacityCubicMeters.toFixed(3)),
    predictionQualityStatus,
    dataQualityIssues: prepared.issues,
    fillingCycleStartedAt: prepared.cycle[0]?.recordedAt.toISOString() ?? null,
    warningProjection, dangerProjection, overflowProjection,
    maintenanceRecommendation: {
      recommendedAt,
      reason: recommendationReason,
      predictionConfidence: confidence,
      safetyBufferHours,
      approvalRequired: true,
    },
    risk, confidence,
    samples: prepared.cycle.length, generatedAt: now.toISOString(),
  };
};

const toApiResponse = (prediction: OverflowPrediction): PredictionApiResponse => ({
  tank_id: prediction.tankId,
  current_level: prediction.currentLevel,
  current_volume_cubic_meters: prediction.currentVolumeCubicMeters,
  fill_velocity_percent_per_hour: prediction.fillVelocityPercentPerHour,
  historical_average_daily_increase: prediction.historicalAverageDailyIncrease,
  remaining_capacity_percent: prediction.remainingCapacityPercent,
  remaining_capacity_cubic_meters: prediction.remainingCapacityCubicMeters,
  prediction_quality_status: prediction.predictionQualityStatus,
  data_quality_issues: prediction.dataQualityIssues,
  filling_cycle_started_at: prediction.fillingCycleStartedAt,
  warning_projection: prediction.warningProjection,
  danger_projection: prediction.dangerProjection,
  overflow_projection: prediction.overflowProjection,
  risk_level: prediction.risk,
  confidence: prediction.confidence,
  maintenance_recommendation: prediction.maintenanceRecommendation,
  samples: prediction.samples,
  generated_at: prediction.generatedAt,
});

const persist = (prediction: OverflowPrediction) => predictionModel.storePrediction({
  tankId: prediction.tankId,
  fillVelocityPercentPerHour: prediction.fillVelocityPercentPerHour,
  currentLevel: prediction.currentLevel,
  currentVolumeCubicMeters: prediction.currentVolumeCubicMeters,
  remainingVolumeCubicMeters: prediction.remainingCapacityCubicMeters,
  warning: prediction.warningProjection,
  danger: prediction.dangerProjection,
  overflow: prediction.overflowProjection,
  predictionStatus: prediction.overflowProjection.status,
  qualityStatus: prediction.predictionQualityStatus,
  regressionRSquared: prediction.regressionRSquared,
  fillingCycleStartedAt: prediction.fillingCycleStartedAt,
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

const optionalTankId = (value: unknown): string | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !uuidPattern.test(value)) {
    throw new PredictionValidationError("tankId must be a valid UUID.");
  }
  return value;
};

export const listPredictionHistory = (tankId: unknown) =>
  predictionModel.getPredictionHistory(optionalTankId(tankId));

export const evaluatePredictions = (tankId: unknown) =>
  predictionModel.getPredictionEvaluation(optionalTankId(tankId));
