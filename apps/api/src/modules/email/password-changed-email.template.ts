import {
  buildEmailLayout,
  emailNotice,
  escapeEmailHtml as escapeHtml,
} from "./email-layout";
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
  const html = buildEmailLayout({
    eyebrow: "NirmanSite account security",
    title: "Password",
    accent: "changed.",
    body: `<p style="margin:0 0 16px">Hello ${name},</p>
<p style="margin:0 0 16px">Your NirmanSite password was changed and existing sign-in sessions were revoked.</p>
${emailNotice("If you did not make this change, contact NirmanSite support immediately.")}`,
  });
  return { subject, text, html };
}
