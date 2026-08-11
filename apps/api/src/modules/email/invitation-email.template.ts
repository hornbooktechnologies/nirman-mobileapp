export interface OrganizationOwnerInvitationEmailInput {
  recipientName: string;
  recipientEmail: string;
  organizationName: string;
  organizationType: "BUILDER" | "CONTRACTOR";
  roleName: string;
  invitedByName: string;
  expiresAt: string;
  activationUrl: string;
  mobileActivationUrl: string;
  requiresPasswordSetup: boolean;
}

export interface EmailContent {
  subject: string;
  text: string;
  html: string;
}

export function buildOrganizationOwnerInvitationEmail(
  input: OrganizationOwnerInvitationEmailInput,
): EmailContent {
  const expiry = formatExpiry(input.expiresAt);
  const passwordInstruction = input.requiresPasswordSetup
    ? "Open an activation link and create your password."
    : "Open an activation link to add this organization, then sign in with your existing password.";
  const subject = `Activate your ${input.organizationName} account`;

  const text = [
    `Hello ${input.recipientName},`,
    "",
    `${input.invitedByName} invited you to NirmanSite as ${input.roleName} for ${input.organizationName} (${input.organizationType}).`,
    `Login email: ${input.recipientEmail}`,
    passwordInstruction,
    "",
    `Web activation: ${input.activationUrl}`,
    `Mobile activation: ${input.mobileActivationUrl}`,
    `This invitation expires ${expiry}.`,
    "",
    "For security, NirmanSite never sends a password in an invitation email.",
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f5f7f4;color:#1f2922;font-family:Arial,sans-serif">
    <div style="max-width:640px;margin:0 auto;padding:32px 16px">
      <div style="background:#ffffff;border:1px solid #dce2dc;border-radius:16px;padding:32px">
        <p style="margin:0 0 8px;color:#6a756d;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">NirmanSite onboarding</p>
        <h1 style="margin:0 0 20px;font-size:24px;line-height:1.3">Activate your organization account</h1>
        <p style="margin:0 0 16px;line-height:1.6">Hello ${escapeHtml(input.recipientName)},</p>
        <p style="margin:0 0 20px;line-height:1.6">${escapeHtml(input.invitedByName)} invited you to NirmanSite as <strong>${escapeHtml(input.roleName)}</strong> for <strong>${escapeHtml(input.organizationName)}</strong> (${escapeHtml(input.organizationType)}).</p>
        <div style="margin:0 0 24px;padding:16px;background:#f5f7f4;border-radius:10px;line-height:1.7">
          <div><strong>Login email:</strong> ${escapeHtml(input.recipientEmail)}</div>
          <div><strong>Invitation expires:</strong> ${escapeHtml(expiry)}</div>
        </div>
        <p style="margin:0 0 20px;line-height:1.6">${escapeHtml(passwordInstruction)}</p>
        <p style="margin:0 0 24px">
          <a href="${escapeHtml(input.activationUrl)}" style="display:inline-block;border-radius:9px;background:#c86b2a;color:#ffffff;padding:12px 20px;text-decoration:none;font-weight:700">Activate on Web</a>
        </p>
        <p style="margin:0 0 8px;color:#6a756d;font-size:13px">Using the mobile app?</p>
        <p style="margin:0 0 24px">
          <a href="${escapeHtml(input.mobileActivationUrl)}" style="display:inline-block;border-radius:9px;background:#2f372b;color:#ffffff;padding:12px 20px;text-decoration:none;font-weight:700">Open Mobile App</a>
        </p>
        <p style="margin:0;color:#6a756d;font-size:12px;line-height:1.6">For security, NirmanSite never sends a password in an invitation email. If you were not expecting this invitation, you can ignore this message.</p>
      </div>
    </div>
  </body>
</html>`;

  return { subject, text, html };
}

function formatExpiry(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  });
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character] ?? character,
  );
}
