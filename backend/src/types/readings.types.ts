// Defines the sensor-reading contracts used by the ThingSpeak and database layers.
export interface SensorReading {
  id: string;
  tank_id: string;
  thingspeak_channel_id: number | null;
  thingspeak_entry_id: number | null;
  device_reading_id?: string | null;
  level: number | null;
  gas_level: number | null;
  recorded_at: Date;
  created_at: Date;
}

export interface DeviceReadingInput {
  tank_id: string;
  reading_id: string;
  level: number;
  gas_level: number;
  status: DeviceStatus;
  recorded_at: Date;
}

export interface ThingSpeakFeed {
  entry_id: number | string;
  created_at: string;
  field1?: string | null;
  field2?: string | null;
  field5?: string | null;
  field6?: string | null;
}

export interface ThingSpeakLatestFeedResponse {
  channel?: { id?: number | string };
  feeds?: ThingSpeakFeed[];
}

export interface NewSensorReading {
  tank_id: string;
  thingspeak_channel_id: number;
  thingspeak_entry_id: number;
  level: number | null;
  gas_level: number | null;
  recorded_at: Date;
}

export interface HistoricalSensorReading {
  recorded_at: Date;
  level: number | null;
  gas_level: number | null;
}

export type AnalyticsRange = "1h" | "24h" | "7d" | "30d" | "all";

export interface AnalyticsReading extends HistoricalSensorReading {
  tank_id: string;
}

export interface AnalyticsSummary {
  highestFill: number | null;
  averageFill: number | null;
  highestGas: number | null;
  reportingDeviceCount: number;
  offlineDeviceCount: number;
}

export type DeviceStatus = "SAFE" | "WARNING" | "DANGER";

export interface AnalyticsResponse {
  range: AnalyticsRange;
  generatedAt: string;
  readings: AnalyticsReading[];
  summary: AnalyticsSummary;
}
