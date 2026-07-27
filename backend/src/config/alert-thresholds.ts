import fs from "node:fs";
import path from "node:path";

export type SewageCondition = "SAFE" | "WARNING" | "DANGER";
interface ThresholdConfig {
  sewageLevel: {
    safeMaximum: number;
    warningMinimum: number;
    warningMaximum: number;
    dangerMinimum: number;
    dangerMaximum: number;
  };
  maintenanceOnWarning: boolean;
}

const configPath = path.resolve(__dirname, "../../../config/alert-thresholds.json");
export const alertThresholdConfig = JSON.parse(
  fs.readFileSync(configPath, "utf8"),
) as ThresholdConfig;

export const classifySewageLevel = (level: number | null): SewageCondition | null => {
  if (level === null || !Number.isFinite(level)) return null;
  if (level >= alertThresholdConfig.sewageLevel.dangerMinimum) return "DANGER";
  if (level >= alertThresholdConfig.sewageLevel.warningMinimum) return "WARNING";
  return "SAFE";
};
