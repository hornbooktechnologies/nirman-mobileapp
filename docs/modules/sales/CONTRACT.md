# Sales API Contract

## A. Status And Authority

- Status: source complete; migration `011` and role seed applied on 2026-08-27; authenticated workflow/concurrency acceptance pending.
- Authority: `MVP_REQUIREMENTS.md` sections 19-23.
- Scope: one project-scoped Sales vertical slice covering Leads, timeline, follow-ups, site visits, unit inventory/blocking, and booking conversion.

## B. Boundaries

Sales owns lead/customer prospect data, assignment history, sales activities, follow-ups, site visits, unit sales availability, temporary blocks, and booking conversion.

Explicitly excluded from this slice:

- mobile and web Sales UI;
- notification delivery and reminder jobs;
- automated background block-expiry scheduling (expired blocks are reconciled on inventory/block/booking access);
- round-robin assignment;
- complex commission calculations;
- payment collection, customer post-booking, documents, and accounting;
- public website lead capture;
- migration or seed execution without separate target-specific approval.

## C. Authorization

All routes require an active Organization membership, Project access, the required Organization Role permission, and any Project `CUSTOM` grant.

- `leads:read-own`: assigned or self-created leads only.
- `leads:read-team`: leads assigned within the accessible Project team, including the unassigned queue.
- `leads:read-all`: all leads in the accessible Project.
- `leads:create`, `leads:update`, `leads:assign`, `leads:reassign`, `leads:convert` control mutations.
- `followups:manage` and `site-visits:manage` remain subject to lead visibility.
- `inventory:read`, `inventory:manage`, `inventory:block`, and `inventory:book` separate inventory capabilities.
- `sales-reports:read` is reserved for a later reporting endpoint.

Platform roles receive no Sales permissions by default. A Sales User receives own-lead operations and inventory read/block/book, but no team/all visibility, reassignment, inventory administration, or sales-report access by default.

## D. Shared Values

Canonical values live in `packages/shared/src/constants/sales.ts`:

- Lead sources and stages from the MVP requirements.
- Lead priority: `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
- Follow-up types/statuses.
- Site-visit statuses.
- Unit, unit-block, and booking statuses.
- Timeline activity types.

Clients must not invent alternate values.

## E. API Routes

Base path:

```text
/api/v1/organizations/:organizationId/projects/:projectId/sales
```

### Leads And Timeline

```text
GET   /leads
POST  /leads
GET   /leads/:leadId
PATCH /leads/:leadId
PUT   /leads/:leadId/assignment
GET   /leads/:leadId/activities
POST  /leads/:leadId/activities
```

The list supports search, stage, assignee, page, and limit. `createdBy` and `assignedTo` are both retained. Reassignment appends immutable assignment history and a timeline event. Direct lead updates cannot set `BOOKED`; only booking confirmation can convert a lead.

### Follow-ups

```text
GET   /follow-ups
POST  /leads/:leadId/follow-ups
PATCH /leads/:leadId/follow-ups/:followUpId
```

Exact duplicate lead/assignee/time/type follow-ups are rejected. Completion records outcome, optional next action time, completion time, and timeline evidence.

### Site Visits

```text
GET   /site-visits
POST  /leads/:leadId/site-visits
PATCH /leads/:leadId/site-visits/:visitId
```

Scheduling derives `SITE_VISIT_SCHEDULED` unless the lead is already terminal. Completion derives `SITE_VISIT_COMPLETED` and records timeline evidence.

### Unit Inventory And Blocking

```text
GET  /units
POST /units
PUT  /units/:unitId
POST /units/:unitId/blocks
POST /unit-blocks/:blockId/release
```

Unit numbers are unique per Project. Blocking uses a database transaction and row lock. Only one active block may exist for a unit. Default expiry is 24 hours when omitted. Expired blocks return a blocked unit to `AVAILABLE` during reconciliation. `BLOCKED` and `BOOKED` cannot be set through ordinary inventory updates.

### Bookings

```text
GET  /bookings
POST /bookings
POST /bookings/:bookingId/cancel
```

Booking confirmation atomically:

1. locks and validates the lead;
2. optionally locks and validates the unit/block;
3. creates the booking;
4. marks the lead `BOOKED` with immutable conversion actor/time;
5. marks the unit `BOOKED` and its matching active block `CONVERTED`;
6. writes timeline evidence.

Booking creation requires an Organization-scoped idempotency key so a retried mobile or web request cannot create a second confirmed booking.

Inventory-less booking requires `leads:convert`; unit-linked booking also requires `inventory:book`. Cancellation requires an explicit restored Lead stage and, for unit-linked bookings, an explicit restored Unit status. This avoids silently inventing post-cancellation business state. The Lead's first conversion actor/time remain immutable history even after cancellation; each booking row separately retains its own actor and date.

## F. Data Model

Migration `011_sales_crm.sql`, applied to the approved remote database on 2026-08-27, defines:

- `sales_leads`;
- `sales_lead_assignments`;
- `sales_activities`;
- `sales_followups`;
- `sales_site_visits`;
- `sales_units`;
- `sales_unit_blocks`;
- `sales_bookings`.

Every operational record carries Organization and Project scope. Composite foreign keys prevent cross-Project Lead/Unit/Booking relationships. User-provided SQL values remain parameterized.

## G. Stable Errors

Sales errors are registered in `packages/shared/src/constants/errors.ts`, including missing/forbidden leads, invalid assignees, duplicate follow-ups or units, unavailable/concurrently blocked units, and invalid booking restoration state.

## H. Acceptance And Verification

- Tenant and Project scoping are enforced on every route.
- Own/team/all Lead visibility is enforced by the backend.
- Created-by and current assignment remain separately visible.
- Reassignment preserves history.
- Timeline records material Sales actions.
- Concurrent unit blocks cannot both succeed.
- Booking keeps Lead, Unit, Block, and Booking state consistent in one transaction.
- No migration/seed is executed without separate approval for the exact database target.
