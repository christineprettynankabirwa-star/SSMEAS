import assert from "node:assert/strict";
import test from "node:test";
import {
  alertThresholds, generateAlertsForReading, isAlertUuid, isReadingSafe,
} from "../src/services/alerts.service";
import { classifySewageLevel } from "../src/config/alert-thresholds";
import type { SensorReading } from "../src/types/readings.types";

const reading = (level: number, gasLevel = 500): SensorReading => ({
  id: "reading-id",
  tank_id: "00000000-0000-4000-8000-000000000001",
  thingspeak_channel_id: 1,
  thingspeak_entry_id: 1,
  level,
  gas_level: gasLevel,
  recorded_at: new Date(0),
  created_at: new Date(0),
});

for (const [level, condition, severity] of [
  [64, "SAFE", null],
  [65, "WARNING", "warning"],
  [84, "WARNING", "warning"],
  [85, "DANGER", "critical"],
  [100, "DANGER", "critical"],
] as const) {
  test(`${level}% is ${condition}`, () => {
    assert.equal(classifySewageLevel(level), condition);
    const alerts = generateAlertsForReading(reading(level), alertThresholds);
    assert.equal(alerts[0]?.severity ?? null, severity);
    assert.equal(isReadingSafe(reading(level), alertThresholds), condition === "SAFE");
  });
}

test("sewage level is the primary alert trigger", () => {
  assert.deepEqual(generateAlertsForReading(reading(64, 9999), alertThresholds), []);
  assert.equal(generateAlertsForReading(reading(65, 0), alertThresholds)[0]?.severity, "warning");
  assert.equal(generateAlertsForReading(reading(85, 0), alertThresholds)[0]?.severity, "critical");
});

test("alert acknowledgement accepts every UUID value PostgreSQL can store", () => {
  // md5(... )::uuid is used by the idempotent presentation seed and does not
  // guarantee an RFC version nibble between 1 and 5.
  assert.equal(isAlertUuid("c04b7667-b278-e547-517f-bb04a4a41e77"), true);
  assert.equal(isAlertUuid("not-a-uuid"), false);
});
