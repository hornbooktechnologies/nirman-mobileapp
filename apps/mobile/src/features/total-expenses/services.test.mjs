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
test("paid material and Kharchi lists use the dated paid-spending endpoint", async () => {
  const { requests, fetchSpending } = client();
  const dates = { startDate: "2026-10-01", endDate: "2026-10-09" };
  await fetchSpending("org", "project", "token", dates, true);
  await fetchSpending("org", "project", "token", { ...dates, source: "MATERIALS" });
  await fetchSpending("org", "project", "token", { ...dates, source: "KHARCHI" });
  assert.equal(requests[0].path, "/organizations/org/projects/project/total-expenses/summary?startDate=2026-10-01&endDate=2026-10-09");
  assert.equal(requests[1].path, "/organizations/org/projects/project/total-expenses?startDate=2026-10-01&endDate=2026-10-09&source=MATERIALS");
  assert.equal(requests[2].path, "/organizations/org/projects/project/total-expenses?startDate=2026-10-01&endDate=2026-10-09&source=KHARCHI");
  assert.deepEqual(requests[2].auth, { accessToken: "token" });
});
