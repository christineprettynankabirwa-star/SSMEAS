import type { Request, Response } from "express";
import { AuthValidationError, InvalidCredentialsError, login } from "../services/auth.service";
import type { LoginRequest } from "../types/auth.types";

export const postLogin = async (request: Request, response: Response): Promise<void> => {
  try {
    if (typeof request.body !== "object" || request.body === null || Array.isArray(request.body)) {
      response.status(400).json({ message: "Request body must be a JSON object." });
      return;
    }
    response.status(200).json(await login(request.body as LoginRequest));
  } catch (error) {
    if (error instanceof AuthValidationError) {
      response.status(400).json({ message: error.message });
      return;
    }
    if (error instanceof InvalidCredentialsError) {
      response.status(401).json({ message: error.message });
      return;
    }
    if (error instanceof Error && error.message.includes("JWT_SECRET")) {
      response.status(500).json({ message: "Authentication is not configured." });
      return;
    }
    console.error("Login failed:", error);
    response.status(500).json({ message: "An unexpected server error occurred." });
  }
};

export const getCurrentProfile = (request: Request, response: Response): void => {
  response.status(200).json(request.user);
};
