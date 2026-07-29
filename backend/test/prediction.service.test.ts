import assert from "node:assert/strict";
import test from "node:test";
import { calculateOverflowPrediction } from "../src/services/prediction.service";

test("uses timestamp-aware OLS for all operational threshold projections", () => {
  const now = new Date("2026-07-17T10:00:00Z");
  const prediction = calculateOverflowPrediction("tank", 10_000, [
    { level: 60, recordedAt: new Date("2026-07-17T08:00:00Z") },
    { level: 70, recordedAt: new Date("2026-07-17T09:00:00Z") },
    { level: 80, recordedAt: now },
  ], now);
  assert.equal(prediction.fillVelocityPercentPerHour, 10);
  assert.equal(prediction.warningProjection.remainingHours, 0);
  assert.equal(prediction.dangerProjection.remainingHours, 0.5);
  assert.equal(prediction.overflowProjection.remainingHours, 2);
  assert.equal(prediction.remainingCapacityPercent, 20);
  assert.equal(prediction.remainingCapacityCubicMeters, 2);
  assert.equal(prediction.historicalAverageDailyIncrease, 240);
});

test("returns zero when a threshold is already reached", () => {
  const prediction = calculateOverflowPrediction("tank", 5_000, [
    { level: 85, recordedAt: new Date("2026-07-17T08:00:00Z") },
    { level: 90, recordedAt: new Date("2026-07-17T09:00:00Z") },
  ]);
  assert.equal(prediction.warningProjection.remainingHours, 0);
  assert.equal(prediction.dangerProjection.remainingHours, 0);
  assert.equal(prediction.dangerProjection.status, "THRESHOLD_REACHED");
});

test("does not project future thresholds for a stable or falling trend", () => {
  const prediction = calculateOverflowPrediction("tank", 5_000, [
    { level: 40, recordedAt: new Date("2026-07-17T08:00:00Z") },
    { level: 40, recordedAt: new Date("2026-07-17T09:00:00Z") },
    { level: 40, recordedAt: new Date("2026-07-17T10:00:00Z") },
  ]);
  assert.equal(prediction.overflowProjection.estimatedArrivalAt, null);
  assert.equal(prediction.overflowProjection.status, "STABLE_OR_FALLING");
});

test("marks sparse telemetry as insufficient for projection", () => {
  const prediction = calculateOverflowPrediction("tank", 5_000, [
    { level: 55, recordedAt: new Date("2026-07-16T08:00:00Z") },
  ], new Date("2026-07-18T12:00:00Z"));
  assert.equal(prediction.overflowProjection.status, "INSUFFICIENT_DATA");
  assert.equal(prediction.overflowProjection.remainingHours, null);
});

test("rejects out-of-range levels from the regression input", () => {
  const prediction = calculateOverflowPrediction("tank", 5_000, [
    { level: -10, recordedAt: new Date("2026-07-17T07:00:00Z") },
    { level: 50, recordedAt: new Date("2026-07-17T08:00:00Z") },
    { level: 60, recordedAt: new Date("2026-07-17T09:00:00Z") },
  ]);
  assert.equal(prediction.samples, 2);
  assert.equal(prediction.fillVelocityPercentPerHour, 10);
  assert.ok(prediction.dataQualityIssues.includes("INVALID_LEVEL"));
});

test("starts a new filling cycle after a tank emptying event", () => {
  const now = new Date("2026-07-17T12:00:00Z");
  const prediction = calculateOverflowPrediction("tank", 10_000, [
    { level: 80, recordedAt: new Date("2026-07-17T08:00:00Z") },
    { level: 90, recordedAt: new Date("2026-07-17T09:00:00Z") },
    { level: 20, recordedAt: new Date("2026-07-17T10:00:00Z") },
    { level: 25, recordedAt: new Date("2026-07-17T11:00:00Z") },
    { level: 30, recordedAt: now },
  ], now);
  assert.equal(prediction.samples, 3);
  assert.equal(prediction.fillVelocityPercentPerHour, 5);
  assert.equal(prediction.fillingCycleStartedAt, "2026-07-17T10:00:00.000Z");
  assert.ok(prediction.dataQualityIssues.includes("EMPTYING_EVENT"));
});

test("reports duplicate, future, negative-gas, stale, and gap quality issues without mutating input", () => {
  const now = new Date("2026-07-18T12:00:00Z");
  const readings = [
    { level: 10, gasLevel: 5, recordedAt: new Date("2026-07-17T08:00:00Z") },
    { level: 10, gasLevel: 5, recordedAt: new Date("2026-07-17T08:00:00Z") },
    { level: 15, gasLevel: -1, recordedAt: new Date("2026-07-17T09:00:00Z") },
    { level: 20, gasLevel: 5, recordedAt: new Date("2026-07-17T12:00:00Z") },
    { level: 25, gasLevel: 5, recordedAt: new Date("2026-07-17T13:00:00Z") },
    { level: 30, gasLevel: 5, recordedAt: new Date("2026-07-19T13:00:00Z") },
  ];
  const original = readings.map(({ level }) => level);
  const prediction = calculateOverflowPrediction("tank", 10_000, readings, now);
  assert.deepEqual(readings.map(({ level }) => level), original);
  for (const issue of ["DUPLICATE_READING", "NEGATIVE_GAS", "FUTURE_TIMESTAMP", "STALE_READING", "COMMUNICATION_GAP"] as const) {
    assert.ok(prediction.dataQualityIssues.includes(issue));
  }
  assert.equal(prediction.predictionQualityStatus, "POOR");
});

test("calculates a 95 percent interval and configurable time-to-danger risk bands", () => {
  const now = new Date("2026-07-17T12:00:00Z");
  const prediction = calculateOverflowPrediction("tank", 10_000, [
    { level: 60, recordedAt: new Date("2026-07-17T08:00:00Z") },
    { level: 64, recordedAt: new Date("2026-07-17T09:00:00Z") },
    { level: 71, recordedAt: new Date("2026-07-17T10:00:00Z") },
    { level: 75, recordedAt: new Date("2026-07-17T11:00:00Z") },
    { level: 80, recordedAt: now },
  ], now);
  assert.equal(prediction.risk, "CRITICAL");
  assert.notEqual(prediction.overflowProjection.predictionInterval95.minimumHours, null);
});
