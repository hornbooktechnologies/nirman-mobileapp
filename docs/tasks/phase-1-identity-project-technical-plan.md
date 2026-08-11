# Phase 1 Technical Implementation Plan: Identity Access + Project Setup And Assignment

## Status

Draft implementation plan.

This document is planning only. It does not approve code edits, package installation, SQL migration execution, database mutation, or feature implementation. Implementation must begin in a separate approved task.

## Source Documents Read

- `README.md`
- `PLANNING.md`
- `MVP_REQUIREMENTS.md`
- `docs/phases/MVP_PHASES.md`
- `docs/tasks/current-task.md`
- `docs/decisions/004-database-access-mysql2.md`
- `docs/modules/foundation/identity-access/CONTRACTS.md`
- `docs/modules/foundation/project-access/CONTRACTS.md`
- `docs/templates/module-contract-template.md`
- `docs/templates/api-contract-template.md`
- `docs/templates/db-change-template.md`

## Current Implementation Inspected

- `apps/api/src/modules/auth`
- `apps/api/src/modules/users`
- `apps/api/src/modules/roles`
- `apps/api/src/modules/settings`
- `apps/api/src/database`
- `packages/shared/src/constants/permissions.ts`
- `apps/web/src/config/navigation.ts`
- `apps/mobile/src/providers/session-provider.tsx`
- `apps/mobile/src/lib/auth`
- `apps/mobile/src/lib/api`

## Approved Foundation Decisions

- Use `resource:action` permissions.
- Use plural `snake_case` table names for new NirmanSite SQL tables.
- Use `apps/api` with `mysql2/promise` only for active database access.
- Treat `packages/database/prisma` as archived inherited history.
- Keep contracts in `packages/shared` for MVP.
- Future access model uses `organization_members` and `project_members`.
- Current global `users.roleId` is inherited compatibility only.

## Current Implementation Summary

- API auth currently supports email/password login, JWT access tokens, refresh-token rotation through an HTTP-only cookie, logout, `/auth/me`, and password change.
- API auth, users, and roles currently resolve permissions through inherited global `user.roleId`, `role`, and `permission` tables.
- API database access is already API-local `mysql2/promise` through `apps/api/src/database`.
- Shared permissions currently include only `users`, `roles`, `settings`, `files`, and `audit-logs`, with actions `create`, `read`, `update`, `delete`, and `manage`.
- Web navigation currently exposes dashboard, users, roles, settings, and profile, using permission-aware config.
- Web auth currently stores access token locally and relies on API refresh through cookie behavior.
- Mobile session currently stores only a placeholder access token and user name.
- Mobile API helper can send bearer tokens but does not yet implement real login, refresh, project access, or project switching.

## Objective

Implement the tenant and project-access foundation needed before Workers, Attendance, Kharchi, Sales, Reports, Offline Sync, or any other project-scoped MVP module begins.

The implementation must allow the API to resolve:

```text
Authenticated user
+ active organisation membership
+ required permission
+ project assignment or organisation-wide project scope
+ record belongs to same organisation/project
```

## Non-Goals

- Do not implement Workers, Attendance, Wages, Kharchi, Materials, Expenses, Progress, Gallery, CRM, Reports, Notifications delivery, Audit UI, or Offline Sync.
- Do not rename inherited physical tables such as `user`, `role`, `permission`, `refreshtoken`, or `systemsetting`.
- Do not use Prisma.
- Do not create `packages/contracts`.
- Do not add OTP implementation until authentication method and provider decisions are approved.
- Do not implement external Contractor organisation collaboration unless separately approved.

## 1. Shared Contract Changes Needed First

Create or extend shared contracts in `packages/shared` before API, web, or mobile implementation:

- API envelope and error envelope types if not already centralised.
- Auth/session response contract with active organisation, memberships, permissions, project access, feature flags, token metadata, and server time.
- Organisation contracts: type, status, operating profile, create/update/list/detail responses.
- Organisation member contracts: member status, invite/create/update/deactivate schemas, owner lockout error shape.
- Project contracts: status, type, status transitions, create/update/list/detail responses.
- Project member contracts: assignment status, assign/update/unassign schemas.
- Project access contracts: scope `ALL|ASSIGNED|NONE`, accessible project list, active project switch response.
- Shared validation constants for name length, project code normalisation, date ranges, and address fields.

Recommended shared paths after approval:

```text
packages/shared/src/constants/permissions.ts
packages/shared/src/constants/errors.ts
packages/shared/src/constants/statuses.ts
packages/shared/src/schemas/auth.ts
packages/shared/src/schemas/organizations.ts
packages/shared/src/schemas/memberships.ts
packages/shared/src/schemas/projects.ts
packages/shared/src/types/auth.ts
packages/shared/src/types/organizations.ts
packages/shared/src/types/projects.ts
packages/shared/src/types/api.ts
```

Keep the implementation platform-neutral: no Nest, Next, Expo, React, `mysql2`, or server-only imports in shared.

## 2. Permission Constants To Add

Extend `PERMISSION_RESOURCES` with:

```text
organizations
members
projects
project-members
notifications
reports
```

Extend `PERMISSION_ACTIONS` with:

```text
invite
activate
deactivate
assign
unassign
switch
view-all
view-own
archive
restore
export
```

Initial Phase 1 permissions:

```text
organizations:create
organizations:read
organizations:update
organizations:activate
organizations:deactivate

members:read
members:invite
members:update
members:deactivate

roles:read
roles:create
roles:update
roles:delete
roles:manage

projects:read
projects:create
projects:update
projects:archive
projects:restore
projects:assign
projects:view-all
projects:switch

project-members:read
project-members:assign
project-members:update
project-members:unassign
project-members:view-all

settings:read
settings:update
audit-logs:read
notifications:read
reports:read
```

Do not add module permissions such as `attendance:mark` until the relevant module contract is approved.

## 3. Error Codes To Add

Add stable shared error codes before controllers return module-specific errors:

```text
AUTH_INVALID_CREDENTIALS
AUTH_TOKEN_EXPIRED
AUTH_REFRESH_TOKEN_INVALID
AUTH_REFRESH_TOKEN_REVOKED
AUTH_SESSION_REQUIRED
AUTH_PASSWORD_WEAK
AUTH_RATE_LIMITED

ORG_REQUIRED
ORG_NOT_FOUND
ORG_INACTIVE
ORG_ACCESS_DENIED

MEMBERSHIP_REQUIRED
MEMBERSHIP_NOT_FOUND
MEMBERSHIP_INACTIVE
MEMBERSHIP_DUPLICATE
MEMBERSHIP_OWNER_LOCKOUT_DENIED

PROJECT_REQUIRED
PROJECT_NOT_FOUND
PROJECT_CODE_DUPLICATE
PROJECT_ACCESS_DENIED
PROJECT_PERMISSION_DENIED
PROJECT_STATUS_INVALID
PROJECT_STATUS_TRANSITION_INVALID
PROJECT_ARCHIVED_READ_ONLY
PROJECT_COMPLETED_READ_ONLY
PROJECT_ON_HOLD_RESTRICTED
PROJECT_RESTORE_DENIED

PROJECT_MEMBER_NOT_FOUND
PROJECT_MEMBER_ALREADY_ASSIGNED
PROJECT_MEMBER_INACTIVE
PROJECT_MEMBER_NOT_ORGANIZATION_MEMBER
PROJECT_MEMBER_OWNER_ACCESS_PROTECTED
PROJECT_MEMBER_SELF_REMOVAL_DENIED
PROJECT_MEMBER_DATE_RANGE_INVALID

PERMISSION_DENIED
ROLE_NOT_FOUND
ROLE_SYSTEM_PROTECTED
ROLE_PERMISSION_INVALID
VALIDATION_FAILED
CONFLICT
IDEMPOTENCY_CONFLICT
SERVER_ERROR
```

## 4. Status Enums To Add

Add shared enums:

```text
UserStatus = ACTIVE | INACTIVE | LOCKED | PENDING_VERIFICATION
OrganizationType = BUILDER | CONTRACTOR
OrganizationStatus = DRAFT | ACTIVE | SUSPENDED | ARCHIVED
OperatingProfile = INDEPENDENT_CONTRACTOR | SELF_MANAGED_BUILDER | BUILDER_CONTRACTOR | BUILDER_CONTRACTOR_SUPERVISOR | CUSTOM
OrganizationMemberStatus = INVITED | ACTIVE | INACTIVE | SUSPENDED | LEFT
ProjectStatus = DRAFT | ACTIVE | ON_HOLD | COMPLETED | ARCHIVED
ProjectType = RESIDENTIAL | COMMERCIAL | MIXED | SHED | OTHER
ProjectMemberStatus = ACTIVE | INACTIVE | ENDED
InvitationStatus = PENDING | ACCEPTED | EXPIRED | REVOKED
SessionStatus = ACTIVE | EXPIRED | REVOKED | ROTATED
ProjectAccessScope = ALL | ASSIGNED | NONE
```

## 5. API Database Table Plan

No migration is approved by this plan.

New SQL tables should use plural `snake_case`:

```text
organizations
organization_members
projects
project_members
invitations, if invitations are included in first implementation
```

Do not rename inherited tables during this phase:

```text
user
role
permission
refreshtoken
systemsetting
```

Recommended columns:

```text
organizations:
id, name, type, status, operating_profile, timezone, currency,
logo_file_id, created_at, updated_at, created_by, updated_by

organization_members:
id, organization_id, user_id, role_id, status, designation,
organization_wide_project_access, joined_at, invited_by,
created_at, updated_at, created_by, updated_by

projects:
id, organization_id, name, project_code, type,
address_line1, address_line2, city, state, postal_code,
latitude, longitude, status, start_date, expected_completion_date,
description, cover_file_id, created_by, updated_by,
created_at, updated_at, archived_at, archived_by

project_members:
id, organization_id, project_id, member_id, role_label, status,
starts_on, ends_on, created_by, updated_by,
created_at, updated_at, ended_at, ended_by
```

Recommended constraints:

```text
organizations primary key (id)
organization_members unique (organization_id, user_id)
organization_members index (user_id, status)
projects index (organization_id, status)
projects index (organization_id, city)
projects unique (organization_id, project_code) when project_code is not null
project_members unique (project_id, member_id)
project_members index (organization_id, member_id, status)
project_members index (organization_id, project_id, status)
```

## 6. SQL Migration Sequence

Recommended sequence after explicit migration approval:

1. Create `organizations`.
2. Create `organization_members`.
3. Create `projects`.
4. Create `project_members`.
5. Create `invitations` for the approved platform-provisioned primary Owner flow.
6. Seed new shared permission keys.
7. Seed or backfill default Owner role grants as needed.
8. Backfill a default organisation and active owner membership for existing admin users only against a confirmed safe database.
9. Optionally create initial default project during onboarding only if that product decision is approved.

Migration safety:

- Run against local or throwaway database first.
- Review generated/handwritten SQL before execution.
- Use foreign keys only after confirming inherited table names and ID types.
- Keep migrations additive in Phase 1.
- Do not drop or rename inherited foundation columns.

## 7. API Module And File Structure

Recommended API structure:

```text
apps/api/src/modules/organizations/
  organizations.controller.ts
  organizations.service.ts
  organizations.repository.ts
  dto/
  types/

apps/api/src/modules/memberships/
  memberships.controller.ts
  memberships.service.ts
  memberships.repository.ts
  dto/
  types/

apps/api/src/modules/projects/
  projects.controller.ts
  projects.service.ts
  projects.repository.ts
  dto/
  types/

apps/api/src/modules/project-access/
  project-access.service.ts
  project-access.repository.ts
  project-access.guard.ts, if needed later
  decorators/
  types/
```

Extend existing auth files:

```text
apps/api/src/modules/auth/auth.controller.ts
apps/api/src/modules/auth/auth.service.ts
apps/api/src/modules/auth/auth.repository.ts
apps/api/src/modules/auth/strategies/jwt.strategy.ts
apps/api/src/modules/auth/types/auth.types.ts
apps/api/src/modules/auth/guards/permissions.guard.ts
```

Register new modules in:

```text
apps/api/src/app.module.ts
```

## 8. Repository Responsibilities

Repositories must own SQL and return service-compatible shapes.

Organization repository:

- Create, list, get, update, activate, deactivate/suspend organisations.
- Check organisation existence and status.
- Load branding and operating profile.

Membership repository:

- Create owner/member rows.
- Find active membership by user and organisation.
- Find memberships for login/session payload.
- Enforce duplicate membership checks.
- Count active owners before deactivation or role changes.
- Resolve role permissions through the approved bridge.

Projects repository:

- Create project.
- List accessible projects by organisation and membership.
- Get project by ID inside organisation.
- Update metadata.
- Archive/restore.
- Count/list project members.
- Validate project code uniqueness.

Project members repository:

- Assign member to project.
- Update assignment status, role label, and dates.
- End/unassign project access.
- Check active assignment.
- List project members.

Project access repository/helper:

- Resolve `ALL|ASSIGNED|NONE`.
- Resolve permitted project IDs.
- Validate project belongs to active organisation.
- Validate record organization/project ownership for future modules.

## 9. Service And Business-Rule Responsibilities

Services must own business rules:

- User must be active.
- Organisation must be active.
- User must have active organisation membership.
- Owner baseline access cannot be removed by ordinary edits.
- At least one active owner must remain.
- Role/permission edits must not create owner lockout.
- Organisation-wide project access can view all active organisation projects.
- Assigned project access requires active `project_members`.
- Project status transitions must match contract.
- Archived/completed projects are read-only for normal operational writes.
- Assignment target must be an active organisation member.
- Cross-organisation member/project IDs must be rejected.
- Transactions are required for multi-table writes and audit-ready actions.

## 10. Controller Endpoint Responsibilities

Controllers should stay thin and return standard envelopes.

Target endpoints:

```text
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
POST   /auth/logout-all
GET    /auth/me
GET    /auth/session

GET    /organizations
POST   /organizations
GET    /organizations/:organizationId
PATCH  /organizations/:organizationId
POST   /organizations/:organizationId/switch

GET    /organizations/:organizationId/members
POST   /organizations/:organizationId/invitations
PATCH  /organizations/:organizationId/members/:memberId
POST   /organizations/:organizationId/members/:memberId/deactivate

GET    /organizations/:organizationId/projects
POST   /organizations/:organizationId/projects
GET    /organizations/:organizationId/projects/:projectId
PATCH  /organizations/:organizationId/projects/:projectId
POST   /organizations/:organizationId/projects/:projectId/archive
POST   /organizations/:organizationId/projects/:projectId/restore

GET    /organizations/:organizationId/projects/:projectId/members
PUT    /organizations/:organizationId/projects/:projectId/members/:memberId
PATCH  /organizations/:organizationId/projects/:projectId/members/:memberId
DELETE /organizations/:organizationId/projects/:projectId/members/:memberId

GET    /organizations/:organizationId/project-access/me
POST   /organizations/:organizationId/projects/:projectId/switch
GET    /organizations/:organizationId/projects/:projectId/context
```

OTP endpoints remain planned but blocked until OTP decisions are approved.

## 11. Auth And Session Payload Changes

Target `/auth/login`, `/auth/me`, and `/auth/session` should return enough data for web and mobile navigation without guessing:

```text
accessToken
expiresInSeconds
user
activeOrganization
memberships
permissions
projectAccess
featureFlags
serverTime
```

Compatibility requirements:

- Preserve current web login while expanding the returned user/session shape.
- Keep email/password auth first because it is already implemented.
- Keep web refresh cookie behavior.
- Do not add mobile refresh body token until approved.
- JWT payload should remain minimal and not become the source of permissions; permissions must be resolved server-side.
- Permission changes should take effect after refresh/re-auth or direct API revalidation within the approved interval.

## 12. Organisation Membership Access Helper

Add a reusable helper used by controllers/services:

Inputs:

```text
authenticated user
organizationId from path, body, query, or session preference
required permission key
```

Outputs:

```text
organization
membership
resolved permissions
organizationWideProjectAccess
```

Rules:

- Reject missing organisation context with `ORG_REQUIRED`.
- Reject inactive organisation with `ORG_INACTIVE`.
- Reject missing/inactive membership with `MEMBERSHIP_REQUIRED` or `MEMBERSHIP_INACTIVE`.
- Reject missing permission with `PERMISSION_DENIED`.
- Never trust `organizationId` without checking membership.

## 13. Project Access Helper

Add a reusable helper for all future project-scoped modules:

Inputs:

```text
authenticated user context
organizationId
projectId
required permission key
operation kind: read | write | archive | restore | report | sync
```

Outputs:

```text
project
projectAccessScope
projectMember, when assigned access
permittedProjectIds, for list/report helpers
```

Rules:

- Project must belong to active organisation.
- User must have active organisation membership.
- User must have required permission.
- User must have organisation-wide access or active project assignment.
- Archived/completed/on-hold status behavior must be enforced by API.
- Future record checks must compare both `organization_id` and `project_id`.

## 14. Web Admin Implementation Sequence

1. Update web auth types to accept expanded session payload.
2. Update auth provider to store active organisation, memberships, permissions, and project access.
3. Add API services for organisations, memberships, projects, and project members.
4. Add navigation entries for project administration using shared permission keys.
5. Add organisation settings/detail route if included in first slice.
6. Add members list/invite/update/deactivate screens if included in first slice.
7. Add projects list, create, detail, edit, archive, restore screens.
8. Add project member assignment screen.
9. Add forbidden, empty, loading, error, and archived read-only states.
10. Verify direct route access still depends on API authorization, not hidden navigation.

Likely web files:

```text
apps/web/src/providers/auth-provider.tsx
apps/web/src/features/auth/services/auth.service.ts
apps/web/src/config/navigation.ts
apps/web/src/features/organizations/
apps/web/src/features/projects/
apps/web/src/app/(app)/organizations/
apps/web/src/app/(app)/projects/
```

## 15. Mobile Session And Project-Switcher Implementation Sequence

1. Replace placeholder session type with shared session/project-access shape.
2. Implement real login API call.
3. Store access token and approved mobile session fields in secure storage.
4. Add refresh behavior only after mobile refresh strategy is approved.
5. Load accessible projects from login/session payload.
6. Auto-select one accessible active project.
7. Show project switcher for multiple accessible active projects.
8. Persist last selected project locally.
9. Clear active project if it becomes inaccessible, archived for operations, or missing after refresh.
10. Add no-project, no-assigned-project, forbidden, stale session, poor-network, and offline read-only states.
11. Ensure current project name is visible on every project-scoped future screen.

Likely mobile files:

```text
apps/mobile/src/providers/session-provider.tsx
apps/mobile/src/lib/auth/session.ts
apps/mobile/src/lib/auth/index.ts
apps/mobile/src/lib/api/api-client.ts
apps/mobile/src/features/auth/components/login-screen.tsx
apps/mobile/src/features/projects/
apps/mobile/src/app/(app)/
```

## 16. Tests Required Before Implementation Is Accepted

API:

- Valid email/password login returns expanded session payload.
- Invalid credentials return stable auth error.
- Inactive user cannot log in.
- User without active organisation membership is denied organisation endpoints.
- Suspended organisation blocks access.
- Missing permission returns stable permission error.
- Owner cannot remove the final active owner.
- Builder Owner creates Builder project.
- Independent Contractor Owner creates Contractor project.
- Duplicate project code in same organisation is rejected.
- Same project code in different organisation is allowed.
- Assigned member can read assigned project.
- Unassigned member cannot read project by changing ID.
- Organisation-wide member can read all organisation projects.
- Cross-tenant project/member IDs are denied.
- Archived project update is denied.
- Invalid project status transition is denied.
- Project member assignment requires active organisation member.
- Permission changes are reflected after refresh/revalidation.

Web:

- Expanded login/session shape hydrates auth provider.
- Navigation hides inaccessible project/admin pages.
- Direct route access handles API forbidden state.
- Project list/create/edit/archive/member states render.

Mobile:

- Real login stores session.
- Zero projects shows empty state.
- One project auto-selects.
- Multiple projects show switcher.
- Last selected project persists.
- Removed/stale project access clears active project.
- Cached project cannot bypass API authorization.

Security/isolation:

- Every project-scoped helper test includes `organization_id` and `project_id`.
- Aggregate/list helpers cannot leak inaccessible project totals.
- Future offline queued writes must fail if access was removed before sync.

## 17. Safe Verification Commands

Non-mutating verification:

```bash
pnpm --filter @nirman-app/shared type-check
pnpm --filter @nirman-app/api type-check
pnpm --filter @nirman-app/api build
pnpm --filter @nirman-app/web type-check
pnpm --filter @nirman-app/mobile type-check
git diff --check
```

Focused scans:

```bash
rg -n "@prisma/client|PrismaService|prisma\\." apps/api apps/web apps/mobile packages/shared
rg -n "mysql2|DatabaseService|DATABASE_URL" apps/web apps/mobile packages/shared
```

Mutating verification only after safe DB approval:

```bash
pnpm --filter @nirman-app/api test
pnpm --filter @nirman-app/api test:e2e
pnpm db:seed
```

Do not run migrations, seeds, or live smoke tests against production.

## 18. Exact Files Likely To Change

Shared:

```text
packages/shared/src/constants/permissions.ts
packages/shared/src/constants/index.ts
packages/shared/src/constants/errors.ts
packages/shared/src/constants/statuses.ts
packages/shared/src/schemas/index.ts
packages/shared/src/schemas/auth.ts
packages/shared/src/schemas/organizations.ts
packages/shared/src/schemas/memberships.ts
packages/shared/src/schemas/projects.ts
packages/shared/src/types/index.ts
packages/shared/src/types/api.ts
packages/shared/src/types/auth.ts
packages/shared/src/types/organizations.ts
packages/shared/src/types/projects.ts
```

API:

```text
apps/api/src/app.module.ts
apps/api/src/modules/auth/auth.controller.ts
apps/api/src/modules/auth/auth.service.ts
apps/api/src/modules/auth/auth.repository.ts
apps/api/src/modules/auth/strategies/jwt.strategy.ts
apps/api/src/modules/auth/types/auth.types.ts
apps/api/src/modules/auth/types/auth-db.types.ts
apps/api/src/modules/auth/guards/permissions.guard.ts
apps/api/src/modules/users/*
apps/api/src/modules/roles/*
apps/api/src/modules/organizations/*
apps/api/src/modules/memberships/*
apps/api/src/modules/projects/*
apps/api/src/modules/project-access/*
apps/api/src/database/*
apps/api/scripts/seed.ts
```

SQL, after approval:

```text
packages/database/sql/migrations/
packages/database/sql/seeds/
```

or, if separately approved:

```text
apps/api/src/database/sql/
```

Web:

```text
apps/web/src/providers/auth-provider.tsx
apps/web/src/features/auth/services/auth.service.ts
apps/web/src/config/navigation.ts
apps/web/src/features/organizations/
apps/web/src/features/projects/
apps/web/src/app/(app)/organizations/
apps/web/src/app/(app)/projects/
```

Mobile:

```text
apps/mobile/src/providers/session-provider.tsx
apps/mobile/src/lib/auth/session.ts
apps/mobile/src/lib/auth/index.ts
apps/mobile/src/lib/api/api-client.ts
apps/mobile/src/features/auth/components/login-screen.tsx
apps/mobile/src/features/projects/
apps/mobile/src/app/(app)/
```

Docs:

```text
docs/tasks/current-task.md
docs/tasks/phase-1-identity-project-technical-plan.md
docs/modules/foundation/identity-access/CONTRACTS.md, only if implementation approval changes contract
docs/modules/foundation/project-access/CONTRACTS.md, only if implementation approval changes contract
```

## 19. Risks And Rollback Notes

Risks:

- Breaking current web login while expanding session payload.
- Accidentally treating inherited `user.roleId` as final organisation access.
- Owner lockout through role, permission, membership, or project assignment edits.
- Cross-tenant data leakage through missing `organization_id` filters.
- Project data leakage through list/report queries.
- Stale access tokens retaining removed permissions too long.
- Running migrations or seeds against the wrong database.
- Prematurely adding OTP/mobile refresh behavior without approval.
- Confusing old Prisma-era Phase 1 plan with current mysql2 architecture.

Rollback notes:

- Keep changes additive in Phase 1.
- Do not drop or rename inherited tables.
- Keep current email/password login available throughout migration.
- Keep current web screens functional until replacement flows are verified.
- Gate SQL execution behind safe DB confirmation.
- Add tables and backfills separately so data rollback is understandable.
- Seed permissions idempotently.
- Record any compatibility bridge clearly in docs before implementation.

## 20. Open Decisions Blocking Implementation

1. Authentication method: email/password-first, OTP-first, or both.
2. Mobile refresh strategy: cookie-compatible refresh, response-body refresh token in secure storage, or another approved approach.
3. External Contractor model: defer cross-organisation collaboration or include it in MVP.
4. Role model bridge: organisation-scoped roles immediately, or compatibility bridge from inherited global roles.
5. Permission overrides: member/project-specific grants and denials in MVP or defer.
6. Active organisation/project persistence: client-only, server-side session preference, or both.
7. Support/admin impersonation: included in MVP or deferred.
8. Exact access token expiry and permission refresh interval.
9. Invitation delivery: email, SMS/OTP, manual link, or later.
10. Cross-tenant security posture: return forbidden or not-found.
11. Migration file location: `packages/database/sql` or `apps/api/src/database/sql`.
12. ID strategy: UUID strings, ULIDs, or numeric IDs.
13. Initial project creation during onboarding: required before dashboard or separate after login.
14. Project cover image: included in first Project Setup implementation or deferred.
15. Completed project reopening: normal transition, support/admin-only, or disallowed.

## Implementation Gate

Do not begin implementation until:

- This plan is approved.
- The two foundation contracts remain approved or are updated for any decision changes.
- Open blocking decisions above are resolved or explicitly deferred with reversible defaults.
- A safe local or throwaway database target is confirmed for migration and seed verification.
