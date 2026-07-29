export type OverflowRisk = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type PredictionStatus =
  | "PROJECTED"
  | "THRESHOLD_REACHED"
  | "STABLE_OR_FALLING"
  | "INSUFFICIENT_DATA";

export interface ThresholdProjection {
  thresholdPercent: 65 | 85 | 100;
  estimatedArrivalAt: string | null;
  remainingHours: number | null;
  status: PredictionStatus;
}

export interface OverflowPrediction {
  tankId: string;
  currentLevel: number | null;
  fillVelocityPercentPerHour: number;
  historicalAverageDailyIncrease: number;
  diagnosticEndpointRatePercentPerHour: number;
  remainingCapacityPercent: number | null;
  remainingCapacityCubicMeters: number | null;
  warningProjection: ThresholdProjection;
  dangerProjection: ThresholdProjection;
  overflowProjection: ThresholdProjection;
  recommendedMaintenanceAt: string | null;
  risk: OverflowRisk;
  riskPercentage: number;
  confidence: number;
  samples: number;
  generatedAt: string;
}

export interface PredictionApiResponse {
  tank_id: string;
  current_level: number | null;
  fill_velocity_percent_per_hour: number;
  historical_average_daily_increase: number;
  remaining_capacity_percent: number | null;
  remaining_capacity_cubic_meters: number | null;
  warning_projection: ThresholdProjection;
  danger_projection: ThresholdProjection;
  overflow_projection: ThresholdProjection;
  risk: number;
  risk_level: OverflowRisk;
  confidence: number;
  recommended_maintenance_date: string | null;
  samples: number;
  generated_at: string;
}
