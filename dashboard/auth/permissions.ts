export type UserRole = "ADMINISTRATOR" | "SUPERVISOR" | "MAINTENANCE_OFFICER" | "CLIENT";
export type UiPermission =
  | "overview" | "tanks" | "analytics" | "map" | "alerts" | "notifications"
  | "maintenance" | "routes" | "predictions" | "reports" | "users" | "settings"
  | "simulation";

const matrix: Record<UserRole, ReadonlySet<UiPermission>> = {
  ADMINISTRATOR: new Set([
    "overview", "tanks", "analytics", "map", "alerts", "notifications",
    "maintenance", "routes", "predictions", "reports", "users", "settings", "simulation",
  ]),
  SUPERVISOR: new Set([
    "overview", "tanks", "analytics", "map", "alerts", "maintenance",
    "notifications", "predictions", "reports",
  ]),
  MAINTENANCE_OFFICER: new Set([
    "overview", "tanks", "map", "alerts", "notifications", "maintenance",
  ]),
  CLIENT: new Set(["tanks", "map", "alerts", "notifications"]),
};

export const can = (role: UserRole, permission: UiPermission): boolean =>
  matrix[role].has(permission);

export const pathPermission = (pathname: string): UiPermission => {
  if (pathname.startsWith("/testing-simulation")) return "simulation";
  if (pathname.startsWith("/users")) return "users";
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname.startsWith("/reports")) return "reports";
  if (pathname.startsWith("/notifications")) return "notifications";
  if (pathname.startsWith("/analytics")) return "analytics";
  if (pathname.startsWith("/maintenance")) return "maintenance";
  if (pathname.startsWith("/alerts")) return "alerts";
  if (pathname.startsWith("/route")) return "routes";
  if (pathname.startsWith("/map")) return "map";
  if (pathname.startsWith("/tanks")) return "tanks";
  return "overview";
};
