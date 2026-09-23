import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

const source = readFileSync(new URL("./settings-section-input.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const loaded = { exports: {} };
new Function("require", "module", "exports", compiled)(createRequire(import.meta.url), loaded, loaded.exports);
const { settingsSectionInput } = loaded.exports;

test("general settings save omits unsaved email values", () => {
  assert.deepEqual(settingsSectionInput("general", { appName: "NirmanSite" }, { smtpHost: "draft.example" }), { general: { appName: "NirmanSite" }, email: {} });
});

test("email settings save omits unsaved general values", () => {
  assert.deepEqual(settingsSectionInput("email", { appName: "draft" }, { smtpHost: "smtp.example" }), { general: {}, email: { smtpHost: "smtp.example" } });
});
