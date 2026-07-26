import * as maintenanceModel from "../models/maintenance.model";
import * as tankModel from "../models/tank.model";
import type { Alert } from "../types/alerts.types";
import type { CreateMaintenanceRequest, MaintenancePriority, MaintenanceRecord, MaintenanceStatus, UpdateMaintenanceRequest } from "../types/maintenance.types";
import type { SensorReading } from "../types/readings.types";
import type { AuthenticatedUser } from "../types/auth.types";

export class MaintenanceValidationError extends Error {}
export class MaintenanceTankNotFoundError extends Error {}
export class MaintenanceForbiddenError extends Error {}
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const statuses = new Set<MaintenanceStatus>(["SCHEDULED", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);
const priorities = new Set<MaintenancePriority>(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);

export const listMaintenance = async (user?: AuthenticatedUser): Promise<MaintenanceRecord[]> =>
  maintenanceModel.getAllMaintenance(user?.role === "MAINTENANCE_OFFICER" ? user.id : undefined);

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
    throw new MaintenanceValidationError("maintenance status is invalid.");
  }
  if (maintenance.priority !== undefined && !priorities.has(maintenance.priority)) throw new MaintenanceValidationError("priority is invalid.");
  if (maintenance.assigned_to && !uuidPattern.test(maintenance.assigned_to)) throw new MaintenanceValidationError("assigned_to must be a valid UUID.");
  if (!(await tankModel.getTankById(maintenance.tank_id))) throw new MaintenanceTankNotFoundError("Tank not found.");
  return maintenanceModel.createMaintenance({ ...maintenance, scheduled_for: scheduledFor.toISOString() });
};

export const changeMaintenance = async (id: string, update: UpdateMaintenanceRequest): Promise<MaintenanceRecord> => {
  if (!uuidPattern.test(id)) throw new MaintenanceValidationError("maintenance id must be a valid UUID.");
  if (update.status !== undefined && !statuses.has(update.status)) throw new MaintenanceValidationError("maintenance status is invalid.");
  if (update.priority !== undefined && !priorities.has(update.priority)) throw new MaintenanceValidationError("priority is invalid.");
  if (update.assigned_to && !uuidPattern.test(update.assigned_to)) throw new MaintenanceValidationError("assigned_to must be a valid UUID.");
  if (update.scheduled_for && Number.isNaN(new Date(update.scheduled_for).getTime())) throw new MaintenanceValidationError("scheduled_for must be a valid ISO date-time.");
  const record = await maintenanceModel.updateMaintenance(id, update);
  if (!record) throw new MaintenanceTankNotFoundError("Maintenance record not found.");
  return record;
};

export const changeMaintenanceForUser = async (
  id: string, update: UpdateMaintenanceRequest, user: AuthenticatedUser,
): Promise<MaintenanceRecord> => {
  if (user.role !== "MAINTENANCE_OFFICER") return changeMaintenance(id, update);
  const keys = Object.keys(update);
  const allowed = new Set<MaintenanceStatus>(["ASSIGNED", "IN_PROGRESS", "COMPLETED"]);
  if (keys.length !== 1 || keys[0] !== "status" || !update.status || !allowed.has(update.status)) {
    throw new MaintenanceForbiddenError("Maintenance officers may only update assigned task status.");
  }
  const record = await maintenanceModel.updateAssignedMaintenanceStatus(
    id, user.id, update.status as "ASSIGNED" | "IN_PROGRESS" | "COMPLETED",
  );
  if (!record) throw new MaintenanceForbiddenError("This task is not assigned to you.");
  return record;
};

export const removeMaintenance = async (id: string): Promise<void> => {
  if (!uuidPattern.test(id)) throw new MaintenanceValidationError("maintenance id must be a valid UUID.");
  if (!(await maintenanceModel.deleteMaintenance(id))) throw new MaintenanceTankNotFoundError("Maintenance record not found.");
};

const automaticDelayMinutes = (): number => {
  const configured = Number(process.env.CRITICAL_MAINTENANCE_DELAY_MINUTES ?? 30);
  return Number.isFinite(configured) && configured >= 0 ? configured : 30;
};

export const generateAutomaticMaintenanceRequests = (
  reading: SensorReading,
  now: Date = new Date(),
): CreateMaintenanceRequest[] => {
  const baseTime = Math.max(now.getTime(), new Date(reading.recorded_at).getTime());
  const scheduledFor = new Date(baseTime + automaticDelayMinutes() * 60_000).toISOString();

  const reasons: string[] = [];
  if (reading.level !== null && reading.level >= 90) reasons.push("Critical sewage level");
  const hazardousGas = Number(process.env.GAS_LEVEL_THRESHOLD ?? 300);
  if (reading.gas_level !== null && reading.gas_level >= hazardousGas) {
    reasons.push("Hazardous gas");
  }
  return reasons.map((reason) => ({
      tank_id: reading.tank_id,
      task: `Emergency response: ${reason}`,
      scheduled_for: scheduledFor,
      status: "SCHEDULED",
      priority: "HIGH",
    }));
};

export const createCriticalAlertMaintenance = async (alert: Alert): Promise<void> => {
  if (alert.severity !== "critical") return;
  const assignedTo = await maintenanceModel.getOfficerForTank(alert.tank_id);
  await maintenanceModel.createEmergencyInspectionUnlessOpen(alert.id, alert.tank_id, assignedTo);
};

export const createAutomaticMaintenanceForReading = async (reading: SensorReading): Promise<void> => {
  const assignedTo = await maintenanceModel.getOfficerForTank(reading.tank_id);
  await Promise.all(
    generateAutomaticMaintenanceRequests(reading).map((maintenance) =>
      maintenanceModel.createMaintenanceUnlessOpen({ ...maintenance, assigned_to: assignedTo }),
    ),
  );
};
