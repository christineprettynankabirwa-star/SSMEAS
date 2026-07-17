import type { Request, Response } from "express";
import { getOptimizedMaintenanceRoute } from "../services/route-optimization.service";

export const getOptimizedRoute = async (_request: Request, response: Response): Promise<void> => {
  try {
    response.json(await getOptimizedMaintenanceRoute());
  } catch (error) {
    console.error("Route optimization failed:", error);
    response.status(500).json({ message: "Unable to optimize the maintenance route." });
  }
};
