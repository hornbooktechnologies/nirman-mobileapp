## 2026-10-26 - Brochure server size ceiling restored at 1 GiB

User-authorized supersession: API enforces 1,073,741,824 bytes per uploaded file and per Project aggregate stored brochures, counting active and archived assets. Multipart rejects oversized files; service validates size; repository checks total inside the existing Project row lock. Storage cleanup and readable errors are preserved. Web/Mobile retain no size policy copy or storage meter. Quota response again reports actual numeric capacity. No database changes. This bounds uploads but does not guarantee protection against concurrent memory exhaustion: existing multipart/storage handling buffers files in memory.

# Sales Brochures Implementation Review

## 2026-10-26 - Brochure storage policy update

User-authorized change supersedes the earlier 50 MiB requirements below: brochure uploads have no application-level per-file or aggregate storage size ceiling. API multipart, service and repository quota enforcement are removed. The library response retains usedBytes; limitBytes, remainingBytes and percentage are null. Mobile and Web omit storage meters, capacity wording and size-based upload blocking; en/hi/gu upload guidance lists file formats only. Existing supported formats, signature validation, empty-file rejection, permissions, sharing selection count, private storage and cleanup remain in place. No schema change is required. Uploads still use the existing memory-backed transport and remain subject to hosting/storage resources.

Verification: shared build, API and Mobile typechecks, all 7 focused brochure API tests, 19-namespace en/hi/gu parity and diff whitespace checks passed. Web typecheck is blocked by syntax errors in existing generated .next/dev/types/routes.d.ts and validator.ts. Authenticated browser/device and deployed uploads remain unrun; no deployment or database mutation performed.


## Status

- Result: `SCHEMA VERIFIED — RUNTIME ACCEPTANCE PARTIAL`
- Last updated: 2026-10-22
- Database mutation: migration `033_sales_brochures.sql` applied to the configured remote development database on 2026-10-22 with explicit Product Owner authorization

## Implemented

- Shared 50 MiB quota, MIME/category/status/share vocabulary, API models, errors, and `brochures:read/upload/manage/share` permissions.
- Additive Project-scoped asset/share/event schema and guarded Owner/Admin/Independent Contractor Owner/Sales User grants.
- NestJS library, private media, quota-locked upload, archive/restore/delete, share history, email/Other sharing, retry/revoke, public expiring link/media, engagement events, and audit integration.
- Upload MIME, extension, magic-byte, empty/size, Project status, tenant/Project, permission, selection, Lead visibility/email, idempotency, and compensating storage cleanup safeguards.
- Existing Sales Lead creation supports an unchecked optional brochure selection. Permission, email, and asset selection are validated before Lead persistence; SMTP failure leaves the Lead and share evidence committed with a retryable/manual result.
- Branded HTML/plain-text email uses existing SMTP settings and sends a private 30-day link rather than binary attachments.
- Authenticated Web Sales routes include quota, upload, private previews, selection, email, Web Share/copy fallback, archive, Lead opt-in, and a no-index public recipient page.
- Mobile includes permission-aware navigation, quota/library/upload/archive/selection, email/native system share, Lead opt-in immediately after email, and English/Hindi/Gujarati copy.

## Security And Integrity Review

- Private objects remain behind authenticated or capability-token API routes; the public response omits Organization, Project, user, storage, Lead, and recipient identifiers.
- Raw share tokens and recipient addresses are not logged or written to audit metadata. Tokens use a UUID plus HMAC-SHA256 signature and only a SHA-256 hash is stored.
- Project row locking serializes quota checks; active and archived stored bytes count toward the 52,428,800-byte limit.
- New shares contain only an explicit validated active-asset selection. Public reads revalidate that selection and cannot retrieve an unselected asset.
- UI uses existing NirmanSite components, theme tokens, responsive/touch sizing, permission gates, loading/empty/error feedback, and system-native sharing behavior.

## Verification Evidence

- Shared type-check and build passed.
- API type-check and scoped ESLint passed.
- Full API suite passed: 50 suites / 388 tests, including six focused Brochure/email tests after final hardening.
- Mobile type-check and 19-namespace English/Hindi/Gujarati locale validation passed.
- Web Brochure source type-checks; whole-Web type-check remains blocked only by the pre-existing `src/app/(auth)/login/page.tsx` Zod/resolver minor-version mismatch.
- Web ESLint could not start because the installed dependency tree is missing `eslint-module-utils/resolve`; this is an environment/dependency blocker, not a reported Brochure lint finding.
- React best-practices review completed; authenticated image previews are lazy, large PDF/video files load only on user action, and public payloads are minimized.
- Guarded migration status is current at 34/34 with zero pending or draft migrations. Read-only verification confirmed all four Brochure tables, exact default role grants, and zero custom Owner assignments missing `brochures:read`.
- Authenticated read-only runtime smoke against the running local API passed for an existing Organization Owner: Project access exposed `brochures:read`, and the Brochure library returned its items with the authoritative 50 MiB quota.
- Web navigation now includes a permission-gated Brochures item under Sales, and the local `/sales/brochures` route returns HTTP 200. The public Brochure API module is active.

## Not Yet Accepted

- Authenticated Sales-role workflows, concurrent live quota behavior, real S3 upload/read/delete, SMTP inbox delivery, browser Web Share/copy, and public-link expiry/revocation are unrun.
- Physical-device upload, preview, native share sheet, accessibility/large text, and fluent Hindi/Gujarati review are unrun.
- Production deployment and edge rate-limit configuration are unrun. Malware scanning and video transcoding remain explicitly deferred.

## Next Gate

Refresh or sign in again so the Owner session reloads Project access, then complete authenticated browser upload/share and physical-device acceptance without changing the approved workflow.
