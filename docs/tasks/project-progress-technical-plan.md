# Project Progress Technical Plan

> Status: active — full API/database/Mobile slice authorized 2026-09-02.

## Scope

1. Add canonical shared stages, response types, permissions, audit action, and errors.
2. Add guarded migration `019_project_progress.sql` for immutable scoped updates.
3. Add NestJS controller/service/repository/DTO/tests using Project Access and Audit.
4. Extend the idempotent role seed and run the approved remote migration/seed/sync.
5. Add Expo route, permission-aware navigation, services/types, Project Progress screen, update sheet, and en/hi/gu resources.
6. Synchronize module status/index/task/ledger and record verification evidence.

## API Slices

- A: Project summary and paginated history.
- B: Transactional idempotent/concurrency-safe update append.
- C: CSV export and accessible Organization Project portfolio.

## Database Safety And Rollback

Preflight with migration status and confirm the configured target without exposing credentials. Migration is additive: one table plus role-permission rows managed by the existing idempotent seed. Rollback, if required, removes new role permission rows and drops only `project_progress_updates`; no existing Project or operational data is modified.

## Mobile Design

Reuse `NirmanScreenBackground`, `ScreenHeader`, `OperationalEntityCard`, `BottomSheet`, `Button`, `Input`, `DateInput`, `ProgressRing`, semantic mobile tokens, active Project resolution, and existing localized error handling. The UI-skill guidance is limited to clear hierarchy, touch feedback, large targets, and low-density native forms; repository design tokens and fonts override generic search suggestions.

## Verification

- Shared build/type-check.
- Focused Progress API tests, API type-check/build, then full API suite when practical.
- Migration status before/after, schema/permission seed queries, API health and authenticated Progress smoke.
- Mobile locale validation/type-check, Android/Web Expo export as applicable, focused literal review.
- `git diff --check` and review of only Project Progress changes against the dirty worktree.

## Explicitly Deferred

Custom stages/weights, media, notifications, offline mutation queue, Web UI, deletions, approvals, and downstream dashboards.
