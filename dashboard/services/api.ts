import axios from "axios";
import type { AlertItem, DashboardSummary, HistoricalSensorReading, MaintenanceItem, SensorReading, Tank } from "@/components/dashboard/types";

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
export const getLiveReading = async (): Promise<SensorReading> => (await api.get<SensorReading>("/readings/live")).data;
export const getReadingHistory = async (tankId: string): Promise<HistoricalSensorReading[]> => (await api.get<HistoricalSensorReading[]>(`/readings/history/${encodeURIComponent(tankId)}`)).data;
export const getDashboardSummary = async (): Promise<DashboardSummary> => (await api.get<DashboardSummary>("/dashboard/summary")).data;
export const getAlerts = async (): Promise<AlertItem[]> => (await api.get<AlertItem[]>("/alerts")).data;
export const getMaintenance = async (): Promise<MaintenanceItem[]> => (await api.get<MaintenanceItem[]>("/maintenance")).data;
export default api;
