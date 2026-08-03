import assert from "node:assert/strict";
import test from "node:test";
import { MaintenanceValidationError, changeMaintenanceForUser } from "../src/services/maintenance.service";

const officer = {
  id: "00000000-0000-4000-8000-000000000001", email: "officer@example.com",
  full_name: "Officer", role: "MAINTENANCE_OFFICER" as const,
  phone_number: null, created_at: new Date(), updated_at: new Date(),
};

test("maintenance updates reject malformed bodies before database access", async () => {
  await assert.rejects(
    changeMaintenanceForUser("00000000-0000-4000-8000-000000000002", null as never, officer),
    MaintenanceValidationError,
  );
});
