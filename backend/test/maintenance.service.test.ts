import assert from "node:assert/strict";
import test from "node:test";
import {
  changeMaintenance, changeMaintenanceForUser, MaintenanceValidationError,
} from "../src/services/maintenance.service";

const user = {
  id: "00000000-0000-4000-8000-000000000001",
  full_name: "Officer",
  email: "officer@example.com",
  phone_number: null,
  role: "MAINTENANCE_OFFICER" as const,
  created_at: new Date(),
  updated_at: new Date(),
};

test("maintenance updates reject non-object bodies", async () => {
  await assert.rejects(
    () => changeMaintenance("00000000-0000-4000-8000-000000000002", null as unknown as never),
    (error: unknown) => error instanceof MaintenanceValidationError && error.message === "Request body must be a JSON object.",
  );
  await assert.rejects(
    () => changeMaintenanceForUser("00000000-0000-4000-8000-000000000002", [] as unknown as never, user),
    (error: unknown) => error instanceof MaintenanceValidationError && error.message === "Request body must be a JSON object.",
  );
});
