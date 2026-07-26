import type { UserRole } from "../types/auth.types";

export type Permission =
  | "dashboard:read" | "tanks:read" | "tanks:write" | "tanks:delete"
  | "readings:live" | "readings:history" | "readings:analytics"
  | "alerts:read" | "alerts:acknowledge"
  | "notifications:read" | "notifications:configure"
  | "maintenance:read" | "maintenance:create" | "maintenance:update" | "maintenance:delete"
  | "predictions:read" | "reports:read" | "routes:read"
  | "users:manage" | "settings:manage";

const all: Permission[] = [
  "dashboard:read", "tanks:read", "tanks:write", "tanks:delete",
  "readings:live", "readings:history", "readings:analytics",
  "alerts:read", "alerts:acknowledge", "notifications:read",
  "notifications:configure", "maintenance:read", "maintenance:create",
  "maintenance:update", "maintenance:delete", "predictions:read", "reports:read", "routes:read",
  "users:manage", "settings:manage",
];

export const rolePermissions: Readonly<Record<UserRole, ReadonlySet<Permission>>> = {
  ADMINISTRATOR: new Set(all),
  SUPERVISOR: new Set([
    "dashboard:read", "tanks:read", "readings:live", "readings:history",
    "readings:analytics", "alerts:read", "alerts:acknowledge",
    "notifications:read", "maintenance:read", "predictions:read", "reports:read",
  ]),
  MAINTENANCE_OFFICER: new Set([
    "tanks:read", "readings:live", "readings:history",
    "alerts:read", "notifications:read", "maintenance:read",
    "maintenance:update",
  ]),
  CLIENT: new Set(["tanks:read", "readings:live", "alerts:read", "notifications:read"]),
};

export const hasPermission = (role: UserRole, permission: Permission): boolean =>
  rolePermissions[role].has(permission);
