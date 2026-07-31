export interface Coordinate {
  latitude: number;
  longitude: number;
}

export type RoutePriority = "CRITICAL" | "HIGH" | "MEDIUM";

export interface UrgencyFactor {
  label: string;
  points: number;
  detail: string;
}

export interface RouteCandidate extends Coordinate {
  tankId: string;
  tankName: string;
  location: string;
  task: string;
  scheduledFor: Date;
  fillLevel: number | null;
  capacityLiters: number;
  alertSeverity: "critical" | "warning" | null;
  alertCreatedAt: Date | null;
  predictedHoursToDanger: number | null;
  predictedHoursToOverflow: number | null;
  predictionQuality: "GOOD" | "LIMITED" | "POOR" | "INSUFFICIENT_DATA";
  assignedTo: string | null;
  assignedOfficer: string | null;
  priority: RoutePriority;
  priorityScore: number;
  urgencyFactors: UrgencyFactor[];
  estimatedCollectionLiters: number;
}

export interface RouteTankStop extends RouteCandidate {
  stopType: "TANK";
  sequence: number;
  distanceFromPreviousKm: number;
  drivingMinutesFromPrevious: number;
  payloadAfterLiters: number;
  locked: boolean;
}

export interface RouteFacilityStop extends Coordinate {
  stopType: "DISPOSAL" | "DEPOT_RETURN";
  sequence: number;
  name: string;
  distanceFromPreviousKm: number;
  drivingMinutesFromPrevious: number;
  payloadBeforeLiters: number;
  payloadAfterLiters: number;
}

export type OptimizedRouteStop = RouteTankStop | RouteFacilityStop;

export interface RouteOptimizationRequest {
  truckId?: string;
  driverId?: string;
  truckCapacityLiters?: number;
  shiftDurationMinutes?: number;
  excludedTankIds?: string[];
  preferredOrder?: string[];
  lockedTankIds?: string[];
  planningHorizonHours?: number;
}

export interface OptimizedRoute {
  depot: Coordinate;
  disposalSite: Coordinate & { name: string };
  stops: OptimizedRouteStop[];
  roadGeometry: Array<[number, number]>;
  totalDistanceKm: number;
  totalDrivingMinutes: number;
  totalServiceMinutes: number;
  totalUnloadingMinutes: number;
  estimatedDurationMinutes: number;
  tankCount: number;
  disposalTrips: number;
  truckCapacityLiters: number;
  selectedTruckId: string;
  selectedDriverId: string | null;
  availableDrivers: Array<{ id: string; name: string }>;
  shiftDurationMinutes: number;
  exceedsShift: boolean;
  deferredTankIds: string[];
  priorityScore: number;
  routingSource: "OSRM" | "FALLBACK";
  fallbackReason: string | null;
  generatedAt: string;
}
