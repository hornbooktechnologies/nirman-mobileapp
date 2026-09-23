import { strict as assert } from "node:assert";
import { test } from "node:test";
import { normalizeProjectsResponse } from "./project-list-response.ts";

test("server total is retained independently of current page length", () => {
  const response = {
    data: [{ id: "project" }],
    meta: { total: 41, page: 3, pageSize: 20, pageCount: 3 },
  };
  const normalized = normalizeProjectsResponse(response);
  assert.equal(normalized.paginationAvailable, true);
  assert.deepEqual(normalized.meta, response.meta);
});

test("legacy page arrays and missing responses cannot supply reliable totals", () => {
  for (const response of [
    null,
    undefined,
    [],
    [{ id: "project" }],
    { data: [] },
    { meta: { total: 0, page: 1, pageSize: 20, pageCount: 0 } },
  ]) {
    assert.equal(
      normalizeProjectsResponse(response).paginationAvailable,
      false,
    );
  }
});

test("a genuine server empty result differs from missing or invalid metadata", () => {
  const empty = {
    data: [],
    meta: { total: 0, page: 1, pageSize: 20, pageCount: 0 },
  };
  assert.equal(normalizeProjectsResponse(empty).paginationAvailable, true);
  assert.equal(
    normalizeProjectsResponse({ ...empty, meta: { ...empty.meta, total: -1 } })
      .paginationAvailable,
    false,
  );
});
