import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "../types/auth.types";
import { hasPermission, type Permission } from "../auth/permissions";

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

export const authorizePermission = (permission: Permission) => (
  request: Request,
  response: Response,
  next: NextFunction,
): void => {
  if (!request.user) {
    response.status(401).json({ message: "Authentication is required." });
    return;
  }
  if (!hasPermission(request.user.role, permission)) {
    response.status(403).json({ message: "You do not have permission to perform this action." });
    return;
  }
  next();
};
