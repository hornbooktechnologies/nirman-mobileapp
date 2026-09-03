# Project Progress Contract

> Status: implementation authorized by the product owner on 2026-09-02.
>
> Source of truth: `MVP_REQUIREMENTS.md` section 17, current shared/API/Mobile source, and approved Project Access/Audit contracts.

## A. Module Identity

Project Progress gives Builder, Contractor, Project Manager, and Supervisor users a quick, Project-scoped view of construction completion. The MVP includes the nine canonical stages, latest stage state, immutable update history, Project summary, Organization portfolio summary, CSV history export, and a Mobile create/read experience.

Deferred: custom stages, stage weighting, update approval, deletion/editing of history, Files/Media links, notifications, offline queued writes, Web administration, and dashboard aggregation outside this module.

Mandatory dependencies are Authentication, active Organization membership, Project Access, RBAC, Projects, and Audit. Files/Media is optional/downstream for evidence links. Offline Sync is required before offline mutations. Gallery, dashboards, and reports consume Progress later but do not own it.

## B. Domain Terminology

- **Stage**: one canonical construction phase from Foundation through Handover.
- **Progress update**: an immutable observation for one Project stage on a date.
- **Latest stage value**: the newest update ordered by update date, creation time, and id.
- **Overall progress**: equal-weight arithmetic mean of the latest percentage for all nine default stages; a stage without an update contributes 0%. The API rounds to one decimal place.
- **Correction/regression**: a new update lower than the current stage value. It is allowed only with a note and never rewrites history.

## C. Actors And Permissions

- `progress:read`: read Project summaries/history and Organization portfolio rows for Projects the actor can access.
- `progress:update`: record a new update on an active accessible Project.
- `progress:export`: export accessible Project history.
- Organization Owner, Builder Admin, Independent Contractor Owner, and Project Manager receive all three permissions.
- Builder Supervisor, Contractor Member, and Site Supervisor receive read/update.
- Viewer receives read only. Sales User and Platform Super Admin receive none by default.
- Project CUSTOM grants may narrow these permissions; Organization Role permissions remain the ceiling.

All reads/writes are Organization- and Project-scoped. Platform roles do not inherit customer operational access.

## D. Business Workflows

### Record progress

1. An actor with `progress:update` opens an active accessible Project.
2. The actor selects a canonical stage, supplies 0-100%, update date, optional note, the last percentage they observed, and an idempotency key.
3. The API locks the latest stage state. A stale expected value fails with `PROGRESS_VERSION_CONFLICT`; reuse of a key with a different payload fails with `PROGRESS_IDEMPOTENCY_CONFLICT`.
4. A lower percentage requires a note.
5. The API appends an immutable update containing previous/current values and actor identity, records an audit event, and returns the refreshed summary.

There is no edit/delete operation. Correction is another traceable update. No notification is emitted in this slice. Offline writes are unavailable until the shared Offline Sync foundation exists.

## E. Domain Model

`project_progress_updates` stores UUID id, Organization/Project scope, canonical stage, percentage (`DECIMAL(5,2)`), previous percentage, update date (`DATE`), optional notes, actor Member/User, idempotency key/fingerprint, and timestamps. It has composite Project scope foreign keys, unique Organization idempotency, and Project/stage/date indexes. Delete is restricted and records are retained as Project history.

## F. Shared Application Contract

Shared exports define `PROJECT_PROGRESS_STAGES`, `ProjectProgressStage`, update/history/summary/portfolio response types, Progress permissions, audit action, and stable errors. Percentages are JSON numbers. SQL DATE values remain `YYYY-MM-DD` strings.

Errors: `PROGRESS_NOT_FOUND`, `PROGRESS_STAGE_INVALID`, `PROGRESS_PERCENTAGE_INVALID`, `PROGRESS_DATE_IN_FUTURE`, `PROGRESS_REGRESSION_NOTE_REQUIRED`, `PROGRESS_VERSION_CONFLICT`, and `PROGRESS_IDEMPOTENCY_CONFLICT`.

## G. API Contract

- `GET /organizations/:organizationId/projects/:projectId/progress/summary` — `progress:read`; current overall/stages/latest update.
- `GET /organizations/:organizationId/projects/:projectId/progress/history` — `progress:read`; filters `stage`, `dateFrom`, `dateTo`, `page`, `pageSize`.
- `POST /organizations/:organizationId/projects/:projectId/progress/updates` — `progress:update`; body `stage`, `percentage`, `updateDate`, optional `notes`, nullable `expectedPreviousPercentage`, `idempotencyKey`.
- `GET /organizations/:organizationId/projects/:projectId/progress/export` — `progress:export`; CSV history.
- `GET /organizations/:organizationId/progress/projects` — `progress:read`; latest summaries only for accessible active Projects.

Writes require an active Project. All operations enforce active membership, Role permission, Project assignment/scope, and Project CUSTOM grants. POST is transactionally idempotent and concurrency-safe.

## H. Web-Admin Experience

Deferred. A later oversight slice may consume the existing portfolio/history APIs without changing their contracts.

## I. Mobile Experience

The permission-aware Menu exposes Project Progress. The screen uses the active Project context, a compact overall summary, horizontal stage cards, latest activity, full history, pull-to-refresh, and a prominent update action. The update sheet has visible labels, 44px+ touch targets, stage selection, percentage presets plus numeric input, date input, note validation for regressions, inline errors, loading state, and success feedback. All system copy and accessibility labels ship together in English, Hindi, and Gujarati.

## J. Offline And Synchronisation Contract

Online reads/writes only in this slice. The API already supplies UUID idempotency keys and immutable history suitable for a future queue. Mobile must show its existing network/error recovery behavior and must not claim a pending update was saved offline.

## K. Notifications

None for routine updates in MVP. A later approved notification rule may reference a progress update and deep-link to the screen.

## L. Audit Events

`progress.update.recorded` records actor, Organization, Project, update entity id, old percentage, new percentage, stage, update date, and regression metadata inside the write transaction.

## M. Validation And Acceptance

- Stage is canonical; percentage is 0-100 with at most two decimals; notes are at most 2000 characters; update date cannot be later than today in India.
- Date filters must be ordered; pagination is bounded.
- Static checks, focused API tests, migration/seed verification, authenticated runtime routes, locale parity, Expo export, and `git diff --check` are separate evidence gates.
- Physical-device, accessibility/large-text, and fluent Hindi/Gujarati review remain separate acceptance gates unless run explicitly.
