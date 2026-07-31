// Applies tank validation and coordinates storage operations for controllers.
import * as tankModel from "../models/tank.model";
import type { CreateTankRequest, Tank, TankStatus, UpdateTankRequest } from "../types/tank";
import type { AuthenticatedUser } from "../types/auth.types";

export class ValidationError extends Error {}
export class NotFoundError extends Error {}

const statuses = [
    "ACTIVE",
    "INACTIVE",
    "MAINTENANCE",
] as const;
const updatableFields = new Set<keyof UpdateTankRequest>([
  "tank_name",
  "owner_name",
  "owner_user_id",
  "location",
  "latitude",
  "longitude",
  "capacity_liters",
  "status",
  "thingspeak_channel_id",
  "thingspeak_read_api_key",
  "hardware_id",
  "warning_fill_threshold",
  "critical_fill_threshold",
]);

const validateText = (value: unknown, field: string, maxLength: number): void => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ValidationError(`${field} is required.`);
  }
  if (value.length > maxLength) {
    throw new ValidationError(`${field} must not exceed ${maxLength} characters.`);
  }
};

const validateNumber = (
  value: unknown,
  field: string,
  minimum: number,
  maximum: number,
): void => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) {
    throw new ValidationError(`${field} must be a number between ${minimum} and ${maximum}.`);
  }
};

const validateStatus = (value: unknown): void => {
  if (typeof value !== "string" || !statuses.includes(value as TankStatus)) {
    throw new ValidationError("status must be ACTIVE, INACTIVE, or MAINTENANCE.");
  }
};

const validateOptionalPositiveInteger = (value: unknown, field: string): void => {
  if (value !== null && value !== undefined
    && (!Number.isSafeInteger(value) || (value as number) <= 0)) {
    throw new ValidationError(`${field} must be a positive integer when supplied.`);
  }
};

const validateOptionalSecret = (value: unknown, field: string): void => {
  if (value !== null && value !== undefined) validateText(value, field, 255);
};

const validateTank = (tank: CreateTankRequest | UpdateTankRequest, isCreate: boolean): void => {
  if (isCreate || tank.tank_name !== undefined) validateText(tank.tank_name, "tank_name", 100);
  if (isCreate || tank.owner_name !== undefined) validateText(tank.owner_name, "owner_name", 100);
  if (isCreate || tank.location !== undefined) validateText(tank.location, "location", 255);
  if (isCreate || tank.latitude !== undefined) validateNumber(tank.latitude, "latitude", -90, 90);
  if (isCreate || tank.longitude !== undefined) validateNumber(tank.longitude, "longitude", -180, 180);
  if (isCreate || tank.capacity_liters !== undefined) {
    if (
      typeof tank.capacity_liters !== "number" ||
      !Number.isInteger(tank.capacity_liters) ||
      tank.capacity_liters <= 0
    ) {
      throw new ValidationError("capacity_liters must be a positive integer.");
    }
  }
  if (tank.status !== undefined) validateStatus(tank.status);
  if (tank.thingspeak_channel_id !== undefined) {
    validateOptionalPositiveInteger(tank.thingspeak_channel_id, "thingspeak_channel_id");
  }
  if (tank.thingspeak_read_api_key !== undefined) {
    validateOptionalSecret(tank.thingspeak_read_api_key, "thingspeak_read_api_key");
  }
  if (tank.hardware_id !== undefined && tank.hardware_id !== null) validateText(tank.hardware_id, "hardware_id", 100);
  if (isCreate || tank.warning_fill_threshold !== undefined) {
    validateNumber(tank.warning_fill_threshold ?? 80, "warning_fill_threshold", 0, 99);
  }
  if (isCreate || tank.critical_fill_threshold !== undefined) {
    validateNumber(tank.critical_fill_threshold ?? 95, "critical_fill_threshold", 1, 100);
  }
  const warning = tank.warning_fill_threshold ?? 80;
  const critical = tank.critical_fill_threshold ?? 95;
  if (warning >= critical) throw new ValidationError("warning_fill_threshold must be below critical_fill_threshold.");
  if (tank.owner_user_id !== undefined && tank.owner_user_id !== null
    && !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(tank.owner_user_id)) {
    throw new ValidationError("owner_user_id must be a valid user UUID or null.");
  }
};

export const listTanks = async (user?: AuthenticatedUser): Promise<Tank[]> =>
  user?.role === "MAINTENANCE_OFFICER" ? tankModel.getAssignedTanks(user.id) : tankModel.getAllTanks();

export const findTankById = async (id: string, user?: AuthenticatedUser): Promise<Tank> => {
  if (user?.role === "MAINTENANCE_OFFICER") {
    const tank = (await tankModel.getAssignedTanks(user.id)).find((value) => value.id === id);
    if (!tank) throw new NotFoundError("Tank not found.");
    return tank;
  }
  const tank = await tankModel.getTankById(id);
  if (!tank) throw new NotFoundError("Tank not found.");
  return tank;
};

export const addTank = async (tank: CreateTankRequest): Promise<Tank> => {
  if (!tank || typeof tank !== "object" || Array.isArray(tank)) {
    throw new ValidationError("Request body must be a JSON object.");
  }
  validateTank(tank, true);
  return tankModel.createTank(tank);
};

export const editTank = async (id: string, tank: UpdateTankRequest): Promise<Tank> => {
  if (!tank || typeof tank !== "object" || Array.isArray(tank)) {
    throw new ValidationError("Request body must be a JSON object.");
  }
  const suppliedFields = Object.keys(tank);
  if (suppliedFields.length === 0) {
    throw new ValidationError("At least one field is required to update a tank.");
  }
  if (!suppliedFields.every((field) => updatableFields.has(field as keyof UpdateTankRequest))) {
    throw new ValidationError("The request contains a field that cannot be updated.");
  }
  validateTank(tank, false);
  const updatedTank = await tankModel.updateTank(id, tank);
  if (!updatedTank) throw new NotFoundError("Tank not found.");
  return updatedTank;
};

export const removeTank = async (id: string): Promise<void> => {
  if (!(await tankModel.deleteTank(id))) throw new NotFoundError("Tank not found.");
};
