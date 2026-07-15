import * as alertsModel from "../models/alerts.model";
import * as tankModel from "../models/tank.model";
import type { Alert, AlertSeverity, CreateAlertRequest } from "../types/alerts.types";
import type { SensorReading } from "../types/readings.types";

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

const threshold = (environmentName: string, fallback: number): number => {
  const configuredValue = Number(process.env[environmentName] ?? fallback);
  return Number.isFinite(configuredValue) ? configuredValue : fallback;
};

export interface AlertThresholds {
  fillWarning: number;
  fillCritical: number;
  hazardousGas: number;
  lowBattery: number;
}

export const alertThresholds: Readonly<AlertThresholds> = {
  fillWarning: threshold("FILL_WARNING_THRESHOLD", 80),
  fillCritical: threshold("FILL_CRITICAL_THRESHOLD", 95),
  hazardousGas: threshold("GAS_LEVEL_THRESHOLD", 300),
  lowBattery: threshold("LOW_BATTERY_THRESHOLD", 3.3),
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

  if (reading.gas_level !== null && reading.gas_level >= thresholds.hazardousGas) {
    alerts.push({
      tank_id: reading.tank_id,
      alert_type: "Hazardous gas",
      severity: "critical",
      message: `Gas level is ${reading.gas_level.toFixed(1)}, at or above the ${thresholds.hazardousGas} threshold.`,
    });
  }

  if (reading.battery !== null && reading.battery <= thresholds.lowBattery) {
    alerts.push({
      tank_id: reading.tank_id,
      alert_type: "Low battery",
      severity: "warning",
      message: `Battery voltage is ${reading.battery.toFixed(2)}V, at or below the ${thresholds.lowBattery}V threshold.`,
    });
  }

  return alerts;
};

export const createAlertsForReading = async (reading: SensorReading): Promise<void> => {
  await Promise.all(generateAlertsForReading(reading).map((alert) => alertsModel.createAlertUnlessActive(alert)));
};
