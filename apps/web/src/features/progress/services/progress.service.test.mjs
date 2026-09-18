import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";
function adapter(transport) {
  const source = readFileSync(new URL("./progress.service.ts", import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const exports = {};
  new Function("require", "exports", outputText)((id) => { assert.equal(id, "@/lib/api/api-client"); return transport; }, exports);
  return exports.progressService;
}
test("record preserves null baseline, retry key and server summary; transport failure is not retried", async () => {
  const input = { stage: "SLAB", percentage: 10, expectedPreviousPercentage: null, notes: null, updateDate: "2026-09-18", idempotencyKey: "same-key" };
  const summary = { overallPercentage: 1.1 };
  let count = 0;
  const service = adapter({ api: { post: async (path, body) => { count++; assert.equal(path, "/organizations/o/projects/p/progress/updates"); assert.equal(body, input); if (count === 1) throw new Error("Lost response"); return summary; } } });
  await assert.rejects(service.record("o", "p", input), /Lost response/);
  assert.equal(count, 1);
  assert.equal(await service.record("o", "p", input), summary);
});
test("history/export retain tenant, filters, cancellation and CSV; portfolio uses its authorized endpoint", async () => {
  const calls = [];
  const service = adapter({ api: { get: async (path, options) => { calls.push({ path, options }); return []; } }, apiClient: { get: async (path, options) => { calls.push({ path, options }); return { data: "original csv" }; } } });
  const signal = new AbortController().signal;
  const query = { stage: "SLAB", dateFrom: "2026-09-01", dateTo: "2026-09-18", page: 2, pageSize: 25 };
  await service.history("o", "p", query, signal);
  assert.deepEqual(calls.at(-1), { path: "/organizations/o/projects/p/progress/history", options: { params: query, signal } });
  assert.equal(await service.export("o", "p", query, signal), "original csv");
  assert.deepEqual(calls.at(-1), { path: "/organizations/o/projects/p/progress/export", options: { params: query, signal, responseType: "text" } });
  await service.portfolio("o", signal);
  assert.deepEqual(calls.at(-1), { path: "/organizations/o/progress/projects", options: { signal } });
});
