import assert from "node:assert/strict";
import test from "node:test";
import { calculateOverflowPrediction } from "../src/services/prediction.service";

test("predicts overflow from a rising level trend", () => {
  const prediction = calculateOverflowPrediction("tank", [
    { level: 70, recordedAt: new Date("2026-07-17T08:00:00Z") },
    { level: 80, recordedAt: new Date("2026-07-17T09:00:00Z") },
    { level: 90, recordedAt: new Date("2026-07-17T10:00:00Z") },
  ], new Date("2026-07-17T10:00:00Z"));
  assert.equal(prediction.trendPercentPerHour, 10);
  assert.equal(prediction.hoursUntilOverflow, 1);
  assert.equal(prediction.risk, "CRITICAL");
  assert.equal(prediction.samples, 3);
});

test("does not invent an overflow time for a flat trend", () => {
  const prediction = calculateOverflowPrediction("tank", [
    { level: 40, recordedAt: new Date("2026-07-17T08:00:00Z") },
    { level: 40, recordedAt: new Date("2026-07-17T09:00:00Z") },
  ]);
  assert.equal(prediction.predictedOverflowAt, null);
  assert.equal(prediction.risk, "LOW");
});
