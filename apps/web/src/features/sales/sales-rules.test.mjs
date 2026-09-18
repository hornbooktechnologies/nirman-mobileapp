import { strict as assert } from "node:assert";
import { test } from "node:test";
import { QueryClient } from "@tanstack/react-query";
import {
  assignmentPermission,
  canReadSales,
  canWriteLead,
  failureMessage,
  instant,
  localTime,
  salesKey,
  salesScope,
} from "./sales-rules.ts";
test("effective CUSTOM grants and own-scope ownership gate lead writes", () => {
  const lead = { assignedTo: "salesperson", createdBy: "creator" };
  assert.equal(canReadSales(["projects:read"]), false);
  assert.equal(canReadSales(["leads:read-own"]), true);
  const grants = ["leads:read-own", "leads:update"];
  assert.equal(
    canWriteLead(grants, true, "leads:update", lead, "salesperson"),
    true,
  );
  assert.equal(
    canWriteLead(grants, true, "leads:update", lead, "creator"),
    true,
  );
  assert.equal(
    canWriteLead(grants, true, "leads:update", lead, "unrelated"),
    false,
  );
  assert.equal(
    canWriteLead(grants, false, "leads:update", lead, "creator"),
    false,
  );
  assert.equal(
    canWriteLead(["leads:read-all"], true, "leads:update", lead, "creator"),
    false,
  );
});
test("initial assignment never substitutes for reassignment authority", () => {
  assert.equal(assignmentPermission(null), "leads:assign");
  assert.equal(assignmentPermission("another-user"), "leads:reassign");
});
test("user, organization and project scopes cannot reuse another workspace cache", () => {
  const original = salesScope("u", "o", "p");
  for (const args of [
    ["u2", "o", "p"],
    ["u", "o2", "p"],
    ["u", "o", "p2"],
  ])
    assert.notEqual(salesScope(...args), original);
  const cache = new QueryClient();
  cache.setQueryData([...salesKey("o", "p"), "leads"], ["private"]);
  assert.equal(
    cache.getQueryData([...salesKey("other", "p"), "leads"]),
    undefined,
  );
  assert.equal(
    cache.getQueryData([...salesKey("o", "other"), "leads"]),
    undefined,
  );
  cache.clear();
});
test("wall-clock schedules use organization timezone and reject DST gaps", () => {
  assert.equal(
    instant("2026-09-18T09:30", "Asia/Kolkata"),
    "2026-09-18T04:00:00.000Z",
  );
  assert.equal(
    localTime("2026-09-18T04:00:00.000Z", "Asia/Kolkata"),
    "2026-09-18T09:30",
  );
  assert.equal(
    instant("2026-09-18T09:30", "America/New_York"),
    "2026-09-18T13:30:00.000Z",
  );
  assert.throws(() => instant("2026-03-08T02:30", "America/New_York"));
  assert.throws(() => instant("2026-02-31T09:30", "Asia/Kolkata"));
});
test("uncertain writes ask for reconciliation, access failures do not promise retry success", () => {
  assert.match(
    failureMessage(new Error("Network error")),
    /outcome may be uncertain/,
  );
  assert.match(
    failureMessage({ statusCode: 503, message: "Unavailable" }),
    /before submitting again/,
  );
  assert.match(failureMessage({ statusCode: 403 }), /Access denied/);
  assert.match(
    failureMessage({ statusCode: 409, message: "Duplicate" }),
    /Refresh and review/,
  );
});
