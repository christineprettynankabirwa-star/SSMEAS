// Validates ThingSpeak data and coordinates sensor-reading persistence.
import { getLatestChannelFeed } from "../clients/thingspeak.client";
import * as readingsModel from "../models/readings.model";
import * as tankModel from "../models/tank.model";
import { createAlertsForReading } from "./alerts.service";
import { createAutomaticMaintenanceForReading } from "./maintenance.service";
import type {
  HistoricalSensorReading,
  NewSensorReading,
  SensorReading,
  ThingSpeakFeed,
  ThingSpeakLatestFeedResponse,
  DeviceReadingInput,
  AnalyticsRange,
  AnalyticsResponse,
} from "../types/readings.types";

export class ReadingValidationError extends Error {}
export class ReadingNotFoundError extends Error {}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const parsePositiveInteger = (value: unknown, field: string): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) {
    throw new ReadingValidationError(`${field} must be a positive integer.`);
  }
  return parsed;
};

const parseOptionalNumber = (value: unknown, field: string): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) throw new ReadingValidationError(`${field} must be numeric when supplied.`);
  return parsed;
};

const parseTankId = (value: unknown): string => {
  if (typeof value !== "string") {
    throw new ReadingValidationError("field5 (tank_id) must be a registered tank UUID.");
  }
  const tankId = value.trim();
  if (!uuidPattern.test(tankId)) {
    throw new ReadingValidationError("field5 (tank_id) must be a valid UUID.");
  }
  return tankId;
};

const getLatestFeed = (payload: ThingSpeakLatestFeedResponse): ThingSpeakFeed => {
  if (!Array.isArray(payload.feeds) || payload.feeds.length === 0 || !payload.feeds[0]) {
    throw new ReadingValidationError("ThingSpeak returned no readings for this channel.");
  }
  return payload.feeds[0];
};

const mapFeedToReading = (payload: ThingSpeakLatestFeedResponse): NewSensorReading => {
  const feed = getLatestFeed(payload);
  const channelId = parsePositiveInteger(payload.channel?.id, "ThingSpeak channel id");
  const entryId = parsePositiveInteger(feed.entry_id, "ThingSpeak entry id");
  const recordedAt = new Date(feed.created_at);
  if (Number.isNaN(recordedAt.getTime())) {
    throw new ReadingValidationError("ThingSpeak reading has an invalid created_at timestamp.");
  }

  return {
    tank_id: parseTankId(feed.field5),
    thingspeak_channel_id: channelId,
    thingspeak_entry_id: entryId,
    level: parseOptionalNumber(feed.field1, "field1 (level)"),
    gas_level: parseOptionalNumber(feed.field2, "field2 (gas_level)"),
    recorded_at: recordedAt,
  };
};

export const getAndStoreLiveReading = async (): Promise<SensorReading> => {
  let reading: NewSensorReading;
  try {
    const latestFeed = await getLatestChannelFeed();
    reading = mapFeedToReading(latestFeed);
  } catch (error) {
    const storedReading = await readingsModel.getLatestStoredReading();
    if (storedReading) return storedReading;
    throw error;
  }
  const tank = await tankModel.getTankById(reading.tank_id);
  if (!tank) {
    throw new ReadingValidationError("ThingSpeak field5 does not match a registered tank.");
  }
  if (
    typeof tank.thingspeak_channel_id === "number"
    && tank.thingspeak_channel_id !== reading.thingspeak_channel_id
  ) {
    throw new ReadingValidationError("ThingSpeak channel does not match the registered tank.");
  }
  const storedReading = await readingsModel.createOrGetSensorReading(reading);
  await createAlertsForReading(storedReading);
  await createAutomaticMaintenanceForReading(storedReading);
  return storedReading;
};

// Direct device uploads are already persisted before the dashboard requests
// them. Keep this read path database-only so a slow or stale ThingSpeak
// response cannot hide newer ESP32 telemetry.
export const getLatestStoredLiveReading = async (): Promise<SensorReading> => {
  const reading = await readingsModel.getLatestStoredReading();
  if (!reading) throw new ReadingNotFoundError("No sensor readings have been received yet.");
  return reading;
};

export const getLatestStoredReadings = async (): Promise<SensorReading[]> =>
  readingsModel.getLatestStoredReadingsByTank();

export const getHistoricalReadings = async (
  tankId: string,
): Promise<HistoricalSensorReading[]> => {
  if (!uuidPattern.test(tankId)) {
    throw new ReadingValidationError("tankId must be a valid UUID.");
  }

  const tank = await tankModel.getTankById(tankId);
  if (!tank) throw new ReadingNotFoundError("Tank not found.");

  return readingsModel.getHistoricalReadingsByTankId(tankId);
};

const analyticsRanges = new Set<AnalyticsRange>(["1h", "24h", "7d", "30d", "all"]);

export const parseAnalyticsRange = (value: unknown): AnalyticsRange => {
  if (typeof value !== "string" || !analyticsRanges.has(value as AnalyticsRange)) {
    throw new ReadingValidationError("range must be one of: 1h, 24h, 7d, 30d, all.");
  }
  return value as AnalyticsRange;
};

export const parseAnalyticsTankIds = (value: unknown): string[] => {
  if (typeof value !== "string") throw new ReadingValidationError("tankIds is required.");
  const ids = [...new Set(value.split(",").map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0 || ids.length > 20 || ids.some((id) => !uuidPattern.test(id))) {
    throw new ReadingValidationError("tankIds must contain between 1 and 20 valid UUIDs.");
  }
  return ids;
};

export const getAnalytics = async (tankIdsValue: unknown, rangeValue: unknown): Promise<AnalyticsResponse> => {
  const tankIds = parseAnalyticsTankIds(tankIdsValue);
  const range = parseAnalyticsRange(rangeValue ?? "24h");
  const [readings, summary] = await Promise.all([
    readingsModel.getAnalyticsReadings(tankIds, range),
    readingsModel.getAnalyticsSummary(tankIds, range),
  ]);
  return { range, generatedAt: new Date().toISOString(), readings, summary };
};

const parseRequiredUuid = (value: unknown, field: string): string => {
  if (typeof value !== "string" || !uuidPattern.test(value.trim())) {
    throw new ReadingValidationError(`${field} must be a valid UUID.`);
  }
  return value.trim();
};

const parseRequiredNumber = (value: unknown, field: string): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  if (value === null || value === undefined || value === "" || !Number.isFinite(parsed)) {
    throw new ReadingValidationError(`${field} is required and must be numeric.`);
  }
  return parsed;
};

const parseDeviceStatus = (value: unknown): DeviceReadingInput["status"] => {
  if (value !== "SAFE" && value !== "WARNING" && value !== "DANGER") {
    throw new ReadingValidationError("status must be SAFE, WARNING, or DANGER.");
  }
  return value;
};

export const parseDeviceReadingPayload = (payload: Record<string, unknown>): DeviceReadingInput => {
  const recordedAt = payload.recorded_at === undefined ? new Date() : new Date(String(payload.recorded_at));
  if (Number.isNaN(recordedAt.getTime())) {
    throw new ReadingValidationError("recorded_at must be a valid ISO-8601 timestamp.");
  }

  return {
    tank_id: parseRequiredUuid(payload.tank_id, "tank_id"),
    reading_id: parseRequiredUuid(payload.reading_id, "reading_id"),
    level: parseRequiredNumber(payload.level, "level"),
    gas_level: parseRequiredNumber(payload.gas_level, "gas_level"),
    status: parseDeviceStatus(payload.status),
    recorded_at: recordedAt,
  };
};

export const storeDeviceReading = async (payload: Record<string, unknown>): Promise<SensorReading> => {
  const reading = parseDeviceReadingPayload(payload);

  const tank = await tankModel.getTankById(reading.tank_id);
  if (!tank) throw new ReadingValidationError("tank_id does not match a registered tank.");

  const stored = await readingsModel.createOrGetDeviceReading(reading);
  await createAlertsForReading(stored);
  await createAutomaticMaintenanceForReading(stored);
  return stored;
};
