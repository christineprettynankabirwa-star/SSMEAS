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

export interface MaintenanceRecommendation {
  recommendedAt: string | null;
  reason: string;
  predictionConfidence: number;
  safetyBufferHours: number;
  approvalRequired: true;
}

export interface OverflowPrediction {
  tankId: string;
  currentLevel: number | null;
  currentVolumeCubicMeters: number | null;
  fillVelocityPercentPerHour: number;
  historicalAverageDailyIncrease: number;
  diagnosticEndpointRatePercentPerHour: number;
  regressionRSquared: number;
  remainingCapacityPercent: number | null;
  remainingCapacityCubicMeters: number | null;
  predictionQualityStatus: PredictionQualityStatus;
  dataQualityIssues: DataQualityIssue[];
  fillingCycleStartedAt: string | null;
  warningProjection: ThresholdProjection;
  dangerProjection: ThresholdProjection;
  overflowProjection: ThresholdProjection;
  maintenanceRecommendation: MaintenanceRecommendation;
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
  maintenance_recommendation: MaintenanceRecommendation;
  samples: number;
  generated_at: string;
}

export interface PredictionEvaluation {
  evaluatedForecasts: number;
  meanAbsoluteErrorHours: number | null;
  rootMeanSquaredErrorHours: number | null;
}

export interface PredictionHistoryRecord {
  id: string;
  tank_id: string;
  prediction_time: string;
  threshold_percent: 65 | 85 | 100;
  forecast_at: string | null;
  actual_arrival_at: string | null;
  regression_slope: number;
  regression_r_squared: number;
  interval_earliest_at: string | null;
  interval_latest_at: string | null;
  forecast_error_hours: number | null;
  prediction_quality_status: PredictionQualityStatus;
  sample_count: number;
  filling_cycle_started_at: string | null;
}
