// Contract checks with mocked transport; no real invitations or database writes.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
class ApiError extends Error {
  constructor(status) {
    super("API error");
    this.status = status;
  }
}
const calls = [];
let failure;
let requiresPasswordSetup = true;
const request = async (url, options) => {
  calls.push({ url, options });
  if (failure) throw failure;
  return {
    data: {
      organization: { name: "Test project" },
      owner: { name: "Test user", email: "test@example.test" },
      roleName: "Owner",
      requiresPasswordSetup,
    },
  };
};
function load(file, dependencies) {
  const exports = {};
  const js = ts.transpileModule(
    fs.readFileSync(
      path.join(__dirname, "../src/features/activation", file),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  vm.runInNewContext(js, {
    exports,
    AbortSignal,
    require: (name) => {
      if (!(name in dependencies)) throw new Error(name);
      return dependencies[name];
    },
  });
  return exports;
}
const service = load("service.ts", {
  "server-only": {},
  "@/lib/api/http-client": { apiRequest: request },
  "@/lib/api/api-error": { ApiError },
});
const { activateAccount } = load("actions.ts", {
  "./service": service,
  "@/lib/api/http-client": { apiRequest: request },
});
const token = "a".repeat(43);
const initial = { success: false, error: "" };
const form = (password, confirm = password) => {
  const value = new FormData();
  value.set("password", password);
  value.set("confirmPassword", confirm);
  return value;
};
(async () => {
  assert.equal(
    (await activateAccount("../bad", initial, form("password"))).success,
    false,
  );
  assert.equal(calls.length, 0);
  await service.getInvitation(token);
  assert.equal(calls.at(-1).options.cache, "no-store");
  assert.equal(
    calls.filter((c) => c.options.method === "POST").length,
    0,
    "preview must never activate",
  );
  assert.match(
    (await activateAccount(token, initial, form("short"))).error,
    /8 characters/,
  );
  assert.match(
    (await activateAccount(token, initial, form("password", "different")))
      .error,
    /do not match/,
  );
  assert.equal(calls.filter((c) => c.options.method === "POST").length, 0);
  assert.equal(
    (await activateAccount(token, initial, form("password"))).success,
    true,
  );
  assert.equal(calls.at(-1).options.body.password, "password");
  assert.equal(calls.at(-1).url, `/onboarding/invitations/${token}/accept`);
  requiresPasswordSetup = false;
  assert.equal(
    (await activateAccount(token, initial, form("must-not-change"))).success,
    true,
  );
  assert.equal(
    Object.keys(calls.at(-1).options.body).length,
    0,
    "existing password must not be changed",
  );
  for (const [status, expected] of [
    [404, /not be found/],
    [410, /expired/],
    [409, /no longer available/],
    [429, /Too many/],
    [500, /try again/],
  ]) {
    failure = new ApiError(status);
    const before = calls.length;
    assert.match(
      (await activateAccount(token, initial, form("password"))).error,
      expected,
    );
    assert.equal(
      calls.length,
      before + 1,
      "failed preview must not submit or auto-retry",
    );
  }
  console.log(
    "Activation contract checks passed: validation, preview, new/existing accounts, no-store, expiry, replay and transport failures.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
