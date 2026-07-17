import assert from "node:assert/strict";
import test from "node:test";
import { haversineDistanceKm, optimizeMaintenanceRoute } from "../src/services/route-optimization.service";

test("calculates geographic distance and visits the nearest stop first", () => {
  const depot = { latitude: 0.3476, longitude: 32.5825 };
  const route = optimizeMaintenanceRoute([
    { tankId: "far", tankName: "Far", location: "Far", latitude: 0.6, longitude: 32.8, task: "Inspect", scheduledFor: new Date(1) },
    { tankId: "near", tankName: "Near", location: "Near", latitude: 0.35, longitude: 32.59, task: "Pump", scheduledFor: new Date(2) },
  ], depot);
  assert.equal(route.stops[0]?.tankId, "near");
  assert.equal(route.stops[1]?.tankId, "far");
  assert.ok(route.totalDistanceKm > 0);
  assert.ok(haversineDistanceKm(depot, depot) < 0.001);
});
