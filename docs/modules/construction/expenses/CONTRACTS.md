# Site Expenses Module Contract

## 1. Status

- Status: Approved; API and database baseline verified, authenticated/client acceptance pending
- Scope owner: Product Owner
- Last updated: 2026-09-02

The Product Owner approved all section 18 decisions on 2026-09-02. Shared/API source and the
additive migration are implemented. Migration `018` and guarded role synchronization were verified
on the approved target. Authenticated runtime, Mobile, Web, offline, browser, and physical-device
acceptance remain separate gates.

## 2. Module Identity And Outcome

Site Expenses replaces petty-cash notebooks and informal expense messages with a Project-scoped,
auditable record of operational spending.

Included MVP scope:

- self-managed and approval-required Project workflows;
- record, review, approve, reject, cancel, and correct expenses;
- fixed default categories and payment methods;
- Project list, detail, pending review, summary, and CSV export;
- immutable history, reusable audit events, in-app notifications, idempotency, and concurrency;
- framework-neutral contracts for API, Mobile, and later Web use.

Excluded or deferred:

- bookkeeping, general ledger, GST input-credit, reimbursement, payable, bank reconciliation,
  budgets, vendor master, and automatic payment movement;
- automatic expense creation from Materials purchases or other modules;
- organization-defined categories;
- receipt files until Files/Media ownership and authorization are approved;
- offline storage/queue/conflict UI until the shared Offline Sync foundation exists;
- push, email, SMS, and WhatsApp delivery.

## 3. Terminology

- **Expense**: one Project operating-cost record for money spent or incurred.
- **Recognised cost**: an expense amount included in Project summaries; only `APPROVED` records count.
- **Direct workflow**: recording an expense intentionally approves it without a separate reviewer.
- **Approval-required workflow**: recording creates a pending expense that a separate authorized
  Member must approve or reject.
- **Adjustment**: an immutable signed correction linked to an approved expense. It does not rewrite
  the original amount.
- **Receipt**: optional evidence owned by the future Files/Media contract, not an unvalidated URL.

## 4. Actors And Permissions

Proposed permissions:

```text
expenses:read
expenses:create
expenses:update
expenses:configure
expenses:approve
expenses:reject
expenses:adjust
expenses:export
```

Every operation requires an authenticated user, active Organization membership, effective Project
access, the endpoint permission, and matching Organization/Project ownership.

Proposed default direction:

- Organization Owner, Builder Admin, Independent Contractor Owner: all permissions.
- Project Manager: read/create/update/approve/reject/adjust/export; no configure by default.
- Contractor Member and Site Supervisor: read/create/update their own eligible records.
- Builder Supervisor: read/approve/reject; no create or adjust by default.
- Sales User, Viewer, Platform Super Admin: none by default.

Project `CUSTOM` grants remain intersected with the Organization role ceiling. Navigation visibility
uses `expenses:read`; hiding navigation never replaces API authorization.

## 5. Workflows And State Transitions

Each Project has one explicit workflow mode:

```text
DIRECT
APPROVAL_REQUIRED
```

The API snapshots the configured mode onto every expense. Later configuration changes do not alter
existing records.

Proposed statuses:

```text
DRAFT
PENDING_APPROVAL
APPROVED
REJECTED
CANCELLED
```

Proposed transitions:

```text
DRAFT -> PENDING_APPROVAL | APPROVED | CANCELLED
PENDING_APPROVAL -> APPROVED | REJECTED | CANCELLED
REJECTED -> DRAFT | CANCELLED
APPROVED -> immutable; correct through adjustments only
CANCELLED -> terminal
```

- Create may save a draft or submit immediately.
- Submission chooses `APPROVED` in `DIRECT` mode or `PENDING_APPROVAL` in
  `APPROVAL_REQUIRED` mode.
- Direct mode is an intentional simplified workflow, not fake self-approval; audit records the mode.
- In approval-required mode, the recorder cannot approve or reject their own expense.
- Rejection requires a reason and may return to draft for correction and resubmission.
- Cancellation requires a reason and is allowed only before approval.
- Approved expenses are never edited, cancelled, or deleted.
- An approved expense is corrected only by immutable positive or negative adjustments.
- No standard delete endpoint exists for expenses, events, or adjustments.

## 6. Domain Model

### `project_expense_settings`

One row per Organization/Project with workflow mode, creator/updater, and timestamps.

### `project_expense_setting_events`

Immutable workflow-setting changes and their Project-scoped idempotency fingerprints.

### `site_expenses`

Stores:

- UUID, Organization, Project, expense date, category, description, amount;
- optional payment method and vendor/payee;
- recorder Member, immutable workflow snapshot, status, version;
- approval/rejection actor and timestamps where applicable;
- idempotency key/fingerprint, creator/updater, and timestamps.

Amounts use `DECIMAL(14,2)`, must be greater than zero, and are returned as decimal strings. Dates
are calendar dates. Descriptions are trimmed and bounded. Records use restrictive foreign keys and
retain financial history.

Default categories:

```text
TRANSPORT
TOOLS
FOOD
SAFETY
ELECTRICAL
MATERIAL_PURCHASE
LABOUR_RELATED
FUEL
MISCELLANEOUS
```

Proposed payment methods:

```text
CASH
UPI
BANK_TRANSFER
CARD
CHEQUE
OTHER
```

### `site_expense_events`

Immutable user-visible history for create, update, submit, approve, reject, cancel, resubmit, and
adjust actions. Stores previous/next status, comment/reason, actor, idempotency data, and timestamp.

### `site_expense_adjustments`

Immutable signed amount, non-empty reason, actor, idempotency data, and timestamp linked to one
approved expense. The effective recognised amount is original amount plus all adjustments and must
never fall below zero.

## 7. Shared Application Contract

`packages/shared` owns:

- workflow modes, statuses, categories, payment methods, event types, audit actions, and
  notification types;
- permissions and stable error codes;
- list/detail/summary/pagination models;
- create/update/transition/adjust/filter/export inputs;
- server-derived `availableActions` vocabulary.

Clients display server amounts and actions; they do not derive workflow authority or recognised
cost locally.

## 8. API Contract

Base route:

```text
/api/v1/organizations/:organizationId/projects/:projectId/expenses
```

Proposed routes:

- `GET|PUT /settings`;
- `GET /`, `/summary`, `/export`;
- `POST /`;
- `GET|PATCH /:expenseId`;
- `POST /:expenseId/submit`;
- `POST /:expenseId/approve`;
- `POST /:expenseId/reject`;
- `POST /:expenseId/cancel`;
- `POST /:expenseId/adjustments`.

List filters include status, category, payment method, date range, recorder, search, page, page size,
and sort. Summary returns approved original amount, signed adjustments, effective recognised cost,
pending amount/count, and counts by status.

All responses remain tenant- and Project-scoped. Detail exposes server-derived `availableActions`;
the server revalidates every action.

## 9. Idempotency And Concurrency

- Every mutation requires an 8-120 character idempotency key.
- Same key and fingerprint returns the prior outcome; changed fingerprint conflicts.
- Update and transitions require `expectedVersion`.
- Mutations lock the expense row with `FOR UPDATE` before validation and transition.
- Adjustments lock the expense and current adjustment total; effective recognised cost cannot be
  driven below zero.
- Expense, domain event, audit event, and notification writes share one transaction.
- Financial/approval conflicts are rejected; blind last-write-wins is forbidden.

## 10. Mobile Experience

Mobile is the primary field surface:

- permission-aware Menu entry and selected-Project context;
- approved/pending summary, paginated cards, search, filters, and export;
- fast record-expense form with optional draft save;
- pending review, detail timeline, approve/reject, cancellation, and adjustment flows;
- loading, empty, forbidden, retry, timeout, conflict, and success states;
- complete English/Hindi/Gujarati copy and accessibility labels;
- existing NirmanSite operational components and semantic tokens.

Offline creation remains a visible deferred state until the shared queue exists. The online API is
designed for safe future replay through idempotency.

## 11. Web-Admin Experience

Web is supporting back-office scope: Project list/detail, pending review, filters, approval/rejection,
corrections, summary, and export. It must not create a separate business workflow. Web implementation
may be deferred until the API and Mobile surface are verified.

## 12. Notifications

Reusable in-app notification records cover:

- `EXPENSE_APPROVAL_REQUIRED` to eligible same-Project approvers;
- `EXPENSE_APPROVED` or `EXPENSE_REJECTED` to the recorder;
- `EXPENSE_ADJUSTED` to the recorder and eligible approvers.

Deep links revalidate access. In-app records are authoritative; duplicate prevention is transactional.

## 13. Audit Events

Reusable immutable `audit_events` cover settings changes, create, update, submit, approve, reject,
cancel, and adjust. Approval/rejection/correction captures actor, Organization/Project, entity,
previous/new values as appropriate, workflow mode, reason, and request metadata. Sensitive payment
references are redacted from audit metadata.

## 14. Validation And Security

- Amount is greater than zero and uses at most two decimal places.
- Expense date cannot be unreasonably future-dated; the exact accepted future window is an owner
  decision in section 18.
- Category and payment method use shared enums.
- Vendor/payee and description are bounded and sanitized as plain text.
- Only draft/rejected records are editable; recorder ownership and elevated authority are rechecked.
- Approval-required mode enforces actor separation.
- Cross-tenant, inaccessible-Project, inactive-Member, stale-version, and duplicate-key attempts fail
  with stable codes.
- Request bodies are allowlisted; clients cannot set status, workflow, recorder, approval actor,
  recognised totals, or audit fields.

## 15. Reporting And Inter-module Contract

- Only approved expenses plus their adjustments contribute to recognised Project cost.
- Materials never auto-creates an Expense; future linkage requires an explicit idempotent contract.
- Project Access is a mandatory authorization dependency.
- Audit and Notifications are mandatory transactional dependencies.
- Files/Media is required before receipt evidence is implemented.
- Offline Sync may replay idempotent creation later.
- Dashboards/Reports may consume summary/export later.
- Workers, Attendance, Wages, Kharchi, Sales, Progress, and Gallery have no direct foreign key or
  side effect in the initial module.

## 16. Acceptance Criteria

Source verification requires shared/API type-checks, API build, focused tests, full API tests, and
`git diff --check`.

Runtime verification additionally requires separately approved migration/seed execution and
authenticated coverage for direct and approval workflows, self-approval denial, defaults and custom
grants, Project/tenant denial, idempotent retry, stale versions, concurrent approval/adjustment,
summary/export parity, notifications, and audit immutability.

Mobile, Web, offline, browser, accessibility, fluent-language, and physical-device acceptance remain
separate gates and must not be inferred from source checks.

## 17. Test Matrix

- shared enum/type/error coverage;
- repository SQL scope and mapping tests;
- service transition, validation, ownership, self-approval, idempotency, and concurrency tests;
- controller/DTO and permission tests;
- tenant and Project isolation tests;
- adjustment lower-bound and summary/export parity tests;
- notification recipient and deep-link reauthorization tests;
- Mobile component/flow, locale parity, accessibility, and device tests when authorized;
- Web component/flow and authenticated browser tests when authorized.

## 18. Approved Product Decisions

The Product Owner approved all decisions below on 2026-09-02:

1. Use per-Project `DIRECT` and `APPROVAL_REQUIRED` modes with immutable per-expense snapshots.
2. Add `expenses:configure` and `expenses:adjust` beyond the six MVP permission keys.
3. Allow draft save; submission auto-approves in Direct mode and becomes pending in Approval mode.
4. Approved expenses are immutable; corrections use signed adjustments and cannot reduce effective
   recognised cost below zero.
5. Cancel only before approval; rejected expenses may be edited and resubmitted.
6. Use `CASH`, `UPI`, `BANK_TRANSFER`, `CARD`, `CHEQUE`, and `OTHER` payment methods.
7. Defer receipt attachment until Files/Media ownership is approved.
8. Approve the proposed default role grants in section 4.
9. Choose the future-date validation window for `expense_date` (recommended: today only or earlier).
10. Confirm delivery sequence after approval: API first, then Mobile, with Web deferred unless
    separately requested.
