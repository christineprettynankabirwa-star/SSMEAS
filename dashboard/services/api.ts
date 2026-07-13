import axios from "axios";
import type { SensorReading, Tank } from "@/components/dashboard/types";

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api", timeout: 10_000 });
export interface HealthStatus { status: string; timestamp?: string; }
export const getHealth = async (): Promise<HealthStatus> => (await api.get<HealthStatus>("/health")).data;
export const getTanks = async (): Promise<Tank[]> => (await api.get<Tank[]>("/tanks")).data;
export const getLiveReading = async (): Promise<SensorReading> => (await api.get<SensorReading>("/readings/live")).data;
export default api;
