import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

// Execute the real adapter against a recording transport; no live financial writes.
function adapter(transport) {
  const source = readFileSync(
    new URL("./expenses.service.ts", import.meta.url),
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
    return transport;
  }, exports);
  return exports.expensesService;
}

test("every write preserves scope, version, signed amount and retry key using the existing API verbs", async () => {
  const calls = [];
  const record = {
    id: "expense",
    recognizedAmount: "80.00",
    version: 4,
    availableActions: ["ADJUST"],
  };
  const send = (method) => async (path, input) => {
    calls.push({ method, path, input });
    return record;
  };
  const service = adapter({
    api: { post: send("POST"), patch: send("PATCH"), put: send("PUT") },
  });
  const base = "/organizations/org/projects/project/expenses";
  const input = {
    amount: -20,
    reason: "Receipt correction",
    expectedVersion: 3,
    idempotencyKey: "same-retry-key",
  };
  for (const action of [
    "CREATE",
    "EDIT",
    "SUBMIT",
    "APPROVE",
    "REJECT",
    "CANCEL",
    "ADJUST",
  ]) {
    assert.equal(
      await service.write("org", "project", { action, id: "expense", input }),
      record,
    );
    const call = calls.at(-1);
    assert.equal(call.method, action === "EDIT" ? "PATCH" : "POST");
    assert.equal(
      call.path,
      action === "CREATE"
        ? base
        : `${base}/expense${action === "EDIT" ? "" : `/${action === "ADJUST" ? "adjustments" : action.toLowerCase()}`}`,
    );
    assert.equal(call.input, input);
  }
  const settings = {
    workflowMode: "APPROVAL_REQUIRED",
    idempotencyKey: "settings-retry",
  };
  await service.configure("org", "project", settings);
  assert.deepEqual(calls.at(-1), {
    method: "PUT",
    path: `${base}/settings`,
    input: settings,
  });
});

test("read and export requests retain filters and cancellation; server totals are returned untouched", async () => {
  const calls = [];
  const totals = { recognizedAmount: "123.45", adjustmentTotal: "-6.55" };
  const signal = new AbortController().signal;
  const query = {
    page: 2,
    pageSize: 25,
    status: "APPROVED",
    expenseFrom: "2026-09-01",
    expenseTo: "2026-09-18",
    recordedByMemberId: "member",
  };
  const service = adapter({
    api: {
      get: async (path, options) => {
        calls.push({ path, options });
        return totals;
      },
    },
    apiClient: {
      get: async (path, options) => {
        calls.push({ path, options });
        return {
          data: '"Original amount","Recognized amount"\r\n"130.00","123.45"\r\n',
        };
      },
    },
  });
  assert.equal(await service.summary("org", "project", query, signal), totals);
  assert.deepEqual(calls.at(-1), {
    path: "/organizations/org/projects/project/expenses/summary",
    options: { params: query, signal },
  });
  await service.list("org", "project", query, signal);
  assert.equal(calls.at(-1).options.params, query);
  await service.detail("org", "project", "expense", signal);
  assert.equal(calls.at(-1).options.signal, signal);
  const csv = await service.export("org", "project", query, signal);
  assert.ok(csv.includes('"130.00","123.45"'));
  assert.deepEqual(calls.at(-1).options, {
    params: query,
    responseType: "text",
    signal,
  });
});

test("a failed financial write makes one transport attempt and leaves recovery to the caller", async () => {
  let count = 0;
  const failure = new Error("Connection lost after submit");
  const service = adapter({
    api: {
      post: async () => {
        count++;
        throw failure;
      },
    },
  });
  await assert.rejects(
    service.write("org", "project", {
      action: "ADJUST",
      id: "expense",
      input: {
        amount: 10,
        reason: "Correction",
        expectedVersion: 2,
        idempotencyKey: "retry-key",
      },
    }),
    (error) => error === failure,
  );
  assert.equal(count, 1);
});
