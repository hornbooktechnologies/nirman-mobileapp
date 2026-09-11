import { buildPasswordResetEmail } from "./password-reset-email.template";

describe("buildPasswordResetEmail", () => {
  it("renders both clients without including a password", () => {
    const result = buildPasswordResetEmail({
      recipientName: "Test User",
      recipientEmail: "user@example.test",
      expiresAt: "2026-09-11T10:00:00.000Z",
      resetUrl: "https://example.test/reset-password?token=web-token",
      mobileResetUrl: "nirmansite://reset-password?token=mobile-token",
    });

    expect(result.text).toContain("https://example.test/reset-password");
    expect(result.text).toContain("nirmansite://reset-password");
    expect(result.html).not.toContain("system-generated password");
  });
});
