import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  decimalError,
  materialActions,
  materialKey,
  materialProject,
  retainAttempt,
  uncertainFailure,
} from "./material-rules.ts";

test("direct project access uses effective grants and rejects foreign or CUSTOM-restricted projects", () => {
  const projects = [
    { id: "allowed", permissions: ["materials:read"] },
    { id: "restricted", permissions: ["projects:read"] },
  ];
  assert.equal(materialProject(projects, "allowed")?.id, "allowed");
  assert.equal(materialProject(projects, "restricted"), undefined);
  assert.equal(materialProject(projects, "foreign"), undefined);
});
test("actions require server availability, matching effective permission and active project", () => {
  assert.deepEqual(
    materialActions(["APPROVE"], ["materials:approve-final"], true),
    ["APPROVE"],
  );
  assert.deepEqual(materialActions([], ["materials:approve-final"], true), []); // Self-approval is withheld by API.
  // A freshly authorized action is authoritative even if the session predates delegation.
  assert.deepEqual(materialActions(["APPROVE"], ["materials:read"], true), ["APPROVE"]);
  assert.deepEqual(materialActions(["VERIFY"], ["materials:approve-level-1"], true), []);
  assert.deepEqual(materialActions([], ["materials:approve-final"], true), []);
  assert.deepEqual(
    materialActions(["RECORD_PURCHASE"], ["materials:record-purchase"], false),
    [],
  );
  assert.deepEqual(
    materialActions(["UNKNOWN"], ["materials:update"], true),
    [],
  );
});
test("organization and project cache roots are distinct", () => {
  assert.notDeepEqual(materialKey("o1", "p"), materialKey("o2", "p"));
  assert.notDeepEqual(materialKey("o", "p1"), materialKey("o", "p2"));
});
test("quantity and money validation respect DTO decimal precision", () => {
  for (const value of ["", "-1", "NaN", "Infinity", "1e3", "0.0001", "0"])
    assert.ok(decimalError(value, 3, true));
  assert.equal(decimalError("0.001", 3, true), "");
  assert.equal(decimalError("0.00", 2), "");
  assert.ok(decimalError("1.001", 2));
});
test("uncertain retry retains exact version, financial input and key", () => {
  let count = 0;
  const key = () => `key-${++count}`;
  const first = retainAttempt(
    null,
    { orderedQuantity: 2, totalCost: 20, expectedVersion: 3 },
    key,
  );
  assert.deepEqual(
    retainAttempt(
      first,
      { orderedQuantity: 4, totalCost: 40, expectedVersion: 4 },
      key,
    ),
    first,
  );
  assert.equal(count, 1);
  assert.notEqual(
    retainAttempt(null, first.input, key).idempotencyKey,
    first.idempotencyKey,
  );
});
test("only definite rejection releases the pending attempt", () => {
  for (const status of [undefined, 408, 500, 502, 503])
    assert.equal(uncertainFailure(status), true);
  for (const status of [400, 403, 404, 409, 422])
    assert.equal(uncertainFailure(status), false);
});
