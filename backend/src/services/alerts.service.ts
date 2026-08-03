import * as alertsModel from "../models/alerts.model";
import * as tankModel from "../models/tank.model";
import * as readingsModel from "../models/readings.model";
import type { Alert, AlertSeverity, CreateAlertRequest } from "../types/alerts.types";
import type { SensorReading } from "../types/readings.types";
import { publishAlertNotificationEvent } from "./notification-events";
import {
  completeAutomaticMaintenanceForTank, createCriticalAlertMaintenance,
} from "./maintenance.service";
import {
  createAcknowledgementNotifications, createResolutionNotifications,
} from "../models/notifications.model";
import type { AuthenticatedUser } from "../types/auth.types";
import { alertThresholdConfig } from "../config/alert-thresholds";

export class AlertValidationError extends Error {}
export class AlertTankNotFoundError extends Error {}
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const severities = new Set<AlertSeverity>(["critical", "warning", "info"]);

const validateText = (value: unknown, field: string, maxLength: number): void => {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > maxLength) {
    throw new AlertValidationError(`${field} is required and must not exceed ${maxLength} characters.`);
  }
};

export const listAlerts = async (user?: AuthenticatedUser): Promise<Alert[]> =>
  alertsModel.getAllAlerts(user?.role === "MAINTENANCE_OFFICER" ? user.id : undefined);
export const acknowledge = async (id: string, user: AuthenticatedUser): Promise<Alert> => {
  if (!uuidPattern.test(id)) throw new AlertValidationError("alert id must be a valid UUID.");
  const alert = await alertsModel.acknowledgeAlert(id, user.id);
  if (!alert) throw new AlertTankNotFoundError("Active alert not found.");
  // Acknowledgement is the safety-critical state transition.  Notification
  // history is best-effort: a legacy notification constraint or a transient
  // database issue must never turn a committed acknowledgement into a 500.
  try {
    await createAcknowledgementNotifications(alert);
  } catch (error) {
    console.error("Alert was acknowledged, but acknowledgement notification history failed:", error);
  }
  return alert;
};

export const resolve = async (id: string): Promise<Alert> => {
  if (!uuidPattern.test(id)) throw new AlertValidationError("alert id must be a valid UUID.");
  const current = await alertsModel.getAlertById(id);
  if (!current || current.status !== "ACKNOWLEDGED") {
    throw new AlertTankNotFoundError("Acknowledged alert not found.");
  }
  const reading = await readingsModel.getLatestStoredReadingForTank(current.tank_id);
  if (!reading || !isReadingSafe(reading)) {
    throw new AlertValidationError(
      `This incident cannot be resolved until a live sewage reading is below ${alertThresholds.fillWarning}%.`,
    );
  }
  const alert = await alertsModel.resolveAcknowledgedAlert(id);
  if (!alert) throw new AlertTankNotFoundError("Acknowledged alert not found.");
  await completeAutomaticMaintenanceForTank(alert.tank_id);
  await createResolutionNotifications(alert, "Administrator verification of the latest SAFE reading");
  return alert;
};

export const addAlert = async (alert: CreateAlertRequest): Promise<Alert> => {
  if (!uuidPattern.test(alert.tank_id)) throw new AlertValidationError("tank_id must be a valid UUID.");
  validateText(alert.alert_type, "alert_type", 100);
  validateText(alert.message, "message", 1_000);
  if (alert.severity !== undefined && !severities.has(alert.severity)) {
    throw new AlertValidationError("severity must be critical, warning, or info.");
  }
  if (!(await tankModel.getTankById(alert.tank_id))) throw new AlertTankNotFoundError("Tank not found.");
  const created = await alertsModel.createAlert(alert);
  await createCriticalAlertMaintenance(created);
  await publishAlertNotificationEvent({ alert: created });
  return created;
};

export interface AlertThresholds {
  fillWarning: number;
  fillCritical: number;
}

export const alertThresholds: Readonly<AlertThresholds> = {
  fillWarning: alertThresholdConfig.sewageLevel.warningMinimum,
  fillCritical: alertThresholdConfig.sewageLevel.dangerMinimum,
};

export const isReadingSafe = (
  reading: SensorReading,
  thresholds: Readonly<AlertThresholds> = alertThresholds,
): boolean => {
  return reading.level !== null && reading.level < thresholds.fillWarning;
};

export const generateAlertsForReading = (
  reading: SensorReading,
  thresholds: Readonly<AlertThresholds> = alertThresholds,
): CreateAlertRequest[] => {
  const alerts: CreateAlertRequest[] = [];

  if (reading.level !== null && reading.level >= thresholds.fillCritical) {
    alerts.push({
      tank_id: reading.tank_id,
      alert_type: "Critical sewage level",
      severity: "critical",
      message: `Fill level is ${reading.level.toFixed(1)}%, at or above the ${thresholds.fillCritical}% critical threshold.`,
    });
  } else if (reading.level !== null && reading.level >= thresholds.fillWarning) {
    alerts.push({
      tank_id: reading.tank_id,
      alert_type: "High sewage level",
      severity: "warning",
      message: `Fill level is ${reading.level.toFixed(1)}%, at or above the ${thresholds.fillWarning}% warning threshold.`,
    });
  }

  return alerts;
};

export const createAlertsForReading = async (
  reading: SensorReading,
  options: { completeMaintenanceOnResolution?: boolean } = {},
): Promise<void> => {
  const candidates = generateAlertsForReading(reading);
  const escalated = candidates.some(({ severity }) => severity === "critical")
    ? await alertsModel.resolveSupersededWarningAlerts(reading.tank_id)
    : [];
  const resolved = await alertsModel.resolveInactiveReadingAlerts(
    reading.tank_id, !isReadingSafe(reading),
  );
  const created = await Promise.all(candidates.map((alert) => alertsModel.createAlertUnlessActive(alert)));
  await Promise.all(created.filter((alert): alert is Alert => alert !== null)
    .map(async (alert) => {
      await createCriticalAlertMaintenance(alert);
      await publishAlertNotificationEvent({ alert, reading });
    }));
  await Promise.all(escalated.map((alert) =>
    createResolutionNotifications(alert, "Escalated to a CRITICAL sewage incident")));
  if (resolved.length && options.completeMaintenanceOnResolution !== false) {
    await completeAutomaticMaintenanceForTank(reading.tank_id);
    await Promise.all(resolved.map((alert) =>
      createResolutionNotifications(alert, "Live sensor monitoring")));
  }
};
