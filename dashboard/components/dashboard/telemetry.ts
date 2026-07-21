import type { SensorReading } from "./types";

export const LIVE_READING_WINDOW_MS = 5 * 60 * 1_000;

export const isLiveReading = (reading: SensorReading | null | undefined, now = Date.now()): boolean => {
  if (!reading) return false;
  const recordedAt = new Date(reading.recorded_at).getTime();
  return Number.isFinite(recordedAt) && recordedAt <= now + 60_000 && now - recordedAt <= LIVE_READING_WINDOW_MS;
};
