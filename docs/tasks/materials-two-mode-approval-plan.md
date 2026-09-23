# Materials two-mode approval and responsibility plan

Date: 2026-09-22
Status: policy approved and implemented on 2026-09-22; database rollout and runtime acceptance pending.

## Authorized direction

Settings must offer only Direct and Final approval across API, database, Mobile and Web. Remove verification from the new-request workflow. Approval responsibility must respect the active organization membership, project access and explicit delegated authority.

## Source audit

- EXISTING: shared `MATERIAL_WORKFLOW_MODES` drives both client settings and API DTO validation. It currently includes `VERIFY_THEN_FINAL`.
- EXISTING: migration 017 constrains both project settings and request snapshots to three modes. Requests snapshot their mode; changing settings does not change existing requests.
- EXISTING: service/repository commands retain versions, idempotency, row locks, audit events and transactional notifications. Preserve these guarantees.
- EXISTING: final approval uses `materials:approve-final`. There is no exclusive approval assignee. `responsibleContractorMemberId` is a responsible-party reference, not approval authority.
- EXISTING: Builder Organization Owner self-submission can approve immediately. Independent Contractor Owner does not currently receive this exception.
- EXISTING: Contractor Member and Independent Contractor Owner are distinct memberships. Decision 005 forbids automatic cross-organization access or staff propagation.
- NEEDS_CHANGE: Contractor Member seed defaults lack final approval; CUSTOM grants intersect the organization role ceiling. Merely adding a project grant cannot authorize a contractor. Giving the permission to the default role would unintentionally authorize ROLE_DEFAULT contractors.
- NEEDS_CHANGE: notification recipient SQL bypasses CUSTOM restrictions for organization-wide members, whereas ProjectAccessService applies an active CUSTOM assignment even to those members. Align recipient eligibility with command eligibility.
- NEEDS_CHANGE: return/reject currently require `materials:reject`, without final-approval authority. Removing verification must not leave former verification-only roles able to decide final requests.
- MISSING: an explicit project-scoped delegation mechanism for Contractor Members beyond their default role ceiling, and user-visible approval responsibility.
- DEFERRED: live database inspection, migration execution, authenticated acceptance and device/browser acceptance. Audit is source-based; no live grants or data counts were inferred.

## Approved policy

1. Approval pool: Owner plus explicitly authorized project approvers; first valid final decision wins. Owner retains oversight. A contractor without delegation cannot approve, reject or return final-stage requests. Approved: shared eligible pool.
2. Owner requests: extend the existing Builder Owner exception to Independent Contractor Owner in their own organization. Approved; delegates still cannot approve their own requests.
3. Legacy pending verification: explicitly transition to PENDING_FINAL with migration provenance and version increment, preserving original events and workflow snapshot. Approved: convert pending verification to final approval.

Do not interpret a contractor's ownership in another organization as permission in the Builder organization. Do not infer a supervisor-to-contractor reporting chain from the optional responsible-contractor field.

## Implementation sequence

### 1. Contract and shared vocabulary

Update the Materials contract and requirements supersession notes with the confirmed policy. Separate selectable modes (DIRECT, FINAL_APPROVAL) from legacy historical mode types so old details/timelines remain readable. Define API approval-responsibility metadata, including eligible approvers and actor actions, without letting clients compute authority. Retain historical VERIFIED events and labels.

### 2. Delegation and authorization

Add explicit Materials-only project delegation records for active same-organization members, managed by the organization owner, with grant/revoke audit. Scope delegated decisions to final approval, return and rejection; do not broaden unrelated role permissions or seed Contractor Member with automatic approval.

Integrate this narrowly scoped authority into Project Access and endpoint guards, session/project permission snapshots, team permission management and Materials action derivation. A Materials repository-only exception would fail existing guards and client permission checks. Preserve CUSTOM restrictions for ordinary permissions; define the explicit delegation exception in the authorization contract.

Use one Materials eligibility policy for availableActions, execution and notification recipients. Revalidate active access and delegation when deciding requests. Exclude the requester except for the confirmed owner exception. Ensure revocation and approval have a defined transaction ordering. Reject submission with an actionable error if no eligible approver exists rather than silently queueing an unapprovable request.

### 3. API workflow and notifications

New submissions: DIRECT -> APPROVED; FINAL_APPROVAL -> PENDING_FINAL, subject to owner exception. Reject retired configuration values with a clear validation error. Retire verification execution according to the chosen legacy policy.

Final approve/return/reject must all require final decision authority. Preserve comment requirements, exact idempotency replay, expectedVersion and locked status checks. Notify the actual eligible pool, excluding the requester; after a decision, notify the requester. Notification links always reauthorize. Keep historic notifications readable and handle retired verification links safely.

### 4. Database rollout

Create a new ordered migration; do not edit migration 017. Add delegation storage and constraints. Convert legacy project settings to FINAL_APPROVAL and restrict future settings to the two modes. Preserve request workflow snapshots and historical events.

If conversion is approved, move only pending-verification requests to PENDING_FINAL, increment versions, record migration provenance, and ensure eligible approvers receive a deduplicated final-approval notification through a guarded backfill. Define legacy draft/returned resubmission as final-only. Do not rewrite completed approvals, purchase/delivery data or idempotency fingerprints.

Preflight must count affected settings and requests by status, check eligible recipients and orphaned memberships, and inspect database CHECK-constraint compatibility. Coordinate old-client/API rollout so old writers cannot recreate retired settings. Execute only against an explicitly approved database target. Forward recovery is preferred after new decisions; rollback must never undo real approvals.

### 5. Mobile and Web

Show only Direct and Final approval in settings. Explain Direct bypasses approval and Final approval goes to authorized project approvers. Display API-derived approval responsibility and decisions; update owner delegation controls through existing project-team patterns. Preserve permission/cache isolation and unsafe-write recovery.

Remove Verify from active flows under the chosen legacy policy, while retaining historical timeline rendering. Update en/hi/gu Materials strings and affected permission labels. Handle stale sessions, revoked authority, no-approver errors and legacy settings responses.

### 6. Verification and documentation

Test owner and Independent Contractor Owner; Site Supervisor requests; contractor with/without delegation; requester exclusion; CUSTOM grants; expired/revoked assignments; organization-wide CUSTOM restrictions; cross-tenant rejection; return/reject parity; no eligible approver; simultaneous decisions; delegation revocation; idempotency retries; stale versions; migration/backfill reruns and preserved history.

Run shared/API/Mobile/Web focused type checks, API tests, scoped client checks, locale validation and git diff --check. Record whole-app failures separately if encountered. Verify authenticated API notification/action parity, Web/Mobile responsibility display and physical-device behavior before acceptance. Update Materials contract, task and progress records with actual evidence.

## Scope boundaries

No Expense, purchase accounting, worker/wage, inventory, cross-organization sharing or reporting-chain redesign. No global role-ceiling relaxation. No database execution, seed, build distribution or deployment has been performed by this planning task.

## Implementation details and rollout

- Delegation is managed directly in Materials settings on both clients, rather than changing the generic project-team permission editor. This keeps the explicit Materials exception separate from the ordinary role ceiling.
- One API policy query is reused by Project Access and Materials for candidates, effective actions and notification routing. Former non-owner role defaults are not auto-delegated; the Owner explicitly chooses delegates.
- Migration 027 adds project_material_approvers, settings version and material_workflow_migrations. Both owner types self-approve with ORGANIZATION_OWNER_REQUEST audit provenance. Old snapshots/events remain unchanged.
- API PUT /settings accepts optional approverMemberIds and expectedVersion. Delegation replacement requires Owner authority plus version; old clients omitting delegation cannot erase it. A stale settings save returns 409 and requires refresh.
- A stale client session cannot override fresh API final decision availability; final actions are rechecked on the server. Inactive/revoked members lose decision authority immediately for subsequent commands.
- No database commands have run. Before deploying the new API, approve a target and perform the guarded migration rollout with API/push writers stopped. Check affected pending requests and eligible Owners, back up, apply migration 027 once, inspect provenance/version counts and inbox/push backfill, then start the API and refresh client sessions.
- DDL follows the existing migration runner and is not claimed transactionally reversible. A partially failed migration requires inspection and explicit recovery, never blind rerun. After final decisions occur, use forward recovery; do not roll back statuses or audit history.
- Authenticated API, SQL engine/runtime, browser and physical-device acceptance remain distinct pending gates until run.

## Verification evidence

- Shared build passed.
- Full API tests: 37 suites, 246 tests passed; includes 13 new approval-pool cases and project permission regressions.
- API production build and API/Mobile type-check passed.
- Web Materials rules: 6 tests passed; scoped Web lint passed.
- Web source-only TypeScript check passed with generated Next route declarations excluded in-memory. Ordinary Web type-check failed in pre-existing malformed `.next/dev/types/routes.d.ts` and `.next/dev/types/validator.ts`; generated files were not modified.
- Locale validation: 18 namespaces across en/hi/gu passed.
- Migration SQL is prepared, not executed or verified against the live SQL engine. No live permission/data assumptions were used to claim acceptance.
- At implementation time, local root configuration identified md-in-30.webhostbox.net:3306 / vishwlt9_nirmansite; no live database check had yet been run.

2026-09-23 production login incident and rollout: status against md-in-30.webhostbox.net:3306 / vishwlt9_nirmansite showed 027 as the only pending migration. Login failed because `project_material_approvers` was absent. Production is MySQL 5.7.23, which did not retain the legacy Materials `CHECK`; 027 now conditionally replaces that constraint only on servers that support it. Preflight found zero `VERIFY_THEN_FINAL` settings and zero `PENDING_VERIFICATION` requests. After explicit user authorization, 027 was applied: the ledger reports 28 applied and zero pending. Read-only verification found both new tables and the settings version column, and the approval-policy query used during login succeeded for a sample project. A production backup and API write pause were not independently verified; an authenticated production login remains to be checked. The corrected migration source must reach main to match the recorded checksum.

Final recheck: 5 focused API suites / 54 tests passed after the final source edits; API and Mobile type-checks and scoped API lint passed. git diff --check passed.
