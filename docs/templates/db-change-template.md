# Database Change Template

## 1. Status

- Draft / Approved / Applied / Superseded:
- Module:
- Last updated:

This document is a database plan only until a separate migration implementation is approved.

## 2. Change Summary

Describe the business reason, affected workflows, and whether this is a new table, compatibility migration, or seed/tooling change.

## 3. Approved Database Rules

- Active database access lives only in `apps/api`.
- Runtime access uses `mysql2/promise` repositories, parameterized SQL, and transactions where needed.
- New SQL tables use plural `snake_case` physical names.
- New columns use `snake_case`.
- `packages/database/prisma` is archived inherited history only.
- Web, mobile, and shared packages must not access the database directly.

## 4. Tables Added

List each new table with columns, indexes, unique constraints, foreign keys, and ownership.

## 5. Tables Changed

List existing tables changed. Clearly distinguish inherited compatibility tables from approved new-table naming.

## 6. Relationships and Access Scope

Describe organisation scope, project scope, and membership joins. Future access must flow through `organization_members` and `project_members`; inherited global `users.roleId` compatibility is not the target model.

## 7. Seed Data

List required seed data, permission keys in `resource:action` format, default roles, and environment requirements.

## 8. Migration Notes

- Migration file/script path, after approval:
- Backfill strategy:
- Locking/transaction strategy:
- Data safety checks:
- Production approval required:

## 9. Rollback

Describe rollback, reversibility, and data-loss risk.

## 10. Verification

List type checks, migration dry-runs, repository tests, tenant/project isolation tests, and manual smoke tests.
