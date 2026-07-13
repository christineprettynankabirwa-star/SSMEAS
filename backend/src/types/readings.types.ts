// Defines the sensor-reading contracts used by the ThingSpeak and database layers.
export interface SensorReading {
  id: string;
  tank_id: string;
  thingspeak_channel_id: number;
  thingspeak_entry_id: number;
  level: number | null;
  gas_level: number | null;
  temperature: number | null;
  battery: number | null;
  recorded_at: Date;
  created_at: Date;
}

export interface ThingSpeakFeed {
  entry_id: number | string;
  created_at: string;
  field1?: string | null;
  field2?: string | null;
  field3?: string | null;
  field4?: string | null;
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
  temperature: number | null;
  battery: number | null;
  recorded_at: Date;
}
