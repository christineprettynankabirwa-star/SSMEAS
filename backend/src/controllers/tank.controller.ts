// Handles HTTP requests for tank management endpoints.
import type { Request, Response } from "express";
import {
  addTank,
  editTank,
  findTankById,
  listTanks,
  NotFoundError,
  removeTank,
  ValidationError,
} from "../services/tank.service";
import type { CreateTankRequest, UpdateTankRequest } from "../types/tank";

const handleError = (error: unknown, response: Response): void => {
  if (error instanceof ValidationError) {
    response.status(400).json({ message: error.message });
    return;
  }
  if (error instanceof NotFoundError) {
    response.status(404).json({ message: error.message });
    return;
  }
  console.error("Tank request failed:", error);
  response.status(500).json({ message: "An unexpected server error occurred." });
};

const getTankId = (request: Request): string => {
  const { id } = request.params;
  if (typeof id !== "string" || id.length === 0) {
    throw new ValidationError("Tank id is required.");
  }
  return id;
};

export const getTanks = async (_request: Request, response: Response): Promise<void> => {
  try {
    response.status(200).json(await listTanks());
  } catch (error) {
    handleError(error, response);
  }
};

export const getTank = async (request: Request, response: Response): Promise<void> => {
  try {
    response.status(200).json(await findTankById(getTankId(request)));
  } catch (error) {
    handleError(error, response);
  }
};

export const postTank = async (request: Request, response: Response): Promise<void> => {
  try {
    response.status(201).json(await addTank(request.body as CreateTankRequest));
  } catch (error) {
    handleError(error, response);
  }
};

export const putTank = async (request: Request, response: Response): Promise<void> => {
  try {
    response.status(200).json(await editTank(getTankId(request), request.body as UpdateTankRequest));
  } catch (error) {
    handleError(error, response);
  }
};

export const destroyTank = async (request: Request, response: Response): Promise<void> => {
  try {
    await removeTank(getTankId(request));
    response.sendStatus(204);
  } catch (error) {
    handleError(error, response);
  }
};
