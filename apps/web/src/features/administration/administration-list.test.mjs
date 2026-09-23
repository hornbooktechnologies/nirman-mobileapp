import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";

const source = readFileSync(new URL("./administration-list.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const loaded = { exports: {} };
new Function("require", "module", "exports", compiled)(createRequire(import.meta.url), loaded, loaded.exports);
const { administrationListUrl, administrationDetailUrl, safeAdministrationReturn, platformUsersQuery } = loaded.exports;

test("platform Users query sends server pagination, search and role filter", () => {
  assert.equal(platformUsersQuery({ page: 2, pageSize: 25, search: "Anita Rao", roleId: "role-1" }), "page=2&pageSize=25&search=Anita+Rao&roleId=role-1");
});

test("administration filters reset page and retain list return", () => {
  const list = administrationListUrl("/users", new URLSearchParams("page=3&search=Anita"), { roleId: "role-1" }, ["page"]);
  assert.equal(list, "/users?search=Anita&roleId=role-1");
  const detail = administrationDetailUrl("/users/user-1", list);
  assert.equal(new URL(detail, "https://test.local").searchParams.get("returnTo"), list);
  assert.equal(safeAdministrationReturn(list, "users"), list);
});

test("administration return rejects another list and unapproved parameters", () => {
  for (const value of ["https://test.local", "//test.local", "/roles?search=owner", "/users/user-1", "/users?returnTo=%2Funsafe"]) {
    assert.equal(safeAdministrationReturn(value, "users"), "/users");
  }
  assert.equal(safeAdministrationReturn("/roles?roleId=another-role", "roles"), "/roles");
});
