import assert from "node:assert/strict";
import test from "node:test";
import { AuthValidationError, createUser, updateUser } from "../src/services/auth.service";

test("user creation rejects a non-object request body", async () => {
  await assert.rejects(
    () => createUser(null as unknown as never),
    (error: unknown) => error instanceof AuthValidationError && error.message === "Request body must be a JSON object.",
  );
});

test("user updates reject a non-object request body", async () => {
  await assert.rejects(
    () => updateUser("00000000-0000-4000-8000-000000000001", [] as unknown as never),
    (error: unknown) => error instanceof AuthValidationError && error.message === "Request body must be a JSON object.",
  );
});
