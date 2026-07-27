import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { pool } from "../src/config/database";
import {
  acknowledgeAlert,
  createAlertUnlessActive,
  resolveAllOpenAlertsForTank,
  resolveInactiveReadingAlerts,
} from "../src/models/alerts.model";

test("does not recreate an alert while its condition is active or acknowledged", async () => {
  const query = mock.method(pool, "query", async (sql: string) => {
    assert.match(sql, /UPDATE alerts SET severity/);
    assert.match(sql, /status IN \('ACTIVE','ACKNOWLEDGED'\)/);
    return { rows: [] };
  });

  try {
    const result = await createAlertUnlessActive({
      tank_id: "00000000-0000-4000-8000-000000000001",
      alert_type: "Critical sewage level",
      severity: "critical",
      message: "Threshold exceeded.",
    });

    assert.equal(result, null);
    assert.equal(query.mock.callCount(), 1);
  } finally {
    query.mock.restore();
  }
});

test("resolves active and acknowledged alerts after their condition clears", async () => {
  const query = mock.method(pool, "query", async (sql: string, values: unknown[]) => {
    assert.match(sql, /status IN \('ACTIVE', 'ACKNOWLEDGED'\)/);
    assert.match(sql, /resolved_at=NOW\(\)/);
    assert.deepEqual(values, ["00000000-0000-4000-8000-000000000001"]);
    return { rows: [] };
  });

  try {
    await resolveInactiveReadingAlerts(
      "00000000-0000-4000-8000-000000000001",
      false,
    );
    assert.equal(query.mock.callCount(), 1);
  } finally {
    query.mock.restore();
  }
});

test("unsafe readings do not resolve an open incident", async () => {
  const query = mock.method(pool, "query", async () => {
    throw new Error("query should not run");
  });
  try {
    assert.deepEqual(
      await resolveInactiveReadingAlerts("00000000-0000-4000-8000-000000000001", true),
      [],
    );
    assert.equal(query.mock.callCount(), 0);
  } finally {
    query.mock.restore();
  }
});

test("acknowledgement records the administrator and timestamp without resolving", async () => {
  const query = mock.method(pool, "query", async (sql: string, values: unknown[]) => {
    assert.match(sql, /status='ACKNOWLEDGED'/);
    assert.match(sql, /acknowledged_by=\$2/);
    assert.match(sql, /acknowledged_at=NOW\(\)/);
    assert.doesNotMatch(sql, /resolved_at=NOW/);
    assert.deepEqual(values, ["alert-id", "administrator-id"]);
    return { rows: [] };
  });
  try {
    assert.equal(await acknowledgeAlert("alert-id", "administrator-id"), null);
  } finally {
    query.mock.restore();
  }
});

test("safe reset resolves every open alert type for its tank", async () => {
  const query = mock.method(pool, "query", async (sql: string, values: unknown[]) => {
    assert.match(sql, /UPDATE alerts SET status='RESOLVED'/);
    assert.match(sql, /status IN \('ACTIVE','ACKNOWLEDGED'\)/);
    assert.doesNotMatch(sql, /alert_type IN/);
    assert.deepEqual(values, ["00000000-0000-4000-8000-000000000001"]);
    return { rows: [], rowCount: 2 };
  });
  try {
    assert.equal(
      await resolveAllOpenAlertsForTank("00000000-0000-4000-8000-000000000001"),
      2,
    );
  } finally {
    query.mock.restore();
  }
});
