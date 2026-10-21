import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  accessibleProjectSwitchHref,
  projectIdFromLocation,
  projectSwitchHref,
} from "./project-switch.ts";

const projects = [
  { id: "first", isDefault: false },
  { id: "default", isDefault: true },
];

test("header project selection follows valid route and query context", () => {
  assert.equal(
    projectIdFromLocation(
      "/projects/first/sales/leads",
      new URLSearchParams(),
      projects,
      "default",
    ),
    "first",
  );
  assert.equal(
    projectIdFromLocation(
      "/attendance",
      new URLSearchParams("projectId=first"),
      projects,
      "default",
    ),
    "first",
  );
  assert.equal(
    projectIdFromLocation(
      "/attendance",
      new URLSearchParams("projectId=forbidden"),
      projects,
      "default",
    ),
    "default",
  );
});

test("switching keeps safe module context and removes record-specific paths", () => {
  assert.equal(
    projectSwitchHref("/projects/old/sales/leads/private-lead", "next/id"),
    "/projects/next%2Fid/sales/leads",
  );
  assert.equal(
    projectSwitchHref("/projects/old/expenses/private-expense", "next"),
    "/projects/next/expenses",
  );
  assert.equal(
    projectSwitchHref("/projects/old/sales/inventory/import", "next"),
    "/projects/next/sales/inventory",
  );
});

test("switching rewrites global project routes and otherwise opens overview", () => {
  assert.equal(
    projectSwitchHref("/attendance", "next"),
    "/attendance?projectId=next",
  );
  assert.equal(
    projectSwitchHref("/sales/bookings", "next"),
    "/projects/next/sales/bookings",
  );
  assert.equal(
    projectSwitchHref("/website-enquiries", "next"),
    "/projects/next",
  );
  assert.equal(
    projectSwitchHref("/attendance/mark", "next"),
    "/attendance?projectId=next",
  );
});

test("switching falls back to a route permitted in the target project", () => {
  assert.equal(
    accessibleProjectSwitchHref("/projects/old/sales/leads", "next", [
      "/workers?projectId=next",
    ]),
    "/workers?projectId=next",
  );
  assert.equal(
    accessibleProjectSwitchHref("/projects/old/sales/leads", "next", [
      "/projects/next/sales/leads",
    ]),
    "/projects/next/sales/leads",
  );
  assert.equal(
    accessibleProjectSwitchHref("/dashboard", "next", [
      "/workers?projectId=next",
    ]),
    "/dashboard?projectId=next",
  );
});

