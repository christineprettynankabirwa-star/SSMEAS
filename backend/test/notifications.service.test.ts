import assert from "node:assert/strict";
import test from "node:test";
import {
  deleteNotification, readNotification, setNotificationPreferences, NotificationValidationError,
} from "../src/services/notifications.service";

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

test("notification mutations reject malformed UUIDs before querying the database", async () => {
  const malformedIds = [
    "------------------------------------",
    "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    "00000000-0000-0000-0000-000000000000",
    "not-a-uuid",
  ];

  for (const id of malformedIds) {
    await assert.rejects(readNotification(id, "user-id"), NotificationValidationError);
    await assert.rejects(deleteNotification(id, "user-id"), NotificationValidationError);
  }
});
