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
  assert.equal(prediction.riskPercentage, 99);
  assert.ok(prediction.confidence > 0 && prediction.confidence <= 100);
  assert.equal(prediction.samples, 3);
});

test("does not invent an overflow time for a flat trend", () => {
  const prediction = calculateOverflowPrediction("tank", [
    { level: 40, recordedAt: new Date("2026-07-17T08:00:00Z") },
    { level: 40, recordedAt: new Date("2026-07-17T09:00:00Z") },
  ]);
  assert.equal(prediction.predictedOverflowAt, null);
  assert.equal(prediction.risk, "LOW");
  assert.equal(prediction.riskPercentage, 40);
});

test("reduces confidence for stale or sparse telemetry", () => {
  const now = new Date("2026-07-18T12:00:00Z");
  const sparse = calculateOverflowPrediction("tank", [
    { level: 55, recordedAt: new Date("2026-07-16T08:00:00Z") },
  ], now);
  const recent = calculateOverflowPrediction("tank", Array.from({ length: 20 }, (_, index) => ({
    level: 50 + index,
    recordedAt: new Date(now.getTime() - (19 - index) * 3_600_000),
  })), now);
  assert.ok(sparse.confidence < recent.confidence);
});

test("uses gas history and alert history for maintenance recommendations", () => {
  const now = new Date("2026-07-18T12:00:00Z");
  const prediction = calculateOverflowPrediction("tank", [
    { level: 45, gasLevel: 350, recordedAt: new Date("2026-07-18T11:00:00Z") },
    { level: 45, gasLevel: 380, recordedAt: now },
  ], now, 3);
  assert.equal(prediction.risk, "CRITICAL");
  assert.equal(prediction.recommendedMaintenanceAt, now.toISOString());
});
