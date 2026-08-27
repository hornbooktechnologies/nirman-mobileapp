# Sales API Implementation Handoff

## 1. Purpose

Use this document as the primary handoff for the next AI chat working on the NirmanSite Sales module.

It records:

- the approved requirement source;
- the implemented Sales API scope;
- endpoint and payload contracts;
- permissions and access behavior;
- database and transaction design;
- source files;
- completed verification;
- work that is intentionally still pending.

This handoff describes the source as it exists on 2026-08-26. Recheck the current worktree before changing it.

## 2. Required Reading Order

Before implementing or changing Sales, read these files in order:

1. `MVP_REQUIREMENTS.md`, especially sections 19-23 and sections 30, 33, 36, and 37.
2. `docs/modules/sales/CONTRACT.md`.
3. `docs/modules/foundation/identity-access/CONTRACTS.md`.
4. `docs/modules/foundation/project-access/CONTRACTS.md`.
5. `docs/modules/foundation/project-team-access/CONTRACTS.md`.
6. `docs/architecture/auth-rbac.md`.
7. `docs/decisions/004-database-access-mysql2.md`.
8. `docs/tasks/current-task.md`.
9. `docs/tasks/PROGRESS_LEDGER.md`.
10. This handoff.

Then inspect the current Sales source, migration state, seed, and Git status. Documentation status must not be treated as proof that a migration or runtime workflow is current.

## 3. Product And Architecture Boundaries

NirmanSite is a mobile-first, Project-centric construction and real-estate operating system.

For Sales:

- Mobile is the primary daily Sales-user surface.
- Web is the supporting administration, inventory-management, oversight, reporting, and bulk-management surface.
- The NestJS API is the authority for Organization isolation, Project access, permissions, visibility, state transitions, locking, and booking consistency.
- Active database access is API-local `mysql2/promise` with parameterized SQL.
- Prisma is archived history and must not be used for this module.
- Shared statuses, permissions, and stable errors live in `packages/shared`.
- Platform Super Admin is not a customer Sales actor and receives no `leads:*`, `followups:*`, `site-visits:*`, `inventory:*`, or `sales-reports:*` permissions by default.

## 4. Implemented Scope

The source implementation is a connected Project-scoped Sales vertical slice covering:

1. Leads.
2. Own/team/all Lead visibility.
3. Created-by and assigned-to ownership.
4. Assignment and reassignment history.
5. Lead activity timeline.
6. Follow-ups.
7. Site visits.
8. Unit inventory.
9. Transactional unit blocking and release.
10. Expired-block reconciliation.
11. Idempotent booking conversion.
12. Explicit booking cancellation and restored Lead/Unit state.

The Sales module is registered in `apps/api/src/app.module.ts`.

## 5. Explicitly Excluded Or Pending

The following were not implemented by this API source slice:

- Mobile Sales screens.
- Web Sales screens.
- Notification delivery and reminder scheduling.
- A background job for automatic block expiry.
- Durable Audit-foundation integration; the Sales timeline currently preserves module evidence.
- Round-robin Lead assignment.
- Public website Lead capture.
- Complex commissions or incentives.
- Payment collection and accounting.
- Customer post-booking workflow.
- Booking documents.
- Sales analytics/report endpoints beyond reserving `sales-reports:read`.
- Migration execution.
- Seed execution.
- Authenticated runtime/API smoke testing.
- Browser or physical-device acceptance.

Do not infer any of these from type-check, tests, or build evidence.

## 6. API Base Path And Envelope

Application prefix:

```text
/api/v1
```

Sales base path:

```text
/api/v1/organizations/:organizationId/projects/:projectId/sales
```

Standard item response:

```json
{
  "success": true,
  "message": "Human-readable result",
  "data": {}
}
```

Paginated Lead response:

```json
{
  "success": true,
  "message": "Leads retrieved",
  "data": [],
  "meta": {
    "page": 1,
    "limit": 25,
    "total": 0
  }
}
```

Errors are emitted through the existing global API exception handling. New Sales service errors include a stable `code` and human-readable `message` in the exception response.

## 7. Endpoint Inventory

### 7.1 Leads And Timeline

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/leads` | List visible Project Leads with search/filter/pagination. |
| `POST` | `/leads` | Create and normally auto-assign a Lead to the creator. |
| `GET` | `/leads/:leadId` | Read one visible Lead. |
| `PATCH` | `/leads/:leadId` | Update an accessible Lead and record stage history. |
| `PUT` | `/leads/:leadId/assignment` | Assign or reassign while retaining history. |
| `GET` | `/leads/:leadId/activities` | Read the Lead timeline. |
| `POST` | `/leads/:leadId/activities` | Record a call outcome, note, or manually shared brochure. |

`GET /leads` query parameters:

```text
search?: string
stage?: LeadStage
assignedTo?: UUID
page?: integer, default 1
limit?: integer, default 25, maximum 100
```

Create Lead payload:

```json
{
  "customerName": "Asha Patel",
  "primaryMobile": "9876543210",
  "alternateMobile": "optional",
  "email": "optional@example.com",
  "preferredUnitType": "2 BHK",
  "budgetMin": 5000000,
  "budgetMax": 6500000,
  "purchasePurpose": "Self use",
  "purchaseTimeline": "Within 3 months",
  "source": "WALK_IN",
  "sourceDetail": "Site office",
  "assignedTo": "optional-user-uuid",
  "priority": "HIGH",
  "interestedUnitId": "optional-unit-uuid"
}
```

Required fields are `customerName`, `primaryMobile`, and `source`. When `assignedTo` is omitted, the Lead is assigned to the creator. Assigning another user during creation requires `leads:assign`.

Update Lead accepts any relevant subset of the create fields plus:

```json
{
  "currentStage": "QUALIFIED",
  "lostReason": "Required when moving to LOST"
}
```

Rules:

- `budgetMax` cannot be below `budgetMin`.
- Direct `PATCH` cannot move a Lead into `BOOKED`; booking confirmation owns that transition.
- `lostReason` is required when the Lead becomes `LOST`.
- `createdBy` and `assignedTo` remain distinct.
- Assignment/reassignment appends `sales_lead_assignments` and timeline evidence.
- An assignee must be an active Organization Member with current Project access or Organization-wide Project access.

Assignment payload:

```json
{
  "assignedTo": "user-uuid"
}
```

Manual activity payload:

```json
{
  "activityType": "NOTE_ADDED",
  "summary": "Customer requested the updated floor plan",
  "details": "Optional longer text"
}
```

Manual activity types are limited to:

- `CALL_OUTCOME`;
- `NOTE_ADDED`;
- `BROCHURE_SHARED`.

### 7.2 Follow-ups

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/follow-ups` | List permitted Project follow-ups. |
| `POST` | `/leads/:leadId/follow-ups` | Schedule a Lead follow-up. |
| `PATCH` | `/leads/:leadId/follow-ups/:followUpId` | Complete/cancel/reschedule a follow-up. |

List query parameters:

```text
status?: FollowUpStatus
assignedTo?: UUID
from?: ISO date/time
to?: ISO date/time
```

Create payload:

```json
{
  "assignedUserId": "optional-user-uuid",
  "scheduledAt": "2026-08-28T10:00:00.000Z",
  "type": "PHONE",
  "notes": "Discuss revised budget"
}
```

If `assignedUserId` is omitted, the API uses the Lead assignee and then the current actor as fallback.

Update payload:

```json
{
  "status": "COMPLETED",
  "outcome": "Customer will visit on Saturday",
  "notes": "Optional notes",
  "nextFollowUpAt": "2026-08-30T10:00:00.000Z"
}
```

An exact duplicate of Lead, assigned user, scheduled time, and type is rejected. Completion records `completedAt` and timeline evidence.

### 7.3 Site Visits

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/site-visits` | List visible Project site visits. |
| `POST` | `/leads/:leadId/site-visits` | Schedule a visit. |
| `PATCH` | `/leads/:leadId/site-visits/:visitId` | Complete/cancel/reschedule/no-show a visit. |

Create payload:

```json
{
  "scheduledAt": "2026-08-29T06:30:00.000Z",
  "assignedSalesperson": "optional-user-uuid",
  "attendeeCount": 3
}
```

Update payload:

```json
{
  "status": "COMPLETED",
  "customerFeedback": "Liked the layout",
  "objectionsConcerns": "Concerned about handover date",
  "nextAction": "Share construction schedule"
}
```

Scheduling advances a non-terminal Lead to `SITE_VISIT_SCHEDULED`. Completion advances it to `SITE_VISIT_COMPLETED`. Timeline entries distinguish completed, cancelled, rescheduled, and no-show outcomes.

### 7.4 Unit Inventory And Blocking

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/units` | List Project inventory and active-block context. |
| `POST` | `/units` | Create a unit. |
| `PUT` | `/units/:unitId` | Replace editable unit information. |
| `POST` | `/units/:unitId/blocks` | Block an available unit for a Lead. |
| `POST` | `/unit-blocks/:blockId/release` | Release an active unit block. |

Inventory list parameters:

```text
search?: string
status?: UnitStatus
```

Create/update unit payload:

```json
{
  "unitNumber": "A-1203",
  "unitType": "2 BHK",
  "wingTower": "Tower A",
  "floor": "12",
  "areaSqft": 1125,
  "facing": "East",
  "basePrice": 6200000,
  "status": "AVAILABLE"
}
```

Rules:

- Unit number is unique within a Project.
- `BLOCKED` and `BOOKED` are workflow-owned and cannot be set using ordinary inventory update.
- Sales Users do not receive `inventory:manage` by default.

Block payload:

```json
{
  "leadId": "lead-uuid",
  "expiresAt": "optional-future-ISO-date-time",
  "notes": "Customer requested one-day hold"
}
```

Blocking behavior:

1. Reconcile expired active blocks.
2. Lock the Unit row.
3. Require `AVAILABLE` status.
4. Validate the Lead belongs to the same Organization and Project.
5. Insert the active block.
6. Change the Unit to `BLOCKED`.
7. Change the Lead to `UNIT_BLOCKED` and record its interested Unit.
8. Add timeline evidence.

The default expiry is 24 hours when omitted. A generated unique active-block key prevents two active blocks for the same Unit. There is not yet a background expiry job; reconciliation runs during inventory/block/booking access.

### 7.5 Bookings

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/bookings` | List bookings permitted by Lead visibility. |
| `POST` | `/bookings` | Confirm an inventory-less or Unit-linked booking. |
| `POST` | `/bookings/:bookingId/cancel` | Cancel and explicitly restore Lead/Unit state. |

Create booking payload:

```json
{
  "idempotencyKey": "booking-request-unique-key",
  "leadId": "lead-uuid",
  "unitId": "optional-unit-uuid",
  "bookingDate": "2026-08-26",
  "customerName": "Asha Patel",
  "customerMobile": "9876543210",
  "bookingAmount": 100000,
  "bookingReference": "REC-1001"
}
```

Rules:

- `idempotencyKey` is required and unique within the Organization.
- Reusing the same key with the same booking request returns the existing booking.
- Reusing the key with a different request returns `IDEMPOTENCY_CONFLICT`.
- Inventory-less booking requires `leads:convert`.
- Unit-linked booking additionally requires `inventory:book`.
- An available Unit may be booked directly.
- A blocked Unit may be booked only for the Lead that owns its active block.
- Confirmation atomically creates the Booking, changes the Lead to `BOOKED`, records first conversion actor/time, changes the Unit to `BOOKED`, converts the matching active block, and creates timeline evidence.
- First Lead conversion actor/time are preserved as immutable history after cancellation or later rebooking. Each Booking row also retains its own actor/date.

Cancellation payload:

```json
{
  "cancellationReason": "Customer withdrew",
  "restoredUnitStatus": "AVAILABLE",
  "restoredLeadStage": "NEGOTIATION"
}
```

Rules:

- `restoredLeadStage` is required and cannot be `BOOKED`.
- `restoredUnitStatus` is required for a Unit-linked booking and may be `AVAILABLE` or `UNAVAILABLE`.
- The API does not silently guess post-cancellation business state.

## 8. Canonical Shared Values

Source: `packages/shared/src/constants/sales.ts`.

### Lead sources

```text
WEBSITE
WALK_IN
PHONE_CALL
REFERRAL
FACEBOOK
INSTAGRAM
GOOGLE_ADS
PROPERTY_PORTAL
BROKER
EXISTING_CUSTOMER
SALESPERSON_GENERATED
OTHER
```

### Lead stages

```text
NEW
CONTACTED
QUALIFIED
SITE_VISIT_SCHEDULED
SITE_VISIT_COMPLETED
NEGOTIATION
UNIT_BLOCKED
BOOKED
FOLLOW_UP_LATER
NOT_INTERESTED
LOST
INVALID
DUPLICATE
```

### Other values

```text
LeadPriority: LOW | MEDIUM | HIGH | URGENT

FollowUpType:
PHONE | WHATSAPP | EMAIL | SITE_VISIT | OFFICE_MEETING | VIDEO_CALL | OTHER

FollowUpStatus:
SCHEDULED | COMPLETED | MISSED | CANCELLED | RESCHEDULED

SiteVisitStatus:
SCHEDULED | COMPLETED | CANCELLED | RESCHEDULED | NO_SHOW

UnitStatus:
AVAILABLE | BLOCKED | BOOKED | SOLD | UNAVAILABLE

UnitBlockStatus:
ACTIVE | EXPIRED | RELEASED | CONVERTED

BookingStatus:
CONFIRMED | CANCELLED
```

Do not create alternative client-only enum values.

## 9. Permissions And Visibility

Canonical Sales permissions:

```text
leads:read-own
leads:read-team
leads:read-all
leads:create
leads:assign
leads:reassign
leads:update
leads:convert
followups:manage
site-visits:manage
inventory:read
inventory:manage
inventory:block
inventory:book
sales-reports:read
```

Access resolution remains:

```text
Authenticated user
+ active Organization membership
+ Organization Role permission ceiling
+ Project assignment or Organization-wide Project scope
+ Project CUSTOM grant when applicable
+ target record belongs to the same Organization and Project
```

Lead visibility:

- `read-own`: Lead `assignedTo` or `createdBy` equals the current user.
- `read-team`: Leads assigned to active current Project Members plus the unassigned queue.
- `read-all`: every Lead in the accessible Project.

Default role direction in the migration and seed source:

- Organization Owner, Builder Admin, and Independent Contractor Owner: all Sales permissions.
- Sales User: `leads:read-own`, `leads:create`, `leads:update`, `leads:convert`, `followups:manage`, `site-visits:manage`, `inventory:read`, `inventory:block`, and `inventory:book`.
- Platform roles: no Sales permissions.

Sales permissions are Project-delegatable, but a Project grant cannot exceed the Organization Role ceiling.

## 10. Database Migration

Proposed migration:

```text
apps/api/src/database/sql/migrations/011_sales_crm.sql
```

It creates:

| Table | Purpose |
| --- | --- |
| `sales_leads` | Current Lead identity, assignment, stage, priority, interest, and conversion fields. |
| `sales_lead_assignments` | Immutable assignment/reassignment history. |
| `sales_activities` | Lead timeline evidence. |
| `sales_followups` | Scheduled/completed Lead follow-ups. |
| `sales_site_visits` | Scheduled/completed/cancelled/rescheduled/no-show visits. |
| `sales_units` | Project unit inventory. |
| `sales_unit_blocks` | Expiring, one-active-per-Unit holds. |
| `sales_bookings` | Confirmed/cancelled Lead bookings and idempotency. |

Important constraints:

- All records carry Organization and Project scope.
- Composite foreign keys prevent linking Leads, Units, Blocks, Visits, and Bookings across Projects or Organizations.
- Unit numbers are unique per Organization and Project.
- One active block is allowed per Unit through a generated key.
- One confirmed booking is allowed per Lead through a generated key.
- A cancelled Lead can later receive a new confirmed Booking without deleting history.
- Booking idempotency keys are unique per Organization.
- User-entered values are parameterized in repositories.

Database state after the approved 2026-08-27 server rollout:

- Target: `md-in-30.webhostbox.net/vishwlt9_nirmansite`.
- Server: MySQL `5.7.23-23`.
- Migrations: 12 local, 12 applied, zero pending, zero drafts, current.
- Migration `010` and migration `011` were applied in order through the guarded runner.
- The updated guarded seed committed with `SEED_ROLE_USERS=false`.
- All eight Sales tables, both stored generated columns, and all three workflow uniqueness indexes are present.
- Sales grants: 15 each for Organization Owner, Builder Admin, and Independent Contractor Owner; nine for Sales User; zero for Site Supervisor and Platform Super Admin.
- Duplicate role permissions: zero.
- Every Sales table remains empty.
- API health reports app/database `ok`; the Sales Leads route is registered and returns `401` without authentication.
- Authenticated Sales workflow and live concurrency acceptance remain pending.

Future migration or seed work still requires exact-target inspection and new explicit mutation approval; this rollout authorization must not be reused.

## 11. Stable Sales Errors

Registered in `packages/shared/src/constants/errors.ts`:

```text
LEAD_NOT_FOUND
LEAD_ACCESS_DENIED
LEAD_ASSIGNMENT_DENIED
LEAD_ASSIGNEE_INVALID
LEAD_BUDGET_RANGE_INVALID
LEAD_STAGE_REQUIRES_BOOKING
LEAD_ALREADY_BOOKED
FOLLOW_UP_DUPLICATE
FOLLOW_UP_NOT_FOUND
FOLLOW_UP_ACCESS_DENIED
SITE_VISIT_NOT_FOUND
UNIT_NOT_FOUND
UNIT_NUMBER_DUPLICATE
UNIT_NOT_AVAILABLE
UNIT_BLOCKED_FOR_ANOTHER_LEAD
UNIT_BLOCK_NOT_ACTIVE
UNIT_BLOCK_EXPIRY_INVALID
UNIT_STATUS_MANAGED_BY_WORKFLOW
BOOKING_NOT_FOUND
BOOKING_NOT_ACTIVE
BOOKING_RESTORE_STAGE_INVALID
BOOKING_RESTORE_UNIT_STATUS_REQUIRED
SALES_CONFLICT
IDEMPOTENCY_CONFLICT
```

Existing common errors such as `PROJECT_ACCESS_DENIED`, `PROJECT_PERMISSION_DENIED`, `MEMBER_MODULE_ACCESS_DENIED`, `VALIDATION_FAILED`, and `CONFLICT` still apply.

## 12. Source File Map

### Shared

```text
packages/shared/src/constants/sales.ts
packages/shared/src/constants/permissions.ts
packages/shared/src/constants/errors.ts
packages/shared/src/constants/index.ts
packages/shared/src/types/index.ts
```

### API

```text
apps/api/src/app.module.ts
apps/api/src/modules/sales/sales.module.ts
apps/api/src/modules/sales/sales.controller.ts
apps/api/src/modules/sales/sales.service.ts
apps/api/src/modules/sales/sales.repository.ts
apps/api/src/modules/sales/dto/sales.dto.ts
apps/api/src/modules/sales/sales.service.spec.ts
apps/api/src/database/sql/migrations/011_sales_crm.sql
apps/api/scripts/seed.ts
```

### Documentation

```text
docs/modules/sales/CONTRACT.md
docs/modules/MODULE_INDEX.md
docs/tasks/current-task.md
docs/tasks/PROGRESS_LEDGER.md
docs/tasks/sales-api-handoff.md
```

## 13. Verification Evidence

Passed after the final Sales changes:

```text
pnpm --filter @nirman-app/shared build
pnpm --filter @nirman-app/api type-check
pnpm --filter @nirman-app/api exec eslint "src/modules/sales/**/*.ts"
pnpm --filter @nirman-app/api test -- --runInBand
pnpm --filter @nirman-app/api build
git diff --check
```

Recorded results:

- Shared build passed.
- API type-check passed.
- Focused Sales lint passed.
- All 19 API test suites passed.
- All 105 API tests passed.
- API production build passed.
- `git diff --check` passed.

This evidence is static/automated source evidence only. It does not prove that migration `011` works on the configured database or that authenticated API workflows work against real rows.

## 14. Required Runtime Acceptance Matrix

After explicit database approval and migration/seed execution, verify at minimum:

### Authorization

- Organization Owner can read all Project Leads and manage inventory.
- Builder Admin follows the intended Organization Role ceiling.
- Sales User sees only assigned/self-created Leads.
- Sales User cannot read another user's Lead by changing `leadId`.
- Sales User cannot reassign without `leads:reassign`.
- Sales User cannot administer inventory without `inventory:manage`.
- Project `CUSTOM` grants narrow Sales permissions.
- A user cannot access another Organization or unassigned Project.
- Platform Super Admin has no customer Sales permissions by default.

### Lead lifecycle

- Create, update, assignment, and reassignment.
- Created-by and assigned-to remain distinct.
- Timeline order and actor evidence.
- Direct `BOOKED` update rejected.
- `LOST` without reason rejected.

### Follow-ups and visits

- Exact duplicate follow-up rejected.
- Today/overdue query behavior confirmed with real database timezone handling.
- Completion timestamps and timeline evidence.
- Site-visit completion updates Lead stage.

### Inventory concurrency

- Two concurrent users cannot block the same Unit.
- Expired active block returns the Unit to available during reconciliation.
- A Lead cannot book a Unit blocked for another Lead.
- Cross-Project Unit/Lead IDs are rejected.

### Booking consistency

- Identical idempotent retry returns the existing Booking.
- Same idempotency key with different data returns `IDEMPOTENCY_CONFLICT`.
- Unit-less booking works with `leads:convert` only.
- Unit-linked booking also requires `inventory:book`.
- Booking atomically updates Lead, Unit, active Block, Booking, and timeline.
- Cancellation requires explicit restoration state.
- First conversion actor/time remain unchanged after cancellation/rebooking.

## 15. Recommended Next Sequence

Do not jump directly into broad Sales UI work without confirming the intended next slice.

Recommended sequence:

1. Read this handoff and inspect the current checkout.
2. Review the Sales contract and API implementation for product-owner changes.
3. Inspect the exact configured database target read-only.
4. Add/run the required read-only migration preflight.
5. Request explicit approval for migration `011` on the named target.
6. Apply migration `011` only after approval.
7. Request explicit approval before running the guarded seed.
8. Run the authenticated API authorization and concurrency matrix.
9. Update the contract, module index, current task, and progress ledger with runtime evidence.
10. Obtain approval for either Mobile Sales or Web Sales as the next client slice.

For client implementation, preserve all API enums and identifiers. Translate only display copy. Mobile must use existing NirmanSite field-operation primitives, selected Project context, permission-aware navigation, and complete en/hi/gu localization.

## 16. Copy-Ready Prompt For A New Chat

```text
Work in D:\NIRMANSITE\nirman-mobileapp.

First read these files in order:
1. MVP_REQUIREMENTS.md, especially sections 19-23, 30, 33, 36, and 37.
2. docs/modules/sales/CONTRACT.md
3. docs/tasks/sales-api-handoff.md
4. docs/modules/foundation/identity-access/CONTRACTS.md
5. docs/modules/foundation/project-access/CONTRACTS.md
6. docs/modules/foundation/project-team-access/CONTRACTS.md
7. docs/decisions/004-database-access-mysql2.md
8. docs/modules/MODULE_INDEX.md
9. docs/tasks/current-task.md
10. docs/tasks/PROGRESS_LEDGER.md

Then inspect the current Git status and the Sales shared/API/migration/seed files listed in the handoff. Preserve all unrelated user changes.

The Sales API source is implemented for Leads, timeline, follow-ups, site visits, unit inventory/blocking, and booking conversion. Shared build, API type-check, focused Sales lint, 19 API suites/105 tests, API build, and git diff check passed. On 2026-08-27, migrations 010/011 and the guarded updated seed were applied to the approved remote target; schema, grants, API health, and route registration passed. Authenticated workflow/concurrency acceptance is still pending.

Do not run a migration or seed until you have identified the exact database target and received explicit target-specific approval. Do not infer runtime, browser, or physical-device acceptance from static checks.

For the requested next task, preserve Organization/Project isolation, role-ceiling plus Project-grant authorization, own/team/all Lead visibility, booking idempotency, unit locking, immutable conversion history, shared enum values, and existing API routes unless an approved contract change explicitly authorizes otherwise.

Report separately:
- files changed;
- contract behavior changed or preserved;
- static checks;
- API tests/build;
- database/migration/seed actions;
- authenticated runtime evidence;
- browser/device evidence;
- remaining risks and next approval gate.
```
