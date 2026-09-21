import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  bookingAmountError,
  bookingAttempt,
  bookingPermission,
  bookingRejected,
  eligibleBookingUnit,
} from "./booking-rules.ts";
import { canWriteLead, salesScope, salesKey } from "./sales-rules.ts";
import { QueryClient } from "@tanstack/react-query";
test("conversion and cancellation need active effective permissions, including unit booking", () => {
  assert.equal(bookingPermission(["leads:convert"], true, false), true);
  assert.equal(bookingPermission(["leads:convert"], true, true), false);
  assert.equal(bookingPermission(["inventory:book"], true, true), false);
  assert.equal(
    bookingPermission(["leads:convert", "inventory:book"], true, true),
    true,
  );
  assert.equal(
    bookingPermission(["leads:convert", "inventory:book"], false, true),
    false,
  );
  const permissions = ["leads:read-own", "leads:convert"];
  const lead = { assignedTo: "owner", createdBy: "creator" };
  assert.equal(
    canWriteLead(permissions, true, "leads:convert", lead, "outsider"),
    false,
  );
  assert.equal(
    canWriteLead(permissions, true, "leads:convert", lead, "owner"),
    true,
  );
});
test("only available units and this lead's active block are eligible", () => {
  assert.equal(
    eligibleBookingUnit(
      { status: "AVAILABLE", blockedForLeadId: null },
      "lead",
    ),
    true,
  );
  assert.equal(
    eligibleBookingUnit(
      { status: "BLOCKED", blockedForLeadId: "lead" },
      "lead",
    ),
    true,
  );
  for (const status of ["BOOKED", "UNAVAILABLE", "BLOCKED"])
    assert.equal(
      eligibleBookingUnit({ status, blockedForLeadId: "other" }, "lead"),
      false,
    );
});
test("optional zero amount is valid; negative and non-finite financial values are rejected", () => {
  for (const value of ["", "0", "0.01", "123456.78"])
    assert.ok(!bookingAmountError(value));
  for (const value of ["-1", "Infinity", "NaN", "1e999", "1.2.3"])
    assert.ok(bookingAmountError(value));
});
test("uncertain retry reuses exact payload/key and refuses a changed logical request", () => {
  const input = {
    leadId: "l",
    unitId: "u",
    bookingDate: "2026-09-21",
    bookingAmount: 0,
    bookingReference: "ref",
  };
  let keys = 0;
  const key = () => `booking-key-${++keys}`;
  const first = bookingAttempt(null, input, key);
  assert.deepEqual(bookingAttempt(first, input, key), first);
  assert.equal(keys, 1);
  for (const delta of [
    { leadId: "other" },
    { unitId: "other" },
    { bookingAmount: 1 },
    { bookingDate: "2026-09-22" },
    { bookingReference: "changed" },
  ])
    assert.throws(
      () => bookingAttempt(first, { ...input, ...delta }, key),
      /unresolved/,
    );
  assert.equal(keys, 1);
});
test("only definitive rejections release the logical request; timeouts/conflicts retain it", () => {
  for (const error of [
    {},
    { statusCode: 500 },
    { statusCode: 401 },
    { statusCode: 409, code: "IDEMPOTENCY_CONFLICT" },
  ])
    assert.equal(bookingRejected(error), false);
  for (const statusCode of [400, 403, 404, 409, 422])
    assert.equal(
      bookingRejected({ statusCode, code: "UNIT_NOT_AVAILABLE" }),
      true,
    );
});
test("booking cache cannot be read under another organization/project/user workspace", () => {
  const cache = new QueryClient();
  cache.setQueryData([...salesKey("o", "p"), "booking", "id"], {
    customerName: "Private",
  });
  assert.equal(
    cache.getQueryData([...salesKey("other", "p"), "booking", "id"]),
    undefined,
  );
  assert.equal(
    cache.getQueryData([...salesKey("o", "other"), "booking", "id"]),
    undefined,
  );
  assert.notEqual(salesScope("one", "o", "p"), salesScope("two", "o", "p"));
  cache.clear();
});
