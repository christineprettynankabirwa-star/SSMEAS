// Handles HTTP requests for sensor readings endpoints.
import type { Request, Response } from "express";
import {
  ReadingNotFoundError,
  ReadingValidationError,
  getLatestStoredLiveReading,
  getLatestStoredReadings,
  getHistoricalReadings,
  storeDeviceReading,
  getAnalytics,
} from "../services/readings.service";

export const createDeviceReading = async (request: Request, response: Response): Promise<void> => {
  try {
    const reading = await storeDeviceReading(request.body as Record<string, unknown>);
    response.status(201).json(reading);
  } catch (error) {
    if (error instanceof ReadingValidationError) {
      response.status(400).json({ message: error.message });
      return;
    }
    console.error("Device reading upload failed:", error);
    response.status(500).json({ message: "Unable to store device reading." });
  }
};

export const getReadingAnalytics = async (request: Request, response: Response): Promise<void> => {
  try {
    response.status(200).json(await getAnalytics(request.query.tankIds, request.query.range));
  } catch (error) {
    if (error instanceof ReadingValidationError) {
      response.status(400).json({ message: error.message });
      return;
    }
    console.error("Sensor analytics request failed:", error);
    response.status(500).json({ message: "Unable to load analytics." });
  }
};

export const getLiveReading = async (_request: Request, response: Response): Promise<void> => {
  try {
    response.status(200).json(await getLatestStoredLiveReading());
  } catch (error) {
    if (error instanceof ReadingNotFoundError) {
      response.status(404).json({ message: error.message });
      return;
    }
    console.error("Sensor reading request failed:", error);
    response.status(500).json({ message: "An unexpected server error occurred." });
  }
};

export const getLatestReadings = async (_request: Request, response: Response): Promise<void> => {
  try {
    response.status(200).json(await getLatestStoredReadings());
  } catch (error) {
    console.error("Latest sensor readings request failed:", error);
    response.status(500).json({ message: "An unexpected server error occurred." });
  }
};

export const getReadingHistory = async (request: Request, response: Response): Promise<void> => {
  try {
    const { tankId } = request.params;
    if (typeof tankId !== "string") {
      response.status(400).json({ message: "tankId is required." });
      return;
    }
    response.status(200).json(await getHistoricalReadings(tankId));
  } catch (error) {
    if (error instanceof ReadingValidationError) {
      response.status(400).json({ message: error.message });
      return;
    }
    if (error instanceof ReadingNotFoundError) {
      response.status(404).json({ message: error.message });
      return;
    }
    console.error("Sensor reading history request failed:", error);
    response.status(500).json({ message: "An unexpected server error occurred." });
  }
};
