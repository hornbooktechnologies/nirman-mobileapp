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

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f5f7f4;color:#1f2922;font-family:Arial,sans-serif">
    <div style="max-width:640px;margin:0 auto;padding:32px 16px">
      <div style="background:#ffffff;border:1px solid #dce2dc;border-radius:16px;padding:32px">
        <p style="margin:0 0 8px;color:#6a756d;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">NirmanSite account security</p>
        <h1 style="margin:0 0 20px;font-size:24px;line-height:1.3">Reset your password</h1>
        <p style="margin:0 0 16px;line-height:1.6">Hello ${escapeHtml(input.recipientName)},</p>
        <p style="margin:0 0 20px;line-height:1.6">We received a request to reset your NirmanSite password.</p>
        <div style="margin:0 0 24px;padding:16px;background:#f5f7f4;border-radius:10px;line-height:1.7">
          <div><strong>Login email:</strong> ${escapeHtml(input.recipientEmail)}</div>
          <div><strong>Link expires:</strong> ${escapeHtml(expiry)}</div>
        </div>
        <p style="margin:0 0 16px">
          <a href="${escapeHtml(input.resetUrl)}" style="display:inline-block;border-radius:9px;background:#c86b2a;color:#ffffff;padding:12px 20px;text-decoration:none;font-weight:700">Reset on Web</a>
        </p>
        <p style="margin:0 0 24px">
          <a href="${escapeHtml(input.mobileResetUrl)}" style="display:inline-block;border-radius:9px;background:#2f372b;color:#ffffff;padding:12px 20px;text-decoration:none;font-weight:700">Open Mobile App</a>
        </p>
        <p style="margin:0;color:#6a756d;font-size:12px;line-height:1.6">This link can be used once. If you did not request it, ignore this email; your password has not been changed.</p>
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
