import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { pool } from "../src/config/database";
import { getAllTanks, getAssignedTanks } from "../src/models/tank.model";

test("tank queries retain only the newest normalized tank name", async () => {
  const query = mock.method(pool, "query", async (sql: string) => {
    assert.match(sql, /DISTINCT ON \(LOWER\(BTRIM\(tank_name\)\)\)/);
    assert.match(sql, /created_at DESC, id DESC/);
    return { rows: [] };
  });
  try {
    await getAllTanks();
  } finally {
    query.mock.restore();
  }
});

test("assigned-tank queries apply the same display-name deduplication", async () => {
  const query = mock.method(pool, "query", async (sql: string) => {
    assert.match(sql, /DISTINCT ON \(LOWER\(BTRIM\(tank\.tank_name\)\)\)/);
    assert.match(sql, /WHERE EXISTS/);
    return { rows: [] };
  });
  try {
    await getAssignedTanks("00000000-0000-4000-8000-000000000001");
  } finally {
    query.mock.restore();
  }
});
