import assert from "node:assert/strict";
import test from "node:test";
import { NotificationEventBus } from "../src/services/notification-events";
import type { Alert } from "../src/types/alerts.types";

const alert: Alert = {
  id: "00000000-0000-4000-8000-000000000001",
  tank_id: "00000000-0000-4000-8000-000000000002",
  tank_name: "Test Tank",
  location: "Kampala",
  latitude: 0.3476,
  longitude: 32.5825,
  alert_type: "High sewage level",
  severity: "warning",
  status: "ACTIVE",
  message: "Level is high.",
  created_at: new Date("2026-07-26T12:00:00.000Z"),
  updated_at: new Date("2026-07-26T12:00:00.000Z"),
  last_seen_at: new Date("2026-07-26T12:00:00.000Z"),
  acknowledged_by: null,
  acknowledged_by_name: null,
  acknowledged_at: null,
  resolved_at: null,
};

test("notification events isolate channel failures and continue other listeners", async () => {
  const bus = new NotificationEventBus();
  let delivered = false;
  bus.subscribe(async () => { throw new Error("provider unavailable"); });
  bus.subscribe(async () => { delivered = true; });

  const originalError = console.error;
  console.error = () => {};
  try {
    await assert.doesNotReject(bus.publish({ alert }));
  } finally {
    console.error = originalError;
  }
  assert.equal(delivered, true);
});
