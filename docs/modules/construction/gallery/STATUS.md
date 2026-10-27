## 2026-10-27 - Mobile brochure/gallery upload failures and error popups

Brochure requests used browser crypto.randomUUID and its loader depended on a freshly normalized Project object, causing native compatibility failures and response-driven refetches. Switched brochure upload/share IDs to Expo uuid.v4 and loader dependencies to scalar Organization/Project/token values. Gallery and brochure now share multipart submission through the authenticated API client, reject missing/malformed success data, and append browser Blob versus native URI parts correctly without manually setting multipart Content-Type. Missing brochure picker MIME can be inferred from accepted filename extensions; iOS gallery picker requests compatible representation.

Load/upload/picker/queue failures now show native Alerts alongside retained inline/queued errors, including localized explanation, server error detail and HTTP status/code. Gallery failure items remain queued for explicit retry; preparation/storage errors also reach the popup. Existing limits, formats, authorization and idempotency semantics remain. Updated the existing gallery queue verification harness for TS6 CommonJS interop; no queue production logic changed. No API/DB/deployment changes. Real phone upload and deployed upstream configuration acceptance remain pending.

Verification: six multipart/native UUID/stable brochure-loader regression tests, gallery queue checks, attendance loading checks and Mobile typecheck passed. See src/lib/multipart-upload.test.mjs. Physical-device upload and preview remain unverified; further server/proxy/storage errors will now be visible rather than hidden behind sheets.

# Site Gallery / Project Diary Status

## Web upload simplification - 2026-10-06

Removed the separate "Take a photo" capture input from the Web Add site photo dialog at the user's request. The existing required Photo picker retains JPEG/PNG/WebP selection, validation and preview; metadata and queued upload behavior remain unchanged. Mobile camera capture remains unchanged. Scoped Web lint and diff checks passed; live deployment/browser acceptance remains pending. Existing design components were used; ui-ux-pro-max was unavailable.

> Last updated: 2026-09-07
>
> State: implementation, database rollout, configured storage, and an authenticated real-user upload/media read are verified; the redesigned Gallery device acceptance remains pending.

## Web W6 - 2026-09-18

Implemented Gallery private images, filters/summary/pagination, metadata, browser upload/durable scoped queue, sign-out cleanup and compatibility review. [W6 parity and verification](../../../tasks/web-w6-gallery-parity.md) records pending acceptance and the standalone entry-link API requirement. Web is not runtime-accepted.

## Implemented

### Mobile upload state correction - 2026-09-28

- Queue reads now preserve uploads active in the current runtime. Previously every refresh converted `UPLOADING` to `FAILED`, exposing Retry before the first request completed.
- A per-entry runtime guard prevents duplicate concurrent attempts while preserving interrupted-upload recovery after restart and stable retry identity.
- Regression coverage: `node apps/mobile/scripts/verify-gallery-queue.cjs` passes active refresh, duplicate attempt prevention, unrelated queue updates, restart recovery, lock release, and identity preservation. Physical-device first-upload confirmation remains pending.
- Mobile TypeScript check (`node node_modules/typescript/bin/tsc --noEmit` from `apps/mobile`) and `git diff --check` passed.

- Approved Gallery and narrow Files/Media ownership contracts plus technical plan.
- Shared categories/statuses/types, four permissions, Audit actions, stable errors, and Project grant group.
- Migration `020_gallery_project_diary.sql` with tenant/Project-owned private asset metadata, retry identity, review state/versioning, and restrictive relationships.
- NestJS list, summary, direct-publish multipart upload, authorized media streaming, and compatibility approve/reject routes with Project Access, checksum/idempotency, best-effort object cleanup, Audit, and Notifications.
- Guarded role synchronization for eight intended customer templates; no Platform Super Admin or Sales User grants.
- Expo camera/library picker, app-owned persisted queue, stable restart-safe retry identity, immediate retry, authenticated cache-backed thumbnails with loading/retry fallbacks, dense month/day-grouped Gallery grid, category/date-range filters, tap-to-open photo detail sheet, and complete en/hi/gu copy/accessibility labels.

## Verified

- Remote migration ledger is 21/21 current; `file_assets` and `gallery_entries` exist.
- Gallery role grants match the contract.
- Shared build, API/Mobile type-checks, 28 API suites/153 tests, API production build, locale parity across 18 namespaces, Android Expo export, and runtime health/database checks pass.
- Newly restarted API returns `401 AUTH_SESSION_REQUIRED` from the Gallery route without a session.
- A dedicated development S3 bucket is configured with bucket-owner-enforced ownership, server-side encryption, versioning, and all four public-access blocks enabled.
- `verify:gallery:storage` passed real upload, authenticated SDK read, byte/content-type integrity, blocked public read, delete, and verification-version cleanup using the Organization/Project asset hierarchy.
- The real Gallery row uploaded by `raxorg1@yopmail.com` returned HTTP 200 through the authenticated media API with matching JPEG MIME type, 975,749-byte length, and SHA-256 checksum.

## Pending Acceptance Gates

- Authenticated direct-publish idempotent replay smoke with disposable data.
- Physical-device confirmation of the dense grid/detail sheet/date filters, camera/library permissions, restart queue recovery, low-connectivity retry, small-screen/large-text layout, screen reader, dark mode, and fluent Hindi/Gujarati review.
- Video, thumbnails/transforms, GPS, generic sync engine, retention/deletion, and quota enforcement remain deferred.
