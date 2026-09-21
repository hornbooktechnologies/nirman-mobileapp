import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  validateVisit,
  visitActionable,
  visitSnapshot,
} from "./site-visit-rules.ts";
import { canWriteLead, instant } from "./sales-rules.ts";
test("terminal visits are immutable and rescheduling requires a schedule", () => {
  for (const status of ["COMPLETED", "CANCELLED", "NO_SHOW", "UNKNOWN"])
    assert.equal(visitActionable(status), false);
  for (const status of ["SCHEDULED", "RESCHEDULED"])
    assert.equal(visitActionable(status), true);
  assert.ok(
    validateVisit({ status: "RESCHEDULED", scheduledAt: "" }).scheduledAt,
  );
  assert.deepEqual(
    validateVisit({ status: "COMPLETED", attendeeCount: "1000" }),
    {},
  );
});
test("attendee validation follows API limits including integer-only input", () => {
  for (const attendeeCount of ["0", "1001", "-1", "1.5", "1e2", "NaN"])
    assert.ok(validateVisit({ attendeeCount }).attendeeCount);
  for (const attendeeCount of ["", "1", "1000"])
    assert.deepEqual(validateVisit({ attendeeCount }), {});
});
test("preflight detects every mutable visit field, including repeated reschedules", () => {
  const visit = {
    id: "v",
    leadId: "l",
    status: "RESCHEDULED",
    scheduledAt: "2026-09-21T10:00:00Z",
    assignedSalesperson: "u",
    attendeeCount: 2,
    customerFeedback: null,
    objectionsConcerns: null,
    nextAction: null,
    completedAt: null,
  };
  for (const key of Object.keys(visit))
    assert.notEqual(
      visitSnapshot(visit),
      visitSnapshot({ ...visit, [key]: "changed" }),
    );
  assert.equal(
    visitSnapshot(visit),
    visitSnapshot({ ...visit, customerName: "Renamed" }),
  );
});
test("visit management requires effective grants, active project and writable lead", () => {
  const lead = { assignedTo: "u", createdBy: "creator" };
  assert.equal(
    canWriteLead(
      ["leads:read-own", "site-visits:manage"],
      true,
      "site-visits:manage",
      lead,
      "u",
    ),
    true,
  );
  assert.equal(
    canWriteLead(
      ["leads:read-own", "site-visits:manage"],
      true,
      "site-visits:manage",
      lead,
      "other",
    ),
    false,
  );
  assert.equal(
    canWriteLead(["leads:read-all"], true, "site-visits:manage", lead, "u"),
    false,
  );
  assert.equal(
    canWriteLead(
      ["leads:read-all", "site-visits:manage"],
      false,
      "site-visits:manage",
      lead,
      "u",
    ),
    false,
  );
  assert.equal(
    instant("2026-09-21T14:30", "Asia/Kolkata"),
    "2026-09-21T09:00:00.000Z",
  );
});
