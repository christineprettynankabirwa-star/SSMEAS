import assert from "node:assert/strict";
import test from "node:test";
import type { NextFunction, Request, Response } from "express";
import { authorize } from "../src/middleware/authorize.middleware";
import { authorizePermission } from "../src/middleware/authorize.middleware";

const responseMock = () => {
  let statusCode = 200;
  let body: unknown;
  const response = {
    status(code: number) { statusCode = code; return this; },
    json(value: unknown) { body = value; return this; },
  } as unknown as Response;
  return { response, getStatus: () => statusCode, getBody: () => body };
};

test("authorization rejects an authenticated user without the required role", () => {
  const request = { user: { id: "id", email: "user@example.com", full_name: "User", role: "SUPERVISOR" } } as unknown as Request;
  const mock = responseMock();
  let called = false;
  authorize("ADMINISTRATOR")(request, mock.response, (() => { called = true; }) as NextFunction);
  assert.equal(mock.getStatus(), 403);
  assert.deepEqual(mock.getBody(), { message: "You do not have permission to perform this action." });
  assert.equal(called, false);
});

test("authorization allows a user with a required role", () => {
  const request = { user: { id: "id", email: "admin@example.com", full_name: "Admin", role: "ADMINISTRATOR" } } as unknown as Request;
  const mock = responseMock();
  let called = false;
  authorize("ADMINISTRATOR")(request, mock.response, (() => { called = true; }) as NextFunction);
  assert.equal(called, true);
});

const roleMatrix = [
  { role: "ADMINISTRATOR", dashboard: true, readMaintenance: true, createMaintenance: true },
  { role: "MAINTENANCE_OFFICER", dashboard: false, readMaintenance: true, createMaintenance: false },
  { role: "SUPERVISOR", dashboard: true, readMaintenance: true, createMaintenance: false },
] as const;

for (const expected of roleMatrix) {
  test(`${expected.role} permissions match the acceptance role matrix`, () => {
    const request = { user: { id: "id", email: "user@example.com", full_name: "User", role: expected.role } } as unknown as Request;
    const checks = [
      { allowed: expected.dashboard, middleware: authorizePermission("dashboard:read") },
      { allowed: expected.readMaintenance, middleware: authorizePermission("maintenance:read") },
      { allowed: expected.createMaintenance, middleware: authorizePermission("maintenance:create") },
    ];
    for (const check of checks) {
      const mock = responseMock();
      let called = false;
      check.middleware(request, mock.response, (() => { called = true; }) as NextFunction);
      assert.equal(called, check.allowed);
      assert.equal(mock.getStatus(), check.allowed ? 200 : 403);
    }
  });
}

test("maintenance officers cannot access predictions or create maintenance", () => {
  const request = { user: { id: "id", email: "officer@example.com", full_name: "Officer", role: "MAINTENANCE_OFFICER" } } as unknown as Request;
  for (const permission of ["predictions:read", "maintenance:create"] as const) {
    const mock = responseMock(); let called = false;
    authorizePermission(permission)(request, mock.response, (() => { called = true; }) as NextFunction);
    assert.equal(called, false); assert.equal(mock.getStatus(), 403);
  }
});
