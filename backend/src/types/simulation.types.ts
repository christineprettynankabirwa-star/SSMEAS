import type { SensorReading } from "./readings.types";

export type SimulationCondition = "SAFE" | "WARNING" | "DANGER";

export interface SimulationResult {
  tankId: string;
  tankName: string;
  condition: SimulationCondition;
  reading: SensorReading;
  resolvedAlerts: number;
  cancelledMaintenance: number;
}

export interface SimulationBatchResult {
  results: SimulationResult[];
}
