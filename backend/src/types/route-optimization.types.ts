export interface RouteCandidate {
  tankId: string;
  tankName: string;
  location: string;
  latitude: number;
  longitude: number;
  task: string;
  scheduledFor: Date;
}

export interface OptimizedRouteStop extends RouteCandidate {
  sequence: number;
  distanceFromPreviousKm: number;
}

export interface OptimizedRoute {
  depot: { latitude: number; longitude: number };
  stops: OptimizedRouteStop[];
  totalDistanceKm: number;
  generatedAt: string;
}
