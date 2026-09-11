# 02 — Workforce Operations and Financial Verification

## Purpose

This chapter tests one connected operational flow: a worker is eligible for a project, the working calendar determines expected days, Attendance records exceptions, Kharchi records advances already paid, Wages calculates a snapshot, then payment completes the wage obligation.

## Dependency order

```text
Active organisation + Project access
  → Worker assignment + effective primary-project period + daily rate
  → Work Calendar
  → Attendance exceptions and derived attendance
  → Kharchi advances and adjustments
  → Wage preview and confirmation
  → automatic oldest-first Kharchi deductions
  → wage payments and remaining balance
```

If a later step is wrong, first re-check every earlier step. Do not edit a confirmed wage batch in an attempt to correct an earlier Calendar, Attendance, or Kharchi record.

## Controlled calculation example

Use a six-working-day wage period, daily rate `₹800.00`, four full-present days, one half-day, and one full absence.

| Calculation | Formula | Expected amount |
| --- | --- | ---: |
| Full-present wage | `4 × ₹800.00` | ₹3,200.00 |
| Half-day wage | `1 × ₹800.00 × 0.5` | ₹400.00 |
| Full-absence wage | `1 × ₹800.00 × 0` | ₹0.00 |
| Gross wage | `₹3,200.00 + ₹400.00` | ₹3,600.00 |
| Kharchi advance outstanding | test setup | ₹1,000.00 |
| Kharchi deduction | lesser of outstanding advance and pre-deduction wage | ₹1,000.00 |
| Net payable before manual adjustment | `₹3,600.00 - ₹1,000.00` | ₹2,600.00 |
| Partial payment example | recorded payment | ₹1,500.00 |
| Remaining payable | `₹2,600.00 - ₹1,500.00` | ₹1,100.00 |

Money is calculated in paise and shown to two decimals. The example assumes no manual wage adjustment.

## Test cases

### WF-01 — Set up worker eligibility

**Role:** authorised Owner/Project Manager.

1. Create `Ramesh Test` with daily rate `₹800.00`.
2. Assign the worker to `Testing Site A` for the whole fixed wage period.
3. Make `Testing Site A` the worker’s effective primary project for that same period.

**Expected result:** the worker is eligible for derived attendance and wages only inside the assignment and primary-project dates. A worker assigned to another project or outside those effective dates must not silently appear in the calculation.

### WF-02 — Configure the Work Calendar

1. Configure the organisation’s usual working week in `Asia/Kolkata`.
2. Add an organisation or project override only if the test case needs one.
3. Confirm the effective calendar at `Testing Site A`.

**Expected result:** Project override wins over organisation override; organisation override wins over the weekly pattern. An unconfigured calendar must be reported as unconfigured—do not assume Sunday, or any other day, is non-working.

### WF-03 — Record and verify Attendance

1. For the controlled period, leave four eligible working dates without an absence exception.
2. Record one `HALF_DAY` absence exception and one `FULL_DAY` absence exception.
3. Open the worker attendance history/summary.

**Expected result:** eligible working dates without an absence exception derive as `PRESENT`; the half-day contributes half a day; the full-day absence contributes zero. Non-working dates do not count as absences or wages. An exception must be within the worker assignment and effective primary-project period.

### WF-04 — Record Kharchi and verify outstanding balance

1. Record a direct-paid Kharchi advance of `₹1,000.00` for the worker and project.
2. Review the detail screen and outstanding balance.
3. Attempt to edit or delete the original advance.
4. If a correction is needed, record a signed positive or negative adjustment with a reason.

**Expected result:** Kharchi means money already given to the worker. The original paid record is immutable; corrections are new signed adjustments. Outstanding balance is:

```text
original amount + all adjustments − all recorded wage deductions
```

### WF-05 — Preview and confirm Wages

1. Select the same project and inclusive wage period.
2. Generate the wage preview.
3. Compare the displayed attendance counts, daily rate, gross wage, Kharchi deduction, and net payable with the controlled calculation example.
4. Confirm the batch once all values are correct.

**Expected result:**

- Wages uses the effective calendar, worker assignment/primary project, and derived Attendance—not legacy explicit attendance history.
- Missing calendar configuration or missing daily rate blocks confirmation with a clear error.
- Confirmation creates immutable historical snapshots of counts, daily rate, and money values.
- Confirmation does not allow an active overlapping wage batch for the same project period.

### WF-06 — Verify oldest-first deduction allocation

1. Before confirmation, create two advances for the same worker, dated oldest then newest.
2. Confirm a wage batch with enough net pre-deduction wage to recover part or all of both advances.
3. Open Kharchi detail/history and wage-item calculation detail.

**Expected result:** deductions are allocated to outstanding advances oldest first. Each allocation is traceable to its Kharchi source and wage item. The total deduction cannot exceed both the outstanding balance and the wage item’s pre-deduction available amount, so net wage cannot become negative.

### WF-07 — Record partial and full wage payment

1. Record a payment of `₹1,500.00` against the example’s `₹2,600.00` net payable.
2. Verify status and remaining payable.
3. Record the remaining `₹1,100.00`.

**Expected result:** the first payment produces `PARTIALLY_PAID` with `₹1,100.00` remaining; the second produces `PAID` with zero remaining. A payment greater than the remaining payable must be rejected.

## Important boundaries and troubleshooting

| Symptom | Check first | Expected explanation |
| --- | --- | --- |
| Worker missing from wage preview | Assignment, primary-project dates, daily rate | The worker must be assigned and primary for relevant working dates, with a usable rate. |
| Unexpected present/absence count | Calendar effective rule, exception date/duration | Attendance derives from the Calendar and exceptions; it is not a daily approval list. |
| Kharchi deduction is lower than total advance | Net pre-deduction wage and older outstanding advances | Deductions are capped and allocated oldest first. Remaining Kharchi stays outstanding. |
| Confirmed wages do not change after editing source data | Batch confirmation status | Confirmed items are historical snapshots. Use the approved correction flow, not source rewrites. |
| Period crosses a historical daily-rate change | Rate history status | Effective-dated wage-rate history is not yet verified by the current contract. Do not claim the result is rate-history verified. |

## Screenshot capture list

| Capture ID | Screen/state | Required role |
| --- | --- | --- |
| `02-WF-01` | Worker and project assignment | Owner/Project Manager |
| `02-WF-02` | Work Calendar and effective override | Owner/authorised calendar user |
| `02-WF-03` | Attendance mark/history with half/full-day exceptions | Supervisor |
| `02-WF-04` | Kharchi form, detail, and adjustment trail | Authorised Kharchi user |
| `02-WF-05` | Wage preview calculation rows | Authorised Wages user |
| `02-WF-06` | Confirmed wage deduction allocations | Authorised Wages user |
| `02-WF-07` | Partial-paid and paid wage states | Authorised Wages user |
