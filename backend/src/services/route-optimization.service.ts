import * as routeModel from "../models/route-optimization.model";
import type { OptimizedRoute, RouteCandidate } from "../types/route-optimization.types";

export const haversineDistanceKm = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number => {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const earthRadiusKm = 6371;
  const latitudeDelta = radians(b.latitude - a.latitude);
  const longitudeDelta = radians(b.longitude - a.longitude);
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

export const optimizeMaintenanceRoute = (
  candidates: RouteCandidate[],
  depot: { latitude: number; longitude: number },
  now: Date = new Date(),
): OptimizedRoute => {
  const remaining = [...candidates];
  const stops: OptimizedRoute["stops"] = [];
  let current = depot;
  let totalDistanceKm = 0;
  const priorityRank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 } as const;

  while (remaining.length > 0) {
    remaining.sort((left, right) => {
      const priorityDifference = priorityRank[left.priority] - priorityRank[right.priority];
      if (priorityDifference !== 0) return priorityDifference;
      const distanceDifference = haversineDistanceKm(current, left) - haversineDistanceKm(current, right);
      return Math.abs(distanceDifference) > 0.001
        ? distanceDifference
        : left.scheduledFor.getTime() - right.scheduledFor.getTime();
    });
    const next = remaining.shift()!;
    const distance = haversineDistanceKm(current, next);
    totalDistanceKm += distance;
    stops.push({ ...next, sequence: stops.length + 1, distanceFromPreviousKm: Number(distance.toFixed(2)) });
    current = next;
  }

  const averageSpeedKph = configuredCoordinate("ROUTE_AVERAGE_SPEED_KPH", 30);
  const serviceMinutes = configuredCoordinate("ROUTE_SERVICE_MINUTES_PER_TANK", 20);
  const estimatedDurationMinutes = Math.round((totalDistanceKm / Math.max(1, averageSpeedKph)) * 60 + stops.length * serviceMinutes);
  const priorityScore = stops.length === 0 ? 0 : Math.round(stops.reduce((sum, stop) => sum + stop.priorityScore, 0) / stops.length);
  return { depot, stops, totalDistanceKm: Number(totalDistanceKm.toFixed(2)), estimatedDurationMinutes, tankCount: stops.length, priorityScore, generatedAt: now.toISOString() };
};

const configuredCoordinate = (name: string, fallback: number): number => {
  const value = Number(process.env[name] ?? fallback);
  return Number.isFinite(value) ? value : fallback;
};

export const getOptimizedMaintenanceRoute = async (): Promise<OptimizedRoute> => optimizeMaintenanceRoute(
  await routeModel.getOpenMaintenanceStops(),
  {
    latitude: configuredCoordinate("DEPOT_LATITUDE", 0.3476),
    longitude: configuredCoordinate("DEPOT_LONGITUDE", 32.5825),
  },
);
