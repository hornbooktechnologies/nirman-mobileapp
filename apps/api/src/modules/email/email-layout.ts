/** Shared presentation only; subjects, plain text, URLs and delivery stay in each template. */
export function escapeEmailHtml(value: string) {
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

export function emailButton(label: string, url: string, secondary = false) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 16px"><tr><td bgcolor="${secondary ? "#65704a" : "#ad5720"}" style="border-radius:28px;text-align:center"><a href="${escapeEmailHtml(url)}" style="display:inline-block;padding:13px 24px;border:1px solid ${secondary ? "#65704a" : "#ad5720"};border-radius:28px;color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:700;line-height:18px;text-decoration:none">${escapeEmailHtml(label)} &rarr;</a></td></tr></table>`;
}

export function emailNotice(content: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:#f8f6f1;border-radius:0 12px 12px 0"><tr><td style="border-left:4px solid #65704a;padding:20px 22px;font-size:14px;line-height:24px;color:#2b221b">${content}</td></tr></table>`;
}

export function emailDetail(label: string, value: string) {
  return `<tr><td style="padding:16px 0;border-bottom:1px solid #eae4da;font-size:11px;line-height:18px;color:#756b60;width:32%;vertical-align:top;text-transform:uppercase">${escapeEmailHtml(label)}</td><td style="padding:16px 0 16px 12px;border-bottom:1px solid #eae4da;font-size:14px;line-height:22px;font-weight:700;color:#2b221b;overflow-wrap:anywhere;word-break:break-word">${escapeEmailHtml(value)}</td></tr>`;
}

export function buildEmailLayout(input: {
  eyebrow: string;
  title: string;
  accent: string;
  body: string;
}) {
  const origin =
    process.env.PUBLIC_WEB_APP_URL?.trim() ||
    "https://nirman-mobileapp-web.vercel.app";
  const logoUrl = new URL("/brand/horizontal-logo.png", origin).href;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeEmailHtml(input.title)}</title></head>
<body style="margin:0;padding:0;background:#f8f6f1;color:#2b221b;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f8f6f1"><tr><td align="center" style="padding:32px 16px 36px">
<!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto">
<tr><td align="center" style="padding:12px 0 32px"><img src="${escapeEmailHtml(logoUrl)}" alt="NirmanSite" width="160" height="53" style="display:block;width:160px;height:auto;border:0"></td></tr>
<tr><td bgcolor="#2b221b" style="padding:30px 36px;border-radius:24px 24px 0 0;border-bottom:5px solid #c86b2a">
<p style="margin:0 0 14px;font-size:11px;line-height:18px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#f3a564">${escapeEmailHtml(input.eyebrow)}</p>
<h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:36px;line-height:40px;color:#ffffff">${escapeEmailHtml(input.title)}<br><em style="color:#f3a564">${escapeEmailHtml(input.accent)}</em></h1>
</td></tr>
<tr><td bgcolor="#ffffff" style="padding:30px 36px 34px;border:1px solid #eae4da;border-top:0;border-radius:0 0 24px 24px;font-size:14px;line-height:26px">${input.body}</td></tr>
<tr><td align="center" style="padding:24px 12px 0;font-size:12px;line-height:20px;color:#756b60">Built for the people who build India.<br>&copy; NirmanSite</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table></body></html>`;
}
