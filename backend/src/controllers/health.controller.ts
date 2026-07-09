// Handles HTTP requests for the API health endpoint.
import { type Request, type Response } from "express";
import { getHealthStatus } from "../services/health.service";

export const healthCheck = async (
  _request: Request,
  response: Response,
): Promise<void> => {
  const healthStatus = await getHealthStatus();

  response.status(200).json(healthStatus);
};
