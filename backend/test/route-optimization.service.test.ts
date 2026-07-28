import assert from "node:assert/strict";
import test from "node:test";
import { haversineDistanceKm, optimizeMaintenanceRoute } from "../src/services/route-optimization.service";
import type { RouteCandidate } from "../src/types/route-optimization.types";

const candidate = (value: Partial<RouteCandidate> & Pick<RouteCandidate, "tankId" | "latitude" | "longitude" | "priority" | "priorityScore">): RouteCandidate => ({
  tankName: value.tankId, location: value.tankId, task: "Inspect",
  scheduledFor: new Date(), fillLevel: 70, capacityLiters: 5_000,
  alertSeverity: null, alertCreatedAt: null, predictedMinutesToFull: null,
  assignedTo: null, assignedOfficer: null, urgencyFactors: [],
  estimatedCollectionLiters: 3_500,
  ...value,
});

test("calculates geographic fallback distance and visits the urgent nearest stop first", () => {
  const depot = { latitude: 0.3476, longitude: 32.5825 };
  const route = optimizeMaintenanceRoute([
    candidate({ tankId: "far", latitude: 0.6, longitude: 32.8, priority: "MEDIUM", priorityScore: 49 }),
    candidate({ tankId: "near", latitude: 0.35, longitude: 32.59, priority: "MEDIUM", priorityScore: 49 }),
  ], depot);
  const tanks = route.stops.filter((stop) => stop.stopType === "TANK");
  assert.equal(tanks[0]?.tankId, "near");
  assert.equal(tanks[1]?.tankId, "far");
  assert.equal(route.stops.at(-1)?.stopType, "DEPOT_RETURN");
  assert.ok(route.totalDistanceKm > 0);
  assert.equal(route.tankCount, 2);
  assert.ok(route.estimatedDurationMinutes >= 40);
  assert.equal(route.priorityScore, 49);
  assert.ok(haversineDistanceKm(depot, depot) < 0.001);
});

test("routes critical tanks before closer lower-priority tanks", () => {
  const route = optimizeMaintenanceRoute([
    candidate({ tankId: "near", latitude: 0.001, longitude: 0, priority: "HIGH", priorityScore: 86 }),
    candidate({ tankId: "critical", latitude: 0.1, longitude: 0, priority: "CRITICAL", priorityScore: 100 }),
  ], { latitude: 0, longitude: 0 });
  assert.equal(route.stops.find((stop) => stop.stopType === "TANK")?.tankId, "critical");
});

test("injects disposal stops before truck capacity is exceeded", () => {
  const route = optimizeMaintenanceRoute([
    candidate({ tankId: "one", latitude: 0.01, longitude: 0, priority: "HIGH", priorityScore: 70, estimatedCollectionLiters: 7_000 }),
    candidate({ tankId: "two", latitude: 0.02, longitude: 0, priority: "HIGH", priorityScore: 65, estimatedCollectionLiters: 6_000 }),
  ], { latitude: 0, longitude: 0 }, new Date(), { truckCapacityLiters: 10_000 });
  assert.ok(route.stops.some((stop) => stop.stopType === "DISPOSAL"));
  assert.ok(route.stops.filter((stop) => stop.stopType === "TANK").every((stop) => stop.payloadAfterLiters <= 10_000));
  assert.equal(route.disposalTrips, 1);
  assert.equal(route.stops.at(-1)?.stopType, "DEPOT_RETURN");
});

test("honors exclusions and a dispatcher preferred order", () => {
  const candidates = [
    candidate({ tankId: "a", latitude: 0.01, longitude: 0, priority: "HIGH", priorityScore: 60 }),
    candidate({ tankId: "b", latitude: 0.02, longitude: 0, priority: "HIGH", priorityScore: 60 }),
  ];
  const route = optimizeMaintenanceRoute(candidates, { latitude: 0, longitude: 0 }, new Date(), { preferredOrder: ["b", "a"] });
  assert.deepEqual(route.stops.filter((stop) => stop.stopType === "TANK").map((stop) => stop.tankId), ["b", "a"]);
});
