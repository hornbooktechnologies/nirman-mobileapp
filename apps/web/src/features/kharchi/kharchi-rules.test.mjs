import { strict as assert } from "node:assert";
import { test } from "node:test";
import { amountError, effectiveKharchiProject, kharchiKey, retainAttempt, uncertainFailure } from "./kharchi-rules.ts";
test("effective project permission denies unknown and CUSTOM restricted projects", () => {
  const projects = [{ id: "allowed", permissions: ["kharchi:read"] }, { id: "restricted", permissions: ["workers:read"] }];
  assert.equal(effectiveKharchiProject(projects, "allowed")?.id, "allowed");
  assert.equal(effectiveKharchiProject(projects, "restricted"), undefined);
  assert.equal(effectiveKharchiProject(projects, "foreign"), undefined);
});
test("cache roots separate organization and project contexts", () => {
  assert.notDeepEqual(kharchiKey("org1", "p"), kharchiKey("org2", "p"));
  assert.notDeepEqual(kharchiKey("org1", "p"), kharchiKey("org1", "p2"));
});
test("financial validation rejects malformed values and over-correction at paise precision", () => {
  for (const value of ["", "0", "-1", "NaN", "Infinity", "1e3", "1.001"]) assert.ok(amountError(value));
  assert.equal(amountError("0.20", "0.20"), "");
  assert.ok(amountError("0.21", "0.20"));
});
test("uncertain retry keeps original payload and key even if editable state changes", () => {
  let count = 0; const key = () => `key-${++count}`;
  const original = retainAttempt(null, { amount: 10, worker: "a" }, key);
  assert.deepEqual(retainAttempt(original, { amount: 20, worker: "b" }, key), original);
  assert.equal(count, 1);
  assert.notEqual(retainAttempt(null, { amount: 10 }, key).idempotencyKey, original.idempotencyKey);
});
test("network and server errors remain uncertain; confirmed rejections permit correction", () => {
  for (const code of [undefined, 408, 500, 503]) assert.equal(uncertainFailure(code), true);
  for (const code of [400, 403, 404, 409, 422]) assert.equal(uncertainFailure(code), false);
});
