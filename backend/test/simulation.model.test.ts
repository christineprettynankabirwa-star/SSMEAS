import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { pool } from "../src/config/database";
import {
  cancelUnstartedAutomaticMaintenance, completeAutomaticMaintenanceForTank,
} from "../src/models/maintenance.model";
import {
  getUnsafeTestTankIds, recordSimulationAudit,
} from "../src/models/simulation.model";

test("reset-all targets only unsafe reserved test tanks", async () => {
  const query = mock.method(pool, "query", async (sql: string) => {
    assert.match(sql, /id::text LIKE 'd0000000/);
    assert.match(sql, /level,0\) >= 80/);
    assert.match(sql, /gas_level,0\) >= 200/);
    return { rows: [{ id: "test-tank-id" }] };
  });
  try {
    assert.deepEqual(await getUnsafeTestTankIds(), ["test-tank-id"]);
  } finally {
    query.mock.restore();
  }
});

test("safe reset cancels only unstarted automatically generated maintenance", async () => {
  const query = mock.method(pool, "query", async (sql: string, values: unknown[]) => {
    assert.match(sql, /status IN \('SCHEDULED','ASSIGNED'\)/);
    assert.doesNotMatch(sql, /IN_PROGRESS/);
    assert.match(sql, /Emergency response:/);
    assert.match(sql, /Automatically created for a critical sewer alert/);
    assert.deepEqual(values, ["00000000-0000-4000-8000-000000000001"]);
    return { rows: [], rowCount: 2 };
  });
  try {
    assert.equal(
      await cancelUnstartedAutomaticMaintenance("00000000-0000-4000-8000-000000000001"),
      2,
    );
  } finally {
    query.mock.restore();
  }
});

test("simulation audit records the actor, appended reading, and side effects", async () => {
  const expected = {
    actorId: "actor-id", tankId: "tank-id", readingId: "reading-id",
    action: "RESET_TANK", condition: "SAFE",
    resolvedAlerts: 2, cancelledMaintenance: 1,
  };
  const query = mock.method(pool, "query", async (sql: string, values: unknown[]) => {
    assert.match(sql, /INSERT INTO simulation_audit_logs/);
    assert.deepEqual(values, [
      "actor-id", "tank-id", "reading-id", "RESET_TANK", "SAFE", 2, 1,
    ]);
    return { rows: [] };
  });
  try {
    await recordSimulationAudit(expected);
  } finally {
    query.mock.restore();
  }
});

test("natural SAFE readings complete open automatic maintenance", async () => {
  const query = mock.method(pool, "query", async (sql: string) => {
    assert.match(sql, /status='COMPLETED'/);
    assert.match(sql, /completed_at=COALESCE\(completed_at,NOW\(\)\)/);
    assert.match(sql, /status IN \('SCHEDULED','ASSIGNED','IN_PROGRESS'\)/);
    assert.match(sql, /Emergency response:/);
    return { rows: [], rowCount: 2 };
  });
  try {
    assert.equal(await completeAutomaticMaintenanceForTank("tank-id"), 2);
  } finally {
    query.mock.restore();
  }
});
