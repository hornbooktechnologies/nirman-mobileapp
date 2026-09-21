import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";
function adapter(transport) {
  const source = readFileSync(
    new URL("./sales.service.ts", import.meta.url),
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
  return exports.salesService;
}
test("visits preserve scoped filters, abort signals and exact workflow payloads", async () => {
  const calls = [];
  const service = adapter({
    api: Object.fromEntries(
      ["get", "post", "patch"].map((method) => [
        method,
        async (...args) => {
          calls.push([method, ...args]);
          return [];
        },
      ]),
    ),
  });
  const signal = new AbortController().signal;
  const filters = {
    status: "RESCHEDULED",
    assignedSalesperson: "u",
    scheduledFrom: "2026-09-21T00:00:00Z",
  };
  const input = {
    status: "COMPLETED",
    attendeeCount: 1000,
    customerFeedback: "Good",
    objectionsConcerns: "Price",
    nextAction: "Call",
  };
  await service.siteVisits("org", "project", filters, signal);
  await service.createSiteVisit("org", "project", "lead", {
    scheduledAt: filters.scheduledFrom,
  });
  await service.updateSiteVisit("org", "project", "lead", "visit", input);
  assert.deepEqual(calls, [
    [
      "get",
      "/organizations/org/projects/project/sales/site-visits",
      { params: filters, signal },
    ],
    [
      "post",
      "/organizations/org/projects/project/sales/leads/lead/site-visits",
      { scheduledAt: filters.scheduledFrom },
    ],
    [
      "patch",
      "/organizations/org/projects/project/sales/leads/lead/site-visits/visit",
      input,
    ],
  ]);
  let attempts = 0;
  const failed = adapter({
    api: {
      post: async () => {
        attempts++;
        throw new Error("Timeout");
      },
    },
  });
  await assert.rejects(
    failed.createSiteVisit("o", "p", "l", {
      scheduledAt: filters.scheduledFrom,
    }),
  );
  assert.equal(attempts, 1);
});
test("lead list retains top-level meta and passes filters and cancellation", async () => {
  const payload = {
    success: true,
    data: [{ id: "lead" }],
    meta: { page: 2, limit: 25, total: 60 },
  };
  const signal = new AbortController().signal;
  const query = {
    page: 2,
    limit: 25,
    assignedTo: "user",
    search: "A & B",
    stage: "NEW",
  };
  const service = adapter({
    api: {},
    apiClient: {
      get: async (url, options) => {
        assert.equal(url, "/organizations/o/projects/p/sales/leads");
        assert.deepEqual(options, { params: query, signal });
        return { data: payload };
      },
    },
  });
  assert.deepEqual(await service.leads("o", "p", query, signal), payload);
});
test("commands use existing scoped verbs and preserve exact inputs without automatic retry", async () => {
  const calls = [];
  const send = (method) => async (url, input) => {
    calls.push({ method, url, input });
    return {};
  };
  const service = adapter({
    api: { post: send("POST"), patch: send("PATCH"), put: send("PUT") },
  });
  const lead = {
    customerName: "Customer",
    primaryMobile: "1234567890",
    source: "REFERRAL",
    budgetMin: 0,
  };
  const follow = {
    status: "COMPLETED",
    outcome: "Called",
    notes: "Preserved",
    nextFollowUpAt: "2026-09-18T04:00:00.000Z",
  };
  await service.createLead("org", "project", lead);
  await service.assign("org", "project", "lead", "user");
  await service.updateFollowUp("org", "project", "lead", "follow", follow);
  assert.deepEqual(calls, [
    {
      method: "POST",
      url: "/organizations/org/projects/project/sales/leads",
      input: lead,
    },
    {
      method: "PUT",
      url: "/organizations/org/projects/project/sales/leads/lead/assignment",
      input: { assignedTo: "user" },
    },
    {
      method: "PATCH",
      url: "/organizations/org/projects/project/sales/leads/lead/follow-ups/follow",
      input: follow,
    },
  ]);
  let count = 0;
  const failed = adapter({
    api: {
      post: async () => {
        count++;
        throw new Error("Disconnected");
      },
    },
  });
  await assert.rejects(failed.createLead("org", "project", lead));
  assert.equal(count, 1);
});
