# Wages Module Contract

> Status: initial derived-calculation implementation.

## Purpose

Calculate Project Worker wages from the approved Calendar and Attendance model, confirm immutable period snapshots, and record full or partial payments.

## Calculation Source

For the selected inclusive period, Wages consumes:

1. the effective Project Work Calendar;
2. Worker assignment and effective primary-Project periods;
3. derived Attendance states from absence exceptions;
4. the effective-dated assignment rate applicable to each working date.

Wages must not calculate from legacy `attendance_records`.

- derived `PRESENT` contributes `daily rate x 1`;
- `ABSENCE + HALF_DAY` contributes `daily rate x 0.5`;
- `ABSENCE + FULL_DAY` contributes `0`;
- non-working Calendar dates contribute `0` and are not absences.

The preview reports full Present-day count, Half-day count, Full-absence count, and a rate breakdown when the period spans multiple rates. A confirmed wage item snapshots these counts, the representative latest rate, the complete rate breakdown, and calculated money values so later source changes do not rewrite the batch.

## Initial Flow

1. Select Project and period.
2. Generate preview.
3. Resolve missing daily rates or Calendar configuration.
4. Confirm a batch only when it does not overlap another active Project batch.
5. Record any payment up to the remaining payable amount.
6. Derive `UNPAID`, `PARTIALLY_PAID`, or `PAID` status.

An actor with `wages:cancel` may cancel a confirmed batch only before any Wage payment exists in that batch. Cancellation requires a reason, retains the batch as a read-only `CANCELLED` snapshot, releases its Kharchi deductions through immutable reversal rows, and permits the period to be generated again. A partially or fully paid batch cannot be cancelled.

## Money And Deductions

Money is calculated in paise and exposed with two decimal places. Wage confirmation allocates the Worker's Project Kharchi oldest-first, records each source-to-Wage-Item allocation, and caps the deduction so net wages cannot become negative. This source behavior requires the separately gated Audit and Kharchi migrations before runtime use. Manual wage-item adjustments remain separately permission-controlled.

## Batch Cancellation API

- `POST /organizations/:organizationId/projects/:projectId/wages/batches/:batchId/cancel`
- permission: `wages:cancel`, granted by default only to Organization Owner, Builder Admin, and Independent Contractor Owner;
- body: `{ "reason": "required, 2-500 characters" }`;
- response: refreshed `WageBatchDetail` with `status = CANCELLED`, `cancelledBy`, `cancelledAt`, and `cancellationReason`;
- retry: cancelling an already-cancelled batch returns its unchanged detail and does not duplicate reversals or audit events;
- conflict: `WAGE_BATCH_HAS_PAYMENTS` when any payment row exists, including a partial payment;
- transaction: lock Wage Items and batch, verify no payments, append Kharchi allocation reversals, update the batch, and append audit events atomically.

Cancelled batches are never hard-deleted. Their Wage Item snapshot remains visible for audit but cannot be adjusted or paid. Mobile shows a destructive confirmation sheet with a mandatory reason, hides item management after cancellation, and explains when cancellation is blocked by payment history.

## Current Boundary

Effective-dated assignment-rate history is implemented through `worker_assignment_rate_periods`. Wages resolves the rate independently for each derived working date and stores `rate_breakdown` on confirmation. Migration `025_worker_assignment_rate_history.sql` must be applied before this behavior can be accepted at runtime. The migration treats each existing assignment's current rate as the only known baseline from its assignment start because undocumented earlier changes cannot be reconstructed.

Migration `026_wage_batch_cancellation.sql` adds the cancellation reason, immutable Kharchi allocation reversals, and the owner-role `wages:cancel` grants. It must be reviewed and applied to the intended database separately; source/static verification does not prove runtime acceptance.
