import { randomUUID } from "node:crypto";
import * as alertsModel from "../models/alerts.model";
import * as notificationModel from "../models/notifications.model";
import * as simulationModel from "../models/simulation.model";
import * as tankModel from "../models/tank.model";
import { createAlertsForReading } from "./alerts.service";
import {
  cancelUnstartedAutomaticMaintenance,
  createAutomaticMaintenanceForReading,
} from "./maintenance.service";
import * as readingsModel from "../models/readings.model";
import type { AuthenticatedUser } from "../types/auth.types";
import type {
  SimulationBatchResult, SimulationCondition, SimulationResult,
} from "../types/simulation.types";

export class SimulationValidationError extends Error {}
export class SimulationTankNotFoundError extends Error {}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const profiles: Record<SimulationCondition, { level: number; gas: number }> = {
  SAFE: { level: 35, gas: 100 },
  WARNING: { level: 75, gas: 120 },
  DANGER: { level: 90, gas: 120 },
};

const generate = async (
  tankId: string, condition: SimulationCondition, user: AuthenticatedUser, action: string,
): Promise<SimulationResult> => {
  if (!uuidPattern.test(tankId)) throw new SimulationValidationError("tankId must be a valid UUID.");
  const tank = await tankModel.getTankById(tankId);
  if (!tank) throw new SimulationTankNotFoundError("Tank not found.");

  const before = await simulationModel.countOpenAlerts(tankId);
  const profile = profiles[condition];
  const reading = await readingsModel.createOrGetDeviceReading({
    tank_id: tankId,
    reading_id: randomUUID(),
    level: profile.level,
    gas_level: profile.gas,
    status: condition,
    recorded_at: new Date(),
  });
  await createAutomaticMaintenanceForReading(reading);
  await createAlertsForReading(reading, { completeMaintenanceOnResolution: false });

  if (condition === "SAFE") await alertsModel.resolveAllOpenAlertsForTank(tankId);
  const after = await simulationModel.countOpenAlerts(tankId);
  const resolvedAlerts = Math.max(0, before - after);
  const cancelledMaintenance = condition === "SAFE"
    ? await cancelUnstartedAutomaticMaintenance(tankId)
    : 0;
  if (condition === "SAFE" && resolvedAlerts > 0) {
    const alert = await alertsModel.getLatestResolvedAlertForTank(tankId);
    if (alert) await notificationModel.createResolutionNotifications(alert, user.full_name);
  }
  await simulationModel.recordSimulationAudit({
    actorId: user.id, tankId, readingId: reading.id, action, condition,
    resolvedAlerts, cancelledMaintenance,
  });
  return {
    tankId, tankName: tank.tank_name, condition, reading,
    resolvedAlerts, cancelledMaintenance,
  };
};

export const generateSimulationReading = (
  tankId: string, condition: unknown, user: AuthenticatedUser,
): Promise<SimulationResult> => {
  if (condition !== "SAFE" && condition !== "WARNING" && condition !== "DANGER") {
    throw new SimulationValidationError("condition must be SAFE, WARNING, or DANGER.");
  }
  return generate(tankId, condition, user, `GENERATE_${condition}_READING`);
};

export const resetTank = (
  tankId: string, user: AuthenticatedUser,
): Promise<SimulationResult> => generate(tankId, "SAFE", user, "RESET_TANK");

export const resetAllTestTanks = async (
  user: AuthenticatedUser,
): Promise<SimulationBatchResult> => {
  const tankIds = await simulationModel.getUnsafeTestTankIds();
  const results = [];
  for (const tankId of tankIds) results.push(await generate(tankId, "SAFE", user, "RESET_ALL_TEST_TANKS"));
  return { results };
};
