import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";
function adapter(api) {
  const source = readFileSync(
    new URL("./notifications.service.ts", import.meta.url),
    "utf8",
  );
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const exports = {};
  new Function("require", "exports", outputText)((id) => {
    assert.equal(id, "@/lib/api/api-client");
    return { api };
  }, exports);
  return exports.notificationsService;
}
test("inbox filters, recipient-scoped endpoints and cancellation signals match existing API", async () => {
  const calls = [];
  const service = adapter(
    Object.fromEntries(
      ["get", "post"].map((method) => [
        method,
        async (...args) => {
          calls.push([method, ...args]);
          return {};
        },
      ]),
    ),
  );
  const signal = new AbortController().signal;
  await service.list("o", 3, true, signal);
  await service.summary("o", signal);
  await service.read("o", "n", signal);
  await service.readAll("o", signal);
  const base = "/organizations/o/notifications";
  assert.deepEqual(calls, [
    [
      "get",
      base,
      { params: { page: 3, pageSize: 25, unreadOnly: true }, signal },
    ],
    ["get", `${base}/summary`, { signal }],
    ["post", `${base}/n/read`, undefined, { signal }],
    ["post", `${base}/read-all`, undefined, { signal }],
  ]);
});
test("failed read receipts propagate and deliberate retries retain the exact scope and endpoint", async () => {
  const calls = [];
  const service = adapter({
    post: async (url) => {
      calls.push(url);
      throw new Error("Timeout");
    },
  });
  await assert.rejects(service.read("o", "n"), /Timeout/);
  assert.equal(calls.length, 1);
  await assert.rejects(service.read("o", "n"), /Timeout/);
  assert.equal(calls[0], calls[1]);
});

test("target preflight propagates revoked or deleted record failures before navigation", async () => {
  const calls = [];
  const service = adapter({
    get: async (url) => {
      calls.push(url);
      throw new Error("Forbidden");
    },
  });
  const signal = new AbortController().signal;
  await assert.rejects(
    service.verifyTarget(
      "org",
      { projectId: "project", referenceId: "record" },
      "site_expense",
      signal,
    ),
    /Forbidden/,
  );
  assert.deepEqual(calls, [
    "/organizations/org/projects/project/expenses/record",
  ]);
});

test("unit target requires the referenced record in the authorized API result", async () => {
  const service = adapter({ get: async () => [{ id: "available" }] });
  const signal = new AbortController().signal;
  await assert.rejects(
    service.verifyTarget(
      "org",
      { projectId: "project", referenceId: "removed" },
      "unit",
      signal,
    ),
    /no longer available/,
  );
  await service.verifyTarget(
    "org",
    { projectId: "project", referenceId: "available" },
    "unit",
    signal,
  );
});
