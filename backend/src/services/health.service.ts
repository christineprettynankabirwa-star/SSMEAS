// Contains health endpoint business logic for the SSMEAS backend.
import { type HealthResponse } from "../types/health";

export const getHealthStatus = async (): Promise<HealthResponse> => ({
  status: "OK",
  message: "SSMEAS Backend Running",
  timestamp: new Date().toISOString(),
});
