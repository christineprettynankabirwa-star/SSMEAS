import * as alertsModel from "../models/alerts.model";
import * as tankModel from "../models/tank.model";
import type { Alert, AlertSeverity, CreateAlertRequest } from "../types/alerts.types";

export class AlertValidationError extends Error {}
export class AlertTankNotFoundError extends Error {}
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const severities = new Set<AlertSeverity>(["critical", "warning", "info"]);

const validateText = (value: unknown, field: string, maxLength: number): void => {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > maxLength) {
    throw new AlertValidationError(`${field} is required and must not exceed ${maxLength} characters.`);
  }
};

export const listAlerts = async (): Promise<Alert[]> => alertsModel.getAllAlerts();

export const addAlert = async (alert: CreateAlertRequest): Promise<Alert> => {
  if (!uuidPattern.test(alert.tank_id)) throw new AlertValidationError("tank_id must be a valid UUID.");
  validateText(alert.alert_type, "alert_type", 100);
  validateText(alert.message, "message", 1_000);
  if (alert.severity !== undefined && !severities.has(alert.severity)) {
    throw new AlertValidationError("severity must be critical, warning, or info.");
  }
  if (!(await tankModel.getTankById(alert.tank_id))) throw new AlertTankNotFoundError("Tank not found.");
  return alertsModel.createAlert(alert);
};
