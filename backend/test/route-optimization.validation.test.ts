import assert from "node:assert/strict";
import test from "node:test";
import {
  RouteOptimizationValidationError, validateRouteOptimizationRequest,
} from "../src/services/route-optimization.service";

test("route optimization rejects values that could create an invalid or non-terminating route", () => {
  for (const value of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () => validateRouteOptimizationRequest({ truckCapacityLiters: value }),
      RouteOptimizationValidationError,
    );
  }
  assert.throws(
    () => validateRouteOptimizationRequest({ excludedTankIds: ["not-a-uuid"] }),
    RouteOptimizationValidationError,
  );
});

test("route optimization accepts bounded, valid dispatcher controls", () => {
  const request = validateRouteOptimizationRequest({
    truckId: "TRUCK-02", truckCapacityLiters: 12_000, shiftDurationMinutes: 480,
    planningHorizonHours: 24,
    excludedTankIds: ["00000000-0000-4000-8000-000000000001"],
  });
  assert.equal(request.truckCapacityLiters, 12_000);
});
