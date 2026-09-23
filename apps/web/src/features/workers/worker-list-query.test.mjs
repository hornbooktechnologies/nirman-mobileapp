import { test } from "node:test";
import assert from "node:assert/strict";
import {
  workerContext,
  matchesWorkerAssignment,
  readWorkerListQuery,
  workerListHref,
  workerListReturnHref,
  workerDetailReturnHref,
} from "./worker-list-query.ts";

test("unknown and loading rosters cannot become unassigned, including stale data", () => {
  const worker = { status: "ACTIVE", activeAssignmentCount: 0 };
  for (const state of ["unknown", "loading"]) {
    assert.equal(workerContext(worker, undefined, state), state);
    assert.equal(
      workerContext(worker, { isPrimaryForDate: true }, state),
      state,
    );
    assert.equal(matchesWorkerAssignment(state, "not_on_project"), false);
  }
});
test("assignment labels distinguish primary, assigned, elsewhere, unassigned and inactive", () => {
  const worker = { status: "ACTIVE", activeAssignmentCount: 2 };
  assert.equal(
    workerContext(worker, { isPrimaryForDate: true }, "ready"),
    "working_here",
  );
  assert.equal(
    workerContext(worker, { isPrimaryForDate: false }, "ready"),
    "assigned_here",
  );
  assert.equal(workerContext(worker, undefined, "ready"), "elsewhere");
  assert.equal(
    workerContext({ ...worker, activeAssignmentCount: 0 }, undefined, "ready"),
    "unassigned",
  );
  assert.equal(
    workerContext({ ...worker, status: "INACTIVE" }, undefined, "loading"),
    "inactive",
  );
  assert.equal(matchesWorkerAssignment("inactive", "not_on_project"), false);
  assert.equal(matchesWorkerAssignment("working_here", "assigned_here"), true);
  assert.equal(matchesWorkerAssignment("assigned_here", "working_here"), false);
});
test("list refresh and return round trip preserve search, page, project and filters", () => {
  const original = new URLSearchParams({
    organizationId: "org-a",
    search: "A & B",
    page: "4",
    projectId: "p-1",
    status: "ACTIVE",
    trade: "Mason",
    assignment: "not_on_project",
  });
  const query = readWorkerListQuery(original, "org-a");
  const href = workerListHref(query, "org-a");
  assert.equal(workerListReturnHref(href, "org-a"), href);
  assert.deepEqual(
    readWorkerListQuery(new URLSearchParams(href.split("?")[1]), "org-a"),
    query,
  );
});
test("invalid and foreign return URLs cannot redirect or carry another tenant's filters", () => {
  const fallback = "/workers?organizationId=org-a";
  for (const value of [
    "https://example.com",
    "//example.com",
    "/workers/123",
    "/workers?organizationId=org-b&search=secret",
    "/workers?organizationId=org-a#bad",
  ])
    assert.equal(workerListReturnHref(value, "org-a"), fallback);
  const parsed = readWorkerListQuery(
    new URLSearchParams("page=Infinity&status=BAD&assignment=BAD"),
    "org-a",
  );
  assert.equal(parsed.page, 1);
  assert.equal(parsed.status, "");
  assert.equal(parsed.assignment, "all");
});

test("Attendance return keeps period and list context without arbitrary redirect parameters", () => {
  const href = workerDetailReturnHref(
    "/attendance?projectId=p1&startDate=2026-09-01&endDate=2026-09-22&search=mason&page=3&workerId=old&returnTo=https://bad",
    "org-a",
  );
  const params = new URLSearchParams(href.split("?")[1]);
  assert.equal(params.get("projectId"), "p1");
  assert.equal(params.get("page"), "3");
  assert.equal(params.get("endDate"), "2026-09-22");
  assert.equal(params.get("search"), "mason");
  assert.equal(params.has("workerId"), false);
  assert.equal(params.has("returnTo"), false);
  assert.equal(
    workerDetailReturnHref(
      "/attendance?organizationId=org-b&projectId=foreign",
      "org-a",
    ),
    "/workers?organizationId=org-a",
  );
});
