import assert from "node:assert/strict";
import test from "node:test";
import type { NextFunction, Request, Response } from "express";
import { authorize } from "../src/middleware/authorize.middleware";

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
