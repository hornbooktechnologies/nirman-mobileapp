# Files And Media Ownership Contract

> Status: approved for the Gallery / Project Diary vertical slice on 2026-09-03.

## Scope

This foundation owns durable metadata for bytes stored through the existing S3-compatible `StorageService`. Every asset has an Organization, Project, storage key, media type, byte size, checksum, original filename, uploader, timestamps, and a typed business context. Object keys are private implementation details; clients receive bytes only through authenticated API media routes.

The current slice supports Gallery images (`image/jpeg`, `image/png`, and `image/webp`, maximum 10 MiB). Generic document upload, replacement, cross-module attachment linking, retention jobs, virus scanning, transformations, video, quota enforcement, and permanent deletion are deferred.

## Ownership And Security

- `file_assets.organization_id` and `project_id` are mandatory tenant keys.
- `context_type = GALLERY_ENTRY` and `context_id` identify the owning diary entry.
- The Gallery service verifies active Organization membership, effective Project access, and the relevant Gallery permission before returning metadata or a signed read.
- Storage keys are server generated and namespaced by Organization and Project. Client paths and public URLs are never trusted or persisted.
- Failed metadata persistence triggers best-effort object cleanup. Database records are never created for a failed object upload.

## Reliability

Client-generated Gallery entry UUIDs and idempotency keys prevent duplicate metadata when an offline upload is retried. The file checksum participates in the request fingerprint. Binary retry is client controlled; storage bytes are uploaded only while connected.

## Acceptance

Migration/schema verification, authorization tests, authenticated media access, real configured-storage upload, low-connectivity retry, and retention/quota work are separate evidence gates.
