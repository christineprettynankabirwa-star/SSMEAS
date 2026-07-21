import assert from "node:assert/strict";
import test from "node:test";
import { generateAlertsForReading, type AlertThresholds } from "../src/services/alerts.service";
import type { SensorReading } from "../src/types/readings.types";

const reading = (overrides: Partial<SensorReading>): SensorReading => ({
  id: "reading-id",
  tank_id: "00000000-0000-4000-8000-000000000001",
  thingspeak_channel_id: 1,
  thingspeak_entry_id: 1,
  level: null,
  gas_level: null,
  recorded_at: new Date(0),
  created_at: new Date(0),
  ...overrides,
});

const thresholds: AlertThresholds = { fillWarning: 72, fillCritical: 88, hazardousGas: 240 };

test("generates alerts using the configured values in both decisions and messages", () => {
  const alerts = generateAlertsForReading(reading({ level: 88, gas_level: 240 }), thresholds);
  assert.deepEqual(alerts.map(({ alert_type }) => alert_type), ["Critical sewage level", "Hazardous gas"]);
  assert.match(alerts[0]?.message ?? "", /88% critical threshold/);
  assert.match(alerts[1]?.message ?? "", /240 threshold/);
});

test("generates no alerts when readings are within configured limits", () => {
  assert.deepEqual(generateAlertsForReading(reading({ level: 71.9, gas_level: 239.9 }), thresholds), []);
});

test("uses warning rather than critical severity between fill thresholds", () => {
  const alerts = generateAlertsForReading(reading({ level: 72 }), thresholds);
  assert.equal(alerts.length, 1);
  assert.equal(alerts[0]?.severity, "warning");
  assert.match(alerts[0]?.message ?? "", /72% warning threshold/);
});
