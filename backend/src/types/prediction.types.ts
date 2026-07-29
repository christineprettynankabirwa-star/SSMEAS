export type OverflowRisk = "UNKNOWN" | "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
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
  predictionInterval95: {
    earliestArrivalAt: string | null;
    latestArrivalAt: string | null;
    minimumHours: number | null;
    maximumHours: number | null;
  };
}

export type PredictionQualityStatus = "GOOD" | "LIMITED" | "POOR" | "INSUFFICIENT_DATA";
export type DataQualityIssue =
  | "INVALID_LEVEL"
  | "NEGATIVE_GAS"
  | "FUTURE_TIMESTAMP"
  | "DUPLICATE_READING"
  | "STALE_READING"
  | "COMMUNICATION_GAP"
  | "IMPOSSIBLE_OSCILLATION"
  | "EMPTYING_EVENT";

export interface OverflowPrediction {
  tankId: string;
  currentLevel: number | null;
  currentVolumeCubicMeters: number | null;
  fillVelocityPercentPerHour: number;
  historicalAverageDailyIncrease: number;
  diagnosticEndpointRatePercentPerHour: number;
  remainingCapacityPercent: number | null;
  remainingCapacityCubicMeters: number | null;
  predictionQualityStatus: PredictionQualityStatus;
  dataQualityIssues: DataQualityIssue[];
  fillingCycleStartedAt: string | null;
  warningProjection: ThresholdProjection;
  dangerProjection: ThresholdProjection;
  overflowProjection: ThresholdProjection;
  recommendedMaintenanceAt: string | null;
  risk: OverflowRisk;
  confidence: number;
  samples: number;
  generatedAt: string;
}

export interface PredictionApiResponse {
  tank_id: string;
  current_level: number | null;
  current_volume_cubic_meters: number | null;
  fill_velocity_percent_per_hour: number;
  historical_average_daily_increase: number;
  remaining_capacity_percent: number | null;
  remaining_capacity_cubic_meters: number | null;
  prediction_quality_status: PredictionQualityStatus;
  data_quality_issues: DataQualityIssue[];
  filling_cycle_started_at: string | null;
  warning_projection: ThresholdProjection;
  danger_projection: ThresholdProjection;
  overflow_projection: ThresholdProjection;
  risk_level: OverflowRisk;
  confidence: number;
  recommended_maintenance_date: string | null;
  samples: number;
  generated_at: string;
}
