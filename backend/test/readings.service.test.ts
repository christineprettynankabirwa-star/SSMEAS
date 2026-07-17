import assert from "node:assert/strict";
import test from "node:test";
import {
  ReadingValidationError,
  parseDeviceReadingPayload,
} from "../src/services/readings.service";

const tankId = "00000000-0000-4000-8000-000000000001";
const readingId = "00000000-0000-4000-8000-000000000002";

test("accepts and normalizes the ESP32 device payload", () => {
  const reading = parseDeviceReadingPayload({
    tank_id: tankId,
    reading_id: readingId,
    level: "72.5",
    gas_level: 210,
    temperature: null,
    battery: "3.8",
    recorded_at: "2026-07-17T08:00:00.000Z",
    status: "ONLINE",
  });

  assert.equal(reading.tank_id, tankId);
  assert.equal(reading.reading_id, readingId);
  assert.equal(reading.level, 72.5);
  assert.equal(reading.gas_level, 210);
  assert.equal(reading.temperature, null);
  assert.equal(reading.battery, 3.8);
  assert.equal(reading.recorded_at.toISOString(), "2026-07-17T08:00:00.000Z");
});

test("rejects a device payload without idempotency and tank UUIDs", () => {
  assert.throws(
    () => parseDeviceReadingPayload({ tank_id: "not-a-uuid", reading_id: readingId }),
    ReadingValidationError,
  );
  assert.throws(
    () => parseDeviceReadingPayload({ tank_id: tankId }),
    ReadingValidationError,
  );
});

test("rejects non-numeric telemetry and invalid timestamps", () => {
  assert.throws(
    () => parseDeviceReadingPayload({ tank_id: tankId, reading_id: readingId, level: "full" }),
    ReadingValidationError,
  );
  assert.throws(
    () => parseDeviceReadingPayload({ tank_id: tankId, reading_id: readingId, recorded_at: "yesterday-ish" }),
    ReadingValidationError,
  );
});
