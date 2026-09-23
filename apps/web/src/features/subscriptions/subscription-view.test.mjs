import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

const source = readFileSync(new URL("./subscription-view.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const loaded = { exports: {} };
new Function("require", "module", "exports", compiled)(createRequire(import.meta.url), loaded, loaded.exports);
const { subscriptionTone } = loaded.exports;

test("subscription status distinguishes active, pending, suspended and ended access", () => {
  assert.equal(subscriptionTone("ACTIVE"), "success");
  assert.equal(subscriptionTone("PENDING"), "warning");
  assert.equal(subscriptionTone("SUSPENDED"), "danger");
  assert.equal(subscriptionTone("EXPIRED"), "inactive");
  assert.equal(subscriptionTone("CANCELLED"), "inactive");
});
