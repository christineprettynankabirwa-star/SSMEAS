import type { Request, Response } from "express";
import {
  getOptimizedMaintenanceRoute, RouteOptimizationValidationError,
  validateRouteOptimizationRequest,
} from "../services/route-optimization.service";

const handleError = (error: unknown, response: Response, message: string): void => {
  if (error instanceof RouteOptimizationValidationError) {
    response.status(400).json({ message: error.message });
    return;
  }
  console.error(message, error);
  response.status(500).json({ message: "Unable to optimize the maintenance route." });
};

export const getOptimizedRoute = async (_request: Request, response: Response): Promise<void> => {
  try {
    response.json(await getOptimizedMaintenanceRoute());
  } catch (error) {
    handleError(error, response, "Route optimization failed:");
  }
};

export const postOptimizedRoute = async (request: Request, response: Response): Promise<void> => {
  try {
    response.json(await getOptimizedMaintenanceRoute(validateRouteOptimizationRequest(request.body ?? {})));
  } catch (error) {
    handleError(error, response, "Route recalculation failed:");
  }
};
