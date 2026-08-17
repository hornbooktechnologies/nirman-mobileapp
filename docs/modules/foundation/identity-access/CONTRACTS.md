# Identity Access Contract

## 1. Status

Phase 0 aligned draft for product-owner review.

This is a contract plan only. It does not approve implementation, migrations, package changes, or business-module work.

Project Setup And Assignment contract work is paused until this Phase 0 alignment pass is accepted.

Approved Phase 0 decisions recorded here:

- Use `resource:action` permission keys for NirmanSite MVP.
- Use plural `snake_case` table names for all new NirmanSite SQL tables.
- Treat `apps/api` with `mysql2/promise` repositories as the only active database access path.
- Treat `packages/database/prisma` as archived inherited history only.
- Keep contracts in `packages/shared` for MVP unless a later decision creates `packages/contracts`.
- Model future access through `organization_members` and `project_members`; current global `users.roleId` is inherited compatibility only.
- Platform-created customer organizations use an email/password-first primary Owner invitation: DRAFT organization, pending or reused user identity, INVITED Owner membership, single-use activation, then ACTIVE membership and organization.
- Platform Super Admin is never added as the customer organization Owner or member.

Current source evidence:

- API already has email/password auth, JWT access tokens, refresh-token rotation through an HTTP-only cookie, users, roles, permissions, settings, and API-local `mysql2`.
- Current roles and permissions are global, not organisation-scoped.
- Current mobile auth is placeholder session storage only.
- Current web navigation is permission-aware using `resource:action` keys.
- Organisation, membership, project, and project assignment models are not implemented yet.

## 2. Purpose

Identity Access defines who a person is, which organisation they belong to, which projects they can access, and which actions they may perform.

It is the foundation contract for all later NirmanSite modules: projects, workers, attendance, Kharchi, sales, reports, files, audit, notifications, and offline sync.

## 3. Business Outcome

A Builder, Contractor, Supervisor, Sales User, or Admin can log in and see only the organisations, projects, modules, records, and actions they are allowed to use.

Every future project-scoped API must be able to answer:

```text
Who is the user?
Which organisation are they acting inside?
Are they an active member?
Do they have the required permission?
Are they assigned to this project, or do they have organisation-wide scope?
Does the target record belong to the same organisation/project?
```

## 4. Actors

- Platform Super Admin: Manages platform-level access, support, organisation activation, and subscription controls.
- Organisation Owner: Owns a Builder or Contractor organisation and cannot be locked out by normal role editing.
- Builder Admin: Manages members, roles, projects, permissions, reports, and web back-office workflows.
- Independent Contractor Owner: Owns a Contractor organisation and performs operations without Builder approval.
- Contractor Member: Performs project work under their own organisation or as a Builder-invited member.
- Site Supervisor: Performs daily field workflows for assigned projects.
- Sales User: Manages leads, follow-ups, site visits, inventory visibility, and bookings where permitted.
- Viewer: Read-only user for permitted organisations/projects.
- API System Actor: Internal actor for repeat-safe jobs, invitations, notification generation, sync processing, and audit entries.

## 5. Scope

Included:

- User identity.
- Authentication and session contract.
- Organisation model.
- Organisation membership model.
- Role templates and permissions.
- Project access model.
- Active organisation and active project selection.
- Login/session response contract.
- Permission resolution rules.
- Web and mobile responsibilities.
- API endpoint inventory.
- Request/response schemas.
- Error codes and UI states.
- Security and tenant-isolation rules.
- Acceptance criteria and test matrix.

## 6. Explicit Exclusions

Not included in this contract:

- Worker management implementation.
- Attendance implementation.
- Kharchi, wages, materials, expenses, sales, reports, dashboards, bookings, and offline sync implementation.
- Database migrations.
- Prisma work.
- `packages/contracts` creation.
- Final OTP provider selection.
- Push notification provider selection.
- Subscription billing rules.
- Cross-organization project sharing or automatic Contractor staff propagation.

## 7. Web Responsibilities

The web admin portal owns back-office identity administration:

- Login, refresh, logout, profile, and password change.
- Organisation settings and branding.
- Member list, invite, activation/deactivation, and role assignment.
- Role template and permission management.
- Project creation, edit, archive, and member assignment.
- Permission-aware navigation.
- Forbidden state for inaccessible routes.
- Audit visibility for identity, role, membership, and project assignment changes.
- Corrective admin workflows, not high-frequency field entry.

Web must not:

- Access the database directly.
- Define independent permission keys.
- Guess visibility from hidden routes alone.
- Reuse mobile React Native components.

## 8. Mobile Responsibilities

The mobile app owns field-friendly identity flows:

- Login and secure token/session storage.
- Active organisation selection when the user has more than one membership.
- Active project selection when the user has more than one project.
- Permission-aware home/menu.
- Clear current project display on every project-scoped screen.
- Profile and logout.
- Offline-visible session state for cached allowed screens.
- Poor-network handling for refresh, project switch, and queued future actions.

Mobile must not:

- Access the database directly.
- Define independent permissions, statuses, errors, or response shapes.
- Expose all web admin workflows.
- Allow server-authoritative actions, such as project assignment or unit blocking, while offline.

## 9. Shared Contract Ownership

Approved MVP location: keep Identity Access contracts in `packages/shared` for MVP Phase 0 because that package already owns platform-neutral permissions, schemas, types, constants, and tokens.

Reversible future recommendation: create `packages/contracts` later only if shared contracts grow large enough to justify separation from theme tokens and utilities.

Until approved, use:

```text
packages/shared/src/constants
packages/shared/src/schemas
packages/shared/src/types
```

No `packages/contracts` package is approved for MVP Phase 0.

## 10. Domain Model

Identity:

```text
User
```

A person who can authenticate. A user can later belong to one or more organisations.

Organisation:

```text
Organization
```

The tenant boundary. MVP organisation types:

```text
BUILDER
CONTRACTOR
```

Organisation Membership:

```text
OrganizationMember
```

Connects a user to an organisation with a role, status, operating scope, and optional metadata.

Role Template:

```text
Role
```

A reusable permission bundle. Existing code has inherited global roles through a user role relationship. Future access must be resolved through `organization_members` and `project_members`; current global `users.roleId` compatibility must not be treated as the target model.

Permission:

```text
Permission
```

A stable action key used by API guards, web navigation, mobile navigation, and tests.

Project:

```text
Project
```

The primary operating context for construction and sales modules.

Project Membership:

```text
ProjectMember
```

Connects an organisation member to a project and defines whether they can access that project.

Session:

```text
Session / RefreshToken
```

Tracks login state, refresh-token rotation, device metadata, expiry, and revocation.

## 11. Statuses

User status:

```text
ACTIVE
INACTIVE
LOCKED
PENDING_VERIFICATION
```

Organisation status:

```text
DRAFT
ACTIVE
SUSPENDED
ARCHIVED
```

Organisation member status:

```text
INVITED
ACTIVE
INACTIVE
SUSPENDED
LEFT
```

Project status:

```text
DRAFT
ACTIVE
ON_HOLD
COMPLETED
ARCHIVED
```

Project member status:

```text
ACTIVE
INACTIVE
ENDED
```

Invitation status:

```text
PENDING
ACCEPTED
EXPIRED
REVOKED
```

Session status:

```text
ACTIVE
EXPIRED
REVOKED
ROTATED
```

## 12. Permissions

Approved permission key format: `resource:action`.

Reason:

- Current source already uses `resource:action`.
- `packages/shared/src/constants/permissions.ts` defines `PermissionKey` as `${resource}:${action}`.
- API `PermissionsGuard` splits permission strings on `:`.
- Web navigation uses values like `users:read`.

Phase 0 decision:

```text
Use resource:action for all new permissions.
Document MVP dot-style examples as superseded notation.
Do not support both formats in runtime unless a migration bridge is explicitly approved.
```

Foundation permission resources:

```text
auth
users
roles
settings
organizations
members
projects
project-members
files
audit-logs
notifications
reports
```

Foundation actions:

```text
create
read
update
delete
manage
invite
activate
deactivate
assign
unassign
switch
view-all
view-own
approve
reject
export
```

Initial required foundation permissions:

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
projects:assign

project-members:read
project-members:assign
project-members:unassign

settings:read
settings:update

audit-logs:read
notifications:read
```

## 13. Access Rules

Every authenticated request must resolve:

```text
user
activeOrganizationId
activeMembership
permissions
activeProjectId, when project-scoped
projectAssignment or organizationWideProjectAccess
```

Organisation access rule:

```text
User must have an ACTIVE membership in the active organisation.
Organisation must be ACTIVE.
```

Project access rule:

```text
Project must belong to active organisation.
User must either:
- have organisation-wide project scope; or
- have ACTIVE project membership for the project.
```

Permission rule:

```text
Required permission must be present after resolving:
- protected owner capabilities;
- organisation role permissions;
- explicit member grants;
- explicit member denials, if approved later;
- project-level overrides, if approved later.
```

Record access rule for future modules:

```text
The target record's organization_id must equal activeOrganizationId.
If the record has project_id, it must equal activeProjectId or be within an explicitly permitted project set.
```

Owner lockout rule:

```text
At least one ACTIVE owner must remain for every active organisation.
Owner baseline capabilities cannot be removed by ordinary role editing.
```

## 14. Login And Session Contract

Current implementation:

- `POST /auth/login` accepts email/password.
- Returns `accessToken` and `user`.
- Sets refresh token in HTTP-only cookie.
- `POST /auth/refresh` returns a new access token and rotates refresh token.
- `GET /auth/me` returns user, role, and permissions.
- Mobile currently stores a placeholder access token and username.

Target contract:

```json
{
  "success": true,
  "data": {
    "accessToken": "jwt",
    "refreshToken": "mobile-only-if-approved",
    "expiresInSeconds": 900,
    "user": {
      "id": "uuid",
      "name": "string",
      "email": "string|null",
      "mobile": "string|null",
      "avatarUrl": "string|null",
      "status": "ACTIVE"
    },
    "activeOrganization": {
      "id": "uuid",
      "name": "string",
      "type": "BUILDER",
      "status": "ACTIVE",
      "branding": {
        "logoUrl": "string|null",
        "primaryColor": "string|null"
      },
      "operatingProfile": "SELF_MANAGED_BUILDER"
    },
    "memberships": [
      {
        "organizationId": "uuid",
        "memberId": "uuid",
        "organizationName": "string",
        "organizationType": "BUILDER",
        "memberStatus": "ACTIVE",
        "role": {
          "id": "uuid",
          "key": "OWNER",
          "name": "Owner"
        }
      }
    ],
    "permissions": ["projects:read", "attendance:mark"],
    "projectAccess": {
      "scope": "ASSIGNED",
      "activeProjectId": "uuid|null",
      "projects": [
        {
          "id": "uuid",
          "name": "string",
          "status": "ACTIVE",
          "roleLabel": "Supervisor",
          "isDefault": true
        }
      ]
    },
    "featureFlags": {},
    "serverTime": "2026-07-29T00:00:00.000Z"
  },
  "meta": {}
}
```

Authentication method recommendation:

- Phase 1: preserve email/password because current foundation is implemented that way.
- Phase 2: add OTP-first mobile onboarding after provider and rate-limit rules are approved.
- Final MVP: support both invited-user email/password and mobile-number OTP if approved.

Open approval required:

```text
OTP-first, email/password-first, or both.
Mobile refresh token in response body versus cookie-only refresh.
Session/device listing scope.
```

## 15. API Contract Inventory

Current implemented endpoints:

```text
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
GET    /auth/me
PATCH  /auth/change-password

GET    /users
GET    /users/me
PATCH  /users/me
PATCH  /users/me/password
GET    /users/:id
POST   /users
PATCH  /users/:id
DELETE /users/:id

GET    /roles
GET    /roles/:id
POST   /roles
PATCH  /roles/:id
DELETE /roles/:id
GET    /roles/:id/permissions
PUT    /roles/:id/permissions

GET    /settings
PATCH  /settings/general
PATCH  /settings/email
```

Target Identity Access endpoints:

```text
POST   /auth/login
POST   /auth/login/otp/request
POST   /auth/login/otp/verify
POST   /auth/refresh
POST   /auth/logout
POST   /auth/logout-all
GET    /auth/me
GET    /auth/session
PATCH  /auth/change-password

GET    /organizations
POST   /organizations
GET    /organizations/:organizationId
PATCH  /organizations/:organizationId
POST   /organizations/:organizationId/switch

GET    /organizations/:organizationId/members
POST   /organizations/:organizationId/invitations
POST   /organizations/:organizationId/invitations/:invitationId/accept
PATCH  /organizations/:organizationId/members/:memberId
POST   /organizations/:organizationId/members/:memberId/deactivate

GET    /organizations/:organizationId/roles
POST   /organizations/:organizationId/roles
PATCH  /organizations/:organizationId/roles/:roleId
PUT    /organizations/:organizationId/roles/:roleId/permissions

GET    /organizations/:organizationId/projects
POST   /organizations/:organizationId/projects
GET    /organizations/:organizationId/projects/:projectId
PATCH  /organizations/:organizationId/projects/:projectId
POST   /organizations/:organizationId/projects/:projectId/archive

GET    /organizations/:organizationId/projects/:projectId/members
PUT    /organizations/:organizationId/projects/:projectId/members/:memberId
DELETE /organizations/:organizationId/projects/:projectId/members/:memberId
POST   /organizations/:organizationId/projects/:projectId/switch
```

## 16. Request And Response Schemas

API envelope:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Error envelope:

```json
{
  "success": false,
  "error": {
    "code": "MACHINE_READABLE_CODE",
    "message": "Human-readable message",
    "details": {}
  }
}
```

Create platform-provisioned organisation request:

```json
{
  "name": "string",
  "type": "BUILDER|CONTRACTOR",
  "operatingProfile": "INDEPENDENT_CONTRACTOR|SELF_MANAGED_BUILDER|BUILDER_CONTRACTOR|BUILDER_CONTRACTOR_SUPERVISOR|CUSTOM",
  "timezone": "Asia/Kolkata",
  "currency": "INR",
  "owner": {
    "name": "string",
    "email": "string",
    "mobile": "string",
    "designation": "string|null"
  }
}
```

Creation returns the DRAFT organization, INVITED Owner membership, invitation expiry, one-time web/mobile activation links, and `deliveryStatus`. It never includes a password. When SMTP is configured, the API attempts an Owner onboarding email only after the organization transaction commits. Delivery failure must not roll back or hide a successfully created organization; the response reports `EMAIL_SENT`, `EMAIL_FAILED`, or `MANUAL`, and the existing one-time links remain available for secure manual delivery.

The onboarding email includes the organization, Owner role, login email, expiry, and both activation links. Its HTML version renders both activation targets as buttons. For local Expo Go testing, `EXPO_GO_PROJECT_URL` changes the mobile target to `exp://<LAN-IP>:8081/--/activate?token=...`; when unset, the installed-app `MOBILE_APP_SCHEME` remains the fallback. It never includes a generated password or SMTP secret. YOPmail addresses may be used as development recipients, but YOPmail is not the outbound SMTP provider.

Primary Owner invitation acceptance uses the following request contract:

```json
{
  "password": "required only when the invited identity is new or inactive; omit for an existing active identity"
}
```

The API derives this requirement from the invitation preview's `requiresPasswordSetup` value; clients must not decide it from email alone. A valid, unexpired, single-use invitation may activate the linked additional organization membership for an existing active user without requesting or changing that user's password. This does not authenticate the user. After successful acceptance, web and mobile redirect to Login with the normalized invited email pre-filled, and the user signs in using the existing account password.

Invite member request:

```json
{
  "name": "string",
  "email": "string|null",
  "mobile": "string|null",
  "roleId": "uuid",
  "projectIds": ["uuid"],
  "organizationWideProjectAccess": false
}
```

Assign project member request:

```json
{
  "memberId": "uuid",
  "roleLabel": "string|null",
  "startsOn": "YYYY-MM-DD|null",
  "endsOn": "YYYY-MM-DD|null",
  "status": "ACTIVE"
}
```

Switch active organisation request:

```json
{
  "organizationId": "uuid"
}
```

Switch active project request:

```json
{
  "projectId": "uuid"
}
```

Resolved permission response:

```json
{
  "permissions": ["members:read", "projects:read"],
  "scope": {
    "organizationId": "uuid",
    "projectScope": "ALL|ASSIGNED|NONE",
    "projectIds": ["uuid"]
  }
}
```

## 17. Error Codes

```text
AUTH_INVALID_CREDENTIALS
AUTH_TOKEN_EXPIRED
AUTH_REFRESH_TOKEN_INVALID
AUTH_REFRESH_TOKEN_REVOKED
AUTH_SESSION_REQUIRED
AUTH_PASSWORD_WEAK
AUTH_OTP_INVALID
AUTH_OTP_EXPIRED
AUTH_RATE_LIMITED

ORG_REQUIRED
ORG_NOT_FOUND
ORG_INACTIVE
ORG_ACCESS_DENIED

MEMBERSHIP_REQUIRED
MEMBERSHIP_NOT_FOUND
MEMBERSHIP_INACTIVE
MEMBERSHIP_INVITE_EXPIRED
MEMBERSHIP_DUPLICATE
MEMBERSHIP_OWNER_LOCKOUT_DENIED

PROJECT_REQUIRED
PROJECT_NOT_FOUND
PROJECT_INACTIVE
PROJECT_ACCESS_DENIED
PROJECT_ASSIGNMENT_REQUIRED

PERMISSION_DENIED
ROLE_NOT_FOUND
ROLE_SYSTEM_PROTECTED
ROLE_PERMISSION_INVALID

VALIDATION_FAILED
CONFLICT
IDEMPOTENCY_CONFLICT
SERVER_ERROR
```

## 18. Validation Rules

- User email must be valid and normalized to lowercase.
- Mobile number format must be approved before OTP implementation.
- Password minimum remains at least 8 characters; stronger policy requires approval.
- A login identity must be unique within the selected authentication strategy.
- Organisation name is required.
- Organisation type must be `BUILDER` or `CONTRACTOR`.
- Organisation must always retain at least one active Owner.
- One user should have at most one active membership per organisation.
- Project name is required.
- Project must belong to the active organisation.
- Project member must be an active organisation member.
- Role permissions must use approved shared permission keys.
- Clients may validate early, but API validation is authoritative.

## 19. Database Table Plan

No migration is approved by this draft.

Current implemented foundation tables may still use inherited compatibility names in code:

```text
user
role
permission
refreshtoken
systemsetting
```

Earlier architecture docs mentioned plural current foundation names:

```text
users
roles
permissions
role_permissions
refresh_tokens
system_settings
audit_logs
file_assets
```

Phase 0 resolution:

```text
Use plural snake_case table names for all new NirmanSite SQL tables.
Do not rename inherited tables in this contract.
Any future compatibility migration from inherited physical names must be approved separately.
```

Target SQL-first table plan:

```text
users
organizations
organization_members
roles
permissions
role_permissions
organization_member_permission_grants
organization_member_permission_denials
projects
project_members
refresh_tokens
invitations
audit_logs
notifications
file_assets
```

Recommended key fields:

```text
organizations:
id, name, type, status, operating_profile, timezone, currency,
logo_file_id, created_at, updated_at, created_by, updated_by

organization_members:
id, organization_id, user_id, role_id, status, designation,
organization_wide_project_access, joined_at, invited_by,
created_at, updated_at, created_by, updated_by

roles:
id, organization_id nullable, key, name, description, is_system,
created_at, updated_at, created_by, updated_by

permissions:
id, key, resource, action, description, created_at

role_permissions:
role_id, permission_id, created_at

projects:
id, organization_id, name, project_code, type, address, status,
start_date, expected_completion_date, created_at, updated_at,
created_by, updated_by

project_members:
id, organization_id, project_id, member_id, role_label, status,
starts_on, ends_on, created_at, updated_at, created_by, updated_by

refresh_tokens:
id, user_id, token_hash, device_id, expires_at, revoked_at,
rotated_at, created_at
```

Recommended constraints:

```text
organizations.id primary key
organization_members unique (organization_id, user_id)
roles unique (organization_id, key)
permissions unique (key)
role_permissions unique (role_id, permission_id)
projects unique (organization_id, project_code)
project_members unique (project_id, member_id)
refresh_tokens index (user_id, token_hash)
```

## 20. Audit Events

Audit event naming recommendation: `identity.<entity>.<action>`.

Required events:

```text
identity.auth.login_success
identity.auth.login_failed
identity.auth.logout
identity.auth.refresh_rotated
identity.auth.password_changed

identity.organization.created
identity.organization.updated
identity.organization.activated
identity.organization.suspended

identity.member.invited
identity.member.invite_accepted
identity.member.updated
identity.member.deactivated
identity.member.role_changed

identity.role.created
identity.role.updated
identity.role.deleted
identity.role.permissions_replaced

identity.project.created
identity.project.updated
identity.project.archived
identity.project.member_assigned
identity.project.member_unassigned
identity.project.active_project_changed
identity.organization.active_organization_changed
```

Audit records must include:

```text
organization_id
project_id when relevant
actor_user_id
action
entity_type
entity_id
old_value when appropriate
new_value when appropriate
ip/device metadata when available
created_at
```

Sensitive values such as passwords, OTPs, tokens, and SMTP secrets must never be stored in audit metadata.

## 21. Notification Events

Notifications are useful but not mandatory for the first implementation unless invitations are implemented.

Recommended notification types:

```text
member.invitation_created
member.invitation_accepted
member.role_changed
member.deactivated
project.member_assigned
project.member_unassigned
organization.suspended
```

Notification deep links must revalidate permission and project access.

## 22. UI State Requirements

Web and mobile must define these states for identity access:

- Loading: session check, organisation list, project list, permissions.
- Empty: no organisations, no projects, no assigned projects.
- Error: failed login, failed refresh, failed project switch.
- Forbidden: missing permission, inactive membership, inaccessible project.
- Success: login complete, organisation switch complete, project switch complete.
- Offline: cached session visible, server refresh unavailable, server-authoritative writes disabled.

Required UI behavior:

- Navigation is built from resolved permissions.
- Hidden navigation is not security.
- Active organisation and active project are visible where context matters.
- Mobile must avoid ERP terminology in primary flows.
- Web may expose advanced administration only where permitted.

## 23. Offline And Poor Network Behavior

Identity offline behavior:

- Cached session may allow read-only access to already-cached permitted mobile screens.
- Login requires network unless an explicit offline unlock feature is approved later.
- Refresh requires network.
- Organisation switch requires network.
- Project switch may update local UI only if the project was already included in the latest valid session payload.
- Server-authoritative writes must queue only after the offline sync architecture is approved.
- Permission changes take effect after refresh/re-auth within an approved interval.
- If cached permissions are stale, server rejects forbidden writes during sync.

## 24. Security Requirements

- API is the only database access layer.
- Use `mysql2/promise` repositories with parameterized SQL.
- Never use Prisma for new Identity Access work.
- JWT access token must be short-lived.
- Refresh tokens must be hashed at rest.
- Refresh token rotation should remain required.
- Web refresh cookie must be HTTP-only.
- Mobile refresh handling needs explicit approval.
- Every project-scoped endpoint must check organisation, membership, permission, project assignment, and record ownership.
- Deactivated users, members, organisations, and projects must be blocked consistently.
- Owner lockout must be prevented.
- Permission changes must invalidate or age out stale access within an approved interval.
- Logs and audit events must redact credentials, OTPs, tokens, and secrets.
- Cross-tenant ID manipulation must return forbidden or not-found according to approved security posture.

## 25. Acceptance Criteria

- Login returns enough session data for web and mobile to initialize navigation without guessing permissions.
- User cannot access an organisation without active membership.
- User cannot access a project without assignment or organisation-wide scope.
- User cannot access another tenant's records by changing IDs.
- Owner cannot accidentally remove the last owner or lock themselves out.
- Web can manage members, roles, permissions, and project assignments where permitted.
- Mobile can select active organisation/project and show only allowed modules.
- API guards/helpers are reusable by future modules.
- All errors use stable shared error codes.
- Contract definitions live in the approved shared package location.
- No business module implementation begins until this contract and open decisions are approved.

## 26. Test Matrix

```text
Auth:
- valid email/password login succeeds
- invalid credentials fail with AUTH_INVALID_CREDENTIALS
- inactive user cannot log in
- refresh rotates token
- revoked refresh token cannot be reused
- logout revokes current refresh token

Organisation:
- active member can load organisation
- inactive member is denied
- suspended organisation blocks access
- cross-organisation ID access is denied

Membership:
- owner invites member
- duplicate active membership is rejected
- member deactivation blocks future access
- last active owner cannot be removed

Permissions:
- role permission grants allow endpoint access
- missing permission returns PERMISSION_DENIED
- changed permissions take effect after refresh/re-auth interval
- invalid permission key is rejected

Projects:
- assigned member can access project
- unassigned member cannot access project
- organisation-wide member can access all active projects
- archived project is read-only unless restoration permission is approved

Web:
- navigation hides inaccessible admin pages
- direct route access still calls API and receives forbidden
- role editor cannot remove protected owner baseline access

Mobile:
- single project auto-selects
- multiple projects show switcher
- selected project persists locally
- poor network shows recoverable state
- stale cached permission cannot bypass API

Tenant Isolation:
- all future project-scoped helper tests include organization_id and project_id checks
- aggregate/report helper tests cannot leak inaccessible project totals
```

## 27. Open Decisions

1. Authentication method: email/password-first, OTP-first, or both.
2. Mobile refresh strategy: cookie-compatible flow or body token stored in secure storage.
3. Role model implementation detail: organisation-scoped roles from the start, or a compatibility bridge from inherited global roles.
4. Permission overrides: member/project-specific grants and denials in MVP or defer.
5. Active organisation/project persistence: server-side session preference, client-side preference, or both.
6. Whether support/admin impersonation is included in MVP.
7. Exact session expiry and permission refresh interval.
8. Whether invitation delivery is email, SMS/OTP, manual link, or later.
9. SQL compatibility migration path from inherited physical tables to approved plural `snake_case` names, if renaming existing tables is ever required.

Resolved: Builder organizations invite hired Contractors as internal `Contractor Member` memberships. Separately subscribed Contractors own independent `CONTRACTOR` organizations, and cross-organization project sharing is deferred.

## 28. Implementation Notes For Later

- Start with shared contract constants, schemas, error codes, and response types after approval.
- Add organisation and project access helpers before writing business modules.
- Preserve current API response shapes only where existing screens depend on them, or provide a documented versioned transition.
- Keep current email/password flow working while adding mobile-friendly auth.
- Implement one module at a time.
- Use API repositories only; no web/mobile database imports.
- Do not add product permissions without matching API and UI workflow.
- Use transaction boundaries for member role changes, permission replacement, project assignment, invitation acceptance, and session revocation.
- Add audit writes at the same service boundary as the business action.
- Add tenant/project isolation tests before worker, attendance, Kharchi, sales, reports, or sync implementation.

## 29. Documentation Updates Needed

Conflicts found between docs and current code:

- Permission notation conflict is resolved: use `resource:action`; dot-style examples are superseded.
- Database ownership conflict is resolved: `apps/api` with `mysql2/promise` is active; `packages/database/prisma` is archived inherited history only.
- Contract package conflict is resolved for MVP: keep contracts in `packages/shared`; do not create `packages/contracts` in Phase 0.
- SQL naming conflict is resolved for new tables: use plural `snake_case`; inherited table rename/migration is a separate future decision.
- Access-model conflict is resolved: model future access through `organization_members` and `project_members`; inherited global `users.roleId` compatibility is not the target model.
- Template completeness conflict is addressed by the Phase 0 template updates.
- Current mobile session stores only placeholder `accessToken` and `userName`; MVP requires active organisation, active project, memberships, permissions, and feature flags in the session. Recommendation: update mobile architecture after Identity Access approval.
