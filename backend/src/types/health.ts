// Defines shared TypeScript types for health endpoint responses.
export interface HealthResponse {
  status: "OK";
  message: string;
  timestamp: string;
}
