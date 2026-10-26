## 2026-10-26 - Brochure server size ceiling restored at 1 GiB

User-authorized supersession: API enforces 1,073,741,824 bytes per uploaded file and per Project aggregate stored brochures, counting active and archived assets. Multipart rejects oversized files; service validates size; repository checks total inside the existing Project row lock. Storage cleanup and readable errors are preserved. Web/Mobile retain no size policy copy or storage meter. Quota response again reports actual numeric capacity. No database changes. This bounds uploads but does not guarantee protection against concurrent memory exhaustion: existing multipart/storage handling buffers files in memory.

# Sales Brochures Contract

## 2026-10-26 - Brochure storage policy update

User-authorized change supersedes the earlier 50 MiB requirements below: brochure uploads have no application-level per-file or aggregate storage size ceiling. API multipart, service and repository quota enforcement are removed. The library response retains usedBytes; limitBytes, remainingBytes and percentage are null. Mobile and Web omit storage meters, capacity wording and size-based upload blocking; en/hi/gu upload guidance lists file formats only. Existing supported formats, signature validation, empty-file rejection, permissions, sharing selection count, private storage and cleanup remain in place. No schema change is required. Uploads still use the existing memory-backed transport and remain subject to hosting/storage resources.


## A. Module Identity And Status

- Status: `schema_verified_runtime_acceptance_partial`; approved by the Product Owner on 2026-10-22, with migration rollout authorized and completed on 2026-10-22.
- Scope owner: Sales CRM.
- Last updated: 2026-10-22.
- Purpose: give an Organization's Owner and Sales team one professional, Project-scoped library for company brochures, house/unit images, PDFs, and short videos, and let them share selected material from Lead creation or from the library.
- Business outcome: Sales users can send consistent, approved marketing material without searching personal devices or manually assembling large email attachments.

Included:

- private Project brochure library on API, Web, and Mobile;
- PDF, image, and video upload with a hard 50 MiB aggregate quota per Project;
- quota usage shown before and after upload;
- selection and sharing by branded email link;
- Lead-create opt-in selection using the Lead email address;
- a separate Email action and an Other/native-share action;
- delivery/share history, retry, revocation, audit, and basic engagement evidence;
- English, Hindi, and Gujarati Mobile copy.

Excluded or deferred:

- video transcoding, thumbnails extracted from videos, and image editing;
- public search-engine indexing;
- marketing campaigns, mailing lists, scheduled sends, templates per salesperson, and bulk Lead sends;
- social-network APIs or automatic posting to WhatsApp, Facebook, or Instagram;
- offline upload or offline email delivery;
- billing for storage above 50 MiB;
- changes to the public `nirman-website` marketing repository.

Dependencies:

- Identity Access, Project Access, Role/Permission Model, Sales Leads, Files/Media ownership, private S3-compatible storage, Audit, and SMTP email.
- No direct dependency on Inventory, Bookings, financial modules, or Gallery workflow approval.

## B. Domain Terminology

- **Brochure asset**: one private Project marketing file plus its display metadata.
- **Brochure library**: all active brochure assets for one Organization and Project.
- **Quota**: the sum of stored bytes for active or archived brochure assets in that Project. The limit is 50 MiB (`52,428,800` bytes), not 50 decimal MB.
- **Share selection**: one or more active assets chosen for one outbound share.
- **Share record**: immutable evidence of who shared which asset IDs, by which channel, to which Lead or email, and the delivery state.
- **Share link**: a high-entropy, revocable, expiring public token that opens a branded, read-only landing page containing only the selected active assets.
- **Email accepted**: the configured SMTP server accepted the message; it does not prove that the recipient opened it.

## C. Actors And Permissions

Canonical permission keys:

- `brochures:read` — list, preview, download, and view quota/history within accessible Projects.
- `brochures:upload` — upload an asset to an active accessible Project.
- `brochures:manage` — edit metadata, reorder, archive/restore assets, and revoke share links.
- `brochures:share` — create Email or Other share links and retry failed email delivery.

Default role proposal:

| Role template | Read | Upload | Manage | Share |
| --- | --- | --- | --- | --- |
| Organization Owner | yes | yes | yes | yes |
| Builder Admin | yes | yes | yes | yes |
| Independent Contractor Owner | yes | yes | yes | yes |
| Sales User | yes | yes | no | yes |
| Other customer roles | no, unless explicitly granted | no | no | no |
| Platform roles | no customer brochure access | no | no | no |

All API operations additionally require active Organization membership, Project access, and any effective Project `CUSTOM` grant. Navigation is hidden without `brochures:read`; hiding is not authorization. A Lead-linked share also requires visibility of that Lead under the existing own/team/all Sales rules.

Sales Users may upload, but only `brochures:manage` holders may archive, restore, rename, reorder, or revoke. This keeps shared marketing material curated while allowing the team to contribute.

## D. Business Workflows

### D1. Upload And Library Management

1. An authorized user opens Brochures for an active Project.
2. The client shows `used / 50 MiB`, remaining capacity, accepted formats, and the selected file size.
3. The user selects a supported file and enters a required title plus optional description/category.
4. API validates Project state, permission, file name, declared MIME type, byte signature, size, and quota.
5. API reserves quota and writes `file_assets` plus brochure metadata transactionally, then stores the private object using the established storage service and idempotent cleanup pattern.
6. The new asset appears in the same ordered library on Web and Mobile.

Concurrent uploads must serialize quota calculation for the Project. The API, not the client, is authoritative. A failed storage/database operation must not leave counted quota or an untracked object. Exact idempotent retries return the original result; conflicting reuse returns an idempotency error.

### D2. Lead Creation With Optional Brochure Email

1. The Lead form retains its current optional email field.
2. Directly below email, when `brochures:share` is effective, the form shows an unchecked `Send marketing brochures` checkbox.
3. When unchecked, no share record, email, or public token is created.
4. When checked, a compact selector opens and the user explicitly selects one or more active brochure assets. Checking the box never silently selects every future asset.
5. Email becomes required and must be valid while the box is checked. The recipient is the normalized email saved on that Lead; the client cannot submit a different hidden recipient.
6. The Lead is created first. After commit, the API creates the share record/link and attempts the email. Lead creation is never rolled back by SMTP failure.
7. The result distinguishes `lead saved + email sent`, `lead saved + email pending/manual`, and `lead saved + email failed`; failed/manual delivery can be retried from Lead detail or Brochures history without creating another Lead.
8. A successful request adds the existing `BROCHURE_SHARED` Sales activity with the share ID, channel, selected asset count, and delivery state—never the public token.

### D3. Separate Email Share

1. From the Brochure library, an authorized user selects one or more assets and chooses Share > Email.
2. A focused dialog/sheet asks for a valid recipient email and optional recipient name; it may optionally link an accessible Lead.
3. The API creates a share link and sends a branded NirmanSite email listing the selected assets with one clear `View brochures` action.
4. The email contains links, not binary attachments. This is required because the library may total 50 MiB while common mail systems reject messages around 20–25 MiB.
5. SMTP failure is recorded and visible with Retry. Retry reuses the same share/link unless it has expired or been revoked.

### D4. Other / Native Share

1. From the Brochure library, the user selects assets and chooses Share > Other.
2. API creates the same controlled share link.
3. Mobile opens the operating-system share sheet with a short localized message and the link. Installed compatible apps (for example WhatsApp, Messages, Facebook, or other apps) decide whether they appear. NirmanSite does not promise or deep-link a specific social app.
4. Web calls the Web Share API when supported; otherwise it copies the link and shows clear success feedback. No unsupported platform button is displayed as if delivery were guaranteed.
5. Cancelling the system/browser sheet records no external-delivery claim; the created link remains visible in history and can be revoked.

### D5. Public Recipient Experience

- The share landing page requires only the unguessable token, is mobile-first, branded, no-index, and exposes no Organization/Project administration data.
- It shows the selected active assets, safe inline previews where supported, file type/size, and explicit download/open actions.
- Asset bytes are streamed through token-authorized API routes or short-lived signed URLs; permanent storage keys are never exposed.
- Revoked, expired, archived-asset-only, or invalid links return a neutral unavailable page without revealing record existence.
- The proposed default expiry is 30 days. A `brochures:manage` user may revoke earlier.

## E. Domain Model

### `brochure_assets`

- `id` UUID primary key.
- `organization_id`, `project_id` required ownership keys.
- `file_asset_id` required unique FK to `file_assets`.
- `title` required, trimmed, 2–160 characters.
- `description` optional, up to 1,000 characters.
- `category`: `COMPANY`, `PROJECT`, `HOUSE`, `FLOOR_PLAN`, `AMENITIES`, `PRICE_LIST`, `OTHER`.
- `sort_order` non-negative integer with stable created-time fallback.
- `status`: `ACTIVE`, `ARCHIVED`, or `DELETED`; default `ACTIVE`. `DELETED` is a retained metadata tombstone after private bytes are removed.
- `uploaded_by_user_id`, `uploaded_by_member_id`, `created_at`, `updated_at`, `archived_at`, `archived_by_user_id`.
- Indexes: Organization/Project/status/sort; uploader; file asset.

The linked `file_assets.context_type` is `BROCHURE_ASSET`; `context_id` is the brochure asset ID. Private object keys follow `organizations/{organizationId}/projects/{projectId}/assets/brochures/{assetId}/{fileAssetId}.{extension}`.

### `brochure_shares`

- `id` UUID primary key and Organization/Project ownership.
- `lead_id` nullable FK to `sales_leads` in the same Organization/Project.
- `channel`: `EMAIL` or `OTHER`.
- `recipient_email_normalized` nullable; required for `EMAIL`.
- `recipient_name` nullable, up to 160 characters.
- `token_hash` required unique; raw tokens are never stored.
- `status`: `ACTIVE`, `REVOKED`, or `EXPIRED`.
- `email_delivery_status`: `NOT_APPLICABLE`, `PENDING`, `EMAIL_SENT`, `EMAIL_FAILED`, or `MANUAL`.
- `expires_at`, `revoked_at`, `revoked_by_user_id`, `created_by_user_id`, `created_by_member_id`, `created_at`, `last_email_attempt_at`.
- `idempotency_key` plus request fingerprint, unique within Organization.
- Indexes: Project/status/created date; Lead/date; token hash; expiry; recipient/date.

### `brochure_share_assets`

- `share_id`, `brochure_asset_id`, and immutable `position`.
- Composite primary key prevents duplicate selection.
- A share preserves the asset selection; archived assets stop being publicly available rather than disappearing from audit history.

### `brochure_share_events`

- Append-only evidence for `EMAIL_ACCEPTED`, `EMAIL_FAILED`, `LINK_OPENED`, and `ASSET_OPENED`.
- Includes occurred time, asset ID when applicable, coarse client metadata supported by the current request context, and no raw token.
- Open events are marketing indicators, not guaranteed unique people or legal proof of reading.

Quota accounting uses `SUM(file_assets.byte_size)` for every `ACTIVE` or `ARCHIVED` brochure asset whose private object remains stored in one Project. Archive is reversible and does not release quota. A separately confirmed permanent delete removes the private object first, changes the asset to a `DELETED` tombstone, and only then releases quota; implementation must not claim released space while bytes remain billable.

## F. Shared Application Contract

`packages/shared` will own:

- `BROCHURE_PROJECT_QUOTA_BYTES = 52_428_800`;
- allowed MIME types: `application/pdf`, `image/jpeg`, `image/png`, `image/webp`, `video/mp4`, and `video/quicktime`;
- category, asset status, share channel/status, and delivery-status values;
- framework-neutral asset, quota, share, create/update/query, and result types;
- permission keys and grouped permission metadata;
- errors: `BROCHURE_ASSET_NOT_FOUND`, `BROCHURE_FILE_REQUIRED`, `BROCHURE_FILE_TYPE_UNSUPPORTED`, `BROCHURE_FILE_SIGNATURE_INVALID`, `BROCHURE_FILE_TOO_LARGE`, `BROCHURE_QUOTA_EXCEEDED`, `BROCHURE_SELECTION_REQUIRED`, `BROCHURE_SELECTION_INVALID`, `BROCHURE_RECIPIENT_REQUIRED`, `BROCHURE_LEAD_EMAIL_REQUIRED`, `BROCHURE_LEAD_EMAIL_MISMATCH`, `BROCHURE_SHARE_NOT_FOUND`, `BROCHURE_SHARE_UNAVAILABLE`, and `BROCHURE_IDEMPOTENCY_CONFLICT`.

No client invents alternate values or calculates authoritative remaining quota.

## G. API Contract

Authenticated Project base:

```text
/api/v1/organizations/:organizationId/projects/:projectId/brochures
```

| Method and route | Permission | Purpose |
| --- | --- | --- |
| `GET /` | `brochures:read` | paginated/filterable library plus quota summary |
| `POST /` multipart | `brochures:upload` | upload one asset; idempotency required |
| `GET /:assetId/media` | `brochures:read` | authenticated preview/download |
| `PATCH /:assetId` | `brochures:manage` | title, description, category, sort order |
| `POST /:assetId/archive` | `brochures:manage` | hide an asset reversibly; stored bytes continue counting toward quota |
| `POST /:assetId/restore` | `brochures:manage` | restore an archived asset whose private bytes remain |
| `DELETE /:assetId` | `brochures:manage` | permanently remove bytes from an archived asset after explicit confirmation and retain a metadata tombstone |
| `GET /shares` | `brochures:read` | Project share/delivery history |
| `POST /shares/email` | `brochures:share` | arbitrary-email or Lead-linked branded email share |
| `POST /shares/other` | `brochures:share` | controlled link for native/browser share |
| `POST /shares/:shareId/retry-email` | `brochures:share` | retry failed/manual Email share |
| `POST /shares/:shareId/revoke` | `brochures:manage` | revoke public access |

The existing `POST /sales/leads` request gains optional `brochureShare: { assetIds: UUID[] }`. It is rejected if the actor lacks `brochures:share`, the Lead email is absent/invalid, any asset is inactive/out of Project, or the selection is empty. When omitted, current Lead behavior is unchanged and no share occurs. The response gains optional `brochureShareResult` while preserving the existing Lead data envelope.

Public token routes are rate-limited at the deployment edge/API policy and require no authenticated user:

```text
GET /api/v1/public/brochure-shares/:token
GET /api/v1/public/brochure-shares/:token/assets/:assetId/media
```

Tenant and Project ownership are checked on every join. DTO whitelisting prevents mass assignment. Uploads use memory only within the 50 MiB hard ceiling and validate magic bytes, extension normalization, and safe response headers. Inline content uses an allowlist and `X-Content-Type-Options: nosniff`; downloads use sanitized filenames.

## H. Web Experience

- Routes: `/sales/brochures`, `/projects/:projectId/sales/brochures`, and public `/brochure-share/:token`.
- Add `Brochures` to the existing Sales workspace tabs only when `brochures:read` is effective.
- Use existing warm surfaces, card radius, typography, lime/orange actions, Project context, responsive controls, focus rings, and 44 px minimum actions.
- Header shows title, Project, quota meter (`used of 50 MiB`), remaining space, and Upload action.
- Library uses responsive cards/list rows with type preview/icon, title, category, size, uploader, date, selection checkbox, and permission-aware actions.
- Upload is drag/drop plus file picker, never drag/drop only. It displays allowed types, selected size, projected quota, upload progress, cancellation, and recovery.
- Share action bar appears only after selection and offers Email and Other.
- Email dialog has recipient email, optional name/Lead, selected-item review, consent-oriented copy, and explicit Send.
- Other uses `navigator.share({ title, text, url })` when available; fallback copies the URL. Browser capability controls the UI.
- Include skeleton/loading, empty, no-results, quota-full, permission-denied, partial-preview, SMTP-manual, send-failed/retry, link-revoked, and error states.
- All dialogs trap focus, restore focus, have labelled controls, keyboard selection, status announcements, and do not rely on color alone.
- Lead create/edit UI adds the checkbox directly below email. The selector and validation appear only when checked; edit does not resend automatically.

## I. Mobile Experience

- Brochures appears in the existing Sales/Menu navigation for `brochures:read` users and respects selected Project context.
- Match the current premium operational language: warm background, blueprint-blue information surfaces, construction-orange primary action, dark-coffee text, rounded cards, large touch targets, and one-handed bottom actions.
- The same quota, library, upload metadata, selection, Email, history/retry, and empty/error states as Web are present without copying a desktop table.
- Use existing Expo Document Picker for PDF/video/files, Image Picker for images, private cache files, API client, progress feedback, and cleanup patterns. Do not persist raw public share tokens in logs or unsecured app storage.
- Other uses React Native's native `Share` API with message and URL. The operating system determines compatible installed targets; a successful API return means the share sheet completed, not that a third party consumed the content.
- Lead add has the unchecked localized checkbox below email and an accessible selected-asset count. Edit never silently sends.
- All new system copy has English/Hindi/Gujarati key and placeholder parity. User-entered titles/names are never translated.
- Reads may use currently cached React Query/app state while online recovery is attempted; uploads and shares require connectivity. No queued offline marketing sends are claimed.

## J. Offline And Synchronisation

- Server is authoritative for assets, quota, share state, and delivery state.
- No offline upload, archive, restore, share creation, or retry in this slice.
- Clients disable network-required actions when confidently offline and retain form/selection state only for the current screen where practical.
- An uncertain retry uses the original idempotency key. Duplicate requests cannot create duplicate files or emails.
- Reconnect refreshes quota and invalidates Project brochure/share caches.

## K. Email, Notifications, And Marketing Evidence

- Extend the existing `EmailService`; do not create a second SMTP configuration.
- Email subject/body identify the Organization/Project, sender name where available, selected item count, expiry date, and one branded call to action. They include plain-text and accessible HTML versions.
- No binary attachment is sent. No recipient email or public token is written to ordinary application logs.
- SMTP-unconfigured produces `MANUAL`, not a false success.
- An in-app notification is not required for each send; share history is the operational record.
- Link opens and asset opens may update aggregated engagement counts, clearly labelled as approximate.

## L. Audit Events

Record immutable events with Organization, Project, actor, entity, old/new values where applicable, and safe metadata:

- `brochure.asset.uploaded`;
- `brochure.asset.updated`;
- `brochure.asset.archived`;
- `brochure.asset.restored`;
- `brochure.asset.deleted`;
- `brochure.share.created`;
- `brochure.share.email_attempted`;
- `brochure.share.email_accepted`;
- `brochure.share.email_failed`;
- `brochure.share.revoked`.

Audit metadata may include asset IDs/count, channel, Lead ID, byte size, MIME type, expiry, and delivery status. It must not include raw tokens or full recipient email; use the existing redaction convention or a masked value.

## M. Validation And Business Rules

- Project must be `ACTIVE` for upload, share creation, retry, archive, or restore. Read/history remain available according to existing archived/non-active Project access rules.
- One file per upload request. Empty files and files above 50 MiB are rejected before storage.
- Filename is display metadata only; storage keys are server generated.
- MIME declaration, extension, and magic-byte/container signature must agree with the allowlist.
- Title, category, asset selection, Lead ownership, recipient, and Project ownership are server validated.
- At least one and at most 50 assets may be selected per share, bounded further by the 50 MiB Project quota.
- Quota cannot be exceeded by concurrent uploads. Archive does not release quota; permanent deletion releases it only after confirmed object removal.
- Lead checkbox share is opt-in and defaults false on every fresh form.
- Lead-linked recipient must equal the Lead email after trim/lowercase normalization.
- Email/share failures never delete or roll back a committed Lead.
- Archived assets cannot be newly shared. Existing public shares omit archived assets and become unavailable when none remain.
- Share tokens combine an unguessable UUID capability identifier with a 256-bit HMAC-SHA256 signature; only a SHA-256 token hash is stored. This implementation refinement preserves the approved expiring capability-link security outcome while allowing safe idempotent replay without persisting the raw token.
- Permanent deletion requires an already archived asset plus an explicit confirmation value; it cannot be restored, and historical share/audit rows keep metadata without serving bytes.
- Default expiry proposal: 30 days from creation; revocation is immediate.
- Server timestamps and Organization timezone formatting are authoritative; clients do not submit audit/delivery status.

## N. Reporting And Analytics

MVP includes per-Project:

- used/remaining quota and active/archived asset counts;
- shares by channel and delivery status;
- approximate link opens and asset opens;
- Lead timeline evidence for Lead-linked shares.

Cross-Project campaign reporting, conversion attribution, and exports are deferred.

## O. Security And Privacy

- Storage remains private with blocked public bucket access.
- Authenticated routes enforce tenant, Project, membership, permission, and Lead visibility on the server.
- Public access is capability-token scoped, expiring, revocable, rate-limited, and limited to the immutable selected asset set.
- Raw storage keys, SMTP details, raw share tokens, and internal IDs beyond the selected public resource are not exposed.
- Public pages set `noindex, nofollow`, restrictive content security headers, referrer policy, and safe content disposition.
- Recipient addresses are customer personal data: show only to authorized Project users, mask in dense history where practical, and never include in analytics URLs.
- Virus/malware scanning is not present in the repository and remains a production-readiness follow-up. The MVP allowlist/signature/size controls do not replace malware scanning.

## P. Acceptance Criteria

- Database migration is additive, reversible by documented manual rollback, and not executed without separate approval.
- Permission defaults and `CUSTOM` Project grants enforce the role table; cross-tenant/Project access is rejected.
- API rejects quota overflow including a concurrent two-upload race and reports server-authoritative usage.
- Supported PDF/image/video files upload, preview/download safely, and clean up correctly on failure/archive.
- Web and Mobile expose the same workflow, validation, states, and selection semantics in their native UI patterns.
- Fresh Lead forms default the share checkbox off; unchecked creates no share; checked requires email and explicit assets.
- Lead persists when SMTP is unavailable/fails, and retry does not duplicate the Lead or share.
- Separate Email and Other flows create only the selected asset set.
- Mobile opens the native share sheet; Web uses supported browser share or copy fallback.
- Expired/revoked/invalid tokens reveal no tenant details and cannot fetch bytes.
- Mobile locale parity, keyboard/screen-reader labels, responsive Web focus behavior, and 44 px touch targets pass review.
- Existing Sales Lead, Gallery, Email invitation/password, and Project access tests remain green.

## Q. Test Matrix

- Shared constant/type/error tests.
- DTO file, recipient, selection, and query validation tests.
- Repository tenant/Project scoping, quota lock, idempotency, share-token hash, archive/restore, and history tests.
- Service permission, Lead visibility, recipient equality, Project state, MIME/signature, failure cleanup, SMTP outcome, retry, expiry, and revocation tests.
- Controller multipart/media response and public-token tests.
- Email template text/HTML escaping and accessibility-oriented structure tests.
- API integration happy paths plus cross-tenant, cross-Project, revoked-role, concurrent-quota, invalid token, and duplicate retry failures.
- Web component/service tests for quota, upload, selection, Lead opt-in, Email outcome, Web Share capability/fallback, keyboard, and errors.
- Mobile source/component verification for selection, Lead opt-in, offline blocking, native Share invocation, upload recovery, and en/hi/gu parity.
- End-to-end: upload -> Lead opt-in -> SMTP accepted -> public landing -> asset open -> timeline/history evidence.

## R. Decision Classification And Approval Gate

Confirmed by Product Owner request:

- a separate Brochure module for Owner and Sales team;
- PDF, image, and video support;
- 50 MB total visible limit;
- matching Mobile/Web flow plus API changes;
- an unchecked-by-default Lead email checkbox controlling whether selected material is shared;
- separate Email and Other/system-sharing actions;
- professional UI matching the existing theme.

Repository-derived facts:

- Sales is Project-scoped and already defines `BROCHURE_SHARED` as a timeline activity type;
- Leads already have an optional email field on API, Web, and Mobile;
- private S3-compatible storage, `file_assets`, SMTP, Project access, audit, native Expo sharing, and Web Sales workspace patterns already exist;
- the public marketing website is a separate repository and is not the authenticated Web app.

Safe technical decisions proposed by this draft:

- 50 MiB is an aggregate per active Project brochure library;
- Email sends a branded expiring link rather than attachments;
- every share contains an explicit immutable selection;
- Lead creation commits independently from delivery and exposes retry status;
- Mobile/Web share a controlled link through platform-native share capability;
- archive is the reversible default; explicit permanent deletion is required to remove private bytes and release quota while retaining audit tombstones.

Decisions requiring Product Owner approval before implementation:

1. Approve the complete contract and the four permission keys/default role grants.
2. Approve Project-scoped 50 MiB quota (rather than Organization-wide quota) and the exact binary interpretation of 50 MiB.
3. Approve link-based branded email instead of up-to-50-MiB attachments.
4. Approve a 30-day default share expiry, revocation, approximate open tracking, and archive-then-explicit-delete lifecycle.

Runtime implementation is authorized. Migration-file preparation is authorized; database migration/seed execution remains a separate approval gate.
