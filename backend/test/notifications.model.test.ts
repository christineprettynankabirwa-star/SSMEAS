import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { pool } from "../src/config/database";
import { createAcknowledgementNotifications } from "../src/models/notifications.model";
import type { Alert } from "../src/types/alerts.types";

const alert: Alert = {
  id: "00000000-0000-4000-8000-000000000001",
  tank_id: "00000000-0000-4000-8000-000000000002",
  tank_name: "Test Tank",
  location: "Kampala",
  latitude: 0.3476,
  longitude: 32.5825,
  alert_type: "Critical sewage level",
  severity: "critical",
  status: "ACKNOWLEDGED",
  message: "Level is critical.",
  created_at: new Date(), updated_at: new Date(), last_seen_at: new Date(),
  acknowledged_by: "00000000-0000-4000-8000-000000000003",
  acknowledged_by_name: "Administrator", acknowledged_at: new Date(), resolved_at: null,
};

test("acknowledgement history works with either supported notification uniqueness key", async () => {
  const query = mock.method(pool, "query", async (sql: string) => {
    assert.match(sql, /ON CONFLICT DO NOTHING/);
    assert.doesNotMatch(sql, /ON CONFLICT\(alert_id,user_id,channel,title\)/);
    return { rowCount: 1, rows: [] };
  });
  try {
    assert.equal(await createAcknowledgementNotifications(alert), 1);
  } finally {
    query.mock.restore();
  }
});
