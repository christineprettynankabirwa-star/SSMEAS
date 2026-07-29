import fs from "node:fs";
import path from "node:path";

interface PredictiveAnalyticsConfig {
  dataQuality: {
    staleAfterMinutes: number;
    communicationGapMinutes: number;
    emptyingDropPercent: number;
    maximumLevelChangePercentPerMinute: number;
    smoothingWindow: number;
    minimumSamples: number;
  };
  riskHoursToDanger: {
    criticalMaximum: number;
    highMaximum: number;
    moderateMaximum: number;
  };
  maintenanceRecommendation: { safetyBufferHours: number };
  routeOptimization: { planningHorizonHours: number };
}

const configPath = path.resolve(__dirname, "../../../config/predictive-analytics.json");
export const predictiveAnalyticsConfig = JSON.parse(
  fs.readFileSync(configPath, "utf8"),
) as PredictiveAnalyticsConfig;
