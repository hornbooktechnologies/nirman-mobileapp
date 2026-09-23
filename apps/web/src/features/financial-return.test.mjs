import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { createRequire } from "node:module";

const source = readFileSync(new URL("./financial-return.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const loadedModule = { exports: {} };
new Function("require", "module", "exports", compiled)(createRequire(import.meta.url), loadedModule, loadedModule.exports);
const { financialListHref, safeFinancialReturn } = loadedModule.exports;

test("financial detail return keeps applied list state in the same project", () => {
  const href = financialListHref("project-1", "materials", { status: "PENDING_FINAL", page: 3, pageSize: 20 });
  assert.equal(href, "/projects/project-1/materials?status=PENDING_FINAL&page=3");
  assert.equal(safeFinancialReturn(href, "project-1", "materials"), href);
});

test("financial detail return rejects foreign project, sibling and external paths", () => {
  for (const value of ["/projects/project-2/materials", "/projects/project-1/expenses", "https://example.com", "//example.com", "/projects/project-1/materials/record"]) {
    assert.equal(safeFinancialReturn(value, "project-1", "materials"), "/projects/project-1/materials");
  }
});
