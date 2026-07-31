import assert from "node:assert/strict";
import test from "node:test";
import { addTank, editTank, ValidationError } from "../src/services/tank.service";

test("tank creation rejects a non-object request body", async () => {
  await assert.rejects(
    () => addTank(null as unknown as never),
    (error: unknown) => error instanceof ValidationError && error.message === "Request body must be a JSON object.",
  );
});

test("tank updates reject a non-object request body", async () => {
  await assert.rejects(
    () => editTank("00000000-0000-4000-8000-000000000001", [] as unknown as never),
    (error: unknown) => error instanceof ValidationError && error.message === "Request body must be a JSON object.",
  );
});
