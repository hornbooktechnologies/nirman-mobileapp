# Materials Module Contract

## 1. Status

- Status: API implementation baseline; runtime and Product acceptance pending
- Scope owner: Product Owner
- Last updated: 2026-09-01

This contract governs the current Materials API source. Mobile, Web, offline sync, file attachments, Expenses integration, migration execution, seed execution, and authenticated runtime acceptance remain separate gates.

## 2. Purpose

Materials tracks one Project material requirement from creation through optional verification, final approval, purchase/order, partial delivery, and completion.

The module supports Independent Contractor and self-managed Builder work without fake approval while preserving Builder-controlled verification and final commercial approval when configured.

## 3. Scope And Boundaries

Included:

- one material item per request;
- Project workflow configuration;
- draft/edit/submit;
- optional site verification;
- final approval;
- return, rejection, and pre-purchase cancellation;
- multiple purchase/order records;
- multiple partial deliveries;
- immutable domain timeline and audit;
- in-app approval/result notifications;
- Project-scoped summary and CSV export;
- idempotency and concurrency control.

Excluded:

- vendor master, stock/inventory ledger, consumption, transfers, wastage, returns, quality inspection, and unit conversion;
- automatic Expense, payable, payment, reimbursement, GST, or accounting entries;
- invoice/challan files before Files/Media ownership exists;
- offline queue/storage/conflict UI;
- push, email, SMS, or WhatsApp delivery;
- Mobile and Web implementation.

## 4. Foundations

- Permission keys use `resource:action`.
- New tables use plural `snake_case`.
- Persistence is API-local `mysql2/promise`.
- `packages/shared` owns statuses, permissions, errors, and framework-neutral types.
- Every operation requires active Organization membership, effective Project access, and the endpoint permission.
- Platform Super Admin receives no Materials permission by default.
- Subscription does not replace authorization and does not create a Materials-specific entitlement.

## 5. Workflow Modes

Each Project explicitly configures one mode:

```text
DIRECT
FINAL_APPROVAL
VERIFY_THEN_FINAL
```

The API snapshots the configured mode onto each request. Later Project configuration changes do not rewrite existing requests.

- `DIRECT`: submission becomes `APPROVED`.
- `FINAL_APPROVAL`: submission becomes `PENDING_FINAL`.
- `VERIFY_THEN_FINAL`: submission becomes `PENDING_VERIFICATION`; verification then becomes `PENDING_FINAL`.

Builder Supervisor verification is never final commercial approval.

## 6. Statuses And Transitions

Statuses:

```text
DRAFT
SUBMITTED
PENDING_VERIFICATION
PENDING_FINAL
APPROVED
RETURNED_FOR_CHANGES
REJECTED
ORDERED
PARTIALLY_DELIVERED
DELIVERED
CANCELLED
```

Rules:

- Only `DRAFT` and `RETURNED_FOR_CHANGES` requests are editable.
- Submission chooses its next state from the immutable workflow snapshot.
- Return requires a comment and permits editing/resubmission.
- Rejection is terminal and requires a comment.
- Cancellation requires a reason and is unavailable after purchase.
- Purchase requires approval and may be split across multiple purchase records.
- Cumulative ordered quantity cannot exceed requested quantity.
- Delivery requires a purchase.
- Cumulative delivery cannot exceed cumulative ordered quantity.
- A request becomes `DELIVERED` only when cumulative delivered quantity equals requested quantity; otherwise it remains `PARTIALLY_DELIVERED`.
- No critical history has a standard delete endpoint.

## 7. Self-Approval And Actor Rules

- In approval workflows, the requester cannot verify or finally approve their own request.
- Direct workflow is not considered fake self-approval; it intentionally skips approval.
- A requester may edit their own draft/returned request.
- Another Member may edit it only when holding final commercial approval capability.
- A requester may cancel their request in an allowed state; another Member requires final commercial approval capability.
- Responsible Contractor references must resolve to an active same-Organization Member with current access to the same Project.

## 8. Permissions

```text
materials:read
materials:create
materials:update
materials:configure
materials:approve-level-1
materials:approve-final
materials:reject
materials:record-purchase
materials:record-delivery
materials:export
```

Default direction:

- Organization Owner, Builder Admin, Independent Contractor Owner: all.
- Project Manager: operational management, site verification, purchase/delivery, and export; no final approval by default.
- Builder Supervisor: read, site verification, return/reject, and delivery; no final approval.
- Contractor Member and Site Supervisor: read/create/update their requests; no commercial approval or purchase authority by default.
- Sales User, Viewer, Platform Super Admin: none by default.

Project `CUSTOM` grants remain intersected with the Organization role ceiling.

## 9. Data Contract

### `project_material_settings`

One workflow setting per Organization/Project.

### `material_requests`

Stores Organization/Project scope, material name/category, quantity/unit, request/required dates, optional estimate, optional responsible Contractor Member, requester Member, workflow snapshot, status, version, idempotency fingerprint, actor fields, and timestamps.

Supported units:

```text
BAG, KG, TONNE, PIECE, CUBIC_FOOT, CUBIC_METER,
SQUARE_FOOT, LITRE, METER, LOAD, OTHER
```

`OTHER` requires a custom unit label. Unit conversion is not supported.

### `material_request_events`

Immutable user-visible history of create, update, submit, verify, return, approve, reject, cancel, purchase, and delivery actions.

### `material_purchases`

Stores ordered quantity, optional vendor/reference, optional unit/total cost, purchase date, notes, actor, and idempotency data. Cost is a Materials fact only and creates no Expense.

### `material_deliveries`

Stores request/purchase scope, delivered quantity, delivery date/reference, notes, actor, and idempotency data.

## 10. API

Base:

```text
/api/v1/organizations/:organizationId/projects/:projectId/materials
```

Routes:

- `GET|PUT /settings`;
- `GET /`, `/summary`, `/export`;
- `POST /`;
- `GET|PATCH /:materialRequestId`;
- `POST /:id/submit|verify|return|approve|reject|cancel`;
- `POST /:id/purchases`;
- `POST /:id/deliveries`.

Detail responses expose server-derived `availableActions`. Clients may use them for UI but the server revalidates every command.

## 11. Idempotency And Concurrency

- Every mutation requires an 8–120 character idempotency key.
- Same key and same fingerprint returns the prior result.
- Same key and different fingerprint returns `MATERIAL_IDEMPOTENCY_CONFLICT`.
- Edit/transition/purchase/delivery require `expectedVersion`.
- Stale versions return `MATERIAL_VERSION_CONFLICT`.
- Approval, purchase, and delivery transactions lock the request and relevant totals with `FOR UPDATE`.
- Domain history, audit, and notifications are written in the same transaction as the state change.

## 12. Notifications And Audit

In-app notifications cover verification required, final approval required, return, approval, rejection, purchase, and delivery. Recipients are resolved from active same-Project effective permissions. Deep links never grant access.

Critical actions use immutable reusable `audit_events`. Domain events remain separately visible in the request timeline.

## 13. Inter-module Contract

- Project Access and Project Team are mandatory authorization/workflow dependencies.
- Audit and Notifications are transactional dependencies.
- Expenses receives no automatic write; future linkage requires a separate approved contract.
- Files/Media receives no URL/file reference until its ownership contract exists.
- Offline Sync may replay these idempotent APIs later but is not currently implemented.
- Reports/dashboards may consume list/summary data later.
- Workers, Attendance, Wages, Kharchi, and Sales have no direct Materials foreign keys or side effects.

## 14. Errors

Stable Materials error codes are defined in `packages/shared`, including not-found, workflow configuration, invalid transition/action, self-approval, Member/Project validation, version/idempotency conflict, quantity overflow, purchase requirement, completion, and unsupported correction.

## 15. Acceptance Gates

Source-complete requires shared/API type-checks, API build, focused and full tests, and whitespace validation.

Runtime-verified additionally requires separately approved migration/seed execution and authenticated tests for:

- Direct, final-only, and verify-then-final workflows;
- self-approval denial;
- default roles and Project CUSTOM grants;
- unassigned and cross-tenant denial;
- idempotent retries and stale versions;
- concurrent purchase/delivery totals;
- notification visibility/deep-link reauthorization;
- CSV scope/filter parity.

Mobile, Web, offline, browser, and physical-device acceptance remain separate gates.
