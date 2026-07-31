import bcrypt from "bcrypt";
import jwt, { type SignOptions } from "jsonwebtoken";
import * as userModel from "../models/user.model";
import type { AuthenticatedUser, CreateUserRequest, JwtUserPayload, LoginRequest, UpdateUserRequest, UserRecord, UserRole } from "../types/auth.types";

export class InvalidCredentialsError extends Error {}
export class AuthValidationError extends Error {}

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is required.");
  return secret;
};

const publicUser = ({ password_hash: _passwordHash, ...user }: UserRecord): AuthenticatedUser => user;
const userRoles = new Set<UserRole>(["ADMINISTRATOR", "MAINTENANCE_OFFICER", "SUPERVISOR", "CLIENT"]);

export const createUser = async (input: CreateUserRequest): Promise<AuthenticatedUser> => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new AuthValidationError("Request body must be a JSON object.");
  }
  if (typeof input.full_name !== "string" || !input.full_name.trim() || input.full_name.length > 150) {
    throw new AuthValidationError("Full name is required and must not exceed 150 characters.");
  }
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (!email || email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AuthValidationError("Enter a valid email address.");
  }
  if (typeof input.password !== "string" || input.password.length < 8) {
    throw new AuthValidationError("Password must contain at least 8 characters.");
  }
  if (!userRoles.has(input.role)) throw new AuthValidationError("Select a valid role.");
  if (await userModel.getUserByEmail(email)) {
    throw new AuthValidationError("An account with this email already exists.");
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  try {
    return publicUser(await userModel.createUser(input.full_name.trim(), email, passwordHash, input.role));
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      throw new AuthValidationError("An account with this email already exists.");
    }
    throw error;
  }
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

export const listUsers = (): Promise<AuthenticatedUser[]> => userModel.getAllUsers();
export const changeUserRole = async (id: string, role: unknown): Promise<AuthenticatedUser> => {
  if (typeof role !== "string" || !userRoles.has(role as UserRole)) throw new AuthValidationError("role is invalid.");
  const user = await userModel.updateUserRole(id, role as UserRole);
  if (!user) throw new AuthValidationError("User not found.");
  return user;
};

export const updateUser = async (id: string, input: UpdateUserRequest): Promise<AuthenticatedUser> => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new AuthValidationError("Request body must be a JSON object.");
  }
  if (typeof input.full_name !== "string" || !input.full_name.trim() || input.full_name.length > 150) {
    throw new AuthValidationError("Full name is required and must not exceed 150 characters.");
  }
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (!email || email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AuthValidationError("Enter a valid email address.");
  }
  if (!userRoles.has(input.role)) throw new AuthValidationError("Select a valid role.");
  if (input.password !== undefined && input.password !== "" && input.password.length < 8) {
    throw new AuthValidationError("New password must contain at least 8 characters.");
  }

  const current = await userModel.getUserById(id);
  if (!current) throw new AuthValidationError("User not found.");
  const emailOwner = await userModel.getUserByEmail(email);
  if (emailOwner && emailOwner.id !== id) {
    throw new AuthValidationError("An account with this email already exists.");
  }
  const passwordHash = input.password ? await bcrypt.hash(input.password, 12) : undefined;
  try {
    const updated = await userModel.updateUser(id, input.full_name.trim(), email, input.role, passwordHash);
    if (!updated) throw new AuthValidationError("User not found.");
    return updated;
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      throw new AuthValidationError("An account with this email already exists.");
    }
    throw error;
  }
};

export const removeUser = async (id: string, currentUserId: string): Promise<void> => {
  if (id === currentUserId) throw new AuthValidationError("You cannot delete your own account.");
  if (!(await userModel.deleteUser(id))) throw new AuthValidationError("User not found.");
};
