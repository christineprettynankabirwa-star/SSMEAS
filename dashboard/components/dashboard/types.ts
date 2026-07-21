export type TankStatus = "ACTIVE" | "INACTIVE" | "MAINTENANCE";
export interface Tank { id: string; tank_name: string; owner_name: string; location: string; latitude: number; longitude: number; capacity_liters: number; status: TankStatus; thingspeak_channel_id?: number; created_at: string; updated_at: string; }
export interface SensorReading { id: string; tank_id: string; thingspeak_channel_id: number | null; thingspeak_entry_id: number | null; device_reading_id?: string | null; level: number | null; gas_level: number | null; recorded_at: string; created_at: string; }
export interface HistoricalSensorReading { recorded_at: string; level: number | null; gas_level: number | null; }
export type AnalyticsRange = "1h" | "24h" | "7d" | "30d" | "all";
export interface AnalyticsReading extends HistoricalSensorReading { tank_id: string; }
export interface AnalyticsSummary { highestFill: number | null; averageFill: number | null; highestGas: number | null; reportingDeviceCount: number; offlineDeviceCount: number; }
export interface AnalyticsResponse { range: AnalyticsRange; generatedAt: string; readings: AnalyticsReading[]; summary: AnalyticsSummary; }
export interface DashboardSummary { totalTanks: number; onlineTanks: number; activeAlerts: number; averageFillLevel: number; }
export interface AlertItem { id: string; tank_id: string; tank_name: string; alert_type: string; severity: "critical" | "warning" | "info"; status: "ACTIVE" | "RESOLVED"; message: string; created_at: string; }
export interface MaintenanceItem { id: string; tank_id: string; tank_name: string; task: string; scheduled_for: string; status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED"; created_at: string; }
export interface OverflowPrediction { tankId: string; currentLevel: number | null; trendPercentPerHour: number; predictedOverflowAt: string | null; recommendedMaintenanceAt: string | null; hoursUntilOverflow: number | null; risk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; riskPercentage: number; confidence: number; samples: number; generatedAt: string; }
export interface PredictionApiResponse { tank_id: string; predicted_overflow_time: string | null; hours_remaining: number | null; risk: number; confidence: number; recommended_maintenance_date: string | null; }
export interface OptimizedRouteStop { tankId: string; tankName: string; location: string; latitude: number; longitude: number; task: string; scheduledFor: string; fillLevel: number | null; priority: "CRITICAL" | "HIGH" | "MEDIUM"; priorityScore: number; sequence: number; distanceFromPreviousKm: number; }
export interface OptimizedRoute { depot: { latitude: number; longitude: number }; stops: OptimizedRouteStop[]; totalDistanceKm: number; estimatedDurationMinutes: number; tankCount: number; priorityScore: number; generatedAt: string; }
