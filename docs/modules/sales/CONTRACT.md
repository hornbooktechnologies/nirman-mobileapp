# Sales API Contract

## A. Status And Authority

- Status: migrations through `015` are applied on the approved remote target as of 2026-08-31; authenticated workflow/concurrency acceptance is pending.
- Authority: `MVP_REQUIREMENTS.md` sections 19-23.
- Scope: one project-scoped Sales vertical slice covering Leads, timeline, follow-ups, site visits, unit inventory, non-exclusive customer interest, approval-based exclusive holds, and booking conversion.

## B. Boundaries

Sales owns lead/customer prospect data, assignment history, sales activities, follow-ups, site visits, unit sales availability, temporary blocks, and booking conversion.

Explicitly excluded from this slice:

- web Sales UI;
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
- `inventory:read`, `inventory:manage`, `inventory:interest`, `inventory:request-block`, `inventory:block`, and `inventory:book` separate inventory capabilities. `inventory:block` is the approval/rejection/release authority for exclusive holds.
- `sales-reports:read` is reserved for a later reporting endpoint.

Platform roles receive no Sales permissions by default. After migration `014`, a Sales User receives own-lead operations plus inventory read, interest, hold-request, and booking permissions. Sales Users do not receive exclusive hold approval/release, team/all visibility, reassignment, inventory administration, or sales-report access by default.

## D. Shared Values

Canonical values live in `packages/shared/src/constants/sales.ts`:

- Lead sources and stages from the MVP requirements.
- Lead priority: `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
- Follow-up types/statuses.
- Site-visit statuses.
- Unit-interest, hold-request, unit-block, and booking statuses.
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

### Unit Inventory, Interest, And Holds

```text
GET  /units
POST /units
POST /units/import/preview
POST /units/import
PUT  /units/:unitId
GET  /units/:unitId/interests
GET  /leads/:leadId/unit-interests
POST /units/:unitId/interests
POST /units/:unitId/hold-requests
POST /unit-hold-requests/:requestId/decision
POST /units/:unitId/blocks
POST /unit-blocks/:blockId/release
```

Unit numbers are unique per Project. Multiple Leads may record interest in the same available or blocked Unit, and multiple pending hold requests may coexist. Interest does not reserve inventory. An actor with `inventory:block` decides a request; approval uses a database transaction and row locks to create the sole active exclusive block, mark the approved interest `SELECTED`, and mark competing active interests `WAITLISTED`. Rejection does not change Unit availability. Default block expiry is 24 hours when omitted. Release/expiry returns the Unit to `AVAILABLE`, restores the selected Lead's previous stage, and returns its interest to `INTERESTED`. `BLOCKED` and `BOOKED` cannot be set through ordinary inventory updates. The direct block endpoint remains an authorized manager operation, not the Sales User mobile flow.

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

Migration `014_sales_unit_interest_hold_workflow.sql`, applied to the approved remote database on 2026-08-31, adds:

- `sales_unit_interests` for one current Lead/Unit interest record with `INTERESTED`, `HIGH_INTENT`, `WAITLISTED`, `SELECTED`, or `WITHDRAWN` state;
- `sales_unit_hold_requests` for auditable `PENDING`, `APPROVED`, `REJECTED`, or `CANCELLED` decisions;
- `sales_unit_blocks.previous_lead_stage` so release/expiry can restore workflow state;
- the `inventory:interest` and `inventory:request-block` grants and removal of `inventory:block` from the Sales User role.

Migration `015_sales_unit_pricing.sql`, applied to the approved remote database on 2026-08-31, adds `sales_units.price_basis` (`TOTAL` or `PER_SQFT`) and nullable `rate_per_sqft`. The API always stores `base_price` in rupees. For `PER_SQFT`, the server calculates `base_price = area_sqft × rate_per_sqft`; both inputs must be greater than zero.

Unit inventory CSV import accepts 1–500 rows. The mobile columns are `unitNumber,unitType,tower,floor,areaSqft,facing,pricingMethod,totalPrice,priceUnit,ratePerSqft,status`. `TOTAL` rows require `totalPrice` and `priceUnit` (`RUPEE`, `LAKH`, or `CRORE`); `PER_SQFT` rows require `areaSqft` and `ratePerSqft`. The preview checks duplicate Unit numbers in the file and Project. Confirmation is all-or-nothing and inserts every row in one database transaction.

Every operational record carries Organization and Project scope. Composite foreign keys prevent cross-Project Lead/Unit/Booking relationships. User-provided SQL values remain parameterized.

## G. Stable Errors

Sales errors are registered in `packages/shared/src/constants/errors.ts`, including missing/forbidden leads, invalid assignees, duplicate follow-ups or units, invalid pricing/import rows, missing interest, decided/missing hold requests, unavailable/concurrently blocked units, and invalid booking restoration state.

## H. Acceptance And Verification

- Tenant and Project scoping are enforced on every route.
- Own/team/all Lead visibility is enforced by the backend.
- Created-by and current assignment remain separately visible.
- Reassignment preserves history.
- Timeline records material Sales actions.
- Multiple users may record interest and request holds for the same Unit, but concurrent approvals cannot create two active blocks.
- Booking keeps Lead, Unit, Block, and Booking state consistent in one transaction.
- No migration/seed is executed without separate approval for the exact database target.
