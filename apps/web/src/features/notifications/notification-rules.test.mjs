import { strict as assert } from "node:assert";
import { test } from "node:test";
import { QueryClient } from "@tanstack/react-query";
import {
  notificationKey,
  notificationTarget,
  ownsNotification,
} from "./notification-rules.ts";
const item = {
  userId: "u",
  organizationId: "o",
  projectId: "p",
  referenceType: "SITE_EXPENSE",
  referenceId: "e",
  deepLink: "https://untrusted.example",
};
const projects = [{ id: "p", permissions: ["expenses:read", "gallery:read"] }];
test("recipient and organization isolation rejects foreign rows and links", () => {
  assert.equal(ownsNotification(item, "u", "o"), true);
  for (const [user, org] of [
    ["other", "o"],
    ["u", "other"],
  ]) {
    assert.equal(ownsNotification(item, user, org), false);
    assert.throws(
      () => notificationTarget(item, user, org, projects),
      /different workspace/,
    );
  }
});
test("effective CUSTOM permission and current project access guard targets", () => {
  assert.throws(
    () => notificationTarget(item, "u", "o", []),
    /no longer available/,
  );
  assert.throws(
    () => notificationTarget(item, "u", "o", [{ id: "p", permissions: [] }]),
    /permission/,
  );
  assert.equal(
    notificationTarget(item, "u", "o", projects).href,
    "/projects/p/expenses/e",
  );
});
test("only allowlisted Web routes are used, IDs are encoded and unsupported links stay closed", () => {
  assert.equal(
    notificationTarget(
      { ...item, referenceId: "e/?next=bad" },
      "u",
      "o",
      projects,
    ).href,
    "/projects/p/expenses/e%2F%3Fnext%3Dbad",
  );
  for (const referenceType of [null, "unknown", "__proto__", "constructor"])
    assert.throws(() =>
      notificationTarget({ ...item, referenceType }, "u", "o", projects),
    );
  assert.equal(
    notificationTarget(
      { ...item, referenceType: "gallery_entry" },
      "u",
      "o",
      projects,
    ).exact,
    false,
  );
  assert.equal(
    notificationTarget({ ...item, referenceId: null }, "u", "o", projects)
      .exact,
    false,
  );
});
test("scope keys and disposal prevent unread counts leaking across users and organizations", async () => {
  const client = new QueryClient();
  const key = [...notificationKey("u", "o"), "summary"];
  client.setQueryData(key, { unreadCount: 9 });
  assert.equal(
    client.getQueryData([...notificationKey("v", "o"), "summary"]),
    undefined,
  );
  assert.equal(
    client.getQueryData([...notificationKey("u", "other"), "summary"]),
    undefined,
  );
  let aborted = false;
  const request = client
    .fetchQuery({
      queryKey: [...notificationKey("u", "o"), "list"],
      queryFn: ({ signal }) =>
        new Promise(() => {
          signal.addEventListener("abort", () => {
            aborted = true;
          });
        }),
    })
    .catch(() => undefined);
  await client.cancelQueries();
  client.clear();
  await request;
  assert.equal(aborted, true);
  assert.equal(client.getQueryData(key), undefined);
});
