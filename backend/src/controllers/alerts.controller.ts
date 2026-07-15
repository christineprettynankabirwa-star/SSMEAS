import type { Request, Response } from "express";
import { AlertTankNotFoundError, AlertValidationError, addAlert, listAlerts } from "../services/alerts.service";
import type { CreateAlertRequest } from "../types/alerts.types";

const handleError = (error: unknown, response: Response): void => {
  if (error instanceof AlertValidationError) { response.status(400).json({ message: error.message }); return; }
  if (error instanceof AlertTankNotFoundError) { response.status(404).json({ message: error.message }); return; }
  console.error("Alerts request failed:", error);
  response.status(500).json({ message: "An unexpected server error occurred." });
};

export const getAlerts = async (_request: Request, response: Response): Promise<void> => {
  try { response.status(200).json(await listAlerts()); } catch (error) { handleError(error, response); }
};

export const postAlert = async (request: Request, response: Response): Promise<void> => {
  try {
    if (typeof request.body !== "object" || request.body === null || Array.isArray(request.body)) {
      response.status(400).json({ message: "Request body must be a JSON object." });
      return;
    }
    response.status(201).json(await addAlert(request.body as CreateAlertRequest));
  } catch (error) { handleError(error, response); }
};
