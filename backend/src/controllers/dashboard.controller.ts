import type { Request, Response } from "express";
import { getSummary } from "../services/dashboard.service";

export const getDashboardSummary = async (_request: Request, response: Response): Promise<void> => {
  try {
    response.status(200).json(await getSummary());
  } catch (error) {
    console.error("Dashboard summary request failed:", error);
    response.status(500).json({ message: "Unable to load dashboard summary." });
  }
};
