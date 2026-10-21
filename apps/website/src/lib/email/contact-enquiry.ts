export type ContactEnquiry = {
  name: string
  phone: string
  email: string
  message: string
}

export const EMAIL_LOGO_CID = 'nirmansite-logo@hornbooktechnologies.com'
const logo = `<img src="cid:${EMAIL_LOGO_CID}" alt="NirmanSite" width="190" style="display:block;width:190px;max-width:100%;height:auto;margin:0 auto;border:0;">`

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character] || character)

export function buildContactEnquiryEmail(enquiry: ContactEnquiry, receivedAt = new Date()) {
  const name = escapeHtml(enquiry.name)
  const phone = escapeHtml(enquiry.phone || 'Not provided')
  const email = escapeHtml(enquiry.email || 'Not provided')
  const message = escapeHtml(enquiry.message || 'Not provided').replace(/\r?\n/g, '<br>')
  const received = receivedAt.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short',
  })
  const replyHref = `mailto:${encodeURIComponent(enquiry.email)}`
  const subjectName = enquiry.name.replace(/[\r\n]+/g, ' ').slice(0, 80)
  const subject = `NirmanSite enquiry from ${subjectName} · ${received}`
  const text = [
    'NEW WEBSITE ENQUIRY',
    `Received: ${received} IST`,
    '',
    `Name: ${enquiry.name}`,
    `Mobile: ${enquiry.phone || 'Not provided'}`,
    `Email: ${enquiry.email || 'Not provided'}`,
    '',
    'WHAT THEY NEED',
    enquiry.message || 'Not provided',
    '',
    'Submitted through the NirmanSite contact form. The visitor agreed to be contacted about this enquiry.',
  ].join('\n')

  // Tables and inline styles keep the layout readable across Gmail and other email clients.
  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:#f7f5ef;color:#2a211b;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">New enquiry from ${name} · ${escapeHtml(received)} IST</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f7f5ef;">
    <tr><td align="center" style="padding:36px 16px 44px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%;max-width:600px;border-collapse:separate;">
        <tr><td align="center" style="padding:0 0 20px;">${logo}</td></tr>
        <tr><td style="border-radius:22px 22px 0 0;background:#2a211b;padding:30px 36px 28px;">
          <p style="margin:0 0 11px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#e3ab7d;">From your website</p>
          <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:36px;font-weight:400;line-height:1.12;letter-spacing:-.7px;color:#fffaf3;">A new conversation<br><em style="color:#e3ab7d;font-weight:400;">starts here.</em></h1>
        </td></tr>
        <tr><td style="background:#c16c31;height:5px;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="background:#fff;padding:32px 36px 34px;border:1px solid #ece7dd;border-top:0;border-radius:0 0 22px 22px;">
          <p style="margin:0 0 9px;font-size:11px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;color:#9a5220;">New enquiry</p>
          <h2 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:29px;font-weight:400;line-height:1.2;color:#2a211b;">${name}</h2>
          <p style="margin:9px 0 26px;font-size:13px;line-height:1.5;color:#756b62;">Received ${escapeHtml(received)} IST · NirmanSite contact form</p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;border-top:1px solid #ebe6df;">
            <tr><td style="width:112px;padding:17px 12px 17px 0;border-bottom:1px solid #ebe6df;font-size:12px;font-weight:700;color:#756b62;vertical-align:top;">EMAIL</td><td style="padding:17px 0;border-bottom:1px solid #ebe6df;font-size:15px;font-weight:600;line-height:1.4;color:#2a211b;word-break:break-word;">${email}</td></tr>
            <tr><td style="width:112px;padding:17px 12px 17px 0;border-bottom:1px solid #ebe6df;font-size:12px;font-weight:700;color:#756b62;vertical-align:top;">MOBILE</td><td style="padding:17px 0;border-bottom:1px solid #ebe6df;font-size:15px;font-weight:600;line-height:1.4;color:#2a211b;">${phone}</td></tr>
          </table>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:26px;background:#f7f5ef;border-left:4px solid #676f4b;border-radius:0 10px 10px 0;">
            <tr><td style="padding:19px 21px 21px;">
              <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:#4f5637;">What they need</p>
              <p style="margin:0;font-size:15px;line-height:1.7;color:#3b322b;word-break:break-word;">${message}</p>
            </td></tr>
          </table>
          ${enquiry.email ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:27px;"><tr><td style="border-radius:999px;background:#a95a22;"><a href="${escapeHtml(replyHref)}" style="display:inline-block;padding:13px 22px;color:#fff;text-decoration:none;font-size:14px;font-weight:700;">Reply to ${name} &rarr;</a></td></tr></table>` : ''}
        </td></tr>
        <tr><td style="padding:22px 5px 0;font-size:12px;line-height:1.6;color:#756b62;">Sent from the NirmanSite contact form. The visitor agreed to be contacted about this enquiry.<br><span style="color:#4f5637;font-weight:700;">Built for the people who build India.</span></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
  return { subject, text, html }
}

export function buildContactThankYouEmail(enquiry: ContactEnquiry) {
  const firstName = enquiry.name.trim().split(/\s+/)[0] || 'there'
  const safeName = escapeHtml(firstName)
  const subject = 'Thank you for contacting NirmanSite'
  const text = [
    `Hi ${firstName},`,
    '',
    'Thank you for reaching out to NirmanSite. We received your enquiry, and our team will review it and contact you using the details you shared.',
    '',
    'If you need to add anything, reply to this email.',
    '',
    'The NirmanSite team',
    'Built for the people who build India.',
  ].join('\n')
  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f7f5ef;color:#2a211b;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">We received your enquiry and will be in touch.</div>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f7f5ef;">
    <tr><td align="center" style="padding:36px 16px 44px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%;max-width:600px;border-collapse:separate;">
        <tr><td align="center" style="padding:0 0 20px;">${logo}</td></tr>
        <tr><td style="border-radius:22px 22px 0 0;background:#2a211b;padding:30px 36px 28px;">
          <p style="margin:0 0 11px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#e3ab7d;">Your message is with us</p>
          <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:36px;font-weight:400;line-height:1.12;color:#fffaf3;">Thanks for reaching out,<br><em style="color:#e3ab7d;font-weight:400;">${safeName}.</em></h1>
        </td></tr>
        <tr><td style="background:#c16c31;height:5px;font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td style="background:#fff;padding:32px 36px 34px;border:1px solid #ece7dd;border-top:0;border-radius:0 0 22px 22px;">
          <p style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:27px;line-height:1.2;color:#2a211b;">We have your enquiry.</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.75;color:#554b43;">Thank you for contacting NirmanSite. Our team will review your note and get in touch using the details you shared.</p>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:25px 0;background:#f7f5ef;border-left:4px solid #676f4b;border-radius:0 10px 10px 0;"><tr><td style="padding:18px 21px;font-size:14px;line-height:1.6;color:#3b322b;">Need to add something? Simply reply to this email.</td></tr></table>
          <p style="margin:0;font-size:15px;line-height:1.7;color:#554b43;">The NirmanSite team</p>
        </td></tr>
        <tr><td align="center" style="padding:22px 5px 0;font-size:12px;line-height:1.6;color:#756b62;">Built for the people who build India.<br>© NirmanSite</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
  return { subject, text, html }
}
