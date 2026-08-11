# Phase 1 Foundation Review: Identity Access + Project Setup And Assignment

## Status

Review created on 2026-07-30.

This is documentation/review only. No application code, package manifests, SQL migrations, seed commands, or production data were changed as part of this review.

## Source Read

- `docs/tasks/current-task.md`
- `docs/tasks/phase-1-identity-project-technical-plan.md`
- `docs/modules/foundation/identity-access/CONTRACTS.md`
- `docs/modules/foundation/project-access/CONTRACTS.md`
- `apps/api/src/modules/organizations`
- `apps/api/src/modules/projects`
- `apps/api/src/modules/project-access`
- `apps/web/src/features/organizations`
- `apps/web/src/features/projects`
- `apps/mobile/src/providers/session-provider.tsx`
- `apps/mobile/src/features/projects`
- `packages/shared/src/constants`

## 1. What Has Been Implemented

### Shared Foundation Constants

Implemented in `packages/shared/src/constants`:

- Foundation permission resources include `organizations`, `members`, `projects`, `project-members`, `notifications`, and `reports`.
- Foundation permission actions include invite/activate/deactivate/assign/unassign/switch/view-all/archive/restore/export.
- `FOUNDATION_PERMISSIONS` includes organization, member, project, project-member, settings, audit-log, notification, and report permissions.
- Shared status constants exist for users, organizations, organization members, projects, project members, invitations, sessions, and project access scope.
- Project status transitions are centralized in `PROJECT_STATUS_TRANSITIONS`.
- Stable foundation error codes include auth, organization, membership, project, project-member, permission, validation, conflict, idempotency, and server errors.

### API Foundation

Implemented in `apps/api`:

- `OrganizationsModule` and `ProjectsModule` are registered in `apps/api/src/app.module.ts`.
- Organization endpoints exist for list, create, detail, update, switch, member list, member update, and member deactivate.
- Project endpoints exist for list, create, detail, update, archive, restore, project-access summary, switch, context, member list, assign, update assignment, and unassign.
- `ProjectAccessService` resolves active organization access, active membership, permissions, organization-wide project access, project access, and expanded session payload.
- Project access checks compare `organizationId`, `projectId`, active membership, required permission, organization-wide access, and active `project_members` assignment.
- Project creation validates create status, date range, and project code uniqueness.
- Project updates enforce status transitions and read-only behavior for archived/completed projects.
- Project restore requires `projects:restore` plus `projects:view-all`.
- Project member assignment requires active organization membership and both project-member mutation permission plus `projects:assign`.
- Organization owner/member protection includes self role/status update prevention and last active owner guard for non-active status changes.
- A draft SQL migration exists at `apps/api/src/database/sql/migrations/001_phase1_identity_project_setup_draft.sql` for `organizations`, `organization_members`, `projects`, and `project_members`.

### Web Admin Foundation

Implemented in `apps/web`:

- Organization services and React Query hooks call the API for list, detail, create, update, switch, member list, member update, and deactivation.
- Organization list/detail pages use permission gates and show loading, error, empty, and action states.
- Project services and hooks call the API for list, detail, create, update, archive, restore, project access, members, assign, update assignment, and unassign.
- Project list/create/detail/member panels use existing web patterns and permission gates for read/create/update/member assignment actions.
- Web remains back-office/admin-oriented; mobile components are not reused.

### Mobile Field Foundation

Implemented in `apps/mobile`:

- Mobile session provider stores expanded session state: token, user, active organization, memberships, permissions, project access, feature flags, server time, and active project.
- Mobile login calls `/auth/login` through the existing API client.
- Mobile can refresh `/auth/session` with the current access token.
- Active project is resolved from authorized project access data and persisted locally.
- Project switching is local-only among active projects already present in the latest session payload.
- `ProjectContextCard` and bottom-sheet switcher show active organization/project context for field workflows.

## 2. Contracts Satisfied

Satisfied or substantially satisfied:

- `resource:action` permission format is implemented in shared constants and used by API/web gates.
- Shared statuses and project status transitions are centralized.
- API database access remains in `apps/api` with `mysql2/promise`; no web/mobile database access was found in reviewed surfaces.
- Organization membership and project membership are modeled through `organization_members` and `project_members` in API repositories and draft SQL.
- Login/session payload is expanded through API project-access session resolution and mobile storage.
- API has reusable organization/project access helpers before business modules.
- Web owns organization/project setup and assignment workflows.
- Mobile owns field-friendly active organization/project context and project switching.
- Project-scoped API reads and mutations include organization/project access checks.
- No Workers, Attendance, Kharchi, Sales, Reports, or Offline Sync implementation was added in the reviewed foundation surfaces.

Partially satisfied:

- Stable error code constants exist, but API controllers/services still throw Nest exceptions with message strings rather than consistently returning shared error-code envelopes.
- Owner lockout protection exists for member status changes, but deeper role/permission lockout and assignment-owner protection need runtime tests.
- Audit event names are documented, but audit writes are not implemented for organization/project/member changes.
- Mobile stale-project clearing exists through session merge/local selection rules, but no runtime test proves behavior after server-side access removal.

Not satisfied yet:

- OTP/mobile refresh-token strategy is not implemented.
- Invitation endpoints and delivery are not implemented.
- Organization-scoped roles are not implemented; the inherited global role bridge remains in use.
- Shared request/response schemas are not fully centralized beyond constants/types used by implementation.
- Runtime tenant/project isolation tests are not in place.

## 3. Verification Commands Passed

Ran during this review:

```bash
pnpm --filter @nirman-app/shared type-check
pnpm --filter @nirman-app/api type-check
pnpm --filter @nirman-app/web type-check
pnpm --filter @nirman-app/mobile type-check
pnpm --filter @nirman-app/api build
```

Results:

- Shared type-check passed.
- API type-check passed.
- Web type-check passed.
- Mobile type-check passed. The command printed a PowerShell `Import-Clixml` warning, but `tsc --noEmit` exited successfully.
- API build passed.

## 4. Not Runtime-Smoked

Not run because this review did not have an approved safe database/API/device target:

- SQL migration execution.
- Seed or backfill execution.
- API startup against a populated local/throwaway MySQL/MariaDB database.
- Live login through `/auth/login`.
- Live `/auth/session` payload validation.
- Organization create/list/update/member lifecycle.
- Project create/list/detail/update/archive/restore lifecycle.
- Project member assign/update/unassign lifecycle.
- Web browser smoke against a running API.
- Mobile device or Expo smoke against a running API.
- Cross-tenant ID manipulation checks.
- Removed-project-access stale mobile session checks.

No production DB mutation was performed.

## 5. Remaining Open Product Decisions

- Authentication method: email/password-first, OTP-first, or both.
- Mobile refresh strategy: cookie-compatible refresh, response-body refresh token in secure storage, or another approved approach.
- External Contractor collaboration model.
- Organization-scoped role model versus inherited global role compatibility bridge.
- Member/project permission override scope.
- Active organization/project persistence: client-only, server-side preference, or both.
- Support/admin impersonation scope.
- Access-token expiry and permission refresh interval.
- Invitation delivery channel.
- Cross-tenant security posture: forbidden versus not-found.
- Migration execution target and MySQL/MariaDB version.
- ID strategy for future modules.
- Initial project creation during onboarding.
- Project cover image/file metadata table ownership.
- Completed project reopening policy.
- Archive effects for future operational corrections.

## 6. Risks Before Business Modules

- Static verification is good, but no runtime DB/API smoke has proven the new repositories against a real schema.
- The draft SQL references inherited tables and foreign keys that need a safe DB compatibility check before execution.
- API error responses are not yet consistently mapped to shared error codes.
- Permission resolution still depends on inherited global `role`/`permission` behavior.
- Business modules could accidentally bypass `ProjectAccessService` if project-scoped helper usage is not made mandatory in their contracts.
- Mobile cached permissions/project context are useful for field UX but cannot be treated as authorization.
- Owner lockout, self-removal, cross-tenant, duplicate project code, and project assignment edge cases need tests before operational data exists.
- Audit logging for organization/project/member changes is still missing.
- The web UI has ergonomic permission gates, but backend authorization remains the security boundary and needs runtime proof.

## 7. Required Fixes Before Workers/Attendance

Required before implementing Workers or Attendance APIs:

1. Run the Phase 1 SQL migration against a confirmed local or throwaway MySQL/MariaDB database only.
2. Seed/backfill foundation permissions, default organization, owner membership, and at least one project in the safe database.
3. Runtime-smoke `/auth/login` and `/auth/session` and capture the expanded session payload.
4. Runtime-smoke organization access, project access, and project member assignment flows.
5. Add or manually verify tenant/project isolation cases: wrong organization ID, wrong project ID, unassigned member, inactive member, archived/completed project.
6. Standardize API error envelopes or document the temporary Nest-exception bridge before business-module clients depend on errors.
7. Add business-module contract rule that every project-scoped endpoint must use `ProjectAccessService.resolveProjectAccess` or an equivalent approved helper.
8. Decide the first business-module data ownership shape: every Workers/Attendance record must include `organization_id` and `project_id` where project-scoped.
9. Confirm mobile behavior for no project, one project, many projects, and removed/stale project access against a live API.

Required before Workers or Attendance UI:

1. Confirm whether Workers is web-admin-owned, mobile-field-owned, or both for the first slice.
2. Confirm whether Attendance starts mobile-first and what offline behavior is explicitly excluded.
3. Confirm permission keys only after each module contract is approved; do not add `attendance:*` or `workers:*` ahead of contract approval.

## 8. Recommendation

Recommendation: pause business-module implementation until foundation runtime smoke is completed on a safe local or throwaway database.

It is reasonable to proceed with Workers and Attendance contract drafting, because the foundation shape is now coherent and statically verified. Do not proceed to Workers or Attendance implementation until the required runtime smoke and tenant/project isolation checks above pass.

Decision:

```text
Proceed with next module contracts.
Pause business module code implementation.
```
