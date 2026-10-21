import { strict as assert } from "node:assert";
import { test } from "node:test";

import { salesNumberError } from "./sales-number.ts";

test("decimal fields accept ordinary numeric strings and reject non-decimal syntax", () => {
  const rule = { kind: "decimal", min: 0 };
  for (const value of ["", "0", "0.25", ".5", "125000.75"])
    assert.equal(salesNumberError(value, rule), undefined, value);
  for (const value of ["-1", "+1", "1e3", "1.2.3", "NaN", "Infinity", "abc"])
    assert.ok(salesNumberError(value, rule), value);
});

test("integer fields enforce whole-number bounds", () => {
  const rule = { kind: "integer", min: 1, max: 1000 };
  for (const value of ["1", "20", "1000"])
    assert.equal(salesNumberError(value, rule), undefined, value);
  for (const value of ["0", "1001", "1.5", "1e2", "-1"])
    assert.ok(salesNumberError(value, rule), value);
});

test("exclusive minimum rejects zero for positive measurements and prices", () => {
  const rule = { kind: "decimal", min: 0, exclusiveMin: true };
  assert.ok(salesNumberError("0", rule));
  assert.equal(salesNumberError("0.01", rule), undefined);
});
