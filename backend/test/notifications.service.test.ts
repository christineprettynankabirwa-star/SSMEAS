import assert from "node:assert/strict";
import test from "node:test";
import { setNotificationPreferences, NotificationValidationError } from "../src/services/notifications.service";

test("notification preferences require every supported boolean field", () => {
  assert.throws(
    () => setNotificationPreferences("user-id", { dashboard_enabled: true }),
    NotificationValidationError,
  );
});

test("notification preferences reject non-object bodies", () => {
  assert.throws(
    () => setNotificationPreferences("user-id", null),
    /Preferences must be a JSON object/,
  );
});
