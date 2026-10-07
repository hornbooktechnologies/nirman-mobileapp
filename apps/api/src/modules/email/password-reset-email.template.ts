import {
  buildEmailLayout,
  emailButton,
  emailDetail,
  emailNotice,
  escapeEmailHtml as escapeHtml,
} from "./email-layout";
import type { EmailContent } from "./invitation-email.template";

export interface PasswordResetEmailInput {
  recipientName: string;
  recipientEmail: string;
  expiresAt: string;
  resetUrl: string;
  mobileResetUrl: string;
}

export function buildPasswordResetEmail(
  input: PasswordResetEmailInput,
): EmailContent {
  const expiry = formatExpiry(input.expiresAt);
  const subject = "Reset your NirmanSite password";
  const text = [
    `Hello ${input.recipientName},`,
    "",
    "We received a request to reset your NirmanSite password.",
    `Login email: ${input.recipientEmail}`,
    "",
    `Reset on web: ${input.resetUrl}`,
    `Reset in the mobile app: ${input.mobileResetUrl}`,
    `This single-use link expires ${expiry}.`,
    "",
    "If you did not request this, you can ignore this email. Your password has not been changed.",
  ].join("\n");

  const html = buildEmailLayout({
    eyebrow: "NirmanSite account security",
    title: "Reset your",
    accent: "password.",
    body: `<p style="margin:0 0 16px">Hello ${escapeHtml(input.recipientName)},</p>
<p style="margin:0 0 20px">We received a request to reset your NirmanSite password.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${emailDetail("Login email", input.recipientEmail)}${emailDetail("Link expires", expiry)}</table>
${emailNotice("This link can be used once. If you did not request it, ignore this email; your password has not been changed.")}
${emailButton("Reset on Web", input.resetUrl)}
${emailButton("Open Mobile App", input.mobileResetUrl, true)}`,
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
