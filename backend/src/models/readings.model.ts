// Isolates PostgreSQL access required by the sensor readings module.
import { pool } from "../config/database";
import type {
  HistoricalSensorReading,
  DeviceReadingInput,
  NewSensorReading,
  SensorReading,
} from "../types/readings.types";

export const createOrGetSensorReading = async (
  reading: NewSensorReading,
): Promise<SensorReading> => {
  const result = await pool.query<SensorReading>(
    `INSERT INTO sensor_readings (
      tank_id, thingspeak_channel_id, thingspeak_entry_id, level, gas_level,
      temperature, battery, recorded_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT DO NOTHING
    RETURNING *`,
    [
      reading.tank_id, reading.thingspeak_channel_id, reading.thingspeak_entry_id,
      reading.level, reading.gas_level, reading.temperature, reading.battery, reading.recorded_at,
    ],
  );

  if (result.rows[0]) return result.rows[0];

  const existing = await pool.query<SensorReading>(
    `SELECT * FROM sensor_readings
     WHERE thingspeak_channel_id = $1 AND thingspeak_entry_id = $2
     ORDER BY created_at ASC
     LIMIT 1`,
    [reading.thingspeak_channel_id, reading.thingspeak_entry_id],
  );
  const storedReading = existing.rows[0];
  if (!storedReading) throw new Error("Sensor reading could not be stored.");
  return storedReading;
};

export const createOrGetDeviceReading = async (
  reading: DeviceReadingInput,
): Promise<SensorReading> => {
  const result = await pool.query<SensorReading>(
    `INSERT INTO sensor_readings (
      tank_id, device_reading_id, level, gas_level, temperature, battery, recorded_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    ON CONFLICT (device_reading_id) DO NOTHING
    RETURNING *`,
    [
      reading.tank_id, reading.reading_id, reading.level, reading.gas_level,
      reading.temperature, reading.battery, reading.recorded_at,
    ],
  );

  if (result.rows[0]) return result.rows[0];

  const existing = await pool.query<SensorReading>(
    "SELECT * FROM sensor_readings WHERE device_reading_id = $1 LIMIT 1",
    [reading.reading_id],
  );
  const storedReading = existing.rows[0];
  if (!storedReading) throw new Error("Device reading could not be stored.");
  return storedReading;
};

export const getHistoricalReadingsByTankId = async (
  tankId: string,
): Promise<HistoricalSensorReading[]> => {
  const result = await pool.query<HistoricalSensorReading>(
    `SELECT recorded_at, level, gas_level, temperature, battery
     FROM sensor_readings
     WHERE tank_id = $1
     ORDER BY recorded_at ASC`,
    [tankId],
  );
  return result.rows;
};

export const getLatestStoredReading = async (): Promise<SensorReading | null> => {
  const result = await pool.query<SensorReading>(
    `SELECT * FROM sensor_readings ORDER BY recorded_at DESC LIMIT 1`,
  );
  return result.rows[0] ?? null;
};
