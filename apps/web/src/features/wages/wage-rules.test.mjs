import { strict as assert } from "node:assert";
import { test } from "node:test";
import { canCancelWageBatch, paymentValidation, isUncertainPaymentFailure, effectiveWageProject, retainPaymentAttempt } from "./wage-rules.ts";

const item = { netAmount: "100.30", paidAmount: "100.10" };
test("uncertain retry preserves both key and original payload; a completed attempt gets a new key", () => {
  let keys = 0;
  const key = () => `key-${++keys}`;
  const input = { wageItemId: "item-1", amount: 12, paymentDate: "2026-09-17", paymentMethod: "CASH", reference: null };
  const attempt = retainPaymentAttempt(null, input, key);
  const retry = retainPaymentAttempt(attempt, { ...input, amount: 50, wageItemId: "item-2" }, key);
  assert.deepEqual(retry, attempt);
  assert.equal(keys, 1);
  assert.notEqual(retainPaymentAttempt(null, input, key).idempotencyKey, attempt.idempotencyKey);
});
test("payment validation uses exact paise boundary and rejects overpayment", () => {
  assert.equal(paymentValidation("0.20", item), "");
  assert.match(paymentValidation("0.21", item), /exceeds/);
});
test("reject invalid financial inputs and missing worker", () => {
  for (const value of ["", "0", "-1", "NaN", "Infinity", "1.001", "1e2"]) assert.ok(paymentValidation(value, item));
  assert.equal(paymentValidation("1"), "Select a worker.");
});
test("any payment history prevents cancellation, even if totals are zero", () => {
  const batch = { status: "CONFIRMED", totals: { paidAmount: "0.00" }, payments: [] };
  assert.equal(canCancelWageBatch(batch), true);
  assert.equal(canCancelWageBatch({ ...batch, payments: [{ id: "payment" }] }), false);
  assert.equal(canCancelWageBatch({ ...batch, status: "CANCELLED" }), false);
  assert.equal(canCancelWageBatch({ ...batch, totals: { ...batch.totals, paidAmount: "0.01" } }), false);
});
test("network, timeout and server failures preserve payment attempt", () => {
  for (const status of [undefined, 408, 500, 503]) assert.equal(isUncertainPaymentFailure(status), true);
  for (const status of [400, 403, 404, 409, 422]) assert.equal(isUncertainPaymentFailure(status), false);
});
test("direct-route access uses target project's effective CUSTOM permissions", () => {
  const projects = [{ id: "allowed", permissions: ["wages:read"] }, { id: "custom-denied", permissions: ["workers:read"] }];
  assert.equal(effectiveWageProject(projects, "allowed")?.id, "allowed");
  assert.equal(effectiveWageProject(projects, "custom-denied"), undefined);
  assert.equal(effectiveWageProject(projects, "another-organization"), undefined);
});
