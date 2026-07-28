import axios from "axios";
import type { UserProfile } from "@/services/api";

export type ManagedRole = Exclude<UserProfile["role"], "CLIENT">;
export type UserFormField = "fullName" | "email" | "password" | "role";
export interface CreateUserValues {
  fullName: string;
  email: string;
  password: string;
  role: ManagedRole;
}

export const MANAGED_ROLES: ManagedRole[] = [
  "ADMINISTRATOR",
  "SUPERVISOR",
  "MAINTENANCE_OFFICER",
];

export const roleLabel = (role: UserProfile["role"]): string =>
  ({
    ADMINISTRATOR: "Administrator",
    SUPERVISOR: "Supervisor",
    MAINTENANCE_OFFICER: "Maintenance Officer",
    CLIENT: "Client",
  })[role];

export const roleBadgeClass = (role: UserProfile["role"]): string =>
  ({
    ADMINISTRATOR: "border-red-200 bg-red-50 text-red-700",
    SUPERVISOR: "border-amber-200 bg-amber-50 text-amber-800",
    MAINTENANCE_OFFICER: "border-cyan-200 bg-cyan-50 text-cyan-800",
    CLIENT: "border-slate-200 bg-slate-100 text-slate-700",
  })[role];

export const titleCaseName = (value: string): string =>
  value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(/(^|[\s'-])([a-z])/g, (_, boundary: string, letter: string) => `${boundary}${letter.toUpperCase()}`);

export const validateCreateUser = (values: CreateUserValues): Partial<Record<UserFormField, string>> => {
  const errors: Partial<Record<UserFormField, string>> = {};
  if (values.fullName.trim().length < 2) errors.fullName = "Enter the user's full name.";
  else if (values.fullName.trim().length > 150) errors.fullName = "Full name must be 150 characters or fewer.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = "Enter a valid email address.";
  if (values.password.length < 8) errors.password = "Password must contain at least 8 characters.";
  if (!MANAGED_ROLES.includes(values.role)) errors.role = "Select a valid role.";
  return errors;
};

export const apiErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === "string" && message.trim()) return message;
    if (!error.response) return "The server could not be reached. Check your connection and try again.";
  }
  return fallback;
};
