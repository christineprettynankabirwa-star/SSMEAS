import type { Request, Response } from "express";
import { PredictionTankNotFoundError, PredictionValidationError, predictOverflow } from "../services/prediction.service";

export const getOverflowPrediction = async (request: Request, response: Response): Promise<void> => {
  try {
    response.json(await predictOverflow(String(request.params.tankId ?? "")));
  } catch (error) {
    if (error instanceof PredictionValidationError) response.status(400).json({ message: error.message });
    else if (error instanceof PredictionTankNotFoundError) response.status(404).json({ message: error.message });
    else {
      console.error("Overflow prediction failed:", error);
      response.status(500).json({ message: "Unable to calculate overflow prediction." });
    }
  }
};
