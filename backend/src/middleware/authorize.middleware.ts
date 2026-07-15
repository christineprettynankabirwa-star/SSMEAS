import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "../types/auth.types";

export const authorize = (...roles: UserRole[]) => (
  request: Request,
  response: Response,
  next: NextFunction,
): void => {
  if (!request.user) {
    response.status(401).json({ message: "Authentication is required." });
    return;
  }
  if (!roles.includes(request.user.role)) {
    response.status(403).json({ message: "You do not have permission to perform this action." });
    return;
  }
  next();
};
