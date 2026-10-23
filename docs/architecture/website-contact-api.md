# Website contact API ownership

The marketing contact workflow is implemented in `apps/api` under the existing
Website Enquiries module. The website is a presentation and API transport client.
No schema, enquiry administration permissions, status transitions, conversion or
activation rules change in this migration.

## Request and response contract

`POST /api/v1/public/contact` accepts JSON with `name`, `phone`, `email`,
`organizationType` (`BUILDER` or `CONTRACTOR`), optional `message`, and the hidden
`website` honeypot. It also supports the website's existing URL-encoded form
field names for non-JavaScript browser submissions. Multipart uploads are not
supported; this form has no file upload.

The caller must send the exact configured `WEBSITE_URL` Origin. It is also added
to API CORS origins. Origin checks reduce browser abuse but do not authenticate
non-browser clients. Requests are bounded to 6,000 serialized characters and
limited to 20 requests per minute per socket-address/email combination, with a
bounded, expiring per-process map. Forwarded IP headers are not trusted. These
limits are per API process, not a distributed anti-spam service. Honeypot entries
return success without storage or mail. Server validation matches the frontend's
field rules, including Indian mobile-number validation and length limits.

The API uses the existing `WebsiteEnquiriesRepository` to save a fresh submission
before any email. A storage failure returns HTTP 503 and sends nothing. The
existing admin inbox then lists the saved enquiry with its existing access checks.
The team notification and customer acknowledgement are attempted independently
through the shared `EmailService` using saved platform Email Settings or API SMTP
fallback. No customer submission can choose the sender or team recipient.
Templates escape user HTML and reference the frontend's existing public brand logo.

JSON success keeps the existing form contract:

```json
{"ok":true,"teamEmailSent":true,"confirmationEmailSent":true}
```

Each email flag reports SMTP acceptance, not guaranteed inbox delivery. A mail
failure leaves the enquiry saved and returns HTTP 200 with the appropriate false
flag. Invalid fields return HTTP 400 with `ok: false`, `error`, and `fieldErrors`.
Other request failures use 403/413/415/429. Form submissions use a 303 redirect
to the configured marketing origin's `/contact?send=sent` or `send=error`.

## Local and production transport

The website's `/api/contact` is a Next.js rewrite, not an API route. Its destination
is `${API_BASE_URL}/public/contact`. Local root `.env` targets
`http://localhost:4000/api/v1`; standalone hosting should use
`https://api.nirmansite.com/api/v1`. Next.js captures this rewrite at build time.
Docker builds against `http://api:4000/api/v1`, so no loopback upstream is baked
into the production image. Rebuild Website when changing the upstream.

API owns `WEBSITE_URL`, `CONTACT_TO_EMAIL`, `API_SMTP_*` and `API_MAIL_FROM_*`.
Website owns only `API_BASE_URL`, `NEXT_PUBLIC_SITE_URL` and
`SITE_INDEXING_ENABLED`. Legacy `WEBSITE_SMTP_*` settings are removed. The legacy
keyed `/platform/website-enquiries/ingest` remains API-only for compatibility;
this public form never receives or exposes that secret. No migration is needed.

## Verification and acceptance

Focused mocked HTTP tests cover origins behind proxies, form redirects, payload
limits and throttling. Service tests cover validation, honeypots, storage failure
and saved enquiries during SMTP outages. Mocked SMTP tests cover sender identity,
HTML escaping and independent delivery failures. API/Website builds and typechecks
verify packaging; the Website manifest confirms the rewrite and absence of a
Next contact route. Actual customer submission, inbox receipt, admin display and
production rollout remain environment acceptance checks; automated verification
does not mutate databases or send mail.
