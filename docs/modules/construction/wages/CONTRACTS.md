# Wages Module Contract

> Status: initial derived-calculation implementation.

## Purpose

Calculate Project Worker wages from the approved Calendar and Attendance model, confirm immutable period snapshots, and record full or partial payments.

## Calculation Source

For the selected inclusive period, Wages consumes:

1. the effective Project Work Calendar;
2. Worker assignment and effective primary-Project periods;
3. derived Attendance states from absence exceptions;
4. the assignment daily rate available when the preview is generated.

Wages must not calculate from legacy `attendance_records`.

- derived `PRESENT` contributes `daily rate x 1`;
- `ABSENCE + HALF_DAY` contributes `daily rate x 0.5`;
- `ABSENCE + FULL_DAY` contributes `0`;
- non-working Calendar dates contribute `0` and are not absences.

The preview reports full Present-day count, Half-day count, and Full-absence count. A confirmed wage item snapshots these counts, the daily rate, and calculated money values so later source changes do not rewrite the batch.

## Initial Flow

1. Select Project and period.
2. Generate preview.
3. Resolve missing daily rates or Calendar configuration.
4. Confirm a batch only when it does not overlap another active Project batch.
5. Record any payment up to the remaining payable amount.
6. Derive `UNPAID`, `PARTIALLY_PAID`, or `PAID` status.

## Money And Deductions

Money is calculated in paise and exposed with two decimal places. Kharchi deduction remains `0.00` until the separate Kharchi contract and traceable deduction-allocation ledger are implemented. Manual wage-item adjustments remain separately permission-controlled.

## Current Boundary

The initial implementation uses the assignment's current daily-rate snapshot for the whole preview period. Effective-dated wage-rate history is not yet implemented, so a period spanning a historical rate change must not be presented as rate-history-verified. Confirmed batches remain historical snapshots.
