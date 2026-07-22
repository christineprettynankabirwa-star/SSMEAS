import fs from "node:fs/promises";
import path from "node:path";
import { pool } from "../config/database";

type Task = "seed" | "reset" | "demo";

const task = process.argv[2] as Task | undefined;
const databaseDirectory = path.resolve(__dirname, "../../../database");

const runSqlFile = async (fileName: string): Promise<void> => {
  const sql = await fs.readFile(path.join(databaseDirectory, fileName), "utf8");
  await pool.query(sql);
  console.log(`Applied database/${fileName}`);
};

const applySeedPrerequisites = async (): Promise<void> => {
  await runSqlFile("add_demo_status_support.sql");
};

const resetDemoRecords = async (): Promise<void> => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Only reserved seed UUIDs are removed; application and production records are preserved.
    await client.query(
      `DELETE FROM alerts WHERE tank_id::text LIKE 'd0000000-0000-4000-8000-00000000000_';
       DELETE FROM maintenance WHERE tank_id::text LIKE 'd0000000-0000-4000-8000-00000000000_';
       DELETE FROM sensor_readings WHERE tank_id::text LIKE 'd0000000-0000-4000-8000-00000000000_';
       DELETE FROM tanks WHERE id::text LIKE 'd0000000-0000-4000-8000-00000000000_';
       DELETE FROM users WHERE id::text LIKE 'e0000000-0000-4000-8000-00000000000_';`,
    );
    await client.query("COMMIT");
    console.log("Removed SSMEAS demo records only.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const seed = async (): Promise<void> => {
  await applySeedPrerequisites();
  await runSqlFile("seed_demo_data.sql");
  console.log("Demo data is ready. Login: admin@ssmeas.local / ChangeMe123!");
};

const demo = async (): Promise<void> => {
  // CREATE IF NOT EXISTS makes this suitable for an empty or already initialized database.
  for (const migration of [
    "create_users_table.sql",
    "create_tanks_table.sql",
    "create_sensor_readings_table.sql",
    "create_maintenance_table.sql",
    "create_alerts_table.sql",
    "add_direct_device_readings.sql",
    "add_demo_status_support.sql",
  ]) await runSqlFile(migration);
  await resetDemoRecords();
  await runSqlFile("seed_demo_data.sql");
  console.log("Complete SSMEAS demonstration environment is ready.");
};

const main = async (): Promise<void> => {
  if (task === "seed") return seed();
  if (task === "reset") {
    await applySeedPrerequisites();
    await resetDemoRecords();
    return seed();
  }
  if (task === "demo") return demo();
  throw new Error("Usage: ts-node src/scripts/database-task.ts <seed|reset|demo>");
};

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Database task failed.");
    process.exitCode = 1;
  })
  .finally(() => pool.end());
