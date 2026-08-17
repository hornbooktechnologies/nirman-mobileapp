# Project Team And Project Permission Grants Contract

## Status

Approved for implementation on 2026-08-14.

## Purpose

This contract extends Organization membership and Project assignment with an explicit Project permission matrix. It also defines the dedicated Project Team experience shared by Builder and Contractor organizations.

## Access Model

Runtime permission for a Project-scoped operation is:

```text
active user
AND active Organization and membership
AND active Project assignment or Organization-wide Project scope
AND the active assignment's optional start/end date window includes today
AND required permission exists in the Organization Role ceiling
AND, for CUSTOM assignments, the required permission is granted on that Project
AND record ownership and lifecycle rules pass
= allowed
```

Subscription capacity is a separate commercial check. An Operating Profile is a workflow preset and never bypasses this model.

## Assignment Permission Modes

Every `project_members` record has one of two modes:

- `ROLE_DEFAULT`: the active Organization Role permissions apply on the assigned Project. Existing assignments migrate to this mode.
- `CUSTOM`: only explicitly granted Project permission keys apply, intersected with the current Organization Role ceiling.

An Organization-wide Project-access member uses the Organization Role defaults on every Project. To configure different permissions per Project, the Owner must turn off Organization-wide access and create Project assignments.

Project grants never:

- create Organization membership;
- grant access to another Organization or Project;
- exceed the Organization Role ceiling;
- grant platform permissions;
- grant Organization administration, subscription administration, role administration, or Organization-wide access;
- survive an ended/inactive Project assignment as active authorization.
- authorize access before `starts_on` or after `ends_on` when those dates are set.

Changing an Organization Role immediately changes the ceiling. Stored grants outside the new ceiling remain non-effective and are shown as unavailable until removed or the ceiling changes again.

## Delegatable Permission Catalog

The shared package owns the allowlist of Project-delegatable permission keys and their customer-facing groups. Initial groups are:

- Project: read, update, switch where allowed by the role.
- Team: read, assign, update, unassign where allowed by the role.
- Workers: read, create, update, assign Project, update rate, deactivate, export where allowed by the role.

Future module contracts append their own Project-scoped permissions to the catalog. Platform, Organization, Member, Role, Settings, and view-all permissions are never stored as Project grants.

The customer UI may offer `No access`, `View`, and `Manage` presets, but it must submit the resulting explicit permission keys. Advanced action-level selection is allowed within the role ceiling.

## Project Team UX

Project Details exposes a `Team` CTA linking to:

```text
/projects/:projectId/team
```

The page contains:

- `Members`: login identities assigned to the Project.
- `Workers`: Organization-owned workforce records allocated to the Project.

The Organization Members page remains the Organization-centric workflow: one list of all Organization Members with assigned/unassigned visibility and Member-to-many-Projects editing.

The Project Team page is the inverse Project-centric workflow: one Project with many Members/Workers. It supports search, filters, assignment editing, dates, responsibility, permission matrix, status, and ellipsis row actions.

Terminology:

- `Organization Role`: permission ceiling across the Organization membership.
- `Designation`: descriptive Organization job title; no authorization effect.
- `Project responsibility`: descriptive label on one Project; no authorization effect.
- `Project permissions`: actual Project-specific authorization when mode is `CUSTOM`.
- `End assignment`: removes Project access only.
- `Deactivate Member`: disables Organization membership and is never presented as a Project-only action.

Delete remains out of scope.

For a Draft Project, the Owner may prepare Team assignments. An `ACTIVE` assignment
becomes effective when its date window allows it even while the Project remains Draft;
the UI must warn about this and offer `INACTIVE` for planning without access.

## Contractor Delegation

The `Contractor Member` role is an operational role ceiling on assigned Projects. It may manage Workers and Project Team assignments only inside Projects the Contractor can access and only for permissions/roles below its delegation ceiling.

Inviting a new login identity is still an Organization membership operation. Project-scoped invitation requires a later atomic invitation-plus-assignment extension; ordinary `members:invite` must not be granted merely to enable Project Team management.

## Builder Supervisor

`Builder Supervisor` is a distinct Builder-compatible system role representing Builder-side oversight. Initial foundation permissions allow assigned-Project read/switch, Team read, and Workers read. Module-specific verify/review permissions are added only by their approved module contracts. Builder Supervisor is not Site Supervisor and has no final commercial approval by default.

## Site Supervisor

`Site Supervisor` is an assigned-Project daily field-operations role. Its initial ceiling
allows Project and Team viewing plus Worker viewing, creation, editing, and Project
allocation. It does not manage login-member assignments and does not update Worker rates,
deactivate Workers, or export workforce data by default. Those broader actions remain with
the Owner, authorized Contractor, or another explicitly approved role.

## API Contract

Assignment writes accept:

```json
{
  "permissionMode": "CUSTOM",
  "permissions": ["workers:read", "workers:create"]
}
```

alongside responsibility, status, and date fields.

Required endpoints:

- Existing Member-to-many-Projects batch save, extended with permission mode and grants.
- Project Member list returning effective, granted, and role-ceiling permissions.
- Atomic Project-to-many-Members batch save.
- Existing single assignment create/update/end endpoints, extended with grants.

All assignment and grant mutations occur in one API-local database transaction.

## Persistence

### project_members extension

```text
permission_mode ROLE_DEFAULT | CUSTOM, default ROLE_DEFAULT
```

### project_member_permission_grants

```text
id
organization_id
project_id
member_id
permission_key
created_by
created_at
```

Unique key: `(project_id, member_id, permission_key)`.

Composite foreign keys bind the grant to the same Organization, Project, and assignment. Grants are retained for history when an assignment ends but do not authorize access.

## Acceptance Criteria

- Existing active Project assignments retain their previous role-based behavior.
- Owner can select one or many Projects for a Member and configure a distinct permission matrix for each.
- Owner can open a Project Team page and configure multiple Members for that Project.
- CUSTOM grant cannot authorize a permission absent from the Member's Organization Role.
- An assigned Member without a required CUSTOM grant receives a Project permission denial.
- Organization-wide scope is clearly explained and does not pretend to support per-Project differences.
- Contractor cannot mutate another Project by changing identifiers.
- Builder Supervisor and Site Supervisor remain distinguishable in APIs and UI.
- API tests cover role ceiling, custom grants, legacy defaults, Project isolation, and ended assignments.
