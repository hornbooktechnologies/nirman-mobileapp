import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  projectListHref,
  projectListReturnHref,
  readProjectListQuery,
} from "./project-list-query.ts";

test("search, applied filters and pagination survive a detail round trip", () => {
  const query = {
    search: "River & Road",
    status: "ACTIVE",
    type: "RESIDENTIAL",
    page: 3,
    pageSize: 20,
  };
  const href = projectListHref("org-a", query);
  assert.deepEqual(
    readProjectListQuery(new URLSearchParams(href.split("?")[1]), "org-a"),
    query,
  );
  assert.equal(projectListReturnHref(href, "org-a"), href);
});

test("switching organizations does not reuse another scope's filters or page", () => {
  const href = projectListHref("org-a", {
    search: "private search",
    status: "ARCHIVED",
    page: 8,
  });
  assert.deepEqual(
    readProjectListQuery(new URLSearchParams(href.split("?")[1]), "org-b"),
    { search: "", status: "", type: "", page: 1, pageSize: 20 },
  );
  assert.equal(projectListReturnHref(href, "org-b"), "/projects");
});

test("invalid or external return destinations cannot become navigation targets", () => {
  for (const url of [
    "https://example.com",
    "//example.com",
    "/projects/../settings",
    "javascript:alert(1)",
    null,
  ]) {
    assert.equal(projectListReturnHref(url, "org-a"), "/projects");
  }
  assert.equal(
    projectListReturnHref(
      "/projects?organizationId=org-a&returnTo=https://example.com",
      "org-a",
    ),
    "/projects?organizationId=org-a",
  );
});

test("malformed URL filters and page values are normalized before querying", () => {
  for (const page of ["0", "-1", "1.5", "Infinity", "999999999", "2e3"]) {
    const query = readProjectListQuery(
      new URLSearchParams({
        page,
        status: "FAKE",
        type: "FAKE",
        pageSize: "900",
      }),
      "org-a",
    );
    assert.deepEqual(query, {
      search: "",
      status: "",
      type: "",
      page: 1,
      pageSize: 20,
    });
  }
});
