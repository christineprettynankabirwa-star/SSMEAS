// Validates ThingSpeak data and coordinates sensor-reading persistence.
import { getLatestChannelFeed } from "../clients/thingspeak.client";
import * as readingsModel from "../models/readings.model";
import type {
  NewSensorReading,
  SensorReading,
  ThingSpeakFeed,
  ThingSpeakLatestFeedResponse,
} from "../types/readings.types";

export class ReadingValidationError extends Error {}

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
    thingspeak_channel_id: channelId,
    thingspeak_entry_id: entryId,
    level: parseOptionalNumber(feed.field1, "field1 (level)"),
    gas_level: parseOptionalNumber(feed.field2, "field2 (gas_level)"),
    temperature: parseOptionalNumber(feed.field3, "field3 (temperature)"),
    battery: parseOptionalNumber(feed.field4, "field4 (battery)"),
    latitude: parseOptionalNumber(feed.field5, "field5 (latitude)"),
    longitude: parseOptionalNumber(feed.field6, "field6 (longitude)"),
    recorded_at: recordedAt,
  };
};

export const getAndStoreLiveReading = async (): Promise<SensorReading> => {
  const latestFeed = await getLatestChannelFeed();
  return readingsModel.createOrGetSensorReading(mapFeedToReading(latestFeed));
};
