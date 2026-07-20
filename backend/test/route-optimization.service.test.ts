import assert from "node:assert/strict";
import test from "node:test";
import { haversineDistanceKm, optimizeMaintenanceRoute } from "../src/services/route-optimization.service";

test("calculates geographic distance and visits the nearest stop first", () => {
  const depot = { latitude: 0.3476, longitude: 32.5825 };
  const route = optimizeMaintenanceRoute([
    { tankId: "far", tankName: "Far", location: "Far", latitude: 0.6, longitude: 32.8, task: "Inspect", scheduledFor: new Date(1), fillLevel: 70, priority: "MEDIUM", priorityScore: 49 },
    { tankId: "near", tankName: "Near", location: "Near", latitude: 0.35, longitude: 32.59, task: "Pump", scheduledFor: new Date(2), fillLevel: 70, priority: "MEDIUM", priorityScore: 49 },
  ], depot);
  assert.equal(route.stops[0]?.tankId, "near");
  assert.equal(route.stops[1]?.tankId, "far");
  assert.ok(route.totalDistanceKm > 0);
  assert.equal(route.tankCount, 2);
  assert.ok(route.estimatedDurationMinutes >= 40);
  assert.equal(route.priorityScore, 49);
  assert.ok(haversineDistanceKm(depot, depot) < 0.001);
});

test("routes critical tanks before closer lower-priority tanks", () => {
  const depot = { latitude: 0, longitude: 0 };
  const route = optimizeMaintenanceRoute([
    { tankId: "near", tankName: "Near", location: "Near", latitude: 0.001, longitude: 0, task: "Collect", scheduledFor: new Date(1), fillLevel: 82, priority: "HIGH", priorityScore: 86 },
    { tankId: "critical", tankName: "Critical", location: "Far", latitude: 0.1, longitude: 0, task: "Collect", scheduledFor: new Date(2), fillLevel: 98, priority: "CRITICAL", priorityScore: 100 },
  ], depot);
  assert.equal(route.stops[0]?.tankId, "critical");
});
