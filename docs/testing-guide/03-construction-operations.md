# 03 — Construction Operations

## Purpose

This chapter covers Project-scoped operational modules outside the workforce/payroll flow. Every test begins by selecting the correct active organisation and Project. Platform Super Admin has no default operational Project session and should not receive Materials, Expenses, Progress, or Gallery access merely to make a menu appear.

## Materials

### What to test

One material request tracks one required item through the Project’s configured workflow. It is not a purchase order system that automatically creates an Expense.

### CO-01 — Create and submit a material request

1. Sign in as an operational role with `materials:read` and create permission for the selected Project.
2. Open **Materials**, create one request with its item, quantity/unit, and required details.
3. Save as draft, reopen it, then submit it.

**Expected result:** the request belongs only to the active Project; draft/edit/submit actions are available only when the server permits them. Repeating a retryable create/submit action must not create a duplicate request.

### CO-02 — Verify the configured workflow

Run the same request through each enabled Project workflow mode:

| Mode | Expected path |
| --- | --- |
| `DIRECT` | Request can proceed without fake verification/final approval. |
| `FINAL_APPROVAL` | Final commercial approval is required before the next allowed purchasing step. |
| `VERIFY_THEN_FINAL` | Site verification precedes final approval. |

**Expected result:** the workflow mode is snapshotted on the request. A later Project setting change must not rewrite the workflow of an existing request.

### CO-03 — Purchase and delivery history

1. Add multiple purchase/order records where permitted.
2. Record more than one partial delivery.
3. Review the request timeline and summary.

**Expected result:** purchase and delivery history remains traceable; partial deliveries do not overwrite earlier deliveries. There is no automatic Expense record—create and test an Expense separately when the business process needs one.

### CO-04 — Materials access and notification result

1. Submit a request as a requester with limited Project access.
2. Complete an approval, verification, return, or rejection as an authorised reviewer.
3. Check the requester’s Notifications inbox.

**Expected result:** only active, same-Project recipients with effective permissions see a result notification. Sales User and Platform Super Admin do not gain Materials access through notification delivery.

## Site Expenses

### What to test

Expenses records Project costs under a per-Project workflow mode. The server decides status and available actions; client screens must display them rather than inventing actions.

### CO-05 — Draft, submit, approve, and reject an Expense

1. Configure or identify the Project’s mode: `DIRECT` or `APPROVAL_REQUIRED`.
2. Create an Expense, save a draft, edit it, and submit it.
3. In Direct mode, verify the submitted Expense becomes `APPROVED`.
4. In Approval-required mode, verify the submitted Expense becomes `PENDING_APPROVAL`, then approve or reject it with the authorised reviewer.

**Expected result:** the workflow mode is snapshotted on the Expense. Approved Expenses are immutable. A rejected Expense may be edited and resubmitted; cancellation is only available before approval. The user who records an Expense cannot bypass reviewer separation where approval is required.

### CO-06 — Correct an approved Expense

1. Open an approved Expense.
2. Attempt to edit or delete its original amount.
3. Record a positive or negative signed adjustment with a reason.
4. Review the timeline, summary, and export.

**Expected result:** the original recognised cost remains immutable. Corrections are separate auditable adjustments and cannot reduce recognised cost below zero. The calculation and CSV must agree with the detail timeline.

### CO-07 — Retry, stale version, and notification checks

1. Submit the same retryable command twice using a simulated retry.
2. Open the same Expense in two sessions, make a change in one, then submit the stale change in the other.
3. Complete an approval/rejection/adjustment and check the recorder’s notification inbox.

**Expected result:** retries do not duplicate financial records; stale edits show a recoverable conflict rather than silently overwriting data. Results notify the original recorder except the actor who performed the action.

## Project Progress

### CO-08 — Record a Progress update

1. Open **Progress** for the active Project.
2. Review the nine canonical stage values and the overall value.
3. Submit a stage update with an expected previous percentage.
4. Reopen history and the Project/organisation summary.

**Expected result:** updates append immutable history. The displayed overall percentage follows the approved equal-weight calculation across the nine stages. A stale expected value must not overwrite a newer update.

### CO-09 — Progress regression and retry

1. Attempt to reduce a stage percentage without a note.
2. Add the required regression note and submit.
3. Retry the same request.

**Expected result:** regression without a note is blocked. The valid correction becomes a new history entry, preserving earlier values; an idempotent replay does not create a duplicate update.

## Site Gallery / Project Diary

### CO-10 — Upload and view Project media

1. Use the Gallery camera/library picker to upload a disposable image to the active Project.
2. Interrupt network access if practical, reopen the app, and retry the queued upload.
3. Filter Gallery by category/date; open image detail.

**Expected result:** the upload is Project-scoped, access-controlled, and visible through authenticated media streaming. The app shows a meaningful retry state rather than duplicating rows on retry. Public unauthenticated access to the media must fail.

### CO-11 — Gallery review/result notification

1. Where the configured workflow exposes review, approve or reject an uploaded entry.
2. Check history and the uploader’s notification inbox.

**Expected result:** review events retain audit/history; the original uploader receives the result notification except when they are the actor. Gallery does not support generic file deletion, video, GPS, or offline sync unless those features are explicitly released.

## Screenshot capture list

| Capture ID | Screen/state |
| --- | --- |
| `03-CO-01` | Materials list, create form, and request timeline |
| `03-CO-02` | Each Materials workflow state |
| `03-CO-03` | Expense draft, approval, rejection, and adjustment timeline |
| `03-CO-04` | Progress summary, update sheet, and history |
| `03-CO-05` | Gallery picker permission, grid, filter, detail, and retry state |
