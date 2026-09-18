import { strict as assert } from "node:assert";
import { test } from "node:test";
import { QueryClient } from "@tanstack/react-query";
import {
  amountError,
  commandFailure,
  expenseActions,
  expenseKey,
  expenseProject,
  expenseScope,
  retainAttempt,
} from "./expense-rules.ts";

test("effective project grants gate direct routes, including CUSTOM and foreign projects", () => {
  const projects = [
    { id: "allowed", permissions: ["expenses:read"] },
    { id: "custom", permissions: ["projects:read"] },
  ];
  assert.equal(expenseProject(projects, "allowed")?.id, "allowed");
  assert.equal(expenseProject(projects, "custom"), undefined);
  assert.equal(expenseProject(projects, "foreign"), undefined);
});
test("server actions remain authoritative for self approval and immutable records", () => {
  const all = [
    "expenses:update",
    "expenses:approve",
    "expenses:reject",
    "expenses:adjust",
  ];
  assert.deepEqual(expenseActions([], all, true), []);
  assert.deepEqual(expenseActions(["ADJUST"], all, true), ["ADJUST"]);
  assert.deepEqual(expenseActions(["EDIT", "SUBMIT", "CANCEL"], all, true), [
    "EDIT",
    "SUBMIT",
    "CANCEL",
  ]);
  assert.deepEqual(expenseActions(["APPROVE"], ["expenses:read"], true), []);
  assert.deepEqual(expenseActions(["ADJUST"], all, false), []);
  assert.deepEqual(expenseActions(["UNKNOWN", "toString"], all, true), []);
});
test("scope identity changes for user, organization and project; caches do not share financial records", () => {
  const scope = expenseScope("user1", "org1", "project1");
  for (const args of [
    ["user2", "org1", "project1"],
    ["user1", "org2", "project1"],
    ["user1", "org1", "project2"],
  ])
    assert.notEqual(expenseScope(...args), scope);
  const cache = new QueryClient();
  cache.setQueryData([...expenseKey("org1", "p1"), "detail", "record"], {
    recognizedAmount: "250.00",
  });
  assert.equal(
    cache.getQueryData([...expenseKey("org2", "p1"), "detail", "record"]),
    undefined,
  );
  assert.equal(
    cache.getQueryData([...expenseKey("org1", "p2"), "detail", "record"]),
    undefined,
  );
  cache.clear();
  assert.equal(
    cache.getQueryData([...expenseKey("org1", "p1"), "detail", "record"]),
    undefined,
  );
});
test("financial input rejects zero, negatives, exponent and excess decimal precision", () => {
  for (const value of [
    "",
    "0",
    "0.00",
    "-1",
    "NaN",
    "Infinity",
    "1e3",
    "1.001",
  ])
    assert.ok(amountError(value), value);
  assert.equal(amountError("0.01"), "");
  assert.equal(amountError("1250.50"), "");
});
test("decrease validates against the latest server balance without computing recognized cost", () => {
  assert.equal(amountError("10.01", "10.01", true), "");
  assert.ok(amountError("10.02", "10.01", true));
  assert.ok(amountError("0.01", "0.00", true));
  assert.equal(amountError("10.02", "10.01", false), "");
});
test("uncertain retry freezes original amount, version and idempotency key", () => {
  let generated = 0;
  const key = () => `key-${++generated}`;
  const original = retainAttempt(
    null,
    { amount: -20, reason: "Correct receipt", expectedVersion: 3 },
    key,
  );
  assert.equal(
    retainAttempt(
      original,
      { amount: 99, reason: "Changed", expectedVersion: 4 },
      key,
    ),
    original,
  );
  assert.equal(generated, 1);
  assert.notEqual(
    retainAttempt(null, original.input, key).idempotencyKey,
    original.idempotencyKey,
  );
});
test("workflow retry freezes the original selection and key", () => {
  const original = retainAttempt(
    null,
    { workflowMode: "DIRECT" },
    () => "settings-key",
  );
  assert.equal(
    retainAttempt(
      original,
      { workflowMode: "APPROVAL_REQUIRED" },
      () => "wrong-key",
    ),
    original,
  );
});
test("conflict and authorization errors require review; transport failures retain the retry", () => {
  for (const status of [undefined, 408, 500, 502, 503])
    assert.equal(commandFailure(status), "uncertain");
  for (const status of [401, 403])
    assert.equal(commandFailure(status), "denied");
  assert.equal(commandFailure(409, "EXPENSE_VERSION_CONFLICT"), "stale");
  assert.equal(
    commandFailure(400, "EXPENSE_RECOGNIZED_AMOUNT_NEGATIVE"),
    "stale",
  );
  assert.equal(commandFailure(400, "EXPENSE_SELF_APPROVAL_FORBIDDEN"), "stale");
  assert.equal(commandFailure(400, "PROJECT_STATUS_INVALID"), "denied");
  assert.equal(commandFailure(400, "VALIDATION_FAILED"), "rejected");
});
