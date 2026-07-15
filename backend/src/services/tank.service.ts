// Applies tank validation and coordinates storage operations for controllers.
import * as tankModel from "../models/tank.model";
import type { CreateTankRequest, Tank, TankStatus, UpdateTankRequest } from "../types/tank";

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
  "location",
  "latitude",
  "longitude",
  "capacity_liters",
  "status",
  "thingspeak_channel_id",
  "thingspeak_read_api_key",
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
};

export const listTanks = async (): Promise<Tank[]> => tankModel.getAllTanks();

export const findTankById = async (id: string): Promise<Tank> => {
  const tank = await tankModel.getTankById(id);
  if (!tank) throw new NotFoundError("Tank not found.");
  return tank;
};

export const addTank = async (tank: CreateTankRequest): Promise<Tank> => {
  validateTank(tank, true);
  return tankModel.createTank(tank);
};

export const editTank = async (id: string, tank: UpdateTankRequest): Promise<Tank> => {
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
