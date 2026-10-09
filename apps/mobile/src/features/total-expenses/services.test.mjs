import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

function client() {
  const requests = [];
  const exports = {};
  const code = ts.transpileModule(
    readFileSync(new URL("./services.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText;
  new Function("exports", "require", code)(exports, () => ({
    apiRequest: async (path, init, auth) => {
      requests.push({ path, init, auth });
      return { success: true, data: { materials: [], pagination: { total: 0 } } };
    },
  }));
  return { requests, fetchSpending: exports.fetchSpending };
}
test("material overview sends scoped pagination, authentication and abort signal to its own endpoint", async () => {
  const { requests, fetchSpending } = client();
  const controller = new AbortController();
  const result = await fetchSpending("org", "project", "token", { page: 2, pageSize: 20 }, "materials", controller.signal);
  assert.equal(requests[0].path, "/organizations/org/projects/project/total-expenses/materials?page=2&pageSize=20");
  assert.deepEqual(requests[0].auth, { accessToken: "token" });
  assert.equal(requests[0].init.signal, controller.signal);
  assert.deepEqual(result.materials, []);
});
test("paid list and summary retain their existing endpoints and inclusive date parameters", async () => {
  const { requests, fetchSpending } = client();
  const dates = { startDate: "2026-10-01", endDate: "2026-10-09" };
  await fetchSpending("org", "project", "token", dates, true);
  await fetchSpending("org", "project", "token", { ...dates, source: "MATERIALS" });
  assert.equal(requests[0].path, "/organizations/org/projects/project/total-expenses/summary?startDate=2026-10-01&endDate=2026-10-09");
  assert.equal(requests[1].path, "/organizations/org/projects/project/total-expenses?startDate=2026-10-01&endDate=2026-10-09&source=MATERIALS");
});
