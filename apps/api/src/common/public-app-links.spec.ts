import { mobileAccountLink, publicAccountLink } from "./public-app-links";

describe("public account links", () => {
  const original = { ...process.env };
  afterEach(() => {
    process.env = { ...original };
  });
  it("uses the production domain despite stale configuration and preserves tokens", () => {
    process.env.NODE_ENV = "production";
    process.env.PUBLIC_WEB_APP_URL = "http://localhost:3000";
    process.env.PUBLIC_ACTIVATION_WEB_URL =
      "https://legacy.vercel.app/activate";
    process.env.EXPO_GO_PROJECT_URL = "exp://192.168.0.2:8081";
    expect(publicAccountLink("activate", "a/b&c")).toBe(
      "https://app.nirmansite.com/activate?token=a%2Fb%26c",
    );
    expect(publicAccountLink("reset-password", "abc")).toBe(
      "https://app.nirmansite.com/reset-password?token=abc",
    );
    expect(mobileAccountLink("activate", "abc")).toBe(
      "https://app.nirmansite.com/open-app?screen=activate&token=abc",
    );
  });
  it("avoids duplicate activation paths", () => {
    process.env.NODE_ENV = "test";
    process.env.PUBLIC_ACTIVATION_WEB_URL =
      "https://app.nirmansite.com/activate/";
    expect(publicAccountLink("activate", "abc")).toBe(
      "https://app.nirmansite.com/activate?token=abc",
    );
  });
  it("replaces retired Vercel hosts in development for every account action", () => {
    process.env.NODE_ENV = "development";
    process.env.PUBLIC_WEB_APP_URL = "https://nirman-mobileapp-web.vercel.app";
    process.env.PUBLIC_ACTIVATION_WEB_URL = "https://nirman-website.vercel.app";
    delete process.env.EXPO_GO_PROJECT_URL;
    expect(publicAccountLink("activate", "abc")).toBe(
      "https://app.nirmansite.com/activate?token=abc",
    );
    expect(publicAccountLink("reset-password", "abc")).toBe(
      "https://app.nirmansite.com/reset-password?token=abc",
    );
    expect(mobileAccountLink("activate", "abc")).toBe(
      "https://app.nirmansite.com/open-app?screen=activate&token=abc",
    );
  });
  it("retains development Expo Go routes", () => {
    process.env.NODE_ENV = "test";
    process.env.EXPO_GO_PROJECT_URL = "exp://192.168.0.2:8081/";
    expect(mobileAccountLink("reset-password", "a/b")).toBe(
      "exp://192.168.0.2:8081/--/reset-password?token=a%2Fb",
    );
  });
});
