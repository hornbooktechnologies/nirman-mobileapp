import { strict as assert } from "node:assert";
import { test } from "node:test";
import { QueryClient } from "@tanstack/react-query";
import { progressProject, progressScope, progressKey, canUpdateProgress, updateErrors, todayInIndia, retainAttempt, failureKind } from "./progress-rules.ts";
test("effective project access denies foreign and CUSTOM-restricted direct routes", () => {
  const rows = [{ id: "allowed", permissions: ["progress:read"] }, { id: "restricted", permissions: ["projects:read"] }];
  assert.equal(progressProject(rows, "allowed")?.id, "allowed");
  assert.equal(progressProject(rows, "restricted"), undefined);
  assert.equal(progressProject(rows, "foreign"), undefined);
  assert.equal(canUpdateProgress(["progress:read"], true), false);
  assert.equal(canUpdateProgress(["progress:update"], false), false);
  assert.equal(canUpdateProgress(["progress:update"], true), true);
});
test("user organization and project isolate cache and workspace identities", () => {
  const scope = progressScope("u", "o", "p");
  for (const args of [["v", "o", "p"], ["u", "q", "p"], ["u", "o", "r"]]) assert.notEqual(progressScope(...args), scope);
  const cache = new QueryClient();
  cache.setQueryData(progressKey("o", "p"), { percentage: 40 });
  assert.equal(cache.getQueryData(progressKey("q", "p")), undefined);
  assert.equal(cache.getQueryData(progressKey("o", "r")), undefined);
  cache.clear(); assert.equal(cache.getQueryData(progressKey("o", "p")), undefined);
});
test("percentage precision, bounds, regression notes and untouched null baseline", () => {
  const validate = (p, notes = "", previous = null) => updateErrors(p, "2026-09-18", notes, previous, "2026-09-18");
  for (const p of ["", "-1", "100.01", "1e2", "NaN", "1.001"]) assert.ok(validate(p).percentage, p);
  for (const p of ["0", "100", "33.33"]) assert.equal(validate(p).percentage, "");
  assert.ok(validate("20", " ", 30).notes);
  assert.equal(validate("20", "Correction", 30).notes, "");
  assert.equal(validate("0").notes, "");
  assert.ok(validate("20", "x".repeat(2001)).notes);
});
test("API India date boundary and invalid dates", () => {
  assert.equal(todayInIndia(new Date("2026-09-17T18:30:00Z")), "2026-09-18");
  for (const date of ["", "2026-02-30", "2026-09-19"]) assert.ok(updateErrors("10", date, "", null, "2026-09-18").date);
});
test("uncertain replay retains exact payload key and nullable concurrency expectation", () => {
  const first = retainAttempt(null, { percentage: 20, expectedPreviousPercentage: null, stage: "SLAB" }, () => "original-key");
  assert.equal(retainAttempt(first, { percentage: 50, expectedPreviousPercentage: 20, stage: "PLINTH" }, () => "new-key"), first);
  assert.equal(first.expectedPreviousPercentage, null);
  for (const status of [undefined, 408, 500, 503]) assert.equal(failureKind(status), "uncertain");
  assert.equal(failureKind(409), "stale");
  assert.equal(failureKind(403), "denied");
  assert.equal(failureKind(400), "rejected");
});
