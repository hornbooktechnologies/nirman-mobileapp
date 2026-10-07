import {
  buildEmailLayout,
  emailButton,
  emailDetail,
  emailNotice,
  escapeEmailHtml as escapeHtml,
} from "./email-layout";
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

  const html = buildEmailLayout({
    eyebrow: "NirmanSite onboarding",
    title: "Activate your",
    accent: "organization account.",
    body: `<p style="margin:0 0 16px">Hello ${escapeHtml(input.recipientName)},</p>
<p style="margin:0 0 20px">${escapeHtml(input.invitedByName)} invited you to NirmanSite as <strong>${escapeHtml(input.roleName)}</strong> for <strong>${escapeHtml(input.organizationName)}</strong> (${escapeHtml(input.organizationType)}).</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${emailDetail("Login email", input.recipientEmail)}${emailDetail("Invitation expires", expiry)}</table>
${emailNotice(escapeHtml(passwordInstruction))}
${emailButton("Activate on Web", input.activationUrl)}
<p style="margin:0 0 8px;color:#756b60;font-size:13px">Using the mobile app?</p>
${emailButton("Open Mobile App", input.mobileActivationUrl, true)}
<p style="margin:24px 0 0;font-size:12px;line-height:20px;color:#756b60">For security, NirmanSite never sends a password in an invitation email. If you were not expecting this invitation, you can ignore this message.</p>`,
  });

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
