import { createTransport } from 'nodemailer'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { buildContactEnquiryEmail, buildContactThankYouEmail, EMAIL_LOGO_CID } from '@/lib/email/contact-enquiry'
import { validateContactFields } from '@/lib/contact/validation'
import { isAllowedContactOrigin } from '@/lib/contact/request-origin'

export const runtime = 'nodejs'

type Enquiry = {
  name?: unknown
  phone?: unknown
  email?: unknown
  message?: unknown
  website?: unknown
}

const error = (message: string, status: number) => Response.json({ ok: false, error: message }, { status })
const clean = (value: unknown, limit: number) =>
  typeof value === 'string' ? value.trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').slice(0, limit + 1) : ''

export async function POST(request: Request) {
  // Browser submissions must come from this website, not another origin.
  const origin = request.headers.get('origin')
  if (!isAllowedContactOrigin(request.url, origin)) return error('Request origin is not allowed.', 403)
  const contentType = request.headers.get('content-type') || ''
  const browserPost = contentType.startsWith('application/x-www-form-urlencoded') || contentType.startsWith('multipart/form-data')
  const fail = (message: string, status: number) => browserPost
    ? Response.redirect(new URL('/contact?send=error', request.url), 303)
    : error(message, status)
  if (!browserPost && !contentType.startsWith('application/json')) return fail('Invalid request.', 415)
  if (Number(request.headers.get('content-length') || 0) > 6000) return fail('Enquiry is too long.', 413)

  let data: Enquiry
  try {
    if (browserPost) {
      const form = await request.formData()
      data = {
        name: form.get('Full name'), phone: form.get('Mobile number'),
        email: form.get('Email address'), message: form.get('Help requested'),
        website: form.get('website'),
      }
    } else {
      const raw = await request.text()
      if (raw.length > 6000) return fail('Enquiry is too long.', 413)
      data = JSON.parse(raw) as Enquiry
      if (!data || typeof data !== 'object' || Array.isArray(data)) return fail('Invalid request.', 400)
    }
  } catch {
    return fail('Invalid request.', 400)
  }

  // Hidden field: bots that fill every input are silently discarded.
  if (data.website) return browserPost ? Response.redirect(new URL('/contact?send=sent', request.url), 303) : Response.json({ ok: true })

  const name = clean(data.name, 100)
  const phone = clean(data.phone, 25)
  const email = clean(data.email, 150)
  const message = clean(data.message, 1000)
  const fieldErrors = validateContactFields({ name, phone, email, message })
  if (Object.keys(fieldErrors).length) {
    return browserPost ? fail('Please check the form fields.', 400) : Response.json({ ok: false, error: 'Please check the form fields.', fieldErrors }, { status: 400 })
  }

  const enquiry = { name, phone, email, message }
  try {
    await storeEnquiry(enquiry, randomUUID())
  } catch (cause) {
    console.error('Contact enquiry storage failed:', apiErrorDetails(cause))
    return fail('We could not save your enquiry. Please try again later.', 503)
  }

  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || 465)
  const user = process.env.SMTP_USER
  const password = process.env.SMTP_PASS
  const configuredFrom = process.env.SMTP_FROM?.trim()
  const fromAddress = configuredFrom && /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(configuredFrom) ? configuredFrom : user
  const to = process.env.CONTACT_TO_EMAIL
  if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !user || !password || !fromAddress || !to) {
    console.error('Contact SMTP configuration is incomplete')
    return browserPost
      ? Response.redirect(new URL('/contact?send=sent', request.url), 303)
      : Response.json({ ok: true, teamEmailSent: false, confirmationEmailSent: false })
  }

  const transport = createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass: password },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  })

  try {
    const logoContent = await readFile(join(process.cwd(), 'src/assets/brand/horizontal-logo.png'))
    const logoAttachment = { filename: 'NirmanSite-logo.png', content: logoContent, cid: EMAIL_LOGO_CID, contentDisposition: 'inline' as const }
    const content = buildContactEnquiryEmail(enquiry)
    await transport.sendMail({
      from: { name: 'NirmanSite', address: fromAddress },
      to,
      replyTo: email,
      ...content,
      attachments: [logoAttachment],
    })
    let confirmationEmailSent = true
    try {
      await transport.sendMail({
        from: { name: 'NirmanSite', address: fromAddress },
        to: email,
        replyTo: to,
        ...buildContactThankYouEmail(enquiry),
        attachments: [logoAttachment],
      })
    } catch (cause) {
      confirmationEmailSent = false
      console.error('Contact acknowledgement delivery failed:', JSON.stringify(smtpErrorDetails(cause)))
    }
    return browserPost ? Response.redirect(new URL('/contact?send=sent', request.url), 303) : Response.json({ ok: true, teamEmailSent: true, confirmationEmailSent })
  } catch (cause) {
    // The enquiry is already durable in the admin inbox. Email is a secondary notification.
    console.error('Contact SMTP delivery failed:', JSON.stringify(smtpErrorDetails(cause)))
    return browserPost
      ? Response.redirect(new URL('/contact?send=sent', request.url), 303)
      : Response.json({ ok: true, teamEmailSent: false, confirmationEmailSent: false })
  } finally {
    transport.close()
  }
}

async function storeEnquiry(enquiry: { name: string; phone: string; email: string; message: string }, submissionKey: string) {
  const apiBaseUrl = process.env.API_BASE_URL?.replace(/\/$/, '')
  const ingestKey = process.env.WEBSITE_ENQUIRY_INGEST_KEY
  if (!apiBaseUrl || !ingestKey) throw new Error('Website enquiry API configuration is incomplete')

  const response = await fetch(`${apiBaseUrl}/platform/website-enquiries/ingest`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-website-enquiry-key': ingestKey,
    },
    body: JSON.stringify({ ...enquiry, submissionKey }),
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) throw new Error(`Enquiry API returned ${response.status}`)
}

function apiErrorDetails(cause: unknown) {
  return cause instanceof Error ? { name: cause.name, message: cause.message } : 'unknown error'
}

function smtpErrorDetails(cause: unknown) {
  return cause && typeof cause === 'object'
    ? {
        code: 'code' in cause ? cause.code : undefined,
        responseCode: 'responseCode' in cause ? cause.responseCode : undefined,
        command: 'command' in cause ? cause.command : undefined,
        message: 'message' in cause ? cause.message : undefined,
      }
    : 'unknown error'
}
