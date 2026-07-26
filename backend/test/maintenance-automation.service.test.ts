import assert from "node:assert/strict";
import test from "node:test";
import { generateAutomaticMaintenanceRequests } from "../src/services/maintenance.service";
import type { SensorReading } from "../src/types/readings.types";

const reading = (overrides: Partial<SensorReading>): SensorReading => ({
  id: "reading-id",
  tank_id: "00000000-0000-4000-8000-000000000001",
  thingspeak_channel_id: null,
  thingspeak_entry_id: null,
  device_reading_id: "00000000-0000-4000-8000-000000000002",
  level: null,
  gas_level: null,
  recorded_at: new Date("2026-07-17T08:00:00.000Z"),
  created_at: new Date("2026-07-17T08:00:00.000Z"),
  ...overrides,
});

test("schedules field work for every critical condition", () => {
  const requests = generateAutomaticMaintenanceRequests(
    reading({ level: 96, gas_level: 500 }),
    new Date("2026-07-17T09:00:00.000Z"),
  );

  assert.deepEqual(
    requests.map(({ task }) => task),
    ["Emergency response: Critical sewage level", "Emergency response: Hazardous gas"],
  );
  assert.ok(requests.every(({ status }) => status === "SCHEDULED"));
  assert.ok(requests.every(({ priority }) => priority === "HIGH"));
});

test("does not schedule maintenance for warning-only readings", () => {
  assert.deepEqual(generateAutomaticMaintenanceRequests(reading({ level: 80 })), []);
});

test("schedules high-priority maintenance when the level reaches 90 percent", () => {
  const requests = generateAutomaticMaintenanceRequests(reading({ level: 90 }));
  assert.equal(requests.length, 1);
  assert.equal(requests[0]?.priority, "HIGH");
  assert.equal(requests[0]?.status, "SCHEDULED");
});
