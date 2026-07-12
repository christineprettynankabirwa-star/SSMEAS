// Handles HTTP requests for sensor readings endpoints.
import type { Request, Response } from "express";
import axios from "axios";
import { ReadingValidationError, getAndStoreLiveReading } from "../services/readings.service";

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
