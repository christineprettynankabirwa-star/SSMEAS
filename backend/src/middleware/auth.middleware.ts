import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { getProfile } from "../services/auth.service";
import type { JwtUserPayload } from "../types/auth.types";

export const authenticate = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    response.status(401).json({ message: "Authentication token is required." });
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("JWT_SECRET environment variable is required.");
    response.status(500).json({ message: "Authentication is not configured." });
    return;
  }

  try {
    const payload = jwt.verify(authorization.slice(7), secret) as JwtUserPayload;
    if (typeof payload.sub !== "string") throw new jwt.JsonWebTokenError("Invalid token subject.");
    const user = await getProfile(payload.sub);
    if (!user) {
      response.status(401).json({ message: "User account no longer exists." });
      return;
    }
    request.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      response.status(401).json({ message: "Authentication token is invalid or expired." });
      return;
    }
    console.error("Authentication failed:", error);
    response.status(500).json({ message: "An unexpected server error occurred." });
  }
};
