import type { NextFunction, Request, Response } from "express";
import { timingSafeEqual } from "node:crypto";

export const authenticateDevice = (request: Request, response: Response, next: NextFunction): void => {
  const configuredKey = process.env.DEVICE_API_KEY?.trim();
  const suppliedKey = request.header("X-Device-API-Key")?.trim();

  if (!configuredKey) {
    response.status(500).json({ message: "DEVICE_API_KEY is not configured." });
    return;
  }

  if (!suppliedKey) {
    response.status(401).json({ message: "Device API key is required." });
    return;
  }

  const expected = Buffer.from(configuredKey);
  const supplied = Buffer.from(suppliedKey);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    response.status(401).json({ message: "Invalid device API key." });
    return;
  }

  next();
};
