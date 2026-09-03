# Site Gallery / Project Diary Contract

> Status: approved implementation contract — full API/database/Mobile slice authorized 2026-09-03.

## Module Identity And Dependencies

The module creates a chronological, project-scoped visual diary for Builders, Project Managers, Contractors, and Supervisors. Authentication, active Organization membership, Project Access, RBAC, Audit, Notifications, and Files/Media ownership are mandatory. Progress may supply an optional canonical stage tag but owns no Gallery data. Dashboards/reports are downstream. Other attachment modules have no direct dependency in this slice.

Included: image capture/selection, caption/category/stage/date metadata, durable queued mobile upload, chronological paginated reads, summary, authenticated media access, approval/rejection, audit, and notification records. Deferred: video, editing/deletion, Web review, comments, exports, image transformations/thumbnails, GPS, generic offline sync/conflict UI, storage quotas, and attachments in other modules.

## Vocabulary And State

- Categories: `PROGRESS`, `WORK`, `MATERIAL_DELIVERY`, `SAFETY`, `ISSUE`, `OTHER`.
- Review statuses: `PENDING`, `APPROVED`, `REJECTED`.
- Visibility: pending/rejected items are internal; approval publishes an item to ordinary Gallery readers.
- Direct profiles: `SELF_MANAGED_BUILDER` and `INDEPENDENT_CONTRACTOR` publish uploads immediately. Other profiles create `PENDING` items for review.
- Rejection requires an 8–500 character reason. Review uses `expectedVersion`; a stale action conflicts. Review is immutable in this slice.

## Actors And Permissions

- `gallery:read`: read approved Project diary items; uploaders may also read their own pending/rejected items; reviewers may read all.
- `gallery:upload`: upload an image to an active accessible Project.
- `gallery:approve`: approve a pending item created by another Member.
- `gallery:reject`: reject a pending item created by another Member.

Platform Super Admin receives no customer Gallery permissions. Project CUSTOM grants can narrow Organization Role authority.

## Domain And API

`file_assets` owns private object metadata. `gallery_entries` owns caption, category, optional canonical Progress stage, capture date/time, workflow snapshot, status/version, uploader/reviewer identity, rejection reason, idempotency fingerprint, and timestamps. New tables use UUID strings, Organization/Project composite ownership constraints, restrictive foreign keys, and scoped indexes.

Base route: `/organizations/:organizationId/projects/:projectId/gallery`.

- `GET /summary` — `gallery:read`; counts and latest approved item.
- `GET /entries` — `gallery:read`; page/pageSize, category, stage, status, dateFrom/dateTo filters.
- `POST /entries` — `gallery:upload`; multipart `file` plus `entryId`, `idempotencyKey`, category, optional stage/caption/capturedAt/width/height.
- `GET /entries/:entryId/media` — `gallery:read`; authorization then short-lived storage redirect.
- `POST /entries/:entryId/approve` — `gallery:approve`; body `expectedVersion`.
- `POST /entries/:entryId/reject` — `gallery:reject`; body `expectedVersion`, `reason`.

Stable failures cover unsupported/oversized media, missing item, future capture time, invalid transition, self-review, stale version, and idempotency conflict. Upload and review create immutable Audit events. Pending uploads notify Project reviewers; review results notify the uploader with a Gallery deep link.

## Mobile And Offline Contract

The permission-aware Menu exposes Gallery. The Project screen is an image-first two-column diary with date/category context, clear review state, pull-to-refresh, pagination, and a prominent capture action. The capture sheet offers camera or library, preview, category, optional stage/caption, visible validation, upload progress, and retry feedback. Controls are at least 44dp and all copy/accessibility labels ship in English, Hindi, and Gujarati.

Selected media is copied to app-owned storage by Expo Image Picker and the queue metadata is persisted in AsyncStorage before upload. A stable client UUID/idempotency key is retained across restarts. Queued/failed uploads retry from the screen while connected; successful uploads are removed. The client never claims server success while queued. Server states and review authority remain authoritative.

## Validation And Acceptance

Images are JPEG/PNG/WebP and at most 10 MiB. Caption is at most 1000 characters; stage is canonical; capture time cannot be in the future; list pagination is bounded and date ranges ordered. Static/test/export, migration/seed, authenticated API, configured S3 upload, physical-device camera/library, accessibility, and fluent en/hi/gu checks remain distinct gates.
