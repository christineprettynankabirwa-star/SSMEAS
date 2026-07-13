// Validates ThingSpeak data and coordinates sensor-reading persistence.
import { getLatestChannelFeed } from "../clients/thingspeak.client";
import * as readingsModel from "../models/readings.model";
import * as tankModel from "../models/tank.model";
import type {
  HistoricalSensorReading,
  NewSensorReading,
  SensorReading,
  ThingSpeakFeed,
  ThingSpeakLatestFeedResponse,
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
    temperature: parseOptionalNumber(feed.field3, "field3 (temperature)"),
    battery: parseOptionalNumber(feed.field4, "field4 (battery)"),
    recorded_at: recordedAt,
  };
};

export const getAndStoreLiveReading = async (): Promise<SensorReading> => {
  const latestFeed = await getLatestChannelFeed();
  const reading = mapFeedToReading(latestFeed);
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
  return readingsModel.createOrGetSensorReading(reading);
};

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
