# Work Calendar Module Contract

> Status: approved contract; API implementation is Slice A1.
>
> Source of truth: `docs/tasks/calendar-attendance-exception-model-implementation-plan.md`, especially sections 4, 6, 7, and 8.

## A. Ownership And Scope

Calendar owns expected working and non-working dates. It is separate from Worker Attendance and Wages.

- An Organization configures one usual weekly pattern and timezone.
- Projects inherit that Organization calendar.
- Organization and Project date/date-range overrides are supported.
- Project override wins over Organization override; Organization override wins over weekly pattern.
- Initial override types are `NON_WORKING` and `SPECIAL_WORKING`.
- No weekday, including Sunday, is assumed non-working before configuration.
- No external/public holiday provider or automatic India/state holiday is included.

An Organization-wide closure is an Organization override. A site-specific closure is a Project override. Worker-specific absence remains Attendance.

## B. Data Contract

### Organization working week

`organization_work_calendars` has one row per Organization:

- `id`, `organization_id`, `timezone`;
- Monday through Sunday working booleans;
- `created_by`, `updated_by`, `created_at`, `updated_at`.

Until the row exists, reads return `configured: false`, the Organization timezone, and `workingWeek: null`. The API does not fabricate Sunday or any other weekly off.

### Calendar override

`work_calendar_overrides` fields:

- `id`, `organization_id`, nullable `project_id`;
- inclusive `start_date`, `end_date`;
- `day_type: NON_WORKING | SPECIAL_WORKING`;
- required `name`, optional `reason`, `source: MANUAL`;
- create/update and soft-delete actor/timestamps.

At one scope, active ranges may not overlap. Project ranges may overlap Organization ranges intentionally because Project wins.

## C. Permissions And Authorization

- `work-calendar:read`
- `work-calendar:update-organization`
- `work-calendar:update-project`

Organization Owner, Builder Admin, and Independent Contractor Owner receive all three by default. Project read remains subject to Project access. Project Manager, Builder Supervisor, Contractor Member, and Site Supervisor receive no Organization-calendar update permission by default. Project update is granted only by an approved role template or custom Project permission. Platform Super Admin has no normal customer-calendar permission.

Organization routes require active membership and the Organization permission. Project routes also use `ProjectAccessService` for tenant ownership, Project access, and the effective Project permission.

## D. Shared Schemas

```ts
type WorkCalendarDayType = "NON_WORKING" | "SPECIAL_WORKING";
type WorkCalendarOverrideScope = "ORGANIZATION" | "PROJECT";
type Weekday =
  | "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY"
  | "FRIDAY" | "SATURDAY" | "SUNDAY";

type WorkingWeek = Record<Weekday, boolean>;

type OrganizationWorkCalendar = {
  organizationId: string;
  configured: boolean;
  timezone: string;
  workingWeek: WorkingWeek | null;
  overrides: WorkCalendarOverride[];
  updatedAt: string | null;
};

type UpdateOrganizationWorkCalendarInput = {
  timezone: string;
  workingWeek: WorkingWeek;
};

type WorkCalendarOverride = {
  id: string;
  organizationId: string;
  projectId: string | null;
  scope: WorkCalendarOverrideScope;
  startDate: string;
  endDate: string;
  dayType: WorkCalendarDayType;
  name: string;
  reason: string | null;
  source: "MANUAL";
  createdAt: string;
  updatedAt: string;
};

type CreateWorkCalendarOverrideInput = {
  startDate: string;
  endDate: string;
  dayType: WorkCalendarDayType;
  name: string;
  reason?: string | null;
};

type UpdateWorkCalendarOverrideInput = Partial<CreateWorkCalendarOverrideInput>;

type EffectiveWorkCalendarDay = {
  date: string;
  configured: boolean;
  isWorking: boolean | null;
  dayType: "WORKING" | "NON_WORKING" | "SPECIAL_WORKING" | "UNCONFIGURED";
  source: "PROJECT_OVERRIDE" | "ORGANIZATION_OVERRIDE" | "WEEKLY_PATTERN" | "UNCONFIGURED";
  override: WorkCalendarOverride | null;
};

type EffectiveProjectWorkCalendarResponse = {
  organizationId: string;
  projectId: string;
  timezone: string;
  configured: boolean;
  workingWeek: WorkingWeek | null;
  startDate: string;
  endDate: string;
  organizationOverrides: WorkCalendarOverride[];
  projectOverrides: WorkCalendarOverride[];
  days: EffectiveWorkCalendarDay[];
};
```

## E. Effective-Day Resolution

For each Organization-local date:

1. an active Project override covering the date determines the result;
2. otherwise an active Organization override covering the date determines it;
3. otherwise the configured weekday boolean determines it;
4. without configuration, return `UNCONFIGURED` and `isWorking: null`.

`SPECIAL_WORKING` means working and `NON_WORKING` means non-working. Ranges are inclusive. Date-only enumeration must not use UTC conversion.

## F. API Contract

All JSON endpoints use `{ success, message, data }`.

### Organization weekly calendar

`GET /organizations/:organizationId/work-calendar`

- Permission: `work-calendar:read`.
- Response data: `OrganizationWorkCalendar` including active Organization overrides.

`PATCH /organizations/:organizationId/work-calendar`

- Permission: `work-calendar:update-organization`.
- Body: `UpdateOrganizationWorkCalendarInput` with all seven weekday booleans.
- Response data: `OrganizationWorkCalendar`.
- Upserts the one Organization row transactionally.

### Organization overrides

`POST /organizations/:organizationId/work-calendar/overrides`

- Permission: `work-calendar:update-organization`.
- Body: `CreateWorkCalendarOverrideInput`.
- Response data: `WorkCalendarOverride`.

`PATCH /organizations/:organizationId/work-calendar/overrides/:overrideId`

- Permission: `work-calendar:update-organization`.
- Body: `UpdateWorkCalendarOverrideInput`.
- Response data: `WorkCalendarOverride`.

`DELETE /organizations/:organizationId/work-calendar/overrides/:overrideId`

- Permission: `work-calendar:update-organization`.
- Soft-removes only an Organization-owned override and returns `{ id, removed: true }`.

### Project effective calendar and overrides

`GET /organizations/:organizationId/projects/:projectId/work-calendar?startDate=&endDate=`

- Permission: effective Project `work-calendar:read`.
- Response data: `EffectiveProjectWorkCalendarResponse`.
- Inclusive range is required and bounded to 366 days.

`POST /organizations/:organizationId/projects/:projectId/work-calendar/overrides`

- Permission: effective Project `work-calendar:update-project`.
- Body/response: `CreateWorkCalendarOverrideInput` / `WorkCalendarOverride`.

`PATCH /organizations/:organizationId/projects/:projectId/work-calendar/overrides/:overrideId`

- Permission: effective Project `work-calendar:update-project`.
- Body/response: `UpdateWorkCalendarOverrideInput` / `WorkCalendarOverride`.

`DELETE /organizations/:organizationId/projects/:projectId/work-calendar/overrides/:overrideId`

- Permission: effective Project `work-calendar:update-project`.
- Soft-removes only an override owned by that Organization and Project.

## G. Validation And Errors

- `WORK_CALENDAR_NOT_CONFIGURED`: mutation requiring a working determination cannot proceed.
- `WORK_CALENDAR_TIMEZONE_INVALID`: timezone is not a supported IANA identifier.
- `WORK_CALENDAR_DATE_RANGE_INVALID`: date format/range is invalid.
- `WORK_CALENDAR_PERIOD_TOO_LARGE`: read range exceeds 366 days.
- `WORK_CALENDAR_OVERRIDE_TYPE_INVALID`: unsupported day type.
- `WORK_CALENDAR_OVERRIDE_CONFLICT`: overlapping active range at the same scope.
- `WORK_CALENDAR_OVERRIDE_NOT_FOUND`: tenant/scope-owned override does not exist.

Names are required and trimmed. `endDate >= startDate`. Updates revalidate the complete resulting row. Delete is idempotent only for an existing tenant/scope-owned override.

## H. Acceptance

- unconfigured state is explicit;
- Organization weekly pattern is inherited;
- Organization override wins over weekly pattern;
- Project override wins over Organization override;
- range boundaries are inclusive;
- conflicting same-scope ranges fail transactionally;
- tenant, Project, and permission isolation is enforced;
- no external holiday integration or worker Attendance status is introduced.
