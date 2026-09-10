# Gallery / Project Diary Technical Plan

> Status: implemented — API/database/Mobile, configured S3 storage, and a real-user upload/media read are verified; redesigned Gallery device acceptance remains.

## Delivery

1. Add Gallery contracts, permissions, enums, response types, errors, and the narrow Files/Media ownership contract.
2. Add migration `020_gallery_project_diary.sql` for `file_assets` and `gallery_entries`.
3. Add NestJS Gallery controller/service/repository/DTOs, private S3-backed media reads, transactions, audit/notifications, and focused tests.
4. Extend the guarded role seed; migrate, seed with demo users disabled, verify schema/grants, and smoke the live API.
5. Add Expo Image Picker, persisted retry queue, direct-publish Gallery route/navigation/services, dense month/day grid, category/date filters, photo detail sheet, and en/hi/gu resources.
6. Run shared/API/Mobile checks, locale parity, Expo export, whitespace validation, and synchronize module status/index/task/ledger.
7. Configure a dedicated private S3 bucket and verify real object upload/read/public-denial/delete under the Organization/Project asset hierarchy.

Rollback removes only Gallery role grants, `gallery_entries`, and `file_assets`; storage cleanup must be handled separately for uploaded objects. No existing operational data is modified.
