import axios from "axios";
import type { AlertItem, AnalyticsRange, AnalyticsResponse, DashboardSummary, HistoricalSensorReading, MaintenanceItem, OptimizedRoute, OverflowPrediction, SensorReading, Tank } from "@/components/dashboard/types";

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api", timeout: 10_000 });
export interface LoginResponse { token: string; }
export const setAccessToken = (token: string | null): void => {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
};
export const login = async (email: string, password: string): Promise<LoginResponse> =>
  (await api.post<LoginResponse>("/login", { email, password })).data;
export interface HealthStatus { status: string; timestamp?: string; }
export const getHealth = async (): Promise<HealthStatus> => (await api.get<HealthStatus>("/health")).data;
export const getTanks = async (): Promise<Tank[]> => (await api.get<Tank[]>("/tanks")).data;
export const getTank = async (tankId: string): Promise<Tank> =>
  (await api.get<Tank>(`/tanks/${encodeURIComponent(tankId)}`)).data;
export const getLiveReading = async (): Promise<SensorReading> => (await api.get<SensorReading>("/readings/live")).data;
export const getLatestReadings = async (): Promise<SensorReading[]> => (await api.get<SensorReading[]>("/readings/latest")).data;
export const getReadingHistory = async (tankId: string): Promise<HistoricalSensorReading[]> => (await api.get<HistoricalSensorReading[]>(`/readings/history/${encodeURIComponent(tankId)}`)).data;
const analyticsCache = new Map<string, { expires: number; promise: Promise<AnalyticsResponse> }>();
export const getAnalytics = (tankIds: string[], range: AnalyticsRange, force = false): Promise<AnalyticsResponse> => {
  const key = `${[...tankIds].sort().join(",")}:${range}`;
  const cached = analyticsCache.get(key);
  if (!force && cached && cached.expires > Date.now()) return cached.promise;
  const promise = api.get<AnalyticsResponse>("/readings/analytics", { params: { tankIds: tankIds.join(","), range } }).then(({ data }) => data);
  analyticsCache.set(key, { expires: Date.now() + 15_000, promise });
  promise.catch(() => analyticsCache.delete(key));
  return promise;
};
export const getDashboardSummary = async (): Promise<DashboardSummary> => (await api.get<DashboardSummary>("/dashboard/summary")).data;
export const getAlerts = async (): Promise<AlertItem[]> => (await api.get<AlertItem[]>("/alerts")).data;
export const getMaintenance = async (): Promise<MaintenanceItem[]> => (await api.get<MaintenanceItem[]>("/maintenance")).data;
export const getOverflowPrediction = async (tankId: string): Promise<OverflowPrediction> =>
  (await api.get<OverflowPrediction>(`/predictions/${encodeURIComponent(tankId)}`)).data;
export const getOptimizedRoute = async (): Promise<OptimizedRoute> => (await api.get<OptimizedRoute>("/routes/optimized")).data;
export default api;
