# 04 — Sales CRM, Inventory, and Bookings

## Purpose

Sales is Project-scoped. It covers leads, follow-ups, site visits, Unit Inventory, customer interest/holds, conversion, bookings, and cancellation. `createdBy` and `assignedTo` have different meanings and must both be tested.

## Sales visibility matrix

| User scope | Expected record visibility |
| --- | --- |
| Own scope | Only leads/work assigned to that salesperson. |
| Team/all scope | Additional records only when effective permission grants it. |
| Platform Super Admin | No customer Sales permission by default. |

## Test cases

### SC-01 — Create, assign, and follow up a lead

1. From active Project → **Menu** → **Sales**, create a lead with source and contact details.
2. Verify its initial stage and `createdBy` value.
3. Assign/reassign it to a Sales user, then add a dated follow-up.
4. Sign in as the assignee and a different Sales user.

**Expected result:** reassignment is retained as immutable history; the assignee sees the record according to server-controlled scope, while an unrelated own-scope Sales user cannot. Follow-up status/date changes appear in the timeline and applicable dashboard data.

### SC-02 — Create and complete a Site Visit

1. Open a lead and schedule a Site Visit.
2. Reschedule it once, then record a terminal outcome.
3. Attempt another reschedule after the terminal outcome.

**Expected result:** rescheduling requires a new `scheduledAt` and retains the visit history. Only scheduled/rescheduled visits can change; terminal outcomes are immutable. An own-scope actor is restricted to their assigned salesperson scope.

### SC-03 — Create/import Unit Inventory and verify pricing

1. Create a unit manually with status and either `TOTAL` or `PER_SQFT` pricing.
2. Import a CSV of 1–500 disposable units, including a duplicate test row.
3. Confirm the preview before import.

**Expected result:** pricing displays according to its selected basis. CSV preview identifies invalid/duplicate data; confirmed import is all-or-nothing rather than partially inserting a broken file. Inventory data stays inside the selected Project.

### SC-04 — Interest, hold request, and direct block

1. Add more than one customer-interest record to an available unit.
2. Use the permitted hold-request or direct-block action.
3. Attempt the same block concurrently from two sessions.
4. Let the hold expire/release or cancel it as the allowed workflow provides.

**Expected result:** multiple customer interests can coexist. Only roles with the required inventory permission may block directly; active-block uniqueness and transaction locking prevent two simultaneous active blocks. Release/expiry restores availability according to the server result.

### SC-05 — Convert a lead and create a booking

1. Open **Leads** → a lead → **Confirm booking**.
2. Create one booking with a Unit and one `No Unit` booking where the workflow permits it.
3. Retry the final submit with the same stable request identity.
4. Find the booking through **Sales** → header grid → **Bookings**.

**Expected result:** the booking uses server-authoritative lead/customer data and preserves conversion snapshots. Duplicate retry does not create another booking. Unit booking uses the inventory concurrency rules; a no-unit booking does not invent a unit block.

### SC-06 — Cancel a booking and verify restoration

1. Cancel a disposable test booking.
2. Review booking history and linked lead/unit availability.
3. Attempt cancellation again.

**Expected result:** cancellation is a traceable workflow event and restores the allowed linked state only once. Repeated cancellation/retry does not corrupt lead stage, unit availability, or booking history.

## Screenshot capture list

| Capture ID | Screen/state |
| --- | --- |
| `04-SC-01` | Sales home, lead form/detail, assignment and follow-up timeline |
| `04-SC-02` | Site Visit schedule, reschedule, terminal outcome |
| `04-SC-03` | Unit form and CSV preview/error/confirmation |
| `04-SC-04` | Interest list, block/hold, blocked and released states |
| `04-SC-05` | Confirm booking, bookings list/detail |
| `04-SC-06` | Booking cancellation and restored Unit state |
