import type { Request, Response } from "express";
import {
  evaluatePredictions, listPredictionHistory, PredictionTankNotFoundError,
  PredictionValidationError, predictAllOverflows, predictOverflow,
} from "../services/prediction.service";

export const getOverflowPredictions = async (_request: Request, response: Response): Promise<void> => {
  try {
    response.json(await predictAllOverflows());
  } catch (error) {
    console.error("Overflow predictions failed:", error);
    response.status(500).json({ message: "Unable to calculate overflow predictions." });
  }
};

export const getPredictionHistory = async (request: Request, response: Response): Promise<void> => {
  try {
    response.json(await listPredictionHistory(request.query.tankId));
  } catch (error) {
    if (error instanceof PredictionValidationError) response.status(400).json({ message: error.message });
    else response.status(500).json({ message: "Unable to load prediction history." });
  }
};

export const getPredictionEvaluation = async (request: Request, response: Response): Promise<void> => {
  try {
    response.json(await evaluatePredictions(request.query.tankId));
  } catch (error) {
    if (error instanceof PredictionValidationError) response.status(400).json({ message: error.message });
    else response.status(500).json({ message: "Unable to evaluate prediction history." });
  }
};

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
