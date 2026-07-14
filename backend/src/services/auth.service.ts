import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";
import * as userModel from "../models/user.model";
import type { AuthenticatedUser, CreateUserRequest, JwtUserPayload, LoginRequest, UserRecord, UserRole } from "../types/auth.types";

export class InvalidCredentialsError extends Error {}
export class AuthValidationError extends Error {}

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is required.");
  return secret;
};

const publicUser = ({ password_hash: _passwordHash, ...user }: UserRecord): AuthenticatedUser => user;
const userRoles = new Set<UserRole>(["ADMINISTRATOR", "MAINTENANCE_OFFICER", "SUPERVISOR"]);

export const createUser = async (input: CreateUserRequest): Promise<AuthenticatedUser> => {
  if (typeof input.full_name !== "string" || !input.full_name.trim() || input.full_name.length > 150) {
    throw new AuthValidationError("full_name is required and must not exceed 150 characters.");
  }
  if (typeof input.email !== "string" || !input.email.trim() || input.email.length > 255) {
    throw new AuthValidationError("email is required and must not exceed 255 characters.");
  }
  if (typeof input.password !== "string" || input.password.length < 8) {
    throw new AuthValidationError("password must contain at least 8 characters.");
  }
  if (!userRoles.has(input.role)) throw new AuthValidationError("role is invalid.");
  const passwordHash = await bcrypt.hash(input.password, 12);
  return publicUser(await userModel.createUser(input.full_name.trim(), input.email.trim(), passwordHash, input.role));
};

export const login = async (credentials: LoginRequest): Promise<{ token: string; user: AuthenticatedUser }> => {
  if (typeof credentials.email !== "string" || typeof credentials.password !== "string") {
    throw new AuthValidationError("email and password are required.");
  }
  const email = credentials.email.trim();
  if (!email || !credentials.password) throw new AuthValidationError("email and password are required.");

  const user = await userModel.getUserByEmail(email);
  if (!user || !(await bcrypt.compare(credentials.password, user.password_hash))) {
    throw new InvalidCredentialsError("Invalid email or password.");
  }

  const payload: JwtUserPayload = { sub: user.id, email: user.email, role: user.role };
  const expiresIn = (process.env.JWT_EXPIRES_IN ?? "8h") as NonNullable<SignOptions["expiresIn"]>;
  const token = jwt.sign(payload, getJwtSecret(), { expiresIn });
  return { token, user: publicUser(user) };
};

export const getProfile = async (userId: string): Promise<AuthenticatedUser | null> => {
  const user = await userModel.getUserById(userId);
  return user ? publicUser(user) : null;
};
