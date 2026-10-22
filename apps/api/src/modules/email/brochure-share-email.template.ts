import {
  buildEmailLayout,
  emailButton,
  emailNotice,
  escapeEmailHtml,
} from "./email-layout";

export interface BrochureShareEmailInput {
  recipientName?: string;
  organizationName: string;
  projectName: string;
  senderName: string;
  assetCount: number;
  shareUrl: string;
  expiresAt: string;
}

export function buildBrochureShareEmail(input: BrochureShareEmailInput) {
  const greeting = input.recipientName?.trim()
    ? `Hello ${input.recipientName.trim()},`
    : "Hello,";
  const expiry = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeZone: "Asia/Kolkata",
  }).format(new Date(input.expiresAt));
  const subject = `${input.projectName} brochures and property information`;
  const text = `${greeting}\n\n${input.senderName} from ${input.organizationName} shared ${input.assetCount} marketing ${input.assetCount === 1 ? "item" : "items"} for ${input.projectName}.\n\nView brochures: ${input.shareUrl}\n\nThis private link expires on ${expiry}.`;
  const body = `<p style="margin:0 0 18px">${escapeEmailHtml(greeting)}</p><p style="margin:0 0 22px"><strong>${escapeEmailHtml(input.senderName)}</strong> from ${escapeEmailHtml(input.organizationName)} shared ${input.assetCount} curated marketing ${input.assetCount === 1 ? "item" : "items"} for <strong>${escapeEmailHtml(input.projectName)}</strong>.</p>${emailButton("View brochures", input.shareUrl)}${emailNotice(`This private link expires on <strong>${escapeEmailHtml(expiry)}</strong>. You can view or download only the selected files.`)}<p style="margin:0;color:#756b60;font-size:12px;line-height:20px">If you were not expecting this information, you can ignore this email.</p>`;
  return {
    subject,
    text,
    html: buildEmailLayout({
      eyebrow: "Property information",
      title: input.projectName,
      accent: "Brochures prepared for you",
      body,
    }),
  };
}
