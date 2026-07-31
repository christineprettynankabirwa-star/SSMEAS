import axios from "axios";
import type { AlertItem, AnalyticsRange, AnalyticsResponse, DashboardSummary, HistoricalSensorReading, MaintenanceItem, MaintenanceOfficer, MaintenancePriority, MaintenanceStatus, NotificationItem, NotificationPreferences, OptimizedRoute, OverflowPrediction, PredictionApiResponse, PredictionEvaluation, RouteOptimizationRequest, SensorReading, Tank } from "@/components/dashboard/types";

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api", timeout: 10_000 });
export interface LoginResponse { token: string; }
export interface UserProfile { id: string; full_name: string; email: string; role: "ADMINISTRATOR" | "MAINTENANCE_OFFICER" | "SUPERVISOR" | "CLIENT"; }
export interface ManagedUser extends UserProfile { phone_number: string | null; created_at: string; updated_at: string; }
export const setAccessToken = (token: string | null): void => {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
};
export const login = async (email: string, password: string): Promise<LoginResponse> =>
  (await api.post<LoginResponse>("/login", { email, password })).data;
export const getProfile = async (): Promise<UserProfile> => (await api.get<UserProfile>("/profile")).data;
export const getUsers = async (): Promise<ManagedUser[]> => (await api.get<ManagedUser[]>("/users")).data;
export const createUser = async (value: { full_name: string; email: string; password: string; role: UserProfile["role"] }): Promise<ManagedUser> => (await api.post<ManagedUser>("/users", value)).data;
export const updateUser = async (id: string, value: { full_name: string; email: string; password?: string; role: UserProfile["role"] }): Promise<ManagedUser> => (await api.patch<ManagedUser>(`/users/${encodeURIComponent(id)}`, value)).data;
export const updateUserRole = async (id: string, role: UserProfile["role"]): Promise<ManagedUser> => (await api.patch<ManagedUser>(`/users/${encodeURIComponent(id)}/role`, { role })).data;
export const deleteUser = async (id: string): Promise<void> => { await api.delete(`/users/${encodeURIComponent(id)}`); };
export interface HealthStatus { status: string; timestamp?: string; }
export const getHealth = async (): Promise<HealthStatus> => (await api.get<HealthStatus>("/health")).data;
export const getTanks = async (): Promise<Tank[]> => (await api.get<Tank[]>("/tanks")).data;
export const getTank = async (tankId: string): Promise<Tank> =>
  (await api.get<Tank>(`/tanks/${encodeURIComponent(tankId)}`)).data;
export type TankConfigurationInput = Pick<Tank, "tank_name" | "owner_name" | "location" | "latitude" | "longitude" | "capacity_liters"> & Partial<Pick<Tank, "status" | "thingspeak_channel_id" | "hardware_id" | "warning_fill_threshold" | "critical_fill_threshold">>;
export const createTank = async (input: TankConfigurationInput): Promise<Tank> =>
  (await api.post<Tank>("/tanks", input)).data;
export const updateTank = async (tankId: string, input: Partial<TankConfigurationInput>): Promise<Tank> =>
  (await api.put<Tank>(`/tanks/${encodeURIComponent(tankId)}`, input)).data;
export const getLiveReading = async (): Promise<SensorReading> => (await api.get<SensorReading>("/readings/live")).data;
export const getLatestReadings = async (): Promise<SensorReading[]> => (await api.get<SensorReading[]>("/readings/latest")).data;
export const getReadingHistory = async (tankId: string): Promise<HistoricalSensorReading[]> => (await api.get<HistoricalSensorReading[]>(`/readings/history/${encodeURIComponent(tankId)}`)).data;
const analyticsCache = new Map<string, { expires: number; promise: Promise<AnalyticsResponse> }>();
export const getAnalytics = (tankIds: string[], range: AnalyticsRange, force = false): Promise<AnalyticsResponse> => {
  const key = `${[...tankIds].sort().join(",")}:${range}`;
  const cached = analyticsCache.get(key);
  if (!force && cached && cached.expires > Date.now()) return cached.promise;
  const promise = api.get<AnalyticsResponse>("/readings/analytics", { params: { tankIds: tankIds.join(","), range } }).then(({ data }) => data).catch(async (error: unknown) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 404) throw error;
    const histories = await Promise.all(tankIds.map(async (tankId) => (await getReadingHistory(tankId)).map((reading) => ({ ...reading, tank_id: tankId }))));
    const cutoff = range === "all" ? 0 : Date.now() - ({ "1h": 1, "24h": 24, "7d": 168, "30d": 720 }[range] * 3_600_000);
    const readings = histories.flat().filter((reading) => new Date(reading.recorded_at).getTime() >= cutoff);
    const numbers = (key: "level" | "gas_level") => readings.map((reading) => reading[key]).filter((value): value is number => value !== null);
    const fills = numbers("level"); const gases = numbers("gas_level");
    const latestByTank = histories.map((items) => items.at(-1));
    return { range, generatedAt: new Date().toISOString(), readings, summary: {
      highestFill: fills.length ? Math.max(...fills) : null,
      averageFill: fills.length ? fills.reduce((sum, value) => sum + value, 0) / fills.length : null,
      highestGas: gases.length ? Math.max(...gases) : null,
      reportingDeviceCount: latestByTank.filter((reading) => reading && new Date(reading.recorded_at).getTime() >= Date.now() - 300_000).length,
      offlineDeviceCount: latestByTank.filter((reading) => !reading || new Date(reading.recorded_at).getTime() < Date.now() - 300_000).length,
    } };
  });
  analyticsCache.set(key, { expires: Date.now() + 15_000, promise });
  promise.catch(() => analyticsCache.delete(key));
  return promise;
};
export const getDashboardSummary = async (): Promise<DashboardSummary> => (await api.get<DashboardSummary>("/dashboard/summary")).data;
export const getAlerts = async (): Promise<AlertItem[]> => (await api.get<AlertItem[]>("/alerts")).data;
export const acknowledgeAlert = async (id: string): Promise<AlertItem> => (await api.patch<AlertItem>(`/alerts/${encodeURIComponent(id)}/acknowledge`)).data;
export const resolveAlert = async (id: string): Promise<AlertItem> => (await api.patch<AlertItem>(`/alerts/${encodeURIComponent(id)}/resolve`)).data;
export const getMaintenance = async (): Promise<MaintenanceItem[]> => (await api.get<MaintenanceItem[]>("/maintenance")).data;
export const createMaintenance = async (input: { tank_id: string; task: string; scheduled_for: string; status?: MaintenanceStatus; priority?: MaintenancePriority; assigned_to?: string | null; notes?: string | null }): Promise<MaintenanceItem> => (await api.post<MaintenanceItem>("/maintenance", input)).data;
export const updateMaintenance = async (id: string, input: Partial<{ status: MaintenanceStatus; priority: MaintenancePriority; assigned_to: string | null; scheduled_for: string; notes: string | null }>): Promise<MaintenanceItem> => (await api.patch<MaintenanceItem>(`/maintenance/${encodeURIComponent(id)}`, input)).data;
export const deleteMaintenance = async (id: string): Promise<void> => { await api.delete(`/maintenance/${encodeURIComponent(id)}`); };
export const getMaintenanceOfficers = async (): Promise<MaintenanceOfficer[]> => (await api.get<MaintenanceOfficer[]>("/maintenance-officers")).data;
export const getOverflowPrediction = async (tankId: string): Promise<OverflowPrediction> =>
  (await api.get<OverflowPrediction>(`/predictions/${encodeURIComponent(tankId)}`)).data;
export const getOverflowPredictions = async (): Promise<PredictionApiResponse[]> =>
  (await api.get<PredictionApiResponse[]>("/predictions")).data;
export const getPredictionEvaluation = async (tankId?: string): Promise<PredictionEvaluation> =>
  (await api.get<PredictionEvaluation>("/predictions/evaluation", { params: tankId ? { tankId } : undefined })).data;
export const getOptimizedRoute = async (request?: RouteOptimizationRequest): Promise<OptimizedRoute> =>
  request
    ? (await api.post<OptimizedRoute>("/routes/optimized", request)).data
    : (await api.get<OptimizedRoute>("/routes/optimized")).data;
export const getNotifications = async (): Promise<NotificationItem[]> => (await api.get<NotificationItem[]>("/notifications")).data;
export const getUnreadNotifications = async (): Promise<NotificationItem[]> => (await api.get<NotificationItem[]>("/notifications/unread")).data;
export const getUnreadNotificationCount = async (): Promise<number> => (await api.get<{ count: number }>("/notifications/unread-count")).data.count;
export const markNotificationRead = async (id: string): Promise<NotificationItem> => (await api.patch<NotificationItem>(`/notifications/${encodeURIComponent(id)}/read`)).data;
export const markAllNotificationsRead = async (): Promise<{ updated: number }> => (await api.patch<{ updated: number }>("/notifications/read-all")).data;
export const getNotificationPreferences = async (): Promise<NotificationPreferences> => (await api.get<NotificationPreferences>("/notifications/preferences")).data;
export const updateNotificationPreferences = async (value: Omit<NotificationPreferences, "id" | "user_id" | "created_at" | "updated_at">): Promise<NotificationPreferences> => (await api.put<NotificationPreferences>("/notifications/preferences", value)).data;
export const testNotificationEmail = async (): Promise<{ message: string }> => (await api.post<{ message: string }>("/notifications/test-email")).data;
export const deleteNotification = async (id: string): Promise<void> => {
  await api.delete(`/notifications/${encodeURIComponent(id)}`);
};
export type SimulationCondition = "SAFE" | "WARNING" | "DANGER";
export interface SimulationResult {
  tankId: string; tankName: string; condition: SimulationCondition;
  reading: SensorReading; resolvedAlerts: number; cancelledMaintenance: number;
}
export const generateSimulationReading = async (
  tankId: string, condition: SimulationCondition,
): Promise<SimulationResult> =>
  (await api.post<SimulationResult>(
    `/simulation/tanks/${encodeURIComponent(tankId)}/readings`, { condition },
  )).data;
export const resetSimulationTank = async (tankId: string): Promise<SimulationResult> =>
  (await api.post<SimulationResult>(
    `/simulation/tanks/${encodeURIComponent(tankId)}/reset`,
  )).data;
export const resetAllTestTanks = async (): Promise<{ results: SimulationResult[] }> =>
  (await api.post<{ results: SimulationResult[] }>("/simulation/reset-all")).data;
export default api;
