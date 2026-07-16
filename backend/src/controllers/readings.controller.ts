// Handles HTTP requests for sensor readings endpoints.
import type { Request, Response } from "express";
import axios from "axios";
import {
  ReadingNotFoundError,
  ReadingValidationError,
  getAndStoreLiveReading,
  getHistoricalReadings,
  storeDeviceReading,
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

export const getLiveReading = async (_request: Request, response: Response): Promise<void> => {
  try {
    response.status(200).json(await getAndStoreLiveReading());
  } catch (error) {
    if (error instanceof ReadingValidationError) {
      response.status(422).json({ message: error.message });
      return;
    }
    if (axios.isAxiosError(error)) {
      console.error("ThingSpeak request failed:", error.message);
      response.status(502).json({ message: "Unable to retrieve the latest ThingSpeak reading." });
      return;
    }
    if (error instanceof Error && error.message.includes("environment variable is required")) {
      response.status(500).json({ message: error.message });
      return;
    }
    console.error("Sensor reading request failed:", error);
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
