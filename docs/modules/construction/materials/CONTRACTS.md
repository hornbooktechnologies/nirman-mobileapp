# Materials Module Contract

## 1. Status

- Status: API implementation baseline; runtime and Product acceptance pending
- Scope owner: Product Owner
- Last updated: 2026-09-22 (two-mode approval policy approved by Product Owner)

This contract governs the current Materials API source. Mobile, Web, offline sync, file attachments, Expenses integration, migration execution, seed execution, and authenticated runtime acceptance remain separate gates.

## 2. Purpose

Materials tracks one Project material requirement from creation through final approval, purchase/order, partial delivery, and completion.

The module supports Independent Contractor and self-managed Builder work without fake approval while preserving Owner-controlled delegated final approval when configured.

## 3. Scope And Boundaries

Included:

- one material item per request;
- Project workflow configuration;
- draft/edit/submit;
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

Only `DIRECT` and `FINAL_APPROVAL` are configurable. DIRECT submission becomes APPROVED; FINAL_APPROVAL submission becomes PENDING_FINAL, except for the organization-owner self-request rule below. The API snapshots the mode per request. Normal settings changes affect new requests only.

Decision approved 2026-09-22 supersedes verification in MVP section 10 and the previous three-mode contract. Migration 027 changes legacy project settings to FINAL_APPROVAL and moves PENDING_VERIFICATION requests to PENDING_FINAL with a version increment. Original request workflow snapshots, fingerprints and historical events are preserved. A dedicated system migration record appears as WORKFLOW_MIGRATED in the timeline; it is not attributed to a human approver. Legacy draft/returned requests submit directly to the final stage. Historical VERIFY_THEN_FINAL and VERIFIED labels remain readable; the verify endpoint rejects further writes.

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
- Submission chooses its next state from the immutable workflow snapshot, with the Builder Owner own-request exception in section 7.
- Return requires a comment and permits editing/resubmission.
- Rejection is terminal and requires a comment.
- Cancellation requires a reason and is unavailable after purchase.
- Purchase requires approval and may be split across multiple purchase records.
- Cumulative ordered quantity cannot exceed requested quantity.
- Delivery requires a purchase.
- Cumulative delivery cannot exceed cumulative ordered quantity.
- A request becomes `DELIVERED` only when cumulative delivered quantity equals requested quantity; otherwise it remains `PARTIALLY_DELIVERED`.
- No critical history has a standard delete endpoint.

## 7. Approval Responsibility And Actor Rules

- The final decision pool is the eligible organization Owner plus members explicitly delegated by that Owner for this project. The first valid decision completes review; concurrent stale decisions fail through the request lock/version check.
- Builder Organization Owner and Independent Contractor Owner may submit their own requests directly to APPROVED and approve their own pending requests. Both need effective final approval and Materials read access. The audit basis is ORGANIZATION_OWNER_REQUEST; older BUILDER_OWNER_REQUEST audit history remains unchanged.
- Delegates cannot approve, reject or return their own requests. A request needing approval cannot be submitted without at least one other eligible approver (MATERIAL_APPROVER_REQUIRED).
- A Contractor Member in a Builder organization is distinct from an Independent Contractor Owner in another organization. Authority never crosses organizations. The optional responsible contractor reference does not grant approval authority or establish a reporting hierarchy.
- Delegation requires active organization membership, an active user, current project access (including assignment dates), and effective Materials read permission. CUSTOM read restrictions apply to organization-wide members too. Revoking project/read access makes a stored delegation ineffective.
- Only the organization Owner can replace the project's delegated approver list. An approval delegate cannot further delegate. Delegation is managed in Materials settings on Mobile and Web and applies to pending requests immediately.
- `project_material_approvers` is a narrow, explicit exception to the ordinary role ceiling for Materials approve-final/reject only. Other permissions retain the organization-role intersection. Existing non-owner role defaults alone no longer confer Materials final decision authority; an Owner must explicitly select those members as delegates.
- Owner final permission remains subject to effective project restrictions. A delegate needs explicit delegation plus read access, not a global role permission or a project checkbox for approve-final.
- Approve, return and reject all require the same final decision authority. Comments remain mandatory for return/reject. Retired verification/rejection-only roles cannot decide requests.
- Direct deliberately skips approval. Requester identity and all transitions remain recorded.
- Requesters may edit/submit/cancel their own request in allowed states. Editing/submitting/cancelling another member's request requires final approval capability as well as the endpoint's update permission.

## 8. Permissions

Existing `materials:read`, `create`, `update`, `configure`, `record-purchase`, `record-delivery`, and `export` rules remain. Effective `materials:approve-final` and `materials:reject` come from the decision pool above. `materials:approve-level-1` is retained as historical vocabulary but removed from effective project permissions and active actions.

The Materials API uses current ProjectAccessService authorization rather than the global user's role guard, which cannot represent active organization membership and project delegation. Authentication remains required. Final decisions and delegation edits recheck approval eligibility inside the transaction. A shared project lock serializes delegation replacement against decisions; the common eligibility query drives session permissions, actions and notifications.

## 9. Data Contract

### `project_material_settings`

One workflow setting per Organization/Project, with a version for optimistic configuration updates. PUT /settings accepts workflowMode, optional approverMemberIds and expectedVersion. Supplying approverMemberIds requires Owner authority and expectedVersion (0 for initial configuration); omission preserves delegation for older clients. Settings responses include version, canManageApprovers and approvalMembers (memberId, name, roleName, isOwner, delegated, canApprove). Inactive/inaccessible members are not offered as candidates.

### `project_material_approvers`

Same-organization/project membership references with grantor and timestamp; replacements and removals are audited through materials.settings.updated. Delegation grants neither project nor Materials read access.

### `material_workflow_migrations`

Immutable migration provenance (request scope, previous status/version, system timestamp). Original domain/audit events are never rewritten.

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

Detail responses expose server-derived `availableActions` and current `approvalResponsibility` (eligible member IDs, names and roles, excluding a non-owner requester). Clients may use them for UI but the server revalidates every command.

## 11. Idempotency And Concurrency

- Every mutation requires an 8–120 character idempotency key.
- Same key and same fingerprint returns the prior result.
- Same key and different fingerprint returns `MATERIAL_IDEMPOTENCY_CONFLICT`.
- Edit/transition/purchase/delivery require `expectedVersion`.
- Stale versions return `MATERIAL_VERSION_CONFLICT`.
- Approval, purchase, and delivery transactions lock the request and relevant totals with `FOR UPDATE`.
- Domain history, audit, and notifications are written in the same transaction as the state change.

## 12. Notifications And Audit

In-app notifications cover final approval required, return, approval, rejection, purchase, and delivery. Recipients are resolved through the same Materials approval eligibility query as API actions. Requesters are excluded from approval-required notices. Newly delegated members receive notices for existing pending requests. Migration 027 backfills Owner final-approval inbox/push deliveries and stops queued verification reminders. Deep links never grant access.

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

- Direct and final-only workflows, retired-verification rejection and legacy conversion;
- delegated self-approval denial and both owner-type exceptions;
- default roles and Project CUSTOM grants;
- unassigned and cross-tenant denial;
- idempotent retries and stale versions;
- concurrent purchase/delivery totals;
- notification visibility/deep-link reauthorization;
- CSV scope/filter parity.

Mobile, Web, offline, browser, and physical-device acceptance remain separate gates.
