import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

const source = readFileSync(new URL("./sales-view.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const loadedModule = { exports: {} };
new Function("require", "module", "exports", compiled)(createRequire(import.meta.url), loadedModule, loadedModule.exports);
const { salesTone, salesListUrl, salesDetailUrl, safeSalesReturn, safeLeadReturn, safeSalesRecordReturn } = loadedModule.exports;

test("Sales status tone retains distinct availability, conversion and customer intent meaning", () => {
  assert.equal(salesTone("AVAILABLE"), "success");
  assert.equal(salesTone("BOOKED"), "purple");
  assert.equal(salesTone("HIGH_INTENT"), "active");
  assert.equal(salesTone("CANCELLED"), "danger");
  assert.equal(salesTone("LOST"), "danger");
  assert.notEqual(salesTone("BLOCKED"), salesTone("BOOKED"));
});

test("Sales list filters preserve search while resetting page and retain safe return", () => {
  const list = salesListUrl("/projects/p1/sales/leads", new URLSearchParams("page=4&search=Anita&stage=NEW"), { stage: "QUALIFIED" }, ["page"]);
  assert.equal(list, "/projects/p1/sales/leads?search=Anita&stage=QUALIFIED");
  const detail = salesDetailUrl("/projects/p1/sales/leads/l1", list);
  assert.equal(new URL(detail, "https://example.test").searchParams.get("returnTo"), list);
  assert.equal(safeLeadReturn(list, "p1"), list);
  assert.equal(safeLeadReturn("/projects/p1/sales/follow-ups?status=SCHEDULED", "p1"), "/projects/p1/sales/follow-ups?status=SCHEDULED");
});

test("Sales return rejects foreign project, nested route and recursive return", () => {
  for (const value of ["https://example.test", "//example.test", "/projects/p2/sales/inventory?status=AVAILABLE", "/projects/p1/sales/inventory/u1", "/projects/p1/sales/inventory?returnTo=%2Funsafe"]) {
    assert.equal(safeSalesReturn(value, "p1", "inventory"), "/projects/p1/sales/inventory");
  }
});

test("related lead, unit and booking records preserve same-project customer return", () => {
  const leadList = "/projects/p1/sales/leads?search=Anita";
  const lead = salesDetailUrl("/projects/p1/sales/leads/l1", leadList);
  assert.equal(safeSalesRecordReturn(lead, "p1", ["leads"]), lead);
  assert.equal(safeSalesRecordReturn(lead, "p2", ["leads"]), null);
  assert.equal(safeSalesRecordReturn("/projects/p1/sales/leads/l1?returnTo=https%3A%2F%2Fevil.test", "p1", ["leads"]), null);
  assert.equal(safeLeadReturn("/projects/p1/sales/bookings/b1", "p1"), "/projects/p1/sales/bookings/b1");
});
