import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { createRequire } from "node:module";

const source = readFileSync(new URL("./activity-query.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const loadedModule = { exports: {} };
new Function("require", "module", "exports", compiled)(createRequire(import.meta.url), loadedModule, loadedModule.exports);
const { activityFilterHref, activityOrigin, galleryDayKey, safeActivityReturn } = loadedModule.exports;

test("applying filters resets page and retains other project context", () => {
  assert.equal(activityFilterHref("/projects/p1/gallery", new URLSearchParams("page=4&category=WORK&from=calendar"), { category: "ISSUE", dateFrom: "2026-09-01" }, ["category", "dateFrom"]), "/projects/p1/gallery?from=calendar&category=ISSUE&dateFrom=2026-09-01");
  assert.equal(activityOrigin("/projects/p1/gallery", new URLSearchParams("page=3&returnTo=%2Fprojects%2Fp1%2Fprogress")), "/projects/p1/gallery?page=3");
});

test("gallery groups UTC capture time by India calendar day", () => {
  assert.equal(galleryDayKey("2026-09-22T20:00:00.000Z"), "2026-09-23");
});

test("return destination is limited to the same project activity routes", () => {
  assert.equal(safeActivityReturn("/projects/p1/progress?stage=FOUNDATION", "p1"), "/projects/p1/progress?stage=FOUNDATION");
  assert.equal(safeActivityReturn("/work-calendar?projectId=p1&month=2026-09", "p1"), "/work-calendar?projectId=p1&month=2026-09");
  for (const value of ["/projects/p2/gallery", "/work-calendar?projectId=p2", "https://example.com", "//example.com", "/projects/p1/progress/other"]) assert.equal(safeActivityReturn(value, "p1"), null);
});
