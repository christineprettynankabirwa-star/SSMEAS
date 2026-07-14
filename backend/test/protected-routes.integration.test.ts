import assert from "node:assert/strict";
import test from "node:test";
import { app } from "../src/app";

const protectedEndpoints = [
  ["GET", "/api/db-test"],
  ["GET", "/api/profile"],
  ["GET", "/api/dashboard/summary"],
  ["GET", "/api/readings/live"],
  ["GET", "/api/readings/history/00000000-0000-4000-8000-000000000001"],
  ["GET", "/api/tanks"],
  ["POST", "/api/tanks"],
  ["PUT", "/api/tanks/00000000-0000-4000-8000-000000000001"],
  ["DELETE", "/api/tanks/00000000-0000-4000-8000-000000000001"],
  ["GET", "/api/alerts"],
  ["GET", "/api/maintenance"],
  ["POST", "/api/maintenance"],
] as const;

test("every protected endpoint rejects requests without authentication", async () => {
  const server = app.listen(0);
  try {
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    assert(address && typeof address === "object");
    for (const [method, path] of protectedEndpoints) {
      const options: RequestInit = { method };
      if (method !== "GET") {
        options.headers = { "content-type": "application/json" };
        options.body = "{}";
      }
      const response = await fetch(`http://127.0.0.1:${address.port}${path}`, options);
      assert.equal(response.status, 401, `${method} ${path} should require authentication`);
    }
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});
