import type { Request, Response } from "express";
import {
  SimulationTankNotFoundError, SimulationValidationError,
  generateSimulationReading, resetAllTestTanks, resetTank,
} from "../services/simulation.service";

const respond = async (response: Response, operation: () => Promise<unknown>): Promise<void> => {
  try {
    response.status(201).json(await operation());
  } catch (error) {
    if (error instanceof SimulationValidationError) {
      response.status(400).json({ message: error.message });
    } else if (error instanceof SimulationTankNotFoundError) {
      response.status(404).json({ message: error.message });
    } else {
      console.error("Simulation request failed:", error);
      response.status(500).json({ message: "The simulation action could not be completed." });
    }
  }
};

export const postSimulationReading = (request: Request, response: Response): Promise<void> =>
  respond(response, () => generateSimulationReading(
    String(request.params.tankId ?? ""), request.body?.condition, request.user!,
  ));

export const postTankReset = (request: Request, response: Response): Promise<void> =>
  respond(response, () => resetTank(String(request.params.tankId ?? ""), request.user!));

export const postAllTestTankReset = (request: Request, response: Response): Promise<void> =>
  respond(response, () => resetAllTestTanks(request.user!));
