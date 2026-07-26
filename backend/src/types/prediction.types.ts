export type OverflowRisk = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface OverflowPrediction {
  tankId: string;
  currentLevel: number | null;
  trendPercentPerHour: number;
  predictedOverflowAt: string | null;
  recommendedMaintenanceAt: string | null;
  hoursUntilOverflow: number | null;
  predictedMinutesToFull: number | null;
  averageIncreasePerMinute: number;
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
  predicted_minutes_to_full: number | null;
  average_increase_per_minute: number;
  risk: number;
  confidence: number;
  recommended_maintenance_date: string | null;
}
