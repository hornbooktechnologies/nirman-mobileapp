import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("./activity-details.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const loaded = { exports: {} };
new Function("module", "exports", compiled)(loaded, loaded.exports);
const { activityDetails } = loaded.exports;

test("cancelled booking details show reference, unit and readable restored stages", () => {
  const rows = activityDetails({ details: JSON.stringify({ bookingId: "internal-id", restoredLeadStage: "NEGOTIATION", restoredUnitStatus: "AVAILABLE" }), bookingReference: "BK-42", unitNumber: "B2" }, String);
  assert.deepEqual(rows, [["Booking", "BK-42"], ["Unit", "B2"], ["Restored lead stage", "Negotiation"], ["Restored unit status", "Available"]]);
});

test("references without labels never expose internal IDs and retain actual booking date", () => {
  assert.deepEqual(activityDetails({ details: { bookingId: "internal-id", assignedFrom: null, assignedTo: "user-id" }, bookingDate: "2026-09-28", assignedToName: "Nishant" }, String), [["Booking", "Booked on 2026-09-28"], ["Previous owner", "Unassigned"], ["New owner", "Nishant"]]);
});

test("manual notes remain intact for object and plain string payloads", () => {
  assert.deepEqual(activityDetails({ details: { details: "Called customer\nVisit tomorrow" } }, String), [["Notes", "Called customer\nVisit tomorrow"]]);
  assert.deepEqual(activityDetails({ details: "Called customer" }, String), [["Notes", "Called customer"]]);
});
