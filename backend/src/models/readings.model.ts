// Isolates PostgreSQL access required by the sensor readings module.
import { pool } from "../config/database";
import type { NewSensorReading, SensorReading } from "../types/readings.types";

export const createOrGetSensorReading = async (
  reading: NewSensorReading,
): Promise<SensorReading> => {
  const result = await pool.query<SensorReading>(
    `INSERT INTO sensor_readings (
      thingspeak_channel_id, thingspeak_entry_id, level, gas_level, temperature,
      battery, latitude, longitude, recorded_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT DO NOTHING
    RETURNING *`,
    [
      reading.thingspeak_channel_id,
      reading.thingspeak_entry_id,
      reading.level,
      reading.gas_level,
      reading.temperature,
      reading.battery,
      reading.latitude,
      reading.longitude,
      reading.recorded_at,
    ],
  );

  if (result.rows[0]) return result.rows[0];

  const existing = await pool.query<SensorReading>(
    `SELECT * FROM sensor_readings
     WHERE thingspeak_channel_id = $1
       AND (thingspeak_entry_id = $2 OR recorded_at = $3)
     ORDER BY created_at ASC
     LIMIT 1`,
    [reading.thingspeak_channel_id, reading.thingspeak_entry_id, reading.recorded_at],
  );
  const storedReading = existing.rows[0];
  if (!storedReading) throw new Error("Sensor reading could not be stored.");
  return storedReading;
};
