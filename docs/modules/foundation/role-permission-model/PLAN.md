# Role And Permission Model Plan

> Status: approved decision; Slices A-C and the source implementation for Slices D-F are completed on 2026-08-10. Seed execution and Slice G runtime verification remain gated.
>
> Scope: role taxonomy, permission boundaries, platform-vs-tenant separation, and implementation sequencing.
>
> The initial 2026-08-10 approval covered Slices A-C. A later approved correction implemented the bounded source work in Slices D-F without database mutation, seed execution, migration execution, or new business-module implementation.

## 1. Why This Gate Exists

NirmanSite has reached the point where incorrect role assumptions would create long-term security and product problems.

The main correction is:

```text
Platform Super Admin is the NirmanSite product/platform owner role.
Platform Super Admin is not a normal construction operations actor.
```

Operational construction and sales work belongs to customer organization users such as Organization Owner, Builder Admin, Independent Contractor Owner, Contractor Member, Site Supervisor, Project Manager, and Sales User.

## 2. Source Requirements

This plan follows `MVP_REQUIREMENTS.md`:

- NirmanSite serves Builders, Contractors, Supervisors, and Sales teams.
- Mobile is the primary field operations app.
- Web is used for platform administration, organization administration, subscriptions, permissions, project setup, reports, audit, and corrective back-office operations.
- Organization types are `BUILDER` and `CONTRACTOR`.
- Independent Contractors can operate without Builder approval.
- Builders may manage site work directly.
- Builder + Contractor workflows can require configured approvals.
- Roles are templates, not permanent constraints.
- Final access is resolved from identity, organization membership, primary role, additional permissions, project assignments, and optional organization-wide project scope.
- Hidden navigation is not security; API authorization is authoritative.

## 3. Non-Negotiable Decisions

Permission key format:

```text
resource:action
```

Do not reintroduce dot-style permission keys.

Database access:

```text
apps/api + mysql2/promise repositories
```

Do not use Prisma for new active implementation.

Tenant boundary:

```text
organizations
```

Project boundary:

```text
projects + project_members
```

New SQL table naming:

```text
plural snake_case
```

Inherited physical tables such as `user`, `role`, `permission`, `refreshtoken`, and `systemsetting` remain compatibility tables until a separate migration plan is approved.

## 4. Role Layers

### Platform Layer

These roles belong to NirmanSite operations, not customer project work.

| Role | Purpose | Normal platform surface | Operational project access |
| --- | --- | --- | --- |
| Platform Super Admin | Owns and administers the NirmanSite platform | Web only | No default tenant operational access |
| Platform Support | Assists with support or corrective operations where approved | Web only | Only through explicit audited support policy |

Platform permissions should use platform-scoped resources, for example:

```text
platform-organizations:read
platform-organizations:create
platform-organizations:update
platform-organizations:activate
platform-organizations:suspend
platform-subscriptions:read
platform-subscriptions:update
platform-users:read
platform-support:access
platform-support:impersonate
platform-feature-flags:read
platform-feature-flags:update
```

Support access must be:

- explicit;
- scoped to a named organization;
- time-bound where possible;
- audited;
- visible in support/audit records;
- unable to silently bypass tenant safeguards.

### Organization Layer

These roles belong to a customer organization.

| Role template | Purpose |
| --- | --- |
| Organization Owner | Protected owner of a Builder or Contractor organization |
| Builder Admin | Back-office admin for Builder organization projects, members, settings, reports, and approvals |
| Independent Contractor Owner | Owner of a Contractor organization that operates independently |
| Project Manager | Oversees assigned projects and project team access |
| Finance/Admin | Handles financial/admin workflows where later contracts approve it |
| Viewer | Read-only user for permitted organization/project data |

Organization permissions should use resources such as:

```text
organizations:read
organizations:update
members:read
members:invite
members:update
members:deactivate
roles:read
roles:create
roles:update
roles:delete
projects:read
projects:create
projects:update
projects:archive
projects:restore
projects:assign
project-members:read
project-members:assign
project-members:update
project-members:unassign
settings:read
settings:update
audit-logs:read
reports:read
```

### Field Operations Layer

These roles use mobile-first project workflows.

| Role template | Purpose |
| --- | --- |
| Contractor Member | Performs project operations in assigned Builder or Contractor projects |
| Site Supervisor | Performs daily site entries for assigned projects |
| Builder Owner acting operationally | Builder Owner may perform Contractor/Supervisor responsibilities when permitted |
| Independent Contractor Owner acting operationally | Contractor Owner may perform operational work directly in own organization |

Construction permissions should use resources such as:

```text
workers:read
workers:create
workers:update
workers:assign-project
workers:update-rate
workers:deactivate
workers:export
attendance:mark
attendance:read
attendance:update
kharchi:create
kharchi:approve
wages:read
wages:calculate
materials:create
expenses:create
progress:update
gallery:create
```

### Sales Layer

These roles use sales workflows, mostly mobile for daily work and web for oversight/reporting.

| Role template | Purpose |
| --- | --- |
| Sales User | Manages assigned leads, follow-ups, site visits, and permitted inventory actions |
| Sales Manager | Oversees team leads and sales performance where granted |
| Builder Owner/Admin acting in sales | Can oversee sales where organization profile includes real-estate sales |

Sales permissions should use resources such as:

```text
leads:read
leads:create
leads:update
leads:assign
followups:read
followups:create
followups:update
site-visits:read
site-visits:create
units:read
units:block
bookings:read
bookings:create
bookings:approve
```

### Worker Records

Workers or labourers are managed records, not application users.

```text
workers table records do not log in.
worker_project_assignments connect labour records to projects.
```

## 5. Access Resolution Model

Every protected API action must resolve access in this order:

```text
1. Authenticated user
2. Active organization
3. Active organization membership
4. Organization status
5. Role template permissions
6. Additional grants and denials, if implemented
7. Project access scope
8. Target record organization_id/project_id ownership
9. Required resource:action permission
10. Workflow/status-specific rule
```

Recommended service helper shape:

```text
resolveOrganizationAccess(userId, organizationId, requiredPermission)
resolveProjectAccess(userId, organizationId, projectId, requiredPermission)
assertPlatformAccess(userId, requiredPlatformPermission)
```

Platform access and organization access must remain separate. A platform permission should not automatically imply `workers:*`, `attendance:*`, `kharchi:*`, `wages:*`, or `leads:*`.

## 6. Operating Profiles

Operating profiles create default role and permission bundles during onboarding.

| Profile | Organization type | Default behavior |
| --- | --- | --- |
| Independent Contractor | `CONTRACTOR` | Contractor Owner has direct project and operation permissions. No Builder approval is required. |
| Self-managed Builder | `BUILDER` | Builder Owner/Admin can manage projects and field operations directly. Approval flows are simplified where no separate approver exists. |
| Builder + Contractor | `BUILDER` | Contractor handles site operations. Builder has oversight/final approval where configured. |
| Builder + Contractor + Supervisor | `BUILDER` | Supervisor does daily entries, Contractor reviews where configured, Builder approves where configured. |
| Custom | `BUILDER` or `CONTRACTOR` | Organization Owner configures permissions, project assignments, and approval responsibilities. |

The role template is only the starting point. Final access still depends on permission keys and project access.

## 7. Platform Super Admin Policy

Platform Super Admin can manage:

- organization list;
- organization create, activate, suspend;
- subscription plans and limits;
- platform usage dashboard;
- platform user/support controls;
- platform feature flags where implemented.

Platform Super Admin must not be listed as a normal actor for:

- worker creation;
- attendance marking;
- Kharchi entry;
- wage calculation;
- material requests;
- site progress;
- lead follow-ups;
- unit booking by customer teams.

If emergency/support access is needed, it must be a separate policy:

```text
platform-support:access
platform-support:impersonate
```

That policy must record organization, actor, reason, start time, end time, and every action performed during support access.

## 8. Default Role Grant Direction

This table is the starting permission direction. Exact keys must be finalized per module contract.

| Role template | Default project scope | Worker module default |
| --- | --- | --- |
| Organization Owner | Organization-wide | Full within own organization |
| Builder Admin | Organization-wide or configured projects | Full where granted |
| Independent Contractor Owner | Organization-wide in own Contractor org | Full within own organization |
| Project Manager | Assigned or organization-wide | Manage assigned projects where granted |
| Contractor Member | Assigned projects | `workers:read`; additional writes only if explicitly granted |
| Site Supervisor | Assigned projects | `workers:read`, optionally `workers:create`, `workers:update` |
| Sales User | Assigned sales/project scope | No Workers access by default |
| Viewer | Assigned or all read scope | Read only where granted |
| Platform Super Admin | Platform scope | No normal Workers permissions |

## 9. Documentation Alignment Result

Aligned or confirmed on 2026-08-10:

- `MVP_REQUIREMENTS.md` and `AI_PROJECT_START_PROMPT.md` now state the approved platform-vs-customer boundary.
- `docs/architecture/auth-rbac.md` records the layered permission taxonomy and seed compatibility bridge.
- `docs/modules/construction/workers/CONTRACT.md` already excludes Platform Super Admin from normal Workers actors.
- `docs/modules/construction/workers/DECISIONS.md` already grants Platform Super Admin no normal Workers access.
- `docs/modules/construction/workers/IMPLEMENTATION_PLAN.md` keeps seed execution gated and does not grant Workers permissions to Platform Super Admin.
- Future module contracts must include a role/permission matrix that separates platform support from organization operations.

## 10. Implementation Plan

### Slice A: Documentation Alignment

Status: completed on 2026-08-10.

Objective:

- Make RBAC docs and Workers docs consistent with this plan.

Files:

- `docs/architecture/auth-rbac.md`
- `docs/modules/construction/workers/CONTRACT.md`
- `docs/modules/construction/workers/DECISIONS.md`
- `docs/modules/construction/workers/IMPLEMENTATION_PLAN.md`
- `docs/tasks/current-task.md`
- `docs/tasks/PROGRESS_LEDGER.md`
- `docs/modules/MODULE_INDEX.md`

Verification:

```bash
git diff --check
```

### Slice B: Shared Permission Taxonomy

Status: completed on 2026-08-10.

Objective:

- Split platform permissions from organization and module permissions.
- Keep `resource:action` format.

Files:

- `packages/shared/src/constants/permissions.ts`
- shared exports and tests where present.

Verification:

```bash
pnpm --filter @nirman-app/shared type-check
pnpm --filter @nirman-app/shared build
```

### Slice C: Seed Role Template Split

Status: completed on 2026-08-10. After separate explicit approval, the guarded seed ran against `vishwlt9_nirmansite`, synchronized the role templates, and created or rotated 11 role-user logins. No migration was run.

Objective:

- Separate Platform Super Admin from organization roles in seed behavior.
- Add organization role templates without granting platform admin operational module permissions by default.

Files:

- `apps/api/scripts/seed.ts`

Verification:

```bash
pnpm --filter @nirman-app/api type-check
```

Do not run seed against remote DB without explicit approval.

### Slice D: API Authorization Split

Status: source implementation completed on 2026-08-10; updated platform permission seed and runtime matrix remain approval-gated.

Objective:

- Make platform access helpers separate from organization/project access helpers.
- Ensure business modules use organization/project helpers, not platform admin bypass.

Files:

- `apps/api/src/modules/auth`
- `apps/api/src/modules/organizations`
- `apps/api/src/modules/project-access`
- future business modules.

Verification:

```bash
pnpm --filter @nirman-app/api type-check
pnpm --filter @nirman-app/api build
```

### Slice E: Web Navigation Split

Status: source implementation completed on 2026-08-10. Global Users/Roles/Settings now use platform-prefixed visibility, Organizations supports platform or membership visibility, and customer permissions come from the active membership session.

Follow-up clarification: Platform Super Admin role-template and permission management is a protected platform capability. The global Roles & Permissions surface remains available to `Platform Super Admin`/legacy `Super Admin` during the platform-key seed transition, while customer `roles:*` permissions never authorize that global surface. System templates remain seed-managed and read-only; custom role permission sets are editable.

Objective:

- Separate Platform Admin navigation from Organization Admin and Operations navigation.
- Ensure visible navigation mirrors permissions but does not replace API checks.

Files:

- `apps/web/src/config/navigation.ts`
- relevant web layout/guard files.

Verification:

```bash
pnpm --filter @nirman-app/web type-check
pnpm --filter @nirman-app/web build
```

### Slice F: Mobile Field Boundary

Status: source boundary completed on 2026-08-10 for current routes. Workers and Project Detail are permission-filtered, internal showcase entries are removed from the menu, and platform-only sessions expose no field workspace.

Objective:

- Ensure mobile menu is built from session permissions and active project access.
- Do not expose Platform Admin workflows in mobile.

Files:

- `apps/mobile/src/providers/session-provider.tsx`
- mobile navigation/menu/project context files.

Verification:

```bash
pnpm --filter @nirman-app/mobile type-check
```

### Slice G: Test Scenarios

Required future scenarios:

- Platform Super Admin can access platform organization management.
- Platform Super Admin cannot use normal worker/attendance/customer operations unless explicit audited support access is active.
- Organization Owner can manage own organization and projects.
- Independent Contractor Owner can manage own projects without Builder approval.
- Contractor under Builder cannot bypass configured approval or project assignment.
- Supervisor sees only assigned project workflows.
- Sales User cannot see Workers by default.
- Hidden navigation does not grant security.
- API denies cross-tenant and cross-project ID manipulation.

## 11. Gates Before Workers Implementation Continues

Workers implementation should proceed only after:

1. Product owner accepts the platform-vs-organization role separation.
2. Workers contract and decisions remove Super Admin as a normal operational actor.
3. Shared permission taxonomy has a planned split for platform permissions versus organization/module permissions.
4. The implementation prompt tells AI chats to enforce organization membership, permissions, and project access for Workers.

The product decision and Slices A-F are now satisfied in documentation and source. Runtime verification is still blocked on an explicitly approved run of the updated seed against a named database, followed by API/web restart and the Slice G role matrix. Additional business-module work should remain paused until that runtime gate is recorded.

## 12. Open Decisions

These can be answered before or during the RBAC implementation plan, but AI agents must not hard-code irreversible assumptions:

Resolved on 2026-08-10: the implemented `organizations:create` workflow is platform-provisioned tenant creation with a separately invited customer Owner. Self-service organization registration is not part of this slice. Platform Super Admin must not receive customer membership.

1. Whether support impersonation is included in MVP or deferred.
2. Whether member-specific permission grants/denials are implemented in MVP or deferred.
3. Whether external Contractor organizations collaborate with Builder projects in MVP, or Builder organizations invite Contractor members internally.
4. Whether mobile login should block platform-only users from entering the mobile app, or allow login but show no field workspace.
