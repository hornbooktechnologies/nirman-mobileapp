# Workers Module Contract

> Status: approved.
>
> Module path: `docs/modules/construction/workers`
>
> Implementation status: partial; independent MVP source is implemented and automated static/API checks pass, but active-assignment handling during worker deactivation requires an owner decision.
>
> Contract standard: `docs/modules/MODULE_CONTRACT_STANDARD.md`

## A. Module Identity

Module name: Workers / Labour Management.

Business purpose: create reusable worker records for an organization and assign them to projects so field teams can later mark attendance, generate wages, record Kharchi, and produce labour reports.

Target users:

- Builder Owner
- Independent Contractor Owner
- Contractor working under a Builder
- Site Supervisor
- Builder Admin or Project Manager

Business value:

- Replaces paper worker registers.
- Prevents duplicate labour records across projects.
- Makes attendance, wages, Kharchi, and reports depend on stable worker assignments.
- Keeps workers separate from app users and login accounts.

Included MVP scope:

- Organization-level worker master.
- Project-level worker assignment.
- System-generated organization-scoped worker code.
- Daily-rate capture on the Worker master, copied automatically into each new assignment as an interim Workers MVP snapshot.
- Worker activation/deactivation.
- Organization-owner permanent deletion with explicit destructive confirmation.
- Assignment start/end dates.
- Duplicate warning by similar name/mobile.
- Project-filtered worker list.
- Web admin management.
- Mobile field creation and project roster.
- Shared permissions, statuses, inputs, responses, filters, and errors.
- Audit-ready events for create/update/deactivate/assignment changes.
- Offline read-only Workers MVP behavior where existing repository infrastructure supports cached data.

Excluded or deferred:

- Worker app login.
- Employee payroll.
- Contractor/agency company ledger.
- Biometric, face recognition, GPS/geofence enforcement.
- Worker document upload unless file/media ownership is approved.
- Bulk worker import unless product owner promotes it.
- Full wage calculation, wage payments, and Kharchi deduction logic.
- Effective-dated wage-rate history entity; this must be introduced before or during the Wages module.
- Offline worker create, edit, assign, deactivate, and rate-change writes.

Dependencies:

- Identity Access foundation.
- Organization membership.
- Project setup and assignment.
- Foundation permissions seed.
- API-local mysql2 repository architecture.
- Mobile active project context.

Downstream modules:

- Attendance.
- Wages.
- Kharchi.
- Expenses and materials where labour cost references are needed.
- Reports and dashboards.
- Offline sync foundation.

## B. Domain Terminology

System user: a person with login credentials in the `user` table. System users may be owners, admins, supervisors, contractors, sales users, or support users.

Worker or labourer: a managed labour record. A worker does not log in and is not a `user`.

Employee: a future HR/payroll concept. Not part of this Workers module unless a later contract creates employee management.

Contractor: a system user or organization profile responsible for site operations. A contractor may create/manage workers if permitted.

Agency or subcontractor: a future supplier/labour-provider entity. Not represented in this module except an optional text field can be deferred for later.

Worker master: the organization-level record for a real worker.

Worker code: a system-generated, organization-scoped, immutable code used for search, reports, and future Attendance, Wages, and Kharchi references. It is not supplied by the client.

Worker project assignment: the project-level link that says a worker is active on a specific project during a date range. The standard assignment flow inherits the Worker trade and base daily rate instead of asking for duplicate values.

Employment status: worker master lifecycle status, currently `ACTIVE` or `INACTIVE`.

Assignment status: project assignment lifecycle status, currently `ACTIVE` or `ENDED`.

Attendance status: downstream Attendance values, not owned by this module.

Payment status: downstream Wages/Kharchi values, not owned by this module.

## C. Actors And Permissions

Permission keys:

- `workers:read`
- `workers:create`
- `workers:update`
- `workers:deactivate`
- `workers:delete`
- `workers:assign-project`
- `workers:update-rate`
- `workers:export`

Builder Owner:

- Can view and manage workers across owned organization projects when role grants permissions and project scope allows it.
- Can create worker masters and assignments.
- Can update assignment rates before attendance exists.
- Can update assignment rates after attendance exists only when role grants `workers:update-rate`.
- Can deactivate workers if no blocking rule prevents it.
- Can permanently delete a worker and all directly related records when granted organization-wide `workers:delete`.
- Can export worker list if granted `workers:export`.

Independent Contractor Owner:

- Can manage workers for own organization and projects.
- No Builder approval is required for worker creation.

Contractor under Builder:

- Can view and manage workers only for assigned Builder projects unless organization-wide access is granted.
- Cannot view workers from unrelated projects.
- Can create, update, or assign workers only when explicit role permissions and project access both allow it.
- Does not receive create, update, assign, deactivate, update-rate, or export rights automatically.

Site Supervisor:

- Can view project worker list.
- Can create and edit permitted worker details for assigned projects when granted `workers:create` and `workers:update`.
- Can assign workers only when granted `workers:assign-project`.
- Cannot deactivate or export by default.
- Can change rates only with explicit `workers:update-rate`.
- Cannot export unless explicitly granted.

Sales User:

- No worker access by default.

Custom roles:

- Follow permission keys and project access scope.

Platform Support:

- Follows the established platform support/access policy.
- Must not be treated as a normal Workers module actor.
- Must not receive `workers:*` permissions by default.
- May access tenant worker data only through an explicitly approved, scoped, audited support policy.

Default role grants:

| Role/profile                                                      | Default permissions                                                                                                                                                                     | Scope                                                                                                            |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Organization Owner / Builder Admin / Independent Contractor Owner | `workers:read`, `workers:create`, `workers:update`, `workers:assign-project`, `workers:update-rate`, `workers:deactivate`, `workers:delete`, `workers:export` where granted by organization role template | Own organization; permanent deletion requires organization-wide access                                          |
| Supervisor                                                        | `workers:read`, `workers:create`, `workers:update`                                                                                                                                      | Assigned projects only; no default export, deactivation, or elevated rate changes                                |
| Contractor                                                        | `workers:read`                                                                                                                                                                          | Assigned projects only; create, update, assign, update-rate, deactivate, and export require explicit role grants |
| Sales User                                                        | none                                                                                                                                                                                    | No Workers access by default                                                                                     |
| Platform Super Admin / Platform Support                           | none as normal operational access                                                                                                                                                       | Support access must be separately approved, scoped, and audited                                                  |

## D. Business Workflows

### Create Worker And Assign To Current Project

Starting condition:

- Actor is authenticated.
- Actor has active organization membership.
- Actor has active project access or organization-wide project access.
- Actor has `workers:create` and `workers:assign-project`.

Action:

- User opens current project worker list.
- User enters name, trade/type, optional mobile number, optional notes, optional base daily rate, and assignment start date.
- System checks for similar existing workers in the organization.
- If no confirmed existing worker is selected, system creates a worker master.
- System generates a unique immutable `worker_code` inside the organization.
- System creates a project assignment for the current project.

Validation:

- Name is required.
- Trade/type is required for MVP.
- Mobile number is optional but must be normalized if provided.
- Worker code is generated server-side, unique within organization, immutable, and ignored/rejected if supplied by the client.
- Daily rate is optional at creation, but must be present before wage generation.
- Start date cannot be after end date.
- Project must belong to active organization.
- Actor must have project access.

Resulting state:

- Worker master is `ACTIVE`.
- Project assignment is `ACTIVE`.

Notifications:

- None in MVP unless assignment was created by a user requiring review; no such review rule is currently approved.

Audit event:

- `workers.created`
- `worker-project-assignments.created`

Failure paths:

- Forbidden when actor lacks permission or project access.
- Conflict/warning when similar worker exists.
- Bad request for invalid date or daily rate.

Reversal/correction:

- Edit worker details with `workers:update`.
- End assignment instead of deleting it.
- Deactivate worker only when historical data remains preserved.

Offline behavior:

- Workers MVP does not allow offline writes.
- Cached/synced workers may be viewed offline where existing repository infrastructure supports it.
- Create, edit, assign, deactivate, and rate-change actions require connectivity and must be disabled offline with a clear user-facing message.

Concurrency:

- Server prevents duplicate assignment for active worker/project pair.
- Duplicate create uses normalized mobile where supported and name similarity warnings.
- Duplicate organization-scoped mobile numbers and probable duplicate names are warning-only; users may continue after acknowledging the warning.
- Worker name is never used as a unique identifier.

### Assign Existing Worker To Project

Starting condition:

- Worker exists in same organization and is `ACTIVE`.
- Project exists and actor can access it.

Action:

- Actor selects an existing worker from the Project Team table and creates an assignment with a start date.
- The assignment automatically snapshots the Worker's base daily rate; the Worker trade remains the displayed work type.
- The standard assignment flow does not ask for a separate Project role or daily rate.

Validation:

- Worker organization must match project organization.
- Worker must be active.
- Assignment date range must be valid.
- No duplicate active assignment for same worker and project.

Result:

- Assignment is `ACTIVE`.

Audit event:

- `worker-project-assignments.created`

### Update Worker Master

Starting condition:

- Actor has `workers:update`.

Action:

- Actor edits name, trade/type, base daily rate, mobile number, or notes.

Validation:

- Name remains required.
- Changes must stay inside same organization.
- System warns about duplicate name/mobile combinations.

Result:

- Worker details update.
- Existing attendance/wage history remains linked by worker id.

Audit event:

- `workers.updated`

### Update Project Assignment

Starting condition:

- Actor has `workers:assign-project` and project access.

Action:

- Actor edits the assignment start date or end date. Legacy role labels remain readable for historical rows but are not collected by the standard UI.

Validation:

- Start date cannot be after end date.
- Daily-rate changes use the separate rate-change workflow.

Result:

- Assignment details update.

Audit event:

- `worker-project-assignments.updated`

### Update Assignment Daily Rate

Starting condition:

- Actor has `workers:assign-project` before attendance exists for the assignment.
- Actor has `workers:update-rate` after attendance exists for the assignment.
- Actor has project access.

Action:

- Actor changes assignment daily rate and supplies an effective date.

Validation:

- Daily rate must be non-negative and should be greater than zero if set.
- Effective date is required for every rate change.
- Effective date must be inside or after the assignment start date.
- The system must not silently reinterpret past attendance, wages, Kharchi, or reports.
- Before Attendance exists, the current assignment `daily_rate` may be updated by authorized users.
- After Attendance exists, rate change requires elevated `workers:update-rate`.

Result:

- Workers MVP updates the assignment's current `daily_rate` and records an audit event.
- A complete effective-dated rate-history entity remains owned by the Wages domain and must be introduced before or during Wages implementation.

Audit event:

- `worker-project-assignments.rate-updated`

### End Project Assignment

Starting condition:

- Actor has `workers:assign-project`.

Action:

- Actor ends a worker's assignment on a project.

Validation:

- Assignment must be active.
- End date cannot be before start date.

Result:

- Assignment status becomes `ENDED`.
- Worker remains active at organization level.
- Historical attendance and wage links remain.

Audit event:

- `worker-project-assignments.ended`

### Deactivate Worker

Starting condition:

- Actor has `workers:deactivate`.

Action:

- Actor deactivates worker at organization level.

Validation:

- Worker belongs to same organization.
- Historical records must not be deleted.
- Open active assignments should be ended or blocked by explicit confirmation.
- Downstream financial modules may later add restrictions for unsettled balances.

Owner decision gate:

- The approved contract does not yet select whether deactivation blocks, atomically ends active assignments after confirmation, or leaves them active while the inactive worker is excluded from active rosters.
- Current source preserves active assignment rows and filters inactive workers from the default active roster. This is documented behavior, not an approved lifecycle decision.
- Do not mark Workers verified until one rule is approved and implemented consistently in API and web.

Result:

- Worker status becomes `INACTIVE`.
- Worker is hidden from normal active rosters.
- History remains visible in attendance/wage reports.

Audit event:

- `workers.deactivated`

### Permanently Delete Worker

Starting condition:

- Actor has organization-wide `workers:delete`.
- Worker belongs to the actor's active organization.

Action:

- Actor selects **Delete Permanently** on the Web Worker detail page.
- System displays an irreversible-action warning naming the Worker and every category of related data that will be erased.
- Actor explicitly confirms deletion.

Result:

- One transaction deletes Wage payments, Wage items, now-empty Wage batches, Attendance exceptions, legacy Attendance records, primary-Project periods, Project assignments, and the Worker.
- A shared Wage batch remains when it still contains another Worker's Wage item.
- The deleted Worker and history cannot be restored.

Failure paths:

- Forbidden without organization-wide `workers:delete`.
- Not found for a cross-organization or missing Worker identifier.
- Any database failure rolls back the entire deletion.

## E. Domain Model

### Entity: Worker

Purpose: organization-level labour master.

Proposed SQL table: `workers`.

Fields:

| Field               | Type          | Required | Default           | Notes                                                                                   |
| ------------------- | ------------- | -------- | ----------------- | --------------------------------------------------------------------------------------- |
| `id`                | varchar(36)   | yes      | generated UUID    | Primary key                                                                             |
| `organization_id`   | varchar(36)   | yes      | none              | Tenant key, FK to `organizations.id`                                                    |
| `worker_code`       | varchar(40)   | yes      | generated         | Organization-scoped immutable worker code; not client supplied                          |
| `name`              | varchar(160)  | yes      | none              | Display name                                                                            |
| `trade`             | varchar(80)   | yes      | none              | Mason, helper, electrician, plumber, etc.                                               |
| `base_daily_rate`   | decimal(12,2) | no       | null              | Worker-level default copied into new Project assignments                                |
| `mobile_number`     | varchar(20)   | no       | null              | Normalized Indian mobile where possible                                                 |
| `notes`             | text          | no       | null              | Internal note                                                                           |
| `status`            | varchar(32)   | yes      | `ACTIVE`          | `ACTIVE`, `INACTIVE`                                                                    |
| `created_by`        | varchar(36)   | no       | null              | FK to inherited `user.id`                                                               |
| `updated_by`        | varchar(36)   | no       | null              | FK to inherited `user.id`                                                               |
| `created_at`        | datetime(3)   | yes      | current timestamp |                                                                                         |
| `updated_at`        | datetime(3)   | yes      | current timestamp | on update                                                                               |
| `deactivated_at`    | datetime(3)   | no       | null              | Set on deactivation                                                                     |
| `deactivated_by`    | varchar(36)   | no       | null              | FK to inherited `user.id`                                                               |
| `client_created_id` | varchar(80)   | no       | null              | Reserved for future offline write architecture; not used for Workers MVP offline writes |

Uniqueness:

- Primary key `id`.
- Unique `(organization_id, worker_code)`.
- Do not add a unique constraint on `(organization_id, mobile_number)` in MVP.
- Add indexes for `(organization_id, status)`, `(organization_id, worker_code)`, `(organization_id, name)`, and `(organization_id, mobile_number)`.

Retention:

- Deactivation retains Attendance and Wage history.
- Explicit owner-confirmed permanent deletion removes the Worker and every current directly related record transactionally.

### Entity: Worker Project Assignment

Purpose: project-specific worker roster and rate context.

Proposed SQL table: `worker_project_assignments`.

Fields:

| Field               | Type          | Required | Default           | Notes                                                                                              |
| ------------------- | ------------- | -------- | ----------------- | -------------------------------------------------------------------------------------------------- |
| `id`                | varchar(36)   | yes      | generated UUID    | Primary key                                                                                        |
| `organization_id`   | varchar(36)   | yes      | none              | Tenant key                                                                                         |
| `project_id`        | varchar(36)   | yes      | none              | FK to `projects.id` with organization pairing                                                      |
| `worker_id`         | varchar(36)   | yes      | none              | FK to `workers.id`                                                                                 |
| `role_label`        | varchar(120)  | no       | null              | Legacy site-specific label; not collected by the standard assignment UI                            |
| `daily_rate`        | decimal(12,2) | no       | null              | Snapshot of Worker base daily rate when assigned; retained for assignment history and future Wages |
| `status`            | varchar(32)   | yes      | `ACTIVE`          | `ACTIVE`, `ENDED`                                                                                  |
| `starts_on`         | date          | yes      | current date      | Assignment start                                                                                   |
| `ends_on`           | date          | no       | null              | Assignment end                                                                                     |
| `created_by`        | varchar(36)   | no       | null              | FK to inherited `user.id`                                                                          |
| `updated_by`        | varchar(36)   | no       | null              | FK to inherited `user.id`                                                                          |
| `created_at`        | datetime(3)   | yes      | current timestamp |                                                                                                    |
| `updated_at`        | datetime(3)   | yes      | current timestamp | on update                                                                                          |
| `ended_at`          | datetime(3)   | no       | null              | Set when ended                                                                                     |
| `ended_by`          | varchar(36)   | no       | null              | FK to inherited `user.id`                                                                          |
| `client_created_id` | varchar(80)   | no       | null              | Reserved for future offline write architecture; not used for Workers MVP offline writes            |

Uniqueness:

- Prevent more than one active assignment for the same `project_id` and `worker_id`.
- MySQL partial unique index support is version-sensitive, so implement duplicate active assignment protection in service/repository transaction unless target DB supports a safe generated-column strategy.

Indexes:

- `(organization_id, project_id, status)`
- `(organization_id, worker_id, status)`
- `(project_id, worker_id)`
- `(organization_id, worker_code)` on `workers`.
- `(organization_id, client_created_id)` only if a future offline write architecture implements queued creates.

Retention:

- End assignment to preserve history during normal operation.
- Organization-owner permanent Worker deletion removes related assignments as part of the same transaction.

### Entity: Worker Primary Project Period

Purpose: preserve the one effective primary Project assignment used by default Attendance for each Worker/date. This is a Workers allocation extension, not Calendar ownership.

SQL table: `worker_primary_project_periods`.

Fields: `id`, `organization_id`, `worker_id`, `worker_assignment_id`, `starts_on`, nullable `ends_on`, create/update actor and timestamps, and `ended_by`/`ended_at`.

Rules:

- A Worker may have overlapping assignments to multiple Projects.
- Primary periods for the same Organization/Worker may not overlap, including open-ended periods.
- The referenced assignment must belong to the same Organization/Worker and cover the complete primary period.
- Creation/update uses a transaction and locks the Worker's relevant period rows before overlap validation.
- History is changed only through effective-dated update/end operations; no mutable assignment `is_primary` flag is introduced.
- Split-day Project allocation is deferred.

## F. Shared Application Contract

Add to `packages/shared` during implementation:

Enums:

- `WorkerStatus = ACTIVE | INACTIVE`
- `WorkerAssignmentStatus = ACTIVE | ENDED`
- `WorkerSortKey = name | trade | status | created_at | updated_at`

Constants:

- `WORKER_PERMISSIONS`
- worker error codes
- default filters and page sizes

Inputs:

- `CreateWorkerInput`
- `UpdateWorkerInput`
- `AssignWorkerToProjectInput`
- `UpdateWorkerProjectAssignmentInput`
- `UpdateWorkerAssignmentRateInput`
- `DeactivateWorkerInput`
- `EndWorkerProjectAssignmentInput`
- `WorkerListFilter`

Responses:

- `WorkerSummary`
- `WorkerDetail`
- `WorkerProjectAssignmentSummary`
- `WorkerPrimaryProjectPeriod`
- `CreateWorkerPrimaryProjectPeriodInput`
- `UpdateWorkerPrimaryProjectPeriodInput`
- `EndWorkerPrimaryProjectPeriodInput`
- `ProjectWorkerRosterItem`
- `WorkerListResponse`
- `ProjectWorkerRosterResponse`

Error codes:

- `WORKER_NOT_FOUND`
- `WORKER_FORBIDDEN`
- `WORKER_DUPLICATE_WARNING`
- `WORKER_INACTIVE`
- `WORKER_ASSIGNMENT_NOT_FOUND`
- `WORKER_ASSIGNMENT_DUPLICATE`
- `WORKER_ASSIGNMENT_INVALID_DATES`
- `WORKER_DAILY_RATE_INVALID`
- `WORKER_RATE_CHANGE_EFFECTIVE_DATE_REQUIRED`
- `WORKER_RATE_CHANGE_ELEVATED_PERMISSION_REQUIRED`
- `WORKER_HAS_HISTORY`
- `WORKER_PROJECT_ACCESS_REQUIRED`
- `WORKER_PRIMARY_PERIOD_NOT_FOUND`
- `WORKER_PRIMARY_PERIOD_OVERLAP`
- `WORKER_PRIMARY_PERIOD_OUTSIDE_ASSIGNMENT`
- `WORKER_PRIMARY_PERIOD_PROJECT_ACCESS_REQUIRED`

State commands:

- `deactivateWorker`
- `assignWorkerToProject`
- `updateWorkerProjectAssignment`
- `updateWorkerAssignmentRate`
- `endWorkerProjectAssignment`
- `createWorkerPrimaryProjectPeriod`
- `updateWorkerPrimaryProjectPeriod`
- `endWorkerPrimaryProjectPeriod`

## G. API Contract

All routes are under `/api/v1`.

### List Organization Workers

- Method: `GET`
- Route: `/organizations/:organizationId/workers`
- Permission: `workers:read`
- Query: `search`, `status`, `trade`, `projectId`, `page`, `limit`, `sortBy`, `sortOrder`
- Response: paginated worker summaries.
- Tenant enforcement: active organization membership required.
- Project enforcement: if `projectId` is present, actor must have access to that project unless organization-wide.

### Create Worker

- Method: `POST`
- Route: `/organizations/:organizationId/workers`
- Permission: `workers:create`
- Body: `CreateWorkerInput`
- Response: worker detail including generated `workerCode`, plus duplicate warnings.
- Idempotency: future offline write architecture may add `Idempotency-Key` or body `clientCreatedId`; Workers MVP online create does not select a sync library solely for Workers.

### Get Worker Detail

- Method: `GET`
- Route: `/organizations/:organizationId/workers/:workerId`
- Permission: `workers:read`
- Response: worker detail plus project assignments.

### Update Worker

- Method: `PATCH`
- Route: `/organizations/:organizationId/workers/:workerId`
- Permission: `workers:update`
- Body: `UpdateWorkerInput`
- Response: updated worker detail.
- Audit: `workers.updated`.

### Deactivate Worker

- Method: `POST`
- Route: `/organizations/:organizationId/workers/:workerId/deactivate`
- Permission: `workers:deactivate`
- Body: optional reason.
- Response: updated worker detail.
- Audit: `workers.deactivated`.

### Permanently Delete Worker

- Method: `DELETE`
- Route: `/organizations/:organizationId/workers/:workerId`
- Permission: organization-wide `workers:delete`
- Response: deleted Worker identity plus per-table deletion counts.
- Transaction order protects foreign-key dependencies and rolls back on any failure.

### List Project Workers

- Method: `GET`
- Route: `/organizations/:organizationId/projects/:projectId/workers`
- Permission: `workers:read`
- Response: project roster.
- Project enforcement: `resolveProjectAccess` with `workers:read`.

### Assign Worker To Project

- Method: `PUT`
- Route: `/organizations/:organizationId/projects/:projectId/workers/:workerId`
- Permission: `workers:assign-project`
- Body: `AssignWorkerToProjectInput`
- Response: assignment summary.
- Conflict: duplicate active assignment returns conflict.
- Audit: `worker-project-assignments.created`.

### Update Worker Project Assignment

- Method: `PATCH`
- Route: `/organizations/:organizationId/projects/:projectId/workers/:workerId/assignment`
- Permission: `workers:assign-project`
- Body: `UpdateWorkerProjectAssignmentInput`
- Response: assignment summary.
- Audit: `worker-project-assignments.updated`.

### Update Worker Assignment Rate

- Method: `POST`
- Route: `/organizations/:organizationId/projects/:projectId/workers/:workerId/assignment/rate-change`
- Permission: `workers:assign-project` before attendance exists; `workers:update-rate` after attendance exists.
- Body: new daily rate, effective date, optional reason.
- Response: assignment summary.
- Audit: `worker-project-assignments.rate-updated`.
- Financial rule: must not silently rewrite historical attendance or financial meaning.

### End Worker Project Assignment

- Method: `POST`
- Route: `/organizations/:organizationId/projects/:projectId/workers/:workerId/end-assignment`
- Permission: `workers:assign-project`
- Body: end date and optional reason.
- Response: assignment summary.
- Audit: `worker-project-assignments.ended`.

### Duplicate Search

- Method: `GET`
- Route: `/organizations/:organizationId/workers/duplicate-candidates`
- Permission: `workers:create`
- Query: `name`, `mobileNumber`
- Response: similar existing workers.

### Primary Project Periods

- `GET /organizations/:organizationId/workers/:workerId/primary-project-periods`
  - Permission: `workers:read`; response is `WorkerPrimaryProjectPeriod[]`.
  - Non-Organization-wide users may see periods only when they can access the referenced Projects.
- `POST /organizations/:organizationId/workers/:workerId/primary-project-periods`
  - Permission: `workers:assign-project` plus access to the assignment's Project.
  - Body: `{ workerAssignmentId, startsOn, endsOn? }`.
  - Response: `WorkerPrimaryProjectPeriod`.
- `PATCH /organizations/:organizationId/workers/:workerId/primary-project-periods/:periodId`
  - Permission: `workers:assign-project` plus access to both the existing and resulting assignment Projects.
  - Body: `{ workerAssignmentId?, startsOn?, endsOn? }`.
  - Response: `WorkerPrimaryProjectPeriod`.
- `POST /organizations/:organizationId/workers/:workerId/primary-project-periods/:periodId/end`
  - Permission: `workers:assign-project` plus access to the referenced Project.
  - Body: `{ endsOn }`.
  - Response: `WorkerPrimaryProjectPeriod` with end actor/time retained.

Stable failures are `WORKER_PRIMARY_PERIOD_NOT_FOUND`, `WORKER_PRIMARY_PERIOD_OVERLAP`, `WORKER_PRIMARY_PERIOD_OUTSIDE_ASSIGNMENT`, and `WORKER_PRIMARY_PERIOD_PROJECT_ACCESS_REQUIRED`.

## H. Web-Admin Experience

Routes:

- `/workers`
- `/workers/new`
- `/workers/[id]`
- `/projects/[id]` should include a Workers panel or tab.

List screen:

- Search by name/mobile.
- Search by worker code/name/mobile.
- Filter by organization, project, status, trade.
- Sort by name, trade, status, created date.
- Paginated table using established web table patterns.
- Actions: view, edit, deactivate, permanently delete, assign to project, and export where permitted.

Detail screen:

- Worker profile summary.
- Active and historical project assignments.
- Future placeholders for attendance, wages, Kharchi history.
- Deactivate action with confirmation.
- Organization-owner **Delete Permanently** action with a destructive warning listing all related records that will be erased.

Create/edit:

- Name, trade, mobile, notes.
- Worker code displayed as read-only after create.
- Optional assignment-to-project section.
- Daily rate and start date when assigning.
- Duplicate warning panel before final save.

States:

- Loading skeleton or state component.
- Empty state with create action when permitted.
- Forbidden state when missing `workers:read`.
- Conflict warning for duplicate assignment.
- Responsive layout should remain usable on tablet, but desktop web may use tables.

Dashboard/reporting:

- Project worker count card can be added after API summary endpoint exists.
- Worker export is optional for first slice but contract reserves `workers:export`.

## I. Mobile Experience

Role availability:

- Builder Owner, Independent Contractor Owner, Contractor, and Supervisor when project access and permissions allow.
- Sales users do not see Workers by default.
- Platform-only users do not see Workers in mobile.

Navigation:

- Project dashboard quick action: Workers.
- Project detail screen entry: Workers.

List/cards:

- Card-first roster, not dense tables.
- Show name, trade, daily rate if available, assignment status, and sync status.
- Search/filter should be simple and thumb-friendly.

Forms:

- One-handed create flow.
- Large inputs and buttons.
- Required fields first: name, trade.
- Trade input may suggest Mason, Helper, Carpenter, Plumber, Electrician, and Painter, but must allow custom values.
- Optional mobile and notes.
- Worker code is shown after sync/server create, not entered by the user.
- Assignment daily rate can be captured inline when adding to current project.

Offline states:

- Cached/synced workers may be viewed offline where existing repository infrastructure supports it.
- Create, edit, assign, deactivate, and rate-change actions require connectivity.
- Offline write actions are disabled with a clear user-facing message.
- Do not select or introduce a sync library solely for Workers.

Field usability:

- Minimum 44px touch targets.
- Avoid multi-column forms.
- Avoid web tables.
- Designed for low-end Android and poor connectivity.

## J. Offline And Synchronisation Contract

Offline-readable data:

- Current active project roster.
- Recently viewed worker details.
- Worker trade/status labels.

Offline actions:

- Create worker and assign to active project: online only in Workers MVP.
- Update worker or assignment: online only in Workers MVP.
- Deactivate worker: online only in Workers MVP.
- Rate changes: online only in Workers MVP.
- Attendance and the broader offline-sync architecture determine the final mobile write strategy.

Local identifiers:

- `clientCreatedId` and `clientAssignmentId` are reserved for a future offline write architecture, not used for Workers MVP writes.

Queued mutation:

- No queued worker write mutation is implemented for Workers MVP.

Duplicate prevention:

- Server checks duplicate active assignment.
- Server returns warning-only duplicate candidates for normalized mobile and probable duplicate names.

Conflict resolution:

- Exact duplicate active assignment: server returns conflict or existing assignment according to API envelope convention.
- Similar worker name/mobile: server returns warning candidates; user may acknowledge and continue.
- Server-authoritative fields: ids, worker code, organization id, project id, status, timestamps, created_by, updated_by.

Deleted/inactive handling:

- Inactive workers cannot receive new assignments.
- Ended assignments and inactive workers remain visible in history.

Attachment behavior:

- Worker attachments are deferred.

## K. Notifications

No worker notification is required for MVP by default.

Reserved future notifications:

- Worker assigned to project, if assignee notification is later useful.
- Worker duplicate conflict needs attention, if offline sync queue is implemented.

MVP delivery:

- In-app notification support is deferred until Notifications Foundation.

## L. Audit Events

Required audit event names:

- `workers.created`
- `workers.updated`
- `workers.deactivated`
- `worker-project-assignments.created`
- `worker-project-assignments.updated`
- `worker-project-assignments.rate-updated`
- `worker-project-assignments.ended`

Audit payload:

- actor user id
- organization id
- project id when assignment-related
- entity id
- old values for updates/deactivation/end assignment
- new values
- metadata such as source `web`, `mobile`, or `sync`
- IP/device context if available from shared audit helper

Current repository gap:

- Active audit helper/table is missing. Implementation plan must either add a minimal audit foundation slice or explicitly create audit-ready service hooks without claiming persisted audit.

## M. Validation And Business Rules

- Worker name is required.
- Trade is required for MVP field usability.
- Trade is free text for MVP; UI may provide common suggestions but must allow custom values.
- Mobile number is optional.
- Mobile number is normalized before duplicate comparison where supported.
- Duplicate organization-scoped mobile numbers produce warnings, not hard validation failures.
- Probable duplicate names produce warnings, not hard validation failures.
- Users may continue after acknowledging duplicate warnings.
- Worker name is not unique and must not be used as a unique identifier.
- Worker code is server-generated, organization-scoped unique, immutable, and not trusted from client input.
- Daily rate is optional at worker creation but required before wage generation.
- Daily rate cannot be negative.
- Rate changes require an effective date.
- Rate changes after attendance exists require `workers:update-rate`.
- Historical attendance and financial meaning must never be silently changed by rate edits.
- Complete effective-dated rate history belongs to the Wages domain and must be introduced before or during Wages.
- Worker belongs to exactly one organization.
- Project assignment must belong to same organization as worker.
- Actor must have active organization membership.
- Actor must have project access for project roster and assignment operations.
- Inactive workers cannot receive new project assignments.
- End date cannot be before start date.
- Ended assignments remain visible in history.
- Permanent deletion requires organization-wide `workers:delete`, explicit confirmation, and transactional removal of all current downstream Worker records.
- System should warn for similar name/mobile combinations.
- Client-supplied organization/project/creator fields must not be trusted.

## N. Reporting And Analytics

MVP module summaries:

- Worker count by project.
- Active/inactive worker count by organization.
- Active worker count by trade.
- Workers missing daily rate for wage readiness.
- Worker search/report references include `worker_code`.

Reports:

- Project worker list.
- Organization worker list.
- Future attendance/wage/Kharchi reports consume worker and assignment ids.

Exports:

- CSV export is allowed only with `workers:export`.
- Export must enforce organization and project scope.

## O. Security And Privacy

- Tenant isolation by `organization_id` on every worker and assignment query.
- Project access enforced for project-roster operations.
- Permissions enforced in API, not only navigation.
- Mobile number is personal data and must be visible only to users with `workers:read` within scope.
- No mass assignment of `organization_id`, `created_by`, `updated_by`, status, or audit fields from client body.
- No mass assignment of `worker_code`; it is server-generated and immutable.
- Permanent deletion is isolated to the organization-scoped `DELETE` endpoint and cannot be delegated as a Project permission.

## P. Acceptance Criteria

Database:

- `workers` and `worker_project_assignments` migrations use plural snake_case names.
- Tables include organization/project scope, `worker_code`, lifecycle, audit columns, and useful indexes.
- Permanent delete transaction covers the Worker, assignments, primary periods, Attendance, Wage items/payments, and only Wage batches left empty by that deletion.

API:

- CRUD-like endpoints implement business workflows and scope checks.
- Duplicate active assignment is prevented server-side.
- Duplicate mobile/name handling is warning-only after normalization/similarity checks.
- Worker code is generated, organization-scoped unique, immutable, searchable, and not accepted from client body.
- Worker deactivation preserves history.
- Permanent deletion removes all current directly related history and returns deletion counts.

Permissions:

- All write routes require explicit worker permissions.
- Users without project access cannot list or assign project workers.

Tenant isolation:

- Cross-organization worker id manipulation is denied.
- Cross-project roster access is denied unless organization-wide access is granted.

Web:

- Admin can list, create, update, deactivate, permanently delete, assign, and end assignments when permitted.
- Admin can search by worker code.
- Permission-restricted state appears when required.

Mobile:

- Field user can view current project workers.
- Permitted field user can add worker to current project with few steps.
- Mobile disables write actions while offline with a clear message.
- UI uses mobile-native cards and large controls.

Offline:

- Cached/synced workers may be viewed offline where existing repository infrastructure supports it.
- Create, edit, assign, deactivate, and rate-change actions are online-only in Workers MVP.

Notifications:

- No MVP worker notification is required unless offline conflict notifications are added.

Audit:

- Critical worker, assignment, lifecycle, and rate changes produce audit events once audit foundation exists.

Reports:

- Project worker list and active counts are available to future dashboard/report modules.

Accessibility:

- Web forms have labels.
- Mobile controls meet minimum target size.

Performance:

- Project roster supports pagination or bounded list loading.
- Mobile roster remains usable for at least 100 assigned workers.

Regression protection:

- Type-checks pass across shared, API, web, and mobile.
- API authorization and tenant-isolation tests cover worker routes.

## Q. Test Matrix

Unit tests:

- shared validation schemas
- status transitions
- duplicate candidate normalization
- worker-code generation
- rate-change permission rules

Service tests:

- create worker
- create worker plus assignment
- assign existing worker
- update worker
- deactivate worker
- end assignment

API integration tests:

- list organization workers
- list project roster
- create/update/deactivate
- assign/end assignment

Permission tests:

- missing `workers:read`
- missing `workers:create`
- missing `workers:assign-project`
- missing `workers:deactivate`
- project-assigned user cannot access other project

Tenant-isolation tests:

- organization A user cannot read organization B workers.
- assignment cannot link worker and project from different organizations.

Validation tests:

- missing name
- invalid dates
- invalid daily rate
- missing rate-change effective date
- inactive worker assignment blocked

Conflict tests:

- duplicate active assignment
- similar worker duplicate warning

Web tests:

- list renders
- create form validation
- duplicate warning
- forbidden state

Mobile tests:

- project roster renders
- create flow validation
- offline write actions disabled with clear message

End-to-end:

- Owner creates worker and assigns to project.
- Supervisor sees only assigned project roster.
- Deactivated worker disappears from active roster but remains in history.

Offline/sync tests:

- Workers MVP requires read-only/offline-disabled state tests only.
- Queued offline write tests are deferred to the broader offline-sync architecture.

## R. Open Questions And Decisions

Confirmed requirements:

- Workers are not application users.
- Worker is owned by one organization and may be assigned separately to one or more projects.
- Worker code is system-generated, organization-scoped unique, immutable, and not client supplied.
- Worker list is filtered by current project.
- Inactive workers remain in history.
- Organization Owners may permanently delete Workers with financial history after the irreversible warning is confirmed.
- Daily rate is required before wage generation, not necessarily at initial creation.
- Duplicate warnings should be shown for normalized mobile and similar name combinations, but are not hard validation failures.
- Mobile number is optional.
- Trade is free text for MVP with optional UI suggestions.
- Offline worker writes are deferred; Workers MVP is online-only for writes.
- Platform Super Admin is not a normal Workers actor and does not receive Workers permissions by default.

Repository-derived facts:

- Use `resource:action` permissions.
- Use API-local `mysql2/promise`.
- Use plural snake_case for new tables.
- Use inherited `user` table for created_by/updated_by foreign keys.
- Use `resolveOrganizationAccess` and `resolveProjectAccess` for access checks.

Safe technical decisions:

- Model workers separately from users.
- Model assignment as a separate project-scoped entity.
- Use soft deactivation/end assignment when history should remain; reserve permanent deletion for the explicit organization-owner destructive workflow.
- Keep daily rate on assignment for Workers MVP only.
- Keep worker documents and agency ownership deferred.

Unresolved business decisions:

- None blocking Workers implementation.

Deferred functionality:

- Worker documents/photos.
- Agency/subcontractor management.
- Bulk import.
- Worker self-service login.
- Attendance, wages, and Kharchi implementation.
- Effective-dated rate-history entity, owned by Wages.
- Offline worker write strategy, owned by Attendance and broader offline-sync architecture.
