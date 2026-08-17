# Project Setup And Assignment Contract

## 1. Status

Phase 0 aligned draft for product-owner review.

This is a contract plan only. It does not approve implementation, migrations, package changes, database changes, package installation, or business-module work.

Approved Phase 0 decisions applied in this contract:

- Use `resource:action` permission keys for NirmanSite MVP.
- Use plural `snake_case` table names for all new NirmanSite SQL tables.
- Treat `apps/api` with `mysql2/promise` repositories as the only active database access path.
- Treat `packages/database/prisma` as archived inherited history only.
- Keep contracts in `packages/shared` for MVP unless a later decision creates `packages/contracts`.
- Model future access through `organization_members` and `project_members`; current global `users.roleId` compatibility is inherited only.

Current source evidence:

- API has authentication, users, roles, settings, and API-local `mysql2` database access.
- Current API permissions use `resource:action` and the `PermissionsGuard` splits permission strings on `:`.
- Current users and roles are global foundation compatibility, not the target organisation/project access model.
- `packages/shared/src/constants/permissions.ts` does not yet include project resources.
- Web navigation is permission-aware but does not yet include project administration.
- Mobile has project-themed placeholder screens and placeholder session storage only.
- No real Project Setup And Assignment API module is implemented yet.

## 2. Purpose

Project Setup And Assignment defines how Builder and Contractor organisations create projects, manage project metadata, assign organisation members to projects, select an active project context, and enforce project-scoped access across future modules.

This contract is required before implementing Workers, Attendance, Wages, Kharchi, Materials, Expenses, Progress, Gallery, Leads, Follow-ups, Site Visits, Unit Inventory, Bookings, Reports, and Offline Sync.

## 3. Business Outcome

A Builder or Contractor can set up one or more projects, assign the right people, and ensure users only see or modify records for projects they are allowed to access.

Every future project-scoped API must be able to answer:

```text
Who is the authenticated user?
Which organisation are they acting inside?
Is their organisation membership active?
Do they have the required permission?
Does the project belong to the active organisation?
Are they assigned to the project, or do they have organisation-wide project access?
Does the target record belong to the same organisation and project?
```

## 4. Actors

- Platform Super Admin: Supports platform-level administration, organisation suspension, and support workflows under separate platform controls.
- Organisation Owner: Protected owner of a Builder or Contractor organisation with baseline access that ordinary role/project edits cannot remove.
- Builder Admin: Creates and manages Builder-owned projects, assigns members, configures project access, and reviews project setup.
- Independent Contractor Owner: Creates and owns Contractor-organisation projects without requiring Builder approval.
- Contractor Member: Works on assigned projects inside a Builder or Contractor organisation.
- Project Manager: Oversees assigned projects and project teams.
- Site Supervisor: Uses assigned project context for field workflows.
- Sales User: Uses assigned project context for leads, follow-ups, site visits, inventory visibility, and bookings where permitted.
- Viewer: Reads permitted project information without operational write access.
- API System Actor: Internal actor for audit, notification, sync, and repeat-safe jobs.

## 5. Scope

Included:

- Project model and metadata.
- Project status lifecycle.
- Project member assignment model.
- Organisation-wide project access.
- Active project selection.
- Project-scoped access checks for future modules.
- Web admin responsibilities.
- Mobile field responsibilities.
- Shared contract ownership.
- API endpoint inventory.
- Request and response schemas.
- Validation rules.
- Stable error codes.
- Database table plan.
- Permissions.
- Audit and notification events.
- UI state requirements.
- Offline and poor-network behavior.
- Security and tenant/project isolation rules.
- Acceptance criteria.
- Test matrix.

## 6. Explicit Exclusions

Not included:

- Worker Management implementation.
- Attendance implementation.
- Wages implementation.
- Kharchi implementation.
- Materials implementation.
- Expenses implementation.
- Progress implementation.
- Gallery implementation.
- Leads, Follow-ups, Site Visits, Unit Inventory, and Bookings implementation.
- Reports implementation.
- Offline Sync implementation.
- Project phases, towers, floors, and units implementation.
- External Contractor organisation collaboration implementation.
- Database migrations or SQL files.
- Prisma work.
- `packages/contracts` creation.
- Web or mobile feature implementation.

## 7. Web Responsibilities

The web admin portal owns project setup and back-office assignment:

- List projects for the active organisation.
- Create Builder-owned or Contractor-owned projects where permitted.
- View and edit project metadata.
- Change project status according to approved transitions.
- Archive and restore projects where permitted.
- Assign and unassign active organisation members to projects.
- Show project member status, role label, assignment dates, and access state.
- Grant or revoke organisation-wide project access when permitted by the Identity Access contract.
- Provide filters by status, type, city/location, owner, and assigned member.
- Show audit history for project and assignment changes.
- Show loading, empty, error, forbidden, success, and archived read-only states.

Web must not:

- Access the database directly.
- Define independent permission keys, statuses, error codes, or response shapes.
- Treat hidden navigation as security.
- Reuse mobile React Native components.

## 8. Mobile Responsibilities

The mobile app owns field-friendly project context:

- Load accessible projects from the session or project-access endpoint.
- Auto-select the only accessible active project.
- Show a project switcher for multi-project users.
- Persist the last selected project locally.
- Display the current project clearly on every project-scoped screen.
- Clear the active project when access is removed, expired, inactive, archived, or otherwise forbidden.
- Prevent accidental saves into the wrong project.
- Show no-project, no-assigned-project, archived, forbidden, offline, and poor-network states.
- Use shared statuses, permissions, errors, and response shapes.

Mobile must not:

- Access the database directly.
- Own full back-office project administration unless later approved.
- Define independent business rules.
- Allow server-authoritative project setup or assignment actions while offline.

## 9. Shared Contract Ownership

Approved MVP location: `packages/shared`.

Shared project-access contract assets should later include:

- Project status enum.
- Project member status enum.
- Project type enum.
- Project access scope enum.
- Permission keys.
- Error codes.
- Request schemas.
- Response schemas.
- Validation constants.
- Audit event names.
- Notification event names.
- API envelope and pagination conventions where shared.

No `packages/contracts` package is approved for MVP Phase 0.

## 10. Domain Model

### Organization

Tenant boundary. MVP organisation types:

```text
BUILDER
CONTRACTOR
```

### OrganizationMember

Connects a user to an organisation with membership status, role, permission resolution, and project access scope.

### Project

The primary operating context for construction and sales operations.

Minimum fields:

```text
id
organization_id
name
project_code
type
address_line1
address_line2
city
state
postal_code
latitude
longitude
status
start_date
expected_completion_date
description
cover_file_id
created_by
updated_by
created_at
updated_at
archived_at
archived_by
```

### ProjectMember

Assignment of an organisation member to a project.

Minimum fields:

```text
id
organization_id
project_id
member_id
role_label
status
starts_on
ends_on
created_by
updated_by
created_at
updated_at
ended_at
ended_by
```

### ProjectAccessScope

Resolved access scope for a member:

```text
ALL
ASSIGNED
NONE
```

### ActiveProjectContext

The currently selected project for project-scoped mobile and web workflows.

The API must validate every request independently; active project context is a convenience, not an authorization shortcut.

## 11. Project Statuses

Approved contract statuses:

```text
DRAFT
ACTIVE
ON_HOLD
COMPLETED
ARCHIVED
```

Allowed transitions:

```text
DRAFT -> ACTIVE
DRAFT -> ARCHIVED
ACTIVE -> ON_HOLD
ACTIVE -> COMPLETED
ACTIVE -> ARCHIVED
ON_HOLD -> ACTIVE
ON_HOLD -> ARCHIVED
COMPLETED -> ARCHIVED
ARCHIVED -> ACTIVE
```

Behavior:

- `DRAFT`: Setup state. Visible to authorised project admins, not default field operations.
- `ACTIVE`: Normal operational state.
- `ON_HOLD`: Visible but restricted. Future modules must define whether new operational entries are blocked.
- `COMPLETED`: Read-only for new operational entries unless a later module allows approved correction.
- `ARCHIVED`: Hidden from default active lists and read-only except restore.

`COMPLETED -> ACTIVE` reopening is not approved as a normal transition. It remains an open product-owner decision.

## 12. Project Member Statuses

Approved contract statuses:

```text
ACTIVE
INACTIVE
ENDED
```

Behavior:

- `ACTIVE`: Member may access the project if organisation membership and project status also allow it.
- `INACTIVE`: Assignment exists but access is blocked.
- `ENDED`: Assignment has ended and must not grant access.

Assignment history should be retained for audit and historical records. Hard deletion is not part of this contract.

## 13. Permissions

Approved permission key format: `resource:action`.

Project permissions:

```text
projects:read
projects:create
projects:update
projects:archive
projects:restore
projects:assign
projects:view-all
projects:switch
```

Project member permissions:

```text
project-members:read
project-members:assign
project-members:update
project-members:unassign
project-members:view-all
```

Permission meanings:

- `projects:read`: Read accessible projects.
- `projects:create`: Create projects in the active organisation.
- `projects:update`: Update project metadata and permitted status fields.
- `projects:archive`: Archive a project.
- `projects:restore`: Restore an archived project.
- `projects:assign`: Assign members to projects.
- `projects:view-all`: View all projects in the active organisation, subject to organisation membership.
- `projects:switch`: Select an active project from the accessible project list.
- `project-members:read`: View member assignments for accessible projects.
- `project-members:assign`: Add active organisation members to projects.
- `project-members:update`: Update project member role label, status, or dates.
- `project-members:unassign`: End project member access.
- `project-members:view-all`: View all project member assignments in the active organisation.

## 14. Access Rules

Organisation access:

```text
Organisation exists.
Organisation status is ACTIVE.
User has ACTIVE organization_members row for the organisation.
```

Project access:

```text
Project exists.
Project.organization_id equals activeOrganizationId.
User has organisation-wide project access, or ACTIVE project_members assignment.
Project status allows the requested operation.
```

Permission access:

```text
User has the required resource:action permission after resolved role and membership rules.
Owner baseline capabilities cannot be removed by ordinary permission or project assignment edits.
```

Future module access:

```text
Every project-scoped record must include organization_id and project_id.
Every API read/write/export/report/sync query must filter by organization_id and permitted project ids.
```

Builder vs Contractor ownership:

- A Builder organisation may create and own projects.
- A Contractor organisation may independently create and own projects.
- Builder organisations may assign Contractor members, Supervisors, Sales Users, Admins, and Viewers to Builder-owned projects.
- For MVP, a hired Contractor is an internal `Contractor Member` of the Builder organization and may be assigned to Builder-owned projects.
- A separately subscribed Contractor organization remains isolated; cross-organization project relationships and automatic staff sharing are deferred.

## 15. Active Project Context

Mobile selection rules:

- Zero accessible projects: show no assigned projects state.
- One accessible `ACTIVE` project: auto-select.
- Multiple accessible projects: show project switcher.
- Last selected project may be stored locally.
- If last selected project is no longer accessible, clear it and require selection.
- If selected project becomes `ARCHIVED`, clear it for operational screens and show read-only/archived state where history is allowed.
- If selected project becomes `ON_HOLD` or `COMPLETED`, future modules must obey that status contract before allowing writes.

Web selection rules:

- Web may use project filters, route params, and detail pages rather than one global active project.
- Web users with `projects:view-all` can view all organisation projects where permitted.
- Direct URL access must still call the API and enforce access.

API rules:

- Client-provided `projectId` is never trusted by itself.
- Path, query, body, and active session context must resolve to a project inside the active organisation.
- API must revalidate project access on every request.
- Active project switch does not grant permissions.

When a user is removed from a project:

- API denies future project-scoped requests immediately after assignment status changes.
- Mobile clears active project after refresh, failed revalidation, or `PROJECT_ACCESS_DENIED`.
- Cached data remains visible only where offline/read-only behavior is approved.
- Queued future offline writes must be rejected during sync if access was removed before sync.

## 16. API Contract Inventory

Target endpoints:

```text
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
GET    /organizations/:organizationId/project-member-assignments
PUT    /organizations/:organizationId/project-members/:memberId/assignments

GET    /organizations/:organizationId/project-access/me
POST   /organizations/:organizationId/projects/:projectId/switch
GET    /organizations/:organizationId/projects/:projectId/context
```

Endpoint access summary:

```text
GET /projects:
projects:read, plus assigned projects or projects:view-all

POST /projects:
projects:create

GET /projects/:projectId:
projects:read, plus project access

PATCH /projects/:projectId:
projects:update, plus project access or projects:view-all

POST /projects/:projectId/archive:
projects:archive, plus project access or projects:view-all

POST /projects/:projectId/restore:
projects:restore, plus projects:view-all unless owner baseline grants restoration

GET /projects/:projectId/members:
project-members:read, plus project access or project-members:view-all

PUT/PATCH/DELETE /projects/:projectId/members/:memberId:
project-members:assign/update/unassign, plus projects:assign

GET /project-member-assignments:
project-members:read, plus organisation-wide access or project-members:view-all

PUT /project-members/:memberId/assignments:
projects:assign, project-members:view-all, and the applicable project-members:assign/update/unassign permissions; all additions, edits, and removals commit atomically

GET /project-access/me:
authenticated active organisation membership

POST /projects/:projectId/switch:
projects:switch, plus project access
```

## 17. Request And Response Schemas

API success envelope:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

API error envelope:

```json
{
  "success": false,
  "error": {
    "code": "PROJECT_ACCESS_DENIED",
    "message": "You do not have access to this project.",
    "details": {}
  }
}
```

Create project request:

```json
{
  "name": "Riverfront Heights",
  "projectCode": "RFH",
  "type": "RESIDENTIAL",
  "address": {
    "line1": "string|null",
    "line2": "string|null",
    "city": "string|null",
    "state": "string|null",
    "postalCode": "string|null",
    "latitude": 23.0225,
    "longitude": 72.5714
  },
  "startDate": "YYYY-MM-DD|null",
  "expectedCompletionDate": "YYYY-MM-DD|null",
  "description": "string|null",
  "status": "DRAFT|ACTIVE"
}
```

Update project request:

```json
{
  "name": "Riverfront Heights Phase 1",
  "projectCode": "RFH-1",
  "type": "RESIDENTIAL",
  "address": {
    "line1": "string|null",
    "line2": "string|null",
    "city": "string|null",
    "state": "string|null",
    "postalCode": "string|null",
    "latitude": 23.0225,
    "longitude": 72.5714
  },
  "startDate": "YYYY-MM-DD|null",
  "expectedCompletionDate": "YYYY-MM-DD|null",
  "description": "string|null",
  "status": "ACTIVE|ON_HOLD|COMPLETED"
}
```

Project response:

```json
{
  "id": "uuid",
  "organizationId": "uuid",
  "name": "Riverfront Heights",
  "projectCode": "RFH",
  "type": "RESIDENTIAL",
  "address": {
    "line1": "string|null",
    "line2": "string|null",
    "city": "string|null",
    "state": "string|null",
    "postalCode": "string|null",
    "latitude": 23.0225,
    "longitude": 72.5714
  },
  "status": "ACTIVE",
  "startDate": "YYYY-MM-DD|null",
  "expectedCompletionDate": "YYYY-MM-DD|null",
  "description": "string|null",
  "coverImageUrl": "string|null",
  "memberCount": 8,
  "currentUserAccess": {
    "scope": "ALL|ASSIGNED",
    "roleLabel": "Supervisor",
    "permissions": ["projects:read"]
  },
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

Project list response:

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Riverfront Heights",
      "projectCode": "RFH",
      "type": "RESIDENTIAL",
      "status": "ACTIVE",
      "city": "Ahmedabad",
      "memberCount": 8,
      "currentUserRoleLabel": "Project Manager"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 1,
    "pageCount": 1
  }
}
```

Assign project member request:

```json
{
  "roleLabel": "Site Supervisor",
  "status": "ACTIVE",
  "startsOn": "YYYY-MM-DD|null",
  "endsOn": "YYYY-MM-DD|null"
}
```

Batch-save member project assignments request:

```json
{
  "assignments": [
    {
      "projectId": "uuid",
      "roleLabel": "Site Supervisor",
      "status": "ACTIVE",
      "startsOn": "YYYY-MM-DD|null",
      "endsOn": "YYYY-MM-DD|null"
    }
  ],
  "unassignProjectIds": ["uuid"]
}
```

The web UI labels `roleLabel` as **Role on this project**. It is descriptive
assignment context only; organisation role permissions remain authoritative.

Project member response:

```json
{
  "id": "uuid",
  "organizationId": "uuid",
  "projectId": "uuid",
  "memberId": "uuid",
  "user": {
    "id": "uuid",
    "name": "string",
    "email": "string|null",
    "mobile": "string|null"
  },
  "role": {
    "id": "uuid",
    "key": "SUPERVISOR",
    "name": "Supervisor"
  },
  "roleLabel": "Site Supervisor",
  "status": "ACTIVE",
  "startsOn": "YYYY-MM-DD|null",
  "endsOn": "YYYY-MM-DD|null",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

Project access response:

```json
{
  "organizationId": "uuid",
  "projectScope": "ALL|ASSIGNED|NONE",
  "activeProjectId": "uuid|null",
  "projects": [
    {
      "id": "uuid",
      "name": "string",
      "projectCode": "string|null",
      "status": "ACTIVE",
      "roleLabel": "string|null",
      "isDefault": true
    }
  ]
}
```

Switch project request:

```json
{
  "projectId": "uuid"
}
```

Switch project response:

```json
{
  "activeProjectId": "uuid",
  "project": {
    "id": "uuid",
    "name": "Riverfront Heights",
    "status": "ACTIVE"
  }
}
```

## 18. Error Codes

```text
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

ORG_REQUIRED
ORG_NOT_FOUND
ORG_INACTIVE
MEMBERSHIP_REQUIRED
MEMBERSHIP_INACTIVE
PERMISSION_DENIED
VALIDATION_FAILED
CONFLICT
IDEMPOTENCY_CONFLICT
SERVER_ERROR
```

## 19. Validation Rules

- Project name is required.
- Project name should be trimmed and must not be empty after trimming.
- Project name maximum length recommended: 120 characters.
- Project code is optional.
- Project code must be unique within the organisation when present.
- Project code should be normalised consistently before uniqueness checks.
- Project type must be one of the approved shared enum values.
- Create status may only be `DRAFT` or `ACTIVE`.
- Status transitions must follow this contract.
- Start date may be null.
- Expected completion date may be null.
- Expected completion date must not be before start date when both are present.
- Latitude and longitude may be null, but must be valid numeric coordinates when present.
- Project must belong to the active organisation.
- Project member must be an active organisation member.
- Project member must belong to the same organisation as the project.
- `endsOn` must be after `startsOn` when both are present.
- Organisation Owner baseline access cannot be removed by ordinary project assignment edits.
- API validation is authoritative; client validation is for UX only.

Project types:

```text
RESIDENTIAL
COMMERCIAL
MIXED
SHED
OTHER
```

## 20. Database Table Plan

No migration is approved by this draft.

New SQL tables must use plural `snake_case` names.

### projects

```text
id
organization_id
name
project_code
type
address_line1
address_line2
city
state
postal_code
latitude
longitude
status
start_date
expected_completion_date
description
cover_file_id
created_by
updated_by
created_at
updated_at
archived_at
archived_by
```

Recommended constraints:

```text
primary key (id)
index (organization_id, status)
index (organization_id, city)
unique (organization_id, project_code) where project_code is not null
foreign key organization_id -> organizations.id
foreign key cover_file_id -> file_assets.id, nullable
```

### project_members

```text
id
organization_id
project_id
member_id
role_label
status
starts_on
ends_on
created_by
updated_by
created_at
updated_at
ended_at
ended_by
```

Recommended constraints:

```text
primary key (id)
unique (project_id, member_id)
index (organization_id, member_id, status)
index (organization_id, project_id, status)
foreign key organization_id -> organizations.id
foreign key project_id -> projects.id
foreign key member_id -> organization_members.id
```

Migration notes for later:

- Current physical tables such as `user`, `role`, `permission`, `refreshtoken`, and `systemsetting` are inherited foundation compatibility.
- Future project access must use `organizations`, `organization_members`, `projects`, and `project_members`.
- Do not rename inherited foundation tables during this contract unless a separate migration plan is approved.

## 21. Audit Events

Recommended event names:

```text
project.created
project.updated
project.status_changed
project.archived
project.restored
project.member_assigned
project.member_updated
project.member_unassigned
project.member_access_ended
project.active_project_changed
project.organization_wide_access_granted
project.organization_wide_access_revoked
```

Audit metadata:

```text
organization_id
project_id
actor_user_id
action
entity_type
entity_id
old_value
new_value
reason
ip_address
device_id
created_at
```

Rules:

- Audit records are immutable.
- Audit events must be written by the API service layer, not web or mobile clients.
- Sensitive credentials, tokens, OTPs, and secrets must be redacted.
- Project assignment changes must record who changed access and when.

## 22. Notification Events

Notification events are useful for assignment and access changes. Push delivery is not required by this contract unless the Notifications foundation approves it.

Recommended notification types:

```text
project.member_assigned
project.member_removed
project.status_changed
project.archived
project.restored
project.active_project_unavailable
```

Rules:

- Notifications are user-specific.
- Deep links must revalidate permission and project access.
- A notification must not grant access to a forbidden project.
- In-app notification record is the source of truth if push delivery is deferred.

## 23. UI State Requirements

Web states:

- Loading: project list, detail, create form, edit form, member list, assignment save.
- Empty: no projects, no active projects, no assigned members.
- Error: failed list load, failed detail load, failed create/update/archive/restore, failed assignment.
- Forbidden: missing permission, inactive membership, inaccessible project.
- Success: project created, updated, archived, restored, member assigned, member updated, member removed.
- Archived: read-only detail with restore action only if permitted.

Mobile states:

- Loading: session project access, project switcher, active project validation.
- Empty: no assigned projects.
- Error: project access refresh failed or project switch failed.
- Forbidden: current project is no longer accessible.
- Success: project selected.
- Offline: cached project context visible; server writes blocked unless a future sync contract approves queueing.

Required UI behavior:

- Navigation is built from resolved permissions.
- Hidden navigation is not security.
- Project name must be visible on all project-scoped mobile screens.
- Web may expose advanced administration; mobile should stay field-focused.

## 24. Offline And Poor Network Behavior

- Creating, updating, archiving, restoring, assigning, and unassigning projects require network in MVP.
- Active project switch can update local mobile context only if the project exists in the latest valid project access payload.
- Cached project data can support read-only UI states during poor network.
- Future offline records must include `organization_id`, `project_id`, and stable client-generated IDs where the Offline Sync contract requires it.
- Sync must reject queued records if the user lost project access before sync.
- Unit blocking and booking remain online-only because they require server-side concurrency control.
- Server authorization always wins over cached mobile state.

## 25. Security Requirements

- API is the only database access layer.
- Use `mysql2/promise` repositories with parameterized SQL.
- Use transactions for project creation with initial assignments, status changes with audit, and assignment changes.
- Do not use Prisma for new work.
- Never trust client-provided `organizationId`, `projectId`, or `memberId` without ownership checks.
- Every project-scoped endpoint must validate organisation, membership, permission, project access, and record ownership.
- Archived/completed read-only behavior must be enforced by API.
- Reports and dashboards must filter by permitted project IDs.
- Cross-tenant ID manipulation must not leak data.
- Owner baseline access must not be removable through ordinary project assignment edits.
- Logs and audit metadata must redact tokens, credentials, OTPs, and secrets.

## 26. Acceptance Criteria

- Builder Owner can create a project under a Builder organisation.
- Independent Contractor Owner can create a project under a Contractor organisation.
- Builder Admin can assign active organisation members to projects when permitted.
- Assigned users see assigned projects.
- Users with organisation-wide project access can view all organisation projects where permitted.
- Unassigned users cannot access a project by changing IDs.
- Mobile auto-selects one accessible active project.
- Mobile shows a switcher for multiple accessible active projects.
- Mobile clears active project when project access is removed.
- Archived projects are read-only except authorised restore.
- Completed projects are read-only for new operational entries unless a later module approves correction behavior.
- Future module helpers can enforce `organization_id` and `project_id` access.
- Stable shared errors are used across API, web, and mobile.
- No Workers, Attendance, Kharchi, Sales, Reports, or Offline Sync features are implemented by this contract.

## 27. Test Matrix

```text
Project Create:
- owner creates project successfully
- independent contractor owner creates project successfully
- user without projects:create is denied
- duplicate project_code in same organisation is rejected
- same project_code in different organisation is allowed

Project Read:
- assigned member reads assigned project
- unassigned member is denied
- organisation-wide member reads any organisation project
- cross-organisation project id is denied

Project Update:
- authorised admin updates metadata
- archived project update is denied
- completed project operational write is denied
- invalid status transition is denied

Project Archive And Restore:
- authorised user archives active project
- archived project is hidden from default mobile active list
- archived project remains visible in web archive filters
- user without projects:restore cannot restore
- restored project becomes selectable again

Project Members:
- assign active organisation member succeeds
- assign inactive organisation member fails
- assign member from another organisation fails
- duplicate active assignment fails or updates existing row by approved implementation behavior
- removing current mobile user's active project clears active context
- owner protected access cannot be removed accidentally

Permissions:
- missing projects:assign denies assignment
- missing project-members:read denies member list
- hidden web/mobile navigation does not replace backend guard
- permission changes take effect after refresh or API revalidation

Mobile:
- zero projects shows empty state
- one active project auto-selects
- multiple projects show switcher
- stale cached project cannot bypass API
- poor network preserves cached read-only context

Tenant And Project Isolation:
- project from another organisation cannot be read
- project-scoped helper rejects mismatched organization_id
- project-scoped helper rejects mismatched project_id
- aggregate/report query filters inaccessible projects
- offline sync rejects queued writes after project access removal
```

## 28. Open Decisions

1. Completed project reopening: allow normal `COMPLETED -> ACTIVE`, require admin/support action, or disallow.
2. Project code format: free text, generated, or organisation-configurable.
3. Project address minimum: project name only, city/state required, or full address required.
4. Organisation-wide project access source: role-derived only, explicit member flag, or both.
5. Active project persistence: client-only, server-side preference, or both.
6. Archive effects: which future modules remain editable for corrections in archived projects.
7. Security response posture: return forbidden or not-found for cross-tenant IDs.
8. Initial project creation during onboarding: required during owner onboarding or separate after login.
9. Whether project cover image is included in first Project Setup implementation.

Resolved: Builder/Contractor collaboration uses an internal Builder-organization `Contractor Member` for MVP; external Contractor-organization project linking is deferred.

## 29. Implementation Notes For Later

- Implement only after Identity Access and this Project Setup And Assignment contract are approved.
- Add shared project enums, permission constants, error codes, and schemas first.
- Extend auth/session response to include project access after Identity Access implementation.
- Add reusable API project-access helper before product modules.
- Implement database changes only in `apps/api` using `mysql2/promise`.
- Use transactions for project creation plus default owner assignment.
- Use transactions for archive/restore and assignment changes with audit events.
- Preserve current global `users.roleId` compatibility only as a migration concern, not the target model.
- Build web and mobile workflows separately; share contracts, not React components.
- Do not add module-specific permissions such as `attendance:mark` until the relevant module contract is approved.

## 30. Documentation Updates Needed

Resolved by Phase 0 alignment:

- Permission notation conflict is resolved: use `resource:action`; dot-style examples are superseded.
- Database ownership conflict is resolved: `apps/api` with `mysql2/promise` is active; `packages/database/prisma` is archived inherited history only.
- Contract package conflict is resolved for MVP: keep contracts in `packages/shared`; do not create `packages/contracts` in Phase 0.
- SQL naming conflict is resolved for new tables: use plural `snake_case`; inherited table rename/migration is a separate future decision.
- Access-model conflict is resolved: model future access through `organization_members` and `project_members`; inherited global `users.roleId` compatibility is not the target model.

Still needing updates or later implementation alignment:

- `packages/shared/src/constants/permissions.ts` does not yet include `projects` or `project-members`.
- Web navigation has no project administration entries yet.
- Mobile session stores only placeholder `accessToken` and `userName`; it does not include active organisation, active project, project access, permissions, or feature flags.
- API has no Project Setup And Assignment module yet.
- Current API users/roles repositories still use inherited global role relationships; future implementation must migrate toward organisation membership and project assignment access.
