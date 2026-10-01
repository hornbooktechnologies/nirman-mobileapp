import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import axios from "axios";
import ts from "typescript";

function client() {
  const source = readFileSync(new URL("./api-client.ts", import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  new Function("require", "exports", outputText)((id) => {
    assert.equal(id, "axios");
    return axios;
  }, exports);
  return exports;
}

test("overlapping session restores share one refresh and persist the rotated token once", async () => {
  const auth = client();
  let calls = 0;
  let complete;
  const stored = [];
  auth.setApiAccessTokenSetter((token) => stored.push(token));
  auth.apiClient.defaults.adapter = async (config) => {
    calls++;
    assert.equal(config.url, "/auth/refresh");
    assert.equal(config.withCredentials, true);
    await new Promise((resolve) => { complete = resolve; });
    return { config, status: 200, statusText: "OK", headers: {}, data: { success: true, data: { accessToken: "rotated-token" } } };
  };
  const first = auth.refreshAccessToken();
  const second = auth.refreshAccessToken();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 1);
  complete();
  assert.deepEqual(await Promise.all([first, second]), ["rotated-token", "rotated-token"]);
  assert.deepEqual(stored, ["rotated-token"]);
});

test("failed refresh still rejects as unauthorized and a later restore can retry", async () => {
  const auth = client();
  let calls = 0;
  auth.apiClient.defaults.adapter = async (config) => {
    calls++;
    const response = { config, status: 401, statusText: "Unauthorized", headers: {}, data: { error: { code: "AUTH_SESSION_REQUIRED", message: "Unauthorized" } } };
    throw new axios.AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, null, response);
  };
  await assert.rejects(auth.refreshAccessToken(), (error) => error.statusCode === 401 && error.code === "AUTH_SESSION_REQUIRED");
  await assert.rejects(auth.refreshAccessToken(), (error) => error.statusCode === 401);
  assert.equal(calls, 2);
});

test("an earlier refresh cannot overwrite a token from a newer login", async () => {
  const auth = client();
  let token = null;
  let complete;
  auth.setApiTokenGetter(() => token);
  auth.setApiAccessTokenSetter((next) => { token = next; });
  auth.apiClient.defaults.adapter = async (config) => {
    await new Promise((resolve) => { complete = resolve; });
    return { config, status: 200, statusText: "OK", headers: {}, data: { success: true, data: { accessToken: "old-session-token" } } };
  };
  const refresh = auth.refreshAccessToken();
  await new Promise((resolve) => setImmediate(resolve));
  token = "new-login-token";
  complete();
  assert.equal(await refresh, "new-login-token");
  assert.equal(token, "new-login-token");
});

test("Web requests use the same-origin proxy even with a remote base path", () => {
  const previous = process.env.NEXT_PUBLIC_API_BASE_PATH;
  process.env.NEXT_PUBLIC_API_BASE_PATH = "https://example.com/api/v1";
  try {
    assert.equal(client().apiClient.defaults.baseURL, "/api/v1");
  } finally {
    if (previous === undefined) delete process.env.NEXT_PUBLIC_API_BASE_PATH;
    else process.env.NEXT_PUBLIC_API_BASE_PATH = previous;
  }
});

test("proxy upstream supports remote origins and legacy full API URLs", async () => {
  const source = readFileSync(new URL("../../../next.config.ts", import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  for (const env of [
    { NEXT_PUBLIC_API_URL: "https://example.com", NEXT_PUBLIC_API_BASE_PATH: "/api/v1" },
    { NEXT_PUBLIC_API_URL: "https://example.com/api/v1/" },
    { NEXT_PUBLIC_API_BASE_PATH: "https://example.com/api/v1", NEXT_PUBLIC_API_URL: "http://localhost:4000" },
  ]) {
    const exports = {};
    new Function("exports", "process", outputText)(exports, { env });
    assert.deepEqual(await exports.default.rewrites(), [{
      source: "/api/v1/:path*",
      destination: "https://example.com/api/v1/:path*",
    }]);
  }
});

test("a delayed unauthorized response retries the newer login without refreshing", async () => {
  const auth = client();
  let token = "old-token";
  let complete;
  let calls = 0;
  auth.setApiTokenGetter(() => token);
  auth.apiClient.defaults.adapter = async (config) => {
    calls++;
    assert.equal(config.url, "/organizations");
    if (calls === 1) {
      await new Promise((resolve) => { complete = resolve; });
      const response = { config, status: 401, statusText: "Unauthorized", headers: {}, data: {} };
      throw new axios.AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, null, response);
    }
    assert.equal(config.headers.Authorization, "Bearer new-token");
    return { config, status: 200, statusText: "OK", headers: {}, data: { success: true, data: [] } };
  };
  const request = auth.api.get("/organizations");
  await new Promise((resolve) => setImmediate(resolve));
  token = "new-token";
  complete();
  assert.deepEqual(await request, []);
  assert.equal(calls, 2);
});

test("protected project access retries with the refreshed bearer token", async () => {
  const auth = client();
  let token = "expired-token";
  const calls = [];
  auth.setApiTokenGetter(() => token);
  auth.setApiAccessTokenSetter((next) => { token = next; });
  auth.apiClient.defaults.adapter = async (config) => {
    calls.push({ url: config.url, authorization: config.headers.Authorization });
    if (config.url === "/auth/refresh") {
      return { config, status: 200, statusText: "OK", headers: {}, data: { success: true, data: { accessToken: "fresh-token" } } };
    }
    if (config.headers.Authorization === "Bearer expired-token") {
      const response = { config, status: 401, statusText: "Unauthorized", headers: {}, data: { error: { code: "AUTH_SESSION_REQUIRED" } } };
      throw new axios.AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, null, response);
    }
    assert.equal(config.headers.Authorization, "Bearer fresh-token");
    return { config, status: 200, statusText: "OK", headers: {}, data: { success: true, data: { allowed: true } } };
  };
  assert.deepEqual(await auth.api.get("/organizations/org/project-access/me"), { allowed: true });
  assert.equal(calls.length, 3);
  assert.equal(token, "fresh-token");
});
