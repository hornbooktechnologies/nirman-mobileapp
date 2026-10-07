import { buildOrganizationOwnerInvitationEmail } from "./invitation-email.template";
import { buildPasswordResetEmail } from "./password-reset-email.template";
import { buildPasswordChangedEmail } from "./password-changed-email.template";

describe("branded email presentation", () => {
  const invitation = {
    recipientName: "<Nishant & Team>",
    recipientEmail: "person@example.test",
    organizationName: "Nirman & Co",
    organizationType: "BUILDER" as const,
    roleName: "Organization Owner",
    invitedByName: "Admin",
    expiresAt: "2026-10-08T10:00:00.000Z",
    activationUrl: "https://example.test/activate?token=abc&source=email",
    mobileActivationUrl: "nirmansite://activate?token=abc",
    requiresPasswordSetup: true,
  };

  it.each(["Organization Owner", "Supervisor"])(
    "preserves invitation content and both actions for %s",
    (roleName) => {
      const result = buildOrganizationOwnerInvitationEmail({
        ...invitation,
        roleName,
      });
      expect(result.subject).toBe("Activate your Nirman & Co account");
      expect(result.text).toContain(`as ${roleName}`);
      expect(result.text).toContain(invitation.activationUrl);
      expect(result.html).toContain(
        'href="https://example.test/activate?token=abc&amp;source=email"',
      );
      expect(result.html).toContain('href="nirmansite://activate?token=abc"');
      expect(result.html).toContain("&lt;Nishant &amp; Team&gt;");
      expect(result.html).toContain("Invitation expires");
      expect(result.html).toContain("never sends a password");
      expect(result.html).toContain("Built for the people who build India.");
    },
  );

  it("keeps the existing-identity instructions", () => {
    const result = buildOrganizationOwnerInvitationEmail({
      ...invitation,
      requiresPasswordSetup: false,
    });
    expect(result.html).toContain("sign in with your existing password");
    expect(result.text).toContain("sign in with your existing password");
  });

  it("preserves reset actions and single-use warning", () => {
    const result = buildPasswordResetEmail({
      ...invitation,
      resetUrl: invitation.activationUrl,
      mobileResetUrl: invitation.mobileActivationUrl,
    });
    expect(result.subject).toBe("Reset your NirmanSite password");
    expect(result.html).toContain('href="nirmansite://activate?token=abc"');
    expect(result.html).toContain("token=abc&amp;source=email");
    expect(result.html).toContain("This link can be used once.");
    expect(result.html).toContain("Link expires");
  });

  it("keeps the password notice informational without adding actions", () => {
    const result = buildPasswordChangedEmail({ recipientName: "<Nishant>" });
    expect(result.subject).toBe("Your NirmanSite password was changed");
    expect(result.html).toContain("&lt;Nishant&gt;");
    expect(result.html).toContain("existing sign-in sessions were revoked");
    expect(result.html).toContain("contact NirmanSite support immediately");
    expect(result.html).not.toContain("href=");
  });
});
