import * as maintenanceModel from "../models/maintenance.model";
import * as tankModel from "../models/tank.model";
import type { CreateMaintenanceRequest, MaintenanceRecord, MaintenanceStatus } from "../types/maintenance.types";

export class MaintenanceValidationError extends Error {}
export class MaintenanceTankNotFoundError extends Error {}
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const statuses = new Set<MaintenanceStatus>(["SCHEDULED", "IN_PROGRESS", "COMPLETED"]);

export const listMaintenance = async (): Promise<MaintenanceRecord[]> => maintenanceModel.getAllMaintenance();

export const addMaintenance = async (
  maintenance: CreateMaintenanceRequest,
): Promise<MaintenanceRecord> => {
  if (!uuidPattern.test(maintenance.tank_id)) throw new MaintenanceValidationError("tank_id must be a valid UUID.");
  if (typeof maintenance.task !== "string" || maintenance.task.trim().length === 0 || maintenance.task.length > 255) {
    throw new MaintenanceValidationError("task is required and must not exceed 255 characters.");
  }
  if (typeof maintenance.scheduled_for !== "string") {
    throw new MaintenanceValidationError("scheduled_for must be a valid ISO date-time.");
  }
  const scheduledFor = new Date(maintenance.scheduled_for);
  if (Number.isNaN(scheduledFor.getTime())) throw new MaintenanceValidationError("scheduled_for must be a valid ISO date-time.");
  if (maintenance.status !== undefined && !statuses.has(maintenance.status)) {
    throw new MaintenanceValidationError("status must be SCHEDULED, IN_PROGRESS, or COMPLETED.");
  }
  if (!(await tankModel.getTankById(maintenance.tank_id))) throw new MaintenanceTankNotFoundError("Tank not found.");
  return maintenanceModel.createMaintenance({ ...maintenance, scheduled_for: scheduledFor.toISOString() });
};
