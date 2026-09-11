import type { EmailContent } from "./invitation-email.template";

export function buildPasswordChangedEmail(input: {
  recipientName: string;
}): EmailContent {
  const subject = "Your NirmanSite password was changed";
  const text = [
    `Hello ${input.recipientName},`,
    "",
    "Your NirmanSite password was changed and existing sign-in sessions were revoked.",
    "If you did not make this change, contact NirmanSite support immediately.",
  ].join("\n");
  const name = escapeHtml(input.recipientName);
  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f5f7f4;color:#1f2922;font-family:Arial,sans-serif">
    <div style="max-width:640px;margin:0 auto;padding:32px 16px">
      <div style="background:#ffffff;border:1px solid #dce2dc;border-radius:16px;padding:32px">
        <p style="margin:0 0 8px;color:#6a756d;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">NirmanSite account security</p>
        <h1 style="margin:0 0 20px;font-size:24px;line-height:1.3">Password changed</h1>
        <p style="margin:0 0 16px;line-height:1.6">Hello ${name},</p>
        <p style="margin:0 0 16px;line-height:1.6">Your NirmanSite password was changed and existing sign-in sessions were revoked.</p>
        <p style="margin:0;color:#a33b2b;font-size:13px;line-height:1.6;font-weight:700">If you did not make this change, contact NirmanSite support immediately.</p>
      </div>
    </div>
  </body>
</html>`;
  return { subject, text, html };
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
