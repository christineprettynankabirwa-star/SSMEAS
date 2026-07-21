// Isolates PostgreSQL access required by the sensor readings module.
import { pool } from "../config/database";
import type {
  HistoricalSensorReading,
  DeviceReadingInput,
  NewSensorReading,
  SensorReading,
  AnalyticsReading,
  AnalyticsRange,
  AnalyticsSummary,
} from "../types/readings.types";

export const createOrGetSensorReading = async (
  reading: NewSensorReading,
): Promise<SensorReading> => {
  const result = await pool.query<SensorReading>(
    `INSERT INTO sensor_readings (
      tank_id, thingspeak_channel_id, thingspeak_entry_id, level, gas_level,
      recorded_at
    ) VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT DO NOTHING
    RETURNING *`,
    [
      reading.tank_id, reading.thingspeak_channel_id, reading.thingspeak_entry_id,
      reading.level, reading.gas_level, reading.recorded_at,
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
      tank_id, device_reading_id, level, gas_level, recorded_at
    ) VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (device_reading_id) WHERE device_reading_id IS NOT NULL DO NOTHING
    RETURNING *`,
    [
      reading.tank_id, reading.reading_id, reading.level, reading.gas_level,
      reading.recorded_at,
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
    `SELECT recorded_at, level, gas_level
     FROM sensor_readings
     WHERE tank_id = $1
     ORDER BY recorded_at ASC`,
    [tankId],
  );
  return result.rows;
};

const rangeIntervals: Record<Exclude<AnalyticsRange, "all">, string> = {
  "1h": "1 hour",
  "24h": "24 hours",
  "7d": "7 days",
  "30d": "30 days",
};

const datePredicate = (range: AnalyticsRange, alias = "sr"): string =>
  range === "all" ? "" : `AND ${alias}.recorded_at >= NOW() - INTERVAL '${rangeIntervals[range]}'`;

export const getAnalyticsReadings = async (
  tankIds: string[],
  range: AnalyticsRange,
): Promise<AnalyticsReading[]> => {
  const result = await pool.query<AnalyticsReading>(
    `SELECT tank_id, recorded_at, level, gas_level
     FROM sensor_readings sr
     WHERE tank_id = ANY($1::uuid[])
       ${datePredicate(range)}
     ORDER BY recorded_at ASC`,
    [tankIds],
  );
  return result.rows;
};

export const getAnalyticsSummary = async (
  tankIds: string[],
  range: AnalyticsRange,
): Promise<AnalyticsSummary> => {
  const result = await pool.query<{
    highest_fill: number | null; average_fill: number | null; highest_gas: number | null;
    reporting_device_count: number; offline_device_count: number;
  }>(
    `WITH selected_readings AS (
       SELECT * FROM sensor_readings sr
       WHERE tank_id = ANY($1::uuid[]) ${datePredicate(range)}
    ), latest AS (
       SELECT DISTINCT ON (tank_id) tank_id, recorded_at
       FROM sensor_readings
       WHERE tank_id = ANY($1::uuid[])
       ORDER BY tank_id, recorded_at DESC
     )
     SELECT
       MAX(sr.level)::float AS highest_fill,
       AVG(sr.level)::float AS average_fill,
       MAX(sr.gas_level)::float AS highest_gas,
       COUNT(DISTINCT sr.tank_id)::int AS reporting_device_count,
       (SELECT COUNT(*)::int FROM unnest($1::uuid[]) selected(id)
        LEFT JOIN latest l ON l.tank_id = selected.id
        WHERE l.recorded_at IS NULL OR l.recorded_at < NOW() - INTERVAL '5 minutes') AS offline_device_count
     FROM selected_readings sr`,
    [tankIds],
  );
  const row = result.rows[0]!;
  return {
    highestFill: row.highest_fill,
    averageFill: row.average_fill,
    highestGas: row.highest_gas,
    reportingDeviceCount: row.reporting_device_count,
    offlineDeviceCount: row.offline_device_count,
  };
};

export const getLatestStoredReading = async (): Promise<SensorReading | null> => {
  const result = await pool.query<SensorReading>(
    `SELECT * FROM sensor_readings ORDER BY recorded_at DESC LIMIT 1`,
  );
  return result.rows[0] ?? null;
};

export const getLatestStoredReadingsByTank = async (): Promise<SensorReading[]> => {
  const result = await pool.query<SensorReading>(
    `SELECT DISTINCT ON (tank_id) *
     FROM sensor_readings
     ORDER BY tank_id, recorded_at DESC, created_at DESC`,
  );
  return result.rows;
};
