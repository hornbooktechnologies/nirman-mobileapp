# Auth And RBAC

NirmanSite authentication starts from the existing NestJS and Next.js foundation: JWT access tokens plus HTTP-only refresh cookies for the web portal.

Authorization is `resource:action` based.

```text
resource:action
```

Shared resources and actions are defined in `packages/shared/src/constants/permissions.ts`.

The shared taxonomy is split into:

- `PLATFORM_ADMIN_PERMISSIONS` for default NirmanSite operator capabilities;
- `PLATFORM_SUPPORT_PERMISSIONS` for future separately approved support access;
- `ORGANIZATION_PERMISSIONS` for customer organization administration;
- `PROJECT_PERMISSIONS` for project setup and access;
- module-specific groups such as `WORKER_PERMISSIONS` for customer operations;
- `LEGACY_USER_MANAGEMENT_PERMISSIONS` only for inherited global user-management route compatibility.

Global Users, Roles, and application/SMTP Settings now use explicit `platform-users:*`, `platform-roles:*`, and `platform-settings:*` permissions. Customer organization permissions with the same conceptual names do not authorize those global routes.

Platform Super Admin has a protected platform role-template management capability. The web and API therefore recognize `platform-roles:read|create|update|delete|manage` for `Platform Super Admin` and the inherited `Super Admin` name even before a database has been synchronized with the newer platform permission keys. This compatibility does not apply to customer roles, does not grant operational permissions, and does not make system role templates editable; system templates remain seed-managed while custom roles can receive editable permission sets.

Custom platform roles may be renamed, described, assigned permission sets, and deleted by an authorized Platform Super Admin. A role assigned to any user cannot be deleted. Unassigned custom-role deletion removes dependent permission rows and the role in one transaction. System roles cannot be edited or deleted through these APIs.

## Source Of Truth

Current RBAC planning is governed by:

- `MVP_REQUIREMENTS.md`
- `docs/modules/foundation/identity-access/CONTRACTS.md`
- `docs/modules/foundation/project-access/CONTRACTS.md`
- `docs/modules/foundation/role-permission-model/PLAN.md`

## Access Model

Every protected API action must resolve:

```text
authenticated user
+ active organization
+ active organization membership
+ organization status
+ role template permissions
+ additional grants/denials if implemented
+ project assignment or organization-wide project scope
+ target record organization/project ownership
+ required resource:action permission
+ workflow/status rule
```

Navigation in web and mobile mirrors resolved permissions, but the API remains the security authority.

## Role Layers

### Platform Roles

Platform roles belong to the NirmanSite product owner/operator.

- Platform Super Admin
- Platform Support

Platform roles manage platform administration:

- organizations list;
- create, activate, suspend organizations;
- subscriptions and usage limits;
- platform dashboard;
- support controls;
- feature flags where implemented.

Platform roles do not receive normal customer operational permissions such as `workers:*`, `attendance:*`, `kharchi:*`, `wages:*`, or `leads:*` by default.

Support access, if approved, must be explicit, scoped, time-bound where possible, and audited.

### Organization Roles

Organization roles belong to a Builder or Contractor customer organization.

- Organization Owner
- Builder Admin
- Independent Contractor Owner
- Project Manager
- Finance/Admin where later contracts approve it
- Viewer

Organization roles manage members, role templates, organization settings, project setup, reports, and organization back-office workflows according to permissions.

### Field Operations Roles

Field roles use project-scoped mobile workflows.

- Contractor Member
- Site Supervisor
- Builder Owner acting operationally
- Independent Contractor Owner acting operationally

These users can work only inside permitted organizations and projects.

### Sales Roles

Sales roles use sales workflows according to the Sales module contracts.

- Sales User
- Sales Manager
- Builder Owner/Admin acting in sales

Sales users do not receive Workers permissions by default.

## Organization Types

MVP organization types:

```text
BUILDER
CONTRACTOR
```

A `BUILDER` organization may own projects, manage projects directly, invite Contractors, Supervisors, Sales Users, and Admin users, and configure approval responsibilities.

A `CONTRACTOR` organization may independently create projects, manage operations, and operate without external Builder approval.

## Operating Profiles

Operating profiles create default role and permission bundles:

- Independent Contractor
- Self-managed Builder
- Builder + Contractor
- Builder + Contractor + Supervisor
- Custom

Roles remain templates. Final access is always resolved through permissions and project access.

Organization/profile compatibility is enforced in source:

| Organization type | Allowed profiles |
| --- | --- |
| `BUILDER` | `SELF_MANAGED_BUILDER`, `BUILDER_CONTRACTOR`, `BUILDER_CONTRACTOR_SUPERVISOR`, `CUSTOM` |
| `CONTRACTOR` | `INDEPENDENT_CONTRACTOR`, `CUSTOM` |

The profile currently remains validated metadata and session context. Responsibility assignment and approval-state behavior must be added by the relevant approved module contracts rather than inferred globally.

## Permission Strategy

- Keep permission keys in `packages/shared`.
- Use `resource:action` for all new permissions.
- Do not use dot-style permission keys.
- Prefer explicit actions such as `create`, `read`, `update`, `delete`, `assign`, `approve`, `export`, and `view-all`.
- Use `manage` only for broad administrative workflows where the contract explicitly approves it.
- Add product permission resources only with a matching API route and UI workflow.
- Separate approval permissions from normal update permissions for financial or operational risk.
- Keep platform permissions separate from organization and module permissions.

Example platform permissions:

```text
platform-organizations:read
platform-organizations:create
platform-organizations:update
platform-organizations:activate
platform-organizations:suspend
platform-subscriptions:read
platform-subscriptions:update
platform-users:read
platform-users:create
platform-users:update
platform-users:deactivate
platform-roles:read
platform-roles:create
platform-roles:update
platform-roles:delete
platform-roles:manage
platform-settings:read
platform-settings:update
platform-support:access
platform-support:impersonate
```

Example organization and project permissions:

```text
organizations:read
organizations:update
members:read
members:invite
roles:read
roles:update
projects:read
projects:create
project-members:assign
settings:update
```

Example module permissions:

```text
workers:read
workers:create
workers:assign-project
workers:update-rate
attendance:mark
kharchi:approve
leads:assign
bookings:approve
```

## Seeded Role Templates

The mysql2 seed prepares these system templates:

- Platform Super Admin;
- Organization Owner;
- Builder Admin;
- Independent Contractor Owner;
- Project Manager;
- Contractor Member;
- Site Supervisor;
- Sales User;
- Viewer.

`User Manager` and `Member` remain inherited compatibility templates. Existing `Super Admin`, `Contractor`, and `Supervisor` names are upgraded in place by the seed to the approved names so referenced role IDs remain stable.

Platform Support permissions are defined in the taxonomy but are not granted to Platform Super Admin while the support-access policy remains open. The prepared Slice D seed removes the legacy Platform Super Admin bridge and grants platform-prefixed permissions for global Users, Roles, Settings, organizations, subscriptions, and feature flags. That seed change remains database-approval-gated.

Runtime enforcement added on 2026-08-10:

- Platform Super Admin session payloads expose no active customer organization, customer memberships, or projects.
- Web rejects customer operational navigation visibility for platform-only roles even if stale client state contains an old permission.
- Mobile refreshes cached sessions, filters Workers by `workers:read`, and redirects unauthorized direct Workers routes.
- The seed requires exact database-name confirmation and grants Platform Super Admin zero Workers permissions.
- Web resolves its active role and permissions from the selected organization membership; platform-only sessions use their platform role.
- Global Users, Roles, and application/SMTP Settings require platform-prefixed permissions.
- Organization/profile combinations are validated by the API and filtered by the web form.
- Platform roles cannot be assigned as customer organization membership roles.

## Platform-Provisioned Customer Onboarding

Platform Super Admin creates a customer organization together with its primary Owner identity. The API creates the organization as `DRAFT`, creates or reuses the customer user, assigns an `INVITED` organization membership, and issues a hashed, single-use 48-hour invitation. Builder customers receive `Organization Owner`; Contractor customers receive `Independent Contractor Owner`.

The customer opens the web or mobile activation link. A new or inactive customer identity creates its password. An existing active user accepts the additional organization membership from the valid invitation without re-entering or changing the existing password. Acceptance atomically activates the membership and organization, then the client redirects to Login with the invited email pre-filled. Invitation acceptance does not create a login session. Platform Super Admin is never inserted into customer membership, and the organization cannot be manually activated before an active Owner exists.

After the organization transaction commits, the API attempts to email the primary Owner through the configured SMTP settings. The message includes onboarding context plus the existing web/mobile activation links and never includes a password. Email failure is non-transactional: organization creation still succeeds, the response reports `EMAIL_FAILED` or `MANUAL`, and the platform portal retains both links for secure manual sharing. Stored database invitation records contain only the token's SHA-256 hash.

## Web Portal Auth Responsibilities

- Login, logout, session refresh, and profile access.
- Platform administration where platform permissions allow it.
- Organization administration where organization permissions allow it.
- Permission-aware navigation and protected routes.
- Administrative user, role, setting, project, report, and audit workflows.
- Back-office approval and corrective operations.

## Mobile Auth Responsibilities

- Mobile login and secure token/session storage.
- Active organization selection when the user has more than one membership.
- Active project selection when the user has more than one project.
- Permission-aware field menu.
- Project-scoped workflows for allowed Builder, Contractor, Supervisor, and Sales users.
- No Platform Admin workflows.

If a platform-only user signs into mobile, mobile should show no field workspace unless that user also has an active organization membership and project access.

## Open Auth Questions

- Should mobile allow platform-only login and show an empty/no-field-workspace state, or block platform-only users after login?
- Should mobile use the same refresh-cookie model or a mobile-specific refresh-token endpoint?
- Is support impersonation included in MVP or deferred?
- Are member-specific permission grants/denials included in MVP or deferred?
- Is two-factor authentication required for owners, finance, or platform users?
