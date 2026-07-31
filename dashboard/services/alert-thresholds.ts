import thresholdConfig from "../../config/alert-thresholds.json";
import type { SensorReading } from "@/components/dashboard/types";

export type TankCondition = "SAFE" | "WARNING" | "DANGER" | "OFFLINE";
export const alertThresholds = thresholdConfig;

export const classifyLevel = (level: number | null | undefined): Exclude<TankCondition, "OFFLINE"> => {
  if ((level ?? 0) >= alertThresholds.sewageLevel.dangerMinimum) return "DANGER";
  if ((level ?? 0) >= alertThresholds.sewageLevel.warningMinimum) return "WARNING";
  return "SAFE";
};

export const classifyGas = (gas: number | null | undefined): Exclude<TankCondition, "OFFLINE"> => {
  if ((gas ?? 0) >= alertThresholds.gasLevel.dangerMinimum) return "DANGER";
  if ((gas ?? 0) >= alertThresholds.gasLevel.warningMinimum) return "WARNING";
  return "SAFE";
};

export const classifyTelemetry = (
  level: number | null | undefined,
  gas: number | null | undefined,
): Exclude<TankCondition, "OFFLINE"> => {
  const conditions = [classifyLevel(level), classifyGas(gas)];
  return conditions.includes("DANGER") ? "DANGER" : conditions.includes("WARNING") ? "WARNING" : "SAFE";
};

export const classifyReading = (reading: SensorReading | null | undefined): TankCondition =>
  reading ? classifyTelemetry(reading.level, reading.gas_level) : "OFFLINE";
