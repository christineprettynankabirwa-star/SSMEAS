import type { Request, Response } from "express";
import { MaintenanceForbiddenError, MaintenanceTankNotFoundError, MaintenanceValidationError, addMaintenance, changeMaintenanceForUser, listMaintenance, removeMaintenance } from "../services/maintenance.service";
import type { CreateMaintenanceRequest } from "../types/maintenance.types";

const handleError = (error: unknown, response: Response): void => {
  if (error instanceof MaintenanceValidationError) { response.status(400).json({ message: error.message }); return; }
  if (error instanceof MaintenanceTankNotFoundError) { response.status(404).json({ message: error.message }); return; }
  if (error instanceof MaintenanceForbiddenError) { response.status(403).json({ message: error.message }); return; }
  console.error("Maintenance request failed:", error);
  response.status(500).json({ message: "An unexpected server error occurred." });
};

export const getMaintenance = async (request: Request, response: Response): Promise<void> => {
  try { response.status(200).json(await listMaintenance(request.user)); } catch (error) { handleError(error, response); }
};

export const postMaintenance = async (request: Request, response: Response): Promise<void> => {
  try {
    if (typeof request.body !== "object" || request.body === null || Array.isArray(request.body)) {
      response.status(400).json({ message: "Request body must be a JSON object." });
      return;
    }
    response.status(201).json(await addMaintenance(request.body as CreateMaintenanceRequest));
  } catch (error) { handleError(error, response); }
};

export const patchMaintenance = async (request: Request, response: Response): Promise<void> => {
  try { response.status(200).json(await changeMaintenanceForUser(String(request.params.id ?? ""), request.body, request.user!)); }
  catch (error) { handleError(error, response); }
};
export const deleteMaintenance = async (request: Request, response: Response): Promise<void> => {
  try { await removeMaintenance(String(request.params.id)); response.status(204).end(); }
  catch (error) { handleError(error, response); }
};
