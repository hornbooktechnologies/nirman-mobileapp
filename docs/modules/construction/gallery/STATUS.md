# Site Gallery / Project Diary Status

> Last updated: 2026-09-03
>
> State: implementation and database rollout complete; configured-storage, authenticated workflow, and physical-device acceptance pending.

## Implemented

- Approved Gallery and narrow Files/Media ownership contracts plus technical plan.
- Shared categories/statuses/types, four permissions, Audit actions, stable errors, and Project grant group.
- Migration `020_gallery_project_diary.sql` with tenant/Project-owned private asset metadata, retry identity, review state/versioning, and restrictive relationships.
- NestJS list, summary, multipart upload, authorized media streaming, approve, and reject routes with Project Access, checksum/idempotency, best-effort object cleanup, Audit, and Notifications.
- Guarded role synchronization for eight intended customer templates; no Platform Super Admin or Sales User grants.
- Expo camera/library picker, app-owned persisted queue, stable restart-safe retry identity, immediate retry, image-first two-column diary, category browsing, review actions, and complete en/hi/gu copy/accessibility labels.

## Verified

- Remote migration ledger is 21/21 current; `file_assets` and `gallery_entries` exist and contain zero rows.
- Gallery role grants match the contract.
- Shared build, API/Mobile type-checks, 28 API suites/153 tests, API production build, locale parity across 18 namespaces, Android Expo export, and runtime health/database checks pass.
- Newly restarted API returns `401 AUTH_SESSION_REQUIRED` from the Gallery route without a session.

## Pending Acceptance Gates

- Configure the S3-compatible bucket and credentials; current environment has a region only, so real binary upload/media streaming cannot succeed yet.
- Authenticated upload/idempotent replay/reviewer separation/approve/reject/media-read smoke with disposable data.
- Physical-device camera/library permissions, restart queue recovery, low-connectivity retry, two-column small-screen/large-text layout, screen reader, dark mode, and fluent Hindi/Gujarati review.
- Web review, video, thumbnails/transforms, GPS, generic sync engine, retention/deletion, and quota enforcement remain deferred.
