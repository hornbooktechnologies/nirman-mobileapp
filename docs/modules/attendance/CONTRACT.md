# Attendance Module Contract

> Status: approved for MVP implementation.
>
> Source of truth: `MVP_REQUIREMENTS.md` section `12. Module: Attendance`.
>
> Scope: project-scoped daily worker attendance records for Builder, Contractor, and Site Supervisor roles using `attendance:*` permissions.

## A. Module Identity

Module name: Attendance.

Business purpose: replace paper attendance registers with a project-scoped daily record of worker presence for the current project.

Target users:

- Builder Owner
- Independent Contractor
- Contractor under Builder
- Site Supervisor

Business value:

- Daily labour status captured in a consistent record.
- Attendance can be completed quickly for many workers.
- Attendance is project-scoped and auditable.
- Attendance feeds wage generation and reporting.

Included MVP scope:

- Mark attendance for workers assigned to the current project.
- Use project date defaulted to today.
- Allow bulk daily save with default `PRESENT` marking and exception edits.
- Keep exactly one active record per project + worker assignment + date.
- Update existing record instead of creating duplicates.
- Support offline entry and later sync.
- Record actor and previous value on corrections.

Excluded or deferred:

- `PAID_LEAVE` and `SITE_CLOSED` statuses are later options, not MVP values.
- Overtime tracking is deferred unless promoted.
- Biometric, GPS, and geofencing enforcement are deferred.
- Attendance approval workflow beyond permission gating is not defined in the MVP requirement.

Dependencies:

- Identity and project access.
- Worker master and project assignment records.
- Shared permission keys and status enums.
- mysql2 repository architecture.

Downstream modules:

- Wages.
- Kharchi.
- Reports and dashboards.
- Audit.

## B. Domain Terminology

- Attendance record: the daily status for one worker assignment on one project on one date.
- Worker assignment: project-level link to a worker.
- Marked by: the system user who recorded the attendance.
- Last edited by: the user who last corrected the attendance.
- Correction: any change to an existing attendance record after creation.

## C. Actors And Permissions

Permission keys:

- `attendance:read`
- `attendance:mark`
- `attendance:update`
- `attendance:correct-locked`
- `attendance:export`

Required rule:

- A user with `attendance:mark` may mark attendance only for assigned projects unless granted organisation-wide access.

## D. Business Workflows

### Daily mark attendance

Starting condition:

- User is authenticated.
- User has active organisation membership.
- User has project access.
- User has `attendance:mark`.

Action:

1. Open project.
2. Select Attendance.
3. Select date, default today.
4. Worker list loads.
5. Mark all present by default, optional.
6. Change exceptions to `HALF_DAY`, `ABSENT`, or `HOLIDAY`.
7. Save.

Validation:

- Attendance is project-scoped.
- A worker must be assigned to the project.
- A user cannot mark attendance for an unassigned project.
- A record is unique per project + worker assignment + date.

Result state:

- An attendance record is created or updated for each worker/date.

Fail paths:

- Missing project access.
- Invalid status.
- Duplicate server-side prevention.

### Correction workflow

- Every correction records actor and previous value.
- Editing old or paid-period attendance may require elevated permission.

## E. Domain Model

Attendance record fields:

- id
- organisation_id
- project_id
- worker_assignment_id
- work_date
- status
- check_in, optional
- check_out, optional
- overtime_hours, deferred unless promoted
- notes, optional
- marked_by
- marked_at
- last_edited_by
- last_edited_at
- sync metadata
- soft-delete metadata where required

Rules:

- Unique active record per project + worker assignment + date.
- Saving the same worker/date updates the record instead of creating a duplicate.
- `PRESENT`, `HALF_DAY`, `ABSENT`, and `HOLIDAY` are the approved MVP statuses.

## F. Shared Application Contract

Shared enums and permissions are declared in `packages/shared`.

Allowed statuses:

- PRESENT
- HALF_DAY
- ABSENT
- HOLIDAY

## G. API Contract

The initial backend module exposes project-scoped reads and writes consistent with these rules.

- GET attendance for a project/date
- POST attendance bulk save
- PATCH attendance update

The API must enforce project and permission scopes before saving.

## H. Mobile Experience

- large touch targets
- one-hand operation
- “mark all present” action
- quick search
- clear unsynced indicator
- never block saving because of no network

## I. Offline And Synchronisation Contract

- Attendance works offline.
- Offline records sync when connectivity returns.
- The system must not block saving due to no network.
- Duplicate attendance is prevented server-side.

## J. Acceptance Criteria

- Attendance can be completed for 50 workers with minimal taps.
- Offline records sync when connectivity returns.
- Duplicate attendance is prevented server-side.
- A user cannot mark attendance for an unassigned project.
