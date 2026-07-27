import thresholdConfig from "../../config/alert-thresholds.json";
import type { SensorReading } from "@/components/dashboard/types";

export type TankCondition = "SAFE" | "WARNING" | "DANGER" | "OFFLINE";
export const alertThresholds = thresholdConfig;

export const classifyLevel = (level: number | null | undefined): Exclude<TankCondition, "OFFLINE"> => {
  if ((level ?? 0) >= alertThresholds.sewageLevel.dangerMinimum) return "DANGER";
  if ((level ?? 0) >= alertThresholds.sewageLevel.warningMinimum) return "WARNING";
  return "SAFE";
};

export const classifyReading = (reading: SensorReading | null | undefined): TankCondition =>
  reading ? classifyLevel(reading.level) : "OFFLINE";
