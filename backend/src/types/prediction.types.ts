export type OverflowRisk = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface OverflowPrediction {
  tankId: string;
  currentLevel: number | null;
  trendPercentPerHour: number;
  predictedOverflowAt: string | null;
  recommendedMaintenanceAt: string | null;
  hoursUntilOverflow: number | null;
  risk: OverflowRisk;
  riskPercentage: number;
  confidence: number;
  samples: number;
  generatedAt: string;
}

export interface PredictionApiResponse {
  tank_id: string;
  predicted_overflow_time: string | null;
  hours_remaining: number | null;
  risk: number;
  confidence: number;
  recommended_maintenance_date: string | null;
}
