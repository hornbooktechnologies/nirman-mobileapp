# Attendance Module Contract

> Status: approved exception-model contract; API implementation is Slice A1.
>
> Source of truth: `docs/tasks/calendar-attendance-exception-model-implementation-plan.md`, especially sections 4, 6, 7, and 8.
>
> Scope: project-scoped worker absence exceptions and derived period attendance. Calendar owns working/non-working dates; Workers owns assignments and primary-project periods; Wages remains separate.

## A. Module Identity And Boundaries

Attendance answers how an expected Worker differed from the default for a working date. It does not own the working calendar, Project allocation, wage calculation, or daily approval.

For a date to derive as `PRESENT`, all of these must be true:

1. the effective Project calendar says the date is working;
2. the Worker is active for roster purposes;
3. a Worker assignment covers the date;
4. that assignment is the Worker's effective primary Project assignment;
5. no active Attendance exception exists.

No explicit Present row is created. Removing an exception restores derived Present. Secondary Project assignments do not create expected Attendance. Split-day allocation across Projects is deferred.

Included:

- period-based Worker summaries and CSV export;
- `ABSENCE` exceptions with `FULL_DAY` or `HALF_DAY` duration;
- create, update, and soft-remove exception corrections;
- optional reason code and notes;
- historical selected-date roster resolution;
- tenant, Project, and permission enforcement.

Excluded:

- worker-level `HOLIDAY`; Calendar owns non-working dates;
- explicit Present records and daily approval;
- paid leave, check-in/out, overtime, biometric/GPS enforcement;
- offline persistence, queueing, or sync;
- Wages calculation, holiday pay, Kharchi, locking, and financial adjustment.

## B. Domain Contract

### Stored exception

`attendance_exceptions` stores only deviations from derived full-day Present:

- `id`, `organization_id`, `project_id`, `worker_assignment_id`, `work_date`;
- `exception_type`: `ABSENCE`;
- `duration`: `FULL_DAY | HALF_DAY`;
- optional `reason_code` and `notes`;
- `recorded_by`, `recorded_at`, `updated_by`, `updated_at`;
- `deleted_at`, `deleted_by`.

There is at most one active exception for Organization + Project + Worker assignment + date. Corrections retain actor and timestamps. A valid exception date must be working, and the referenced assignment must be the effective primary assignment on that date.

### Derived display states

- `PRESENT`: expected working date with no exception; worked fraction `1`.
- `HALF_DAY`: `ABSENCE + HALF_DAY`; worked fraction `0.5`.
- `ABSENT`: `ABSENCE + FULL_DAY`; worked fraction `0`.
- `NON_WORKING`: Calendar says the date is not working; it is not an absence.

Date-only values are interpreted in the Organization timezone and must not shift through UTC conversion. A requested period is inclusive and may not exceed 366 days.

## C. Permissions And Authorization

Existing permissions remain:

- `attendance:read`
- `attendance:mark`
- `attendance:update`
- `attendance:export`
- `attendance:correct-locked` is reserved and not enforced until Wages locking is approved.

Every route requires an active Organization membership. Project routes additionally require Project access and the matching effective Project permission through `ProjectAccessService`. Platform Super Admin has no normal customer Attendance bypass.

## D. Shared Request And Response Schemas

```ts
type AttendanceExceptionType = "ABSENCE";
type AttendanceDuration = "FULL_DAY" | "HALF_DAY";
type DerivedAttendanceState = "PRESENT" | "HALF_DAY" | "ABSENT" | "NON_WORKING";

type AttendanceException = {
  id: string;
  organizationId: string;
  projectId: string;
  workerAssignmentId: string;
  workDate: string; // YYYY-MM-DD
  exceptionType: AttendanceExceptionType;
  duration: AttendanceDuration;
  reasonCode: string | null;
  notes: string | null;
  recordedBy: string;
  recordedAt: string;
  updatedBy: string;
  updatedAt: string;
};

type CreateAttendanceExceptionInput = {
  workerAssignmentId: string;
  workDate: string;
  exceptionType: "ABSENCE";
  duration: AttendanceDuration;
  reasonCode?: string | null;
  notes?: string | null;
};

type UpdateAttendanceExceptionInput = {
  duration?: AttendanceDuration;
  reasonCode?: string | null;
  notes?: string | null;
};

type AttendanceSummaryQuery = {
  startDate: string;
  endDate: string;
  selectedDate?: string;
  search?: string;
  exceptionsOnly?: boolean;
  page?: number;
  pageSize?: number;
};

type AttendanceSummaryRow = {
  worker: { id: string; workerCode: string; name: string; trade: string };
  workerAssignmentId: string;
  expectedWorkingDays: number;
  presentDays: number; // worked-day equivalent; HALF_DAY contributes 0.5
  absentDays: number;
  selectedDate?: {
    date: string;
    state: DerivedAttendanceState;
    exception: AttendanceException | null;
  };
};

type AttendanceSummaryResponse = {
  organizationId: string;
  projectId: string;
  startDate: string;
  endDate: string;
  rows: AttendanceSummaryRow[];
  totals: {
    workers: number;
    expectedWorkingDays: number;
    presentDays: number;
    absentDays: number;
  };
  meta: { page: number; pageSize: number; total: number; totalPages: number };
};

type WorkerAttendancePeriodResponse = {
  organizationId: string;
  projectId: string;
  workerId: string;
  startDate: string;
  endDate: string;
  totals: {
    expectedWorkingDays: number;
    presentDays: number;
    absentDays: number;
  };
  exceptions: AttendanceException[];
};
```

Summary arithmetic uses day equivalents rather than a separate Half Day column:

- Full Present contributes `1` to `presentDays` and `0` to `absentDays`.
- `ABSENCE + HALF_DAY` contributes `0.5` to both `presentDays` and `absentDays`.
- `ABSENCE + FULL_DAY` contributes `0` to `presentDays` and `1` to `absentDays`.
- Therefore `presentDays + absentDays = expectedWorkingDays` for every row and total.

## E. API Contract

All JSON endpoints use the standard `{ success, message, data }` envelope.

### Period summary

`GET /organizations/:organizationId/projects/:projectId/attendance/summary?startDate=&endDate=&selectedDate=&search=&exceptionsOnly=&page=&pageSize=`

- Permission: `attendance:read`.
- Response data: `AttendanceSummaryResponse`.
- The roster is resolved against the requested dates, never `CURRENT_DATE()`.
- With `selectedDate`, rows include date state/exception detail and Workers whose primary assignment covers that historical date.

### Worker period detail

`GET /organizations/:organizationId/projects/:projectId/attendance/workers/:workerId?startDate=&endDate=`

- Permission: `attendance:read`.
- Response data: `WorkerAttendancePeriodResponse`.
- Totals use the same derived day-equivalent arithmetic as the period summary.
- `exceptions` contains the Worker’s dated Full Day/Half Day absence details for the selected Project and period, newest first.

### Create exception

`POST /organizations/:organizationId/projects/:projectId/attendance/exceptions`

- Permission: `attendance:mark`.
- Body: `CreateAttendanceExceptionInput`.
- Response data: `AttendanceException`.
- Repeating an identical active exception returns that exception; a different active value is `ATTENDANCE_EXCEPTION_DUPLICATE` and must be updated explicitly.

### Update exception

`PATCH /organizations/:organizationId/projects/:projectId/attendance/exceptions/:exceptionId`

- Permission: `attendance:update`.
- Body: `UpdateAttendanceExceptionInput`.
- Response data: `AttendanceException`.

### Remove exception

`DELETE /organizations/:organizationId/projects/:projectId/attendance/exceptions/:exceptionId`

- Permission: `attendance:update`.
- Soft-removes the active exception and returns `{ id, removed: true, restoredState: "PRESENT" }`.
- Repeating removal is idempotent when the tenant/Project-owned row exists.

### Period export

`GET /organizations/:organizationId/projects/:projectId/attendance/export?startDate=&endDate=`

- Permission: `attendance:export`.
- Returns CSV containing worker identity, assignment, date, expected-working flag, derived state, worked fraction, and optional exception reason/notes.

## F. Sequential Client Compatibility

The legacy endpoints remain temporarily while Web and Mobile migrate:

- `GET .../attendance?date=` returns compatibility records derived for the selected date.
- `POST .../attendance` accepts the legacy bulk shape only as an adapter:
  - `PRESENT` removes an active exception;
  - `ABSENT` creates/updates `ABSENCE + FULL_DAY`;
  - `HALF_DAY` creates/updates `ABSENCE + HALF_DAY`.
- `PATCH .../attendance/:attendanceId` updates a migrated exception when safely identifiable.

Legacy `HOLIDAY`, check-in/out, overtime, sync claims, and offline success cannot be safely translated and return `ATTENDANCE_LEGACY_INPUT_UNSUPPORTED`. Compatibility exports are deprecated and are removed only after both clients migrate.

Legacy `attendance_records` remains read-only history. Unambiguous legacy `ABSENT` and `HALF_DAY` rows may be converted by the forward migration; `PRESENT` creates no exception; `HOLIDAY` requires owner review.

## G. Stable Errors

- `ATTENDANCE_PERIOD_INVALID`
- `ATTENDANCE_PERIOD_TOO_LARGE`
- `ATTENDANCE_EXCEPTION_TYPE_INVALID`
- `ATTENDANCE_EXCEPTION_DURATION_INVALID`
- `ATTENDANCE_EXCEPTION_DUPLICATE`
- `ATTENDANCE_EXCEPTION_NOT_FOUND`
- `ATTENDANCE_NON_WORKING_DATE`
- `ATTENDANCE_PRIMARY_PROJECT_REQUIRED`
- `ATTENDANCE_WORKER_NOT_ASSIGNED`
- `ATTENDANCE_LEGACY_INPUT_UNSUPPORTED`

Organization, Project, membership, and permission failures use the established stable access errors.

## H. Client Flow Contract

Attendance clients separate three questions:

1. Period summary: “How many expected, present, and absent days does each Worker have?”
2. Daily marking: “Who was absent or half day on this date?”
3. Worker history: “On which exact dates was this Worker absent or half day, and why?”

The period summary must not require a selected Attendance date and must not become a full-roster edit form. Daily marking shows the historical-date roster with derived Present and writes only absence exceptions. Worker history uses the worker-period endpoint for totals and dated exception details.

Web implements these as `/attendance`, `/attendance/mark`, and the existing Worker detail Attendance tab. Mobile Slice C2 will align `/(app)/attendance` and add separate daily-marking and Worker-history routes as specified in `docs/tasks/mobile-attendance-ux-alignment-plan.md`.

## I. Wages Safety And Acceptance

Existing wage batches, items, payments, and exports remain readable. Wages preview and batch generation now consume Calendar, primary periods, and derived Attendance exceptions through the internal Attendance calculation read. They must not query legacy explicit Attendance records.

Acceptance requires:

- no explicit Present rows are created;
- Calendar precedence and primary assignment determine expectation;
- non-working dates do not become absences;
- Full Day/Half Day/remove behavior derives correctly;
- historical roster, tenant, Project, and permission isolation are covered;
- no offline-save success or Wages correctness is claimed by this slice.
