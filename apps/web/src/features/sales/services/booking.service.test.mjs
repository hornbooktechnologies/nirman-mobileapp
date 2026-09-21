import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";
function adapter(api) {
  const source = readFileSync(
    new URL("./booking.service.ts", import.meta.url),
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
  return exports.bookingService;
}
test("booking reads forward all filters/abort signals and writes preserve scoped payloads", async () => {
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
  const filters = {
    search: "A & B",
    status: "CONFIRMED",
    bookedFrom: "2026-09-01",
    bookedTo: "2026-09-21",
  };
  const input = {
    leadId: "lead",
    bookingDate: "2026-09-21",
    bookingAmount: 0,
    idempotencyKey: "stable-key",
  };
  const cancel = {
    cancellationReason: "Customer withdrew",
    restoredLeadStage: "NEGOTIATION",
    restoredUnitStatus: "AVAILABLE",
  };
  await service.list("org", "project", filters, signal);
  await service.detail("org", "project", "booking", signal);
  await service.create("org", "project", input);
  await service.cancel("org", "project", "booking", cancel);
  const base = "/organizations/org/projects/project/sales/bookings";
  assert.deepEqual(calls, [
    ["get", base, { params: filters, signal }],
    ["get", `${base}/booking`, { signal }],
    ["post", base, input],
    ["post", `${base}/booking/cancel`, cancel],
  ]);
});
test("financial writes never automatically retry a failed request", async () => {
  let attempts = 0;
  const service = adapter({
    post: async () => {
      attempts++;
      throw new Error("Timeout");
    },
  });
  await assert.rejects(
    service.create("o", "p", { idempotencyKey: "same-key" }),
    /Timeout/,
  );
  assert.equal(attempts, 1);
  await assert.rejects(service.cancel("o", "p", "b", {}), /Timeout/);
  assert.equal(attempts, 2);
});
