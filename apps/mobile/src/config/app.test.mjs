import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

const code = ts.transpileModule(readFileSync(new URL("./app.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
function config(platform, host, url, dev = true) {
  const exports = {};
  new Function("exports", "require", "process", "__DEV__", code)(exports,
    (name) => name === "expo-constants" ? {default: {expoConfig: {hostUri: host}}} : {Platform: {OS: platform}},
    {env: {EXPO_PUBLIC_API_BASE_URL: url}}, dev);
  return exports.appConfig.apiBaseUrl;
}
test("local Expo web uses a separate loopback API address while native devices use the Metro host", () => {
  assert.equal(config("web", "localhost:8081", "http://localhost:4000/api/v1"), "http://127.0.0.1:4000/api/v1");
  assert.equal(config("android", "192.168.1.39:8081", "http://localhost:4000/api/v1"), "http://192.168.1.39:4000/api/v1");
  assert.equal(config("web", "192.168.1.39:8081", "http://localhost:4000/api/v1"), "http://192.168.1.39:4000/api/v1");
});
test("explicit remote and production API configuration is retained", () => {
  const remote = "https://api.example.com/api/v1";
  assert.equal(config("web", "localhost:8081", remote), remote);
  assert.equal(config("android", "192.168.1.39:8081", remote, false), remote);
});
