import axios from "axios";
import type { Coordinate } from "../types/route-optimization.types";

export interface RoadMatrix {
  distancesKm: number[][];
  durationsMinutes: number[][];
  source: "OSRM" | "FALLBACK";
  fallbackReason: string | null;
}

export interface RoadRoute {
  distanceKm: number;
  durationMinutes: number;
  geometry: Array<[number, number]>;
  source: "OSRM" | "FALLBACK";
  fallbackReason: string | null;
}

export const haversineDistanceKm = (a: Coordinate, b: Coordinate): number => {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = radians(b.latitude - a.latitude);
  const longitudeDelta = radians(b.longitude - a.longitude);
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(a.latitude)) * Math.cos(radians(b.latitude))
    * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

const fallbackMatrix = (coordinates: Coordinate[], reason: string): RoadMatrix => {
  const distancesKm = coordinates.map((from) => coordinates.map((to) => haversineDistanceKm(from, to)));
  return {
    distancesKm,
    durationsMinutes: distancesKm.map((row) => row.map((distance) => distance / 30 * 60)),
    source: "FALLBACK",
    fallbackReason: reason,
  };
};

const baseUrl = () => (process.env.ROUTING_API_BASE_URL ?? "https://router.project-osrm.org").replace(/\/$/, "");
const coordinatesPath = (coordinates: Coordinate[]) =>
  coordinates.map(({ longitude, latitude }) => `${longitude},${latitude}`).join(";");

export const getRoadMatrix = async (coordinates: Coordinate[]): Promise<RoadMatrix> => {
  if (coordinates.length < 2) return fallbackMatrix(coordinates, "Not enough locations for a road matrix.");
  try {
    const { data } = await axios.get<{
      code: string; distances?: Array<Array<number | null>>; durations?: Array<Array<number | null>>;
    }>(`${baseUrl()}/table/v1/driving/${coordinatesPath(coordinates)}`, {
      params: { annotations: "distance,duration" },
      timeout: Number(process.env.ROUTING_API_TIMEOUT_MS ?? 8000),
    });
    if (data.code !== "Ok" || !data.distances || !data.durations) throw new Error(`OSRM table returned ${data.code}.`);
    const fallback = fallbackMatrix(coordinates, "A road matrix cell was unavailable.");
    return {
      distancesKm: data.distances.map((row, i) => row.map((value, j) => value === null ? fallback.distancesKm[i]![j]! : value / 1000)),
      durationsMinutes: data.durations.map((row, i) => row.map((value, j) => value === null ? fallback.durationsMinutes[i]![j]! : value / 60)),
      source: "OSRM",
      fallbackReason: null,
    };
  } catch (error) {
    return fallbackMatrix(coordinates, error instanceof Error ? error.message : "Road matrix service unavailable.");
  }
};

export const getRoadRoute = async (coordinates: Coordinate[]): Promise<RoadRoute> => {
  const fallbackDistance = coordinates.slice(1).reduce((sum, coordinate, index) =>
    sum + haversineDistanceKm(coordinates[index]!, coordinate), 0);
  const fallback = (reason: string): RoadRoute => ({
    distanceKm: fallbackDistance,
    durationMinutes: fallbackDistance / 30 * 60,
    geometry: coordinates.map(({ latitude, longitude }) => [latitude, longitude]),
    source: "FALLBACK",
    fallbackReason: reason,
  });
  if (coordinates.length < 2) return fallback("Not enough locations for route geometry.");
  try {
    const { data } = await axios.get<{
      code: string;
      routes?: Array<{ distance: number; duration: number; geometry: { coordinates: Array<[number, number]> } }>;
    }>(`${baseUrl()}/route/v1/driving/${coordinatesPath(coordinates)}`, {
      params: { overview: "full", geometries: "geojson", steps: false },
      timeout: Number(process.env.ROUTING_API_TIMEOUT_MS ?? 8000),
    });
    const route = data.routes?.[0];
    if (data.code !== "Ok" || !route) throw new Error(`OSRM route returned ${data.code}.`);
    return {
      distanceKm: route.distance / 1000,
      durationMinutes: route.duration / 60,
      geometry: route.geometry.coordinates.map(([longitude, latitude]) => [latitude, longitude]),
      source: "OSRM",
      fallbackReason: null,
    };
  } catch (error) {
    return fallback(error instanceof Error ? error.message : "Road geometry service unavailable.");
  }
};
