import test from "node:test";
import assert from "node:assert/strict";
import {
  assertDashboardScope,
  assertPendingScope,
  dashboardCount,
  dashboardMetrics,
  dashboardActions,
  dashboardQueryKey,
} from "./dashboard-rules.ts";
import {
  projectNavigation,
  scopedNavigationHref,
} from "../projects/project-navigation.ts";
const response = {
  organizationId: "org",
  project: { id: "project", name: "Site", projectCode: null },
  quickActions: ["MARK_ATTENDANCE", "REQUEST_MATERIAL", "VIEW_PROJECT"],
  workflow: {
    pendingMaterialApprovals: 0,
    overdueMaterialRequests: 12,
    pendingExpenses: null,
  },
  progress: { overallPercentage: 72, updatedStages: 3 },
  gallery: null,
  site: { presentToday: 999 },
  finance: { outstandingKharchi: "99999" },
};
test("missing, malformed and denied metrics are never zero", () => {
  assert.equal(dashboardCount(0), "0");
  for (const value of [null, undefined, -1, NaN, Infinity, "12", 1.5])
    assert.equal(dashboardCount(value), "Unavailable");
  const metrics = dashboardMetrics(response, [
    "materials:read",
    "expenses:read",
    "gallery:read",
  ]);
  assert.equal(metrics[0].value, "0");
  assert.equal(metrics[1].value, "12");
  assert.equal(metrics[2].value, "Unavailable");
  assert.equal(metrics[3].value, "Unavailable");
  assert.deepEqual(dashboardMetrics(response, []), []);
});
test("unsupported attendance/finance aggregates are not exposed as live totals", () => {
  assert.deepEqual(
    dashboardMetrics(response, [
      "attendance:read",
      "wages:read",
      "kharchi:read",
    ]),
    [],
  );
  const metric = dashboardMetrics(response, ["progress:read"])[0];
  assert.equal(metric.label, "Average of reported stages");
  assert.match(metric.detail, /not overall project completion/);
  assert.equal(
    dashboardMetrics(
      { ...response, progress: { overallPercentage: 0, updatedStages: 0 } },
      ["progress:read"],
    )[0].value,
    "No updates",
  );
});
test("API response scope and query cache isolate user, organization, project and effective grants", () => {
  assert.equal(assertDashboardScope(response, "org", "project"), response);
  assert.throws(() => assertDashboardScope(response, "other", "project"));
  assert.throws(() => assertDashboardScope(response, "org", "other"));
  const base = dashboardQueryKey("u", "o", "p", ["read"]);
  for (const key of [
    dashboardQueryKey("v", "o", "p", ["read"]),
    dashboardQueryKey("u", "x", "p", ["read"]),
    dashboardQueryKey("u", "o", "q", ["read"]),
    dashboardQueryKey("u", "o", "p", []),
  ])
    assert.notDeepEqual(key, base);
});
test("shortcuts require both server action and effective read/write permissions; archived removes writes", () => {
  const grants = [
    "attendance:mark",
    "attendance:read",
    "materials:read",
    "materials:create",
    "projects:read",
  ];
  assert.equal(dashboardActions(response, grants, false).length, 3);
  assert.equal(
    dashboardActions(response, ["attendance:mark"], false).length,
    0,
  );
  assert.deepEqual(
    dashboardActions(response, grants, true).map((item) => item.label),
    ["Project overview"],
  );
  assert.deepEqual(
    dashboardActions({ ...response, quickActions: [] }, grants, false),
    [],
  );
});
test("shared navigation respects CUSTOM grants and retains explicit project context", () => {
  const links = projectNavigation({
    id: "p",
    status: "ARCHIVED",
    permissions: ["materials:read"],
  });
  assert.deepEqual(
    links.map((item) => item.label),
    ["Materials"],
  );
  assert.equal(links[0].href, "/projects/p/materials");
  assert.equal(
    scopedNavigationHref("/attendance", "p"),
    "/attendance?projectId=p",
  );
  assert.equal(
    scopedNavigationHref("/sales/leads", "p"),
    "/projects/p/sales/leads",
  );
  assert.equal(scopedNavigationHref("/wages", "p"), "/projects/p/wages");
  assert.equal(scopedNavigationHref("/organizations", "p"), "/organizations");
  assert.equal(
    projectNavigation({
      id: "p",
      status: "ACTIVE",
      permissions: ["workers:read"],
    }).some((item) => item.label === "Team"),
    false,
  );
});

test("pending records cannot leak across tenants/projects or masquerade as another queue", () => {
  const items = [
    { organizationId: "o", projectId: "p", status: "PENDING_FINAL" },
  ];
  assert.equal(assertPendingScope(items, "o", "p", "PENDING_FINAL"), items);
  assert.throws(() => assertPendingScope(items, "other", "p", "PENDING_FINAL"));
  assert.throws(() => assertPendingScope(items, "o", "other", "PENDING_FINAL"));
  assert.throws(() =>
    assertPendingScope(items, "o", "p", "PENDING_VERIFICATION"),
  );
  assert.throws(() => assertPendingScope(undefined, "o", "p", "PENDING_FINAL"));
});

test("Sales read access retains read-only follow-up and visit navigation", () => {
  const links = projectNavigation({
    id: "p",
    status: "ARCHIVED",
    permissions: ["leads:read-own"],
  });
  assert.ok(links.some((item) => item.label === "Site visits"));
  assert.ok(links.some((item) => item.label === "Follow-ups"));
});
