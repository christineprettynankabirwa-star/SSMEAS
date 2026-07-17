export type OverflowRisk = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface OverflowPrediction {
  tankId: string;
  currentLevel: number | null;
  trendPercentPerHour: number;
  predictedOverflowAt: string | null;
  hoursUntilOverflow: number | null;
  risk: OverflowRisk;
  confidence: number;
  samples: number;
  generatedAt: string;
}
