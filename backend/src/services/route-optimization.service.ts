import * as routeModel from "../models/route-optimization.model";
import { getRoadMatrix, getRoadRoute, haversineDistanceKm } from "./road-network.service";
import type {
  Coordinate, OptimizedRoute, OptimizedRouteStop, RouteCandidate, RouteOptimizationRequest,
} from "../types/route-optimization.types";
import { predictAllOverflows } from "./prediction.service";

export { haversineDistanceKm };

const configuredNumber = (name: string, fallback: number): number => {
  const value = Number(process.env[name] ?? fallback);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};
const depot = (): Coordinate => ({
  latitude: configuredNumber("DEPOT_LATITUDE", 0.3476),
  longitude: configuredNumber("DEPOT_LONGITUDE", 32.5825),
});
const disposalSite = () => ({
  name: process.env.DISPOSAL_SITE_NAME ?? "Treatment Plant",
  latitude: configuredNumber("DISPOSAL_SITE_LATITUDE", configuredNumber("DEPOT_LATITUDE", 0.3476)),
  longitude: configuredNumber("DISPOSAL_SITE_LONGITUDE", configuredNumber("DEPOT_LONGITUDE", 32.5825)),
});
const priorityRank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 } as const;

const twoOpt = (route: number[], costs: number[][], fixed: Set<number>): number[] => {
  let best = [...route];
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < best.length - 1; i++) {
      for (let k = i + 1; k < best.length; k++) {
        if (best.slice(i, k + 1).some((index) => fixed.has(index))) continue;
        const previous = i === 0 ? 0 : best[i - 1]!;
        const after = k === best.length - 1 ? 0 : best[k + 1]!;
        const currentCost = costs[previous]![best[i]!]! + costs[best[k]!]![after]!;
        const reversedCost = costs[previous]![best[k]!]! + costs[best[i]!]![after]!;
        if (reversedCost + 0.01 < currentCost) {
          best = [...best.slice(0, i), ...best.slice(i, k + 1).reverse(), ...best.slice(k + 1)];
          improved = true;
        }
      }
    }
  }
  return best;
};

const orderCandidates = (
  candidates: RouteCandidate[],
  matrixCandidates: RouteCandidate[],
  durations: number[][],
  request: RouteOptimizationRequest,
): RouteCandidate[] => {
  const preferred = request.preferredOrder ?? [];
  if (preferred.length) {
    const rank = new Map(preferred.map((id, index) => [id, index]));
    return [...candidates].sort((a, b) => {
      const priority = priorityRank[a.priority] - priorityRank[b.priority];
      if (priority) return priority;
      const aRank = rank.get(a.tankId); const bRank = rank.get(b.tankId);
      if (aRank !== undefined || bRank !== undefined) return (aRank ?? Number.MAX_SAFE_INTEGER) - (bRank ?? Number.MAX_SAFE_INTEGER);
      return b.priorityScore - a.priorityScore;
    });
  }
  const matrixIndex = new Map(matrixCandidates.map((candidate, index) => [candidate.tankId, index + 1]));
  const remaining = candidates.map((candidate) => matrixIndex.get(candidate.tankId)!);
  const route: number[] = [];
  let current = 0;
  while (remaining.length) {
    remaining.sort((a, b) => {
      const left = matrixCandidates[a - 1]!; const right = matrixCandidates[b - 1]!;
      const priority = priorityRank[left.priority] - priorityRank[right.priority];
      if (priority) return priority;
      const urgency = right.priorityScore - left.priorityScore;
      if (urgency) return urgency;
      return durations[current]![a]! - durations[current]![b]!;
    });
    current = remaining.shift()!;
    route.push(current);
  }
  const fixed = new Set(route.filter((index) => request.lockedTankIds?.includes(matrixCandidates[index - 1]!.tankId)));
  const refined: number[] = [];
  for (const priority of ["CRITICAL", "HIGH", "MEDIUM"] as const) {
    const group = route.filter((index) => matrixCandidates[index - 1]!.priority === priority);
    refined.push(...twoOpt(group, durations, fixed));
  }
  return refined.map((index) => matrixCandidates[index - 1]!);
};

const serviceMinutes = (candidate: RouteCandidate): number =>
  /emergency/i.test(candidate.task) ? configuredNumber("ROUTE_EMERGENCY_SERVICE_MINUTES", 30)
    : configuredNumber("ROUTE_SERVICE_MINUTES_PER_TANK", 20);

export const optimizeMaintenanceRoute = (
  candidates: RouteCandidate[],
  start: Coordinate,
  now = new Date(),
  request: RouteOptimizationRequest = {},
): OptimizedRoute => {
  const points = [start, ...candidates, disposalSite()];
  const distances = points.map((from) => points.map((to) => haversineDistanceKm(from, to)));
  const durations = distances.map((row) => row.map((distance) => distance * 2));
  return buildRoute(candidates, candidates, start, distances, durations, {
    ...request,
    truckCapacityLiters: request.truckCapacityLiters ?? configuredNumber("TRUCK_CAPACITY_LITERS", 10_000),
  }, now, "FALLBACK", "Synchronous road-network fallback.");
};

const buildRoute = (
  candidates: RouteCandidate[], matrixCandidates: RouteCandidate[], start: Coordinate, distances: number[][], durations: number[][],
  request: RouteOptimizationRequest, now: Date, source: "OSRM" | "FALLBACK", fallbackReason: string | null,
): OptimizedRoute => {
  const capacity = request.truckCapacityLiters ?? configuredNumber("TRUCK_CAPACITY_LITERS", 10_000);
  const disposal = disposalSite();
  const ordered = orderCandidates(candidates, matrixCandidates, durations, request);
  const candidateIndex = new Map(matrixCandidates.map((candidate, index) => [candidate.tankId, index + 1]));
  const stops: OptimizedRouteStop[] = [];
  let currentIndex = 0; let payload = 0; let serviceTotal = 0; let unloadingTotal = 0;
  const appendDisposal = () => {
    const disposalIndex = matrixCandidates.length + 1;
    stops.push({
      stopType: "DISPOSAL", sequence: stops.length + 1, name: disposal.name,
      latitude: disposal.latitude, longitude: disposal.longitude,
      distanceFromPreviousKm: Number(distances[currentIndex]![disposalIndex]!.toFixed(2)),
      drivingMinutesFromPrevious: Math.round(durations[currentIndex]![disposalIndex]!),
      payloadBeforeLiters: payload, payloadAfterLiters: 0,
    });
    currentIndex = disposalIndex; payload = 0;
    unloadingTotal += configuredNumber("DISPOSAL_UNLOADING_MINUTES", 30);
  };
  for (const candidate of ordered) {
    const index = candidateIndex.get(candidate.tankId)!;
    let remainingVolume = candidate.estimatedCollectionLiters;
    do {
      if (payload >= capacity || (payload > 0 && payload + remainingVolume > capacity)) appendDisposal();
      const collected = Math.min(remainingVolume, capacity - payload);
      payload += collected;
      remainingVolume -= collected;
      serviceTotal += serviceMinutes(candidate);
      stops.push({
        ...candidate, estimatedCollectionLiters: collected,
        stopType: "TANK", sequence: stops.length + 1,
        distanceFromPreviousKm: Number(distances[currentIndex]![index]!.toFixed(2)),
        drivingMinutesFromPrevious: Math.round(durations[currentIndex]![index]!),
        payloadAfterLiters: payload,
        locked: request.lockedTankIds?.includes(candidate.tankId) ?? false,
      });
      currentIndex = index;
      if (remainingVolume > 0) appendDisposal();
    } while (remainingVolume > 0);
  }
  const returnDistance = distances[currentIndex]![0]!;
  const returnDuration = durations[currentIndex]![0]!;
  stops.push({
    stopType: "DEPOT_RETURN", sequence: stops.length + 1, name: "Return to Depot",
    ...start, distanceFromPreviousKm: Number(returnDistance.toFixed(2)),
    drivingMinutesFromPrevious: Math.round(returnDuration),
    payloadBeforeLiters: payload, payloadAfterLiters: payload,
  });
  const driving = stops.reduce((sum, stop) => sum + stop.drivingMinutesFromPrevious, 0);
  const distance = stops.reduce((sum, stop) => sum + stop.distanceFromPreviousKm, 0);
  const duration = Math.round(driving + serviceTotal + unloadingTotal);
  const shift = request.shiftDurationMinutes ?? configuredNumber("ROUTE_SHIFT_DURATION_MINUTES", 480);
  return {
    depot: start, disposalSite: disposal, stops, roadGeometry: [], totalDistanceKm: Number(distance.toFixed(2)),
    totalDrivingMinutes: Math.round(driving), totalServiceMinutes: serviceTotal,
    totalUnloadingMinutes: unloadingTotal, estimatedDurationMinutes: duration,
    tankCount: ordered.length, disposalTrips: stops.filter((stop) => stop.stopType === "DISPOSAL").length,
    truckCapacityLiters: capacity, selectedTruckId: request.truckId ?? "TRUCK-01",
    selectedDriverId: request.driverId ?? null, availableDrivers: [],
    shiftDurationMinutes: shift, exceedsShift: duration > shift, deferredTankIds: [],
    priorityScore: ordered.length ? Math.round(ordered.reduce((sum, stop) => sum + stop.priorityScore, 0) / ordered.length) : 0,
    routingSource: source, fallbackReason, generatedAt: now.toISOString(),
  };
};

export const getOptimizedMaintenanceRoute = async (
  request: RouteOptimizationRequest = {},
): Promise<OptimizedRoute> => {
  const start = depot();
  await predictAllOverflows();
  const [all, availableDrivers] = await Promise.all([
    routeModel.getOpenMaintenanceStops(),
    routeModel.getAvailableDrivers(),
  ]);
  const excluded = new Set(request.excludedTankIds ?? []);
  let candidates = all.filter((candidate) => !excluded.has(candidate.tankId));
  const matrixCandidates = [...candidates];
  const disposal = disposalSite();
  const matrix = await getRoadMatrix([start, ...matrixCandidates, disposal]);
  let route = buildRoute(candidates, matrixCandidates, start, matrix.distancesKm, matrix.durationsMinutes, request, new Date(), matrix.source, matrix.fallbackReason);
  const deferredTankIds: string[] = [];
  while (route.exceedsShift) {
    const deferrable = [...candidates]
      .filter((candidate) => candidate.priority !== "CRITICAL" && !request.lockedTankIds?.includes(candidate.tankId))
      .sort((a, b) => priorityRank[b.priority] - priorityRank[a.priority] || a.priorityScore - b.priorityScore)[0];
    if (!deferrable) break;
    deferredTankIds.push(deferrable.tankId);
    candidates = candidates.filter((candidate) => candidate.tankId !== deferrable.tankId);
    route = buildRoute(candidates, matrixCandidates, start, matrix.distancesKm, matrix.durationsMinutes, request, new Date(), matrix.source, matrix.fallbackReason);
  }
  route.deferredTankIds = deferredTankIds;
  route.availableDrivers = availableDrivers;
  const journeyCoordinates: Coordinate[] = [start, ...route.stops.map((stop) => ({ latitude: stop.latitude, longitude: stop.longitude }))];
  const roadRoute = await getRoadRoute(journeyCoordinates);
  route.roadGeometry = roadRoute.geometry;
  route.totalDistanceKm = Number(roadRoute.distanceKm.toFixed(2));
  route.totalDrivingMinutes = Math.round(roadRoute.durationMinutes);
  route.estimatedDurationMinutes = Math.round(roadRoute.durationMinutes + route.totalServiceMinutes + route.totalUnloadingMinutes);
  route.exceedsShift = route.estimatedDurationMinutes > route.shiftDurationMinutes;
  if (roadRoute.source === "FALLBACK") {
    route.routingSource = "FALLBACK";
    route.fallbackReason = roadRoute.fallbackReason;
  }
  return route;
};
