# Mobile Customer Experience Implementation Plan

## 1. Objective

Make the Expo application the primary customer product for Builder Owners, Independent Contractor Owners, Contractor Members, Site Supervisors, Project Managers, and Sales Users while keeping the web portal as the supporting administration and oversight surface.

This plan covers the customer foundation that must be complete before adding Attendance, Wages, Kharchi, Materials, Expenses, Progress, Gallery, or Sales business modules.

## 2. Approved Product Boundaries

- Platform Super Admin remains a web-first platform actor and receives no customer operational workspace by default.
- Mobile access is driven by active organization membership, `resource:action` permissions, project access, and record ownership.
- A Builder hires a Contractor by inviting that person as an internal `Contractor Member` of the Builder organization.
- A separately subscribed Contractor owns a `CONTRACTOR` organization and invites its own Supervisors or staff.
- One identity may have different roles in different organizations; active organization selection determines permissions and projects.
- Mobile shows only implemented, authorized capabilities. It must not display mock metrics, fake people, dead buttons, or future module tiles.
- Workers are workforce records, not login users. Members are login identities with organization/project access.

## 3. Current Source Baseline

Already available:

- Mobile login, secure session storage, refresh, invitation activation, login email prefill, and project switching.
- Session payload with active organization, memberships, permissions, project scope, and accessible projects.
- Organization-member list, compatible-role lookup, invitation, update, and deactivate APIs.
- Project create/read/update/archive, member assignment, and project-access APIs.
- Permission-aware mobile Organization Members, project assignment, Project Team, and Workers management flows.
- Mobile project creation/editing plus direct access to Draft and On-hold Project Team contexts.
- Mobile subscription-capacity visibility for Organization Owners/Admins on Members.
- Web equivalents for organization invitations, project member assignment, and Workers management.

Still missing or incomplete on mobile:

- Persisted worker deactivation and assignment-rate-change UI remain gated by the approved Workers decisions and future Attendance/Wages ownership.
- Automated mobile component/state tests and the physical-device role matrix remain pending.
- Sales modules themselves; they must not be represented by fake screens before their contracts are approved.
- Persisted offline data and queued writes.

## 4. Role Experiences

### Builder Owner / Builder Admin

- Switch organizations and projects.
- View Builder organization and active operating profile.
- Invite Contractor Members, Site Supervisors, Project Managers, Sales Users, Admins, Viewers, and additional Owners when allowed.
- Create projects and assign active members.
- View and manage Workers when permitted.
- Later receive Builder approval and cross-project oversight modules as their contracts are implemented.

### Independent Contractor Owner

- Manage the Contractor organization without Builder approval.
- Invite Supervisors, Project Managers, staff, and Viewers allowed for a Contractor organization.
- Create projects, assign staff, and manage Workers directly.
- Later receive Attendance, Wages, Kharchi, Materials, Expenses, and Progress direct workflows.

### Contractor Member Under Builder

- See only the Builder organization and projects to which the membership is assigned, unless organization-wide access is explicitly granted.
- Manage site Workers and operational entries only where the role permissions allow.
- Later perform first-level review in `BUILDER_CONTRACTOR_SUPERVISOR` workflows.
- Never gain access to the Builder's platform settings, unrelated projects, or the Contractor's separate organization unless separately selected.

### Site Supervisor

- Open assigned projects quickly.
- Use concise field actions with no organization-administration clutter.
- View Workers and perform only explicitly granted worker actions.
- Later mark Attendance and create project entries as downstream module contracts are approved.

### Sales User

- See assigned sales-enabled projects and personal/customer pipeline actions only when Sales permissions exist.
- Never see Workers or construction finance merely because the user can log in.
- Until Leads and related Sales modules are implemented, show an honest no-available-work state rather than mock CRM content.

## 5. Implementation Slices

### Slice 0 — Customer Shell Cleanup

Status: implemented in this preparation pass.

- Remove internal Design System and fake Workflow routes.
- Remove fake projects, progress values, team avatars, notifications, and nonfunctional tabs.
- Build Home, Current Project, Workers, and Menu navigation from live permissions.
- Render only session-backed organization/project/role information.
- Keep direct-route permission redirects.

Acceptance:

- A user sees no unimplemented module or fake business value.
- Navigation changes when permission keys change.
- Mobile type-check passes.

### Slice 1 — Multi-Organization Session

Status: implemented; physical-device role switching remains to be verified.

- Add an organization switcher listing only ACTIVE memberships and organizations.
- Add a mobile API call to the existing organization switch/session resolution boundary.
- On switch, refresh role, permissions, project access, feature flags, and active project atomically in client state.
- Clear a previously selected project if it does not belong to the new organization.
- Persist only the selected organization/project identifiers and the authorized session snapshot.

Acceptance:

- The same identity can switch between `Independent Contractor Owner` and `Contractor Member` memberships without logging out.
- No permission or project from the previous organization remains visible after switching.

### Slice 2 — Mobile Members And Invitations

Status: implemented; authenticated device verification remains pending.

- Add an Organization/Team screen behind `members:read`.
- List member name, organization role, status, designation, and project scope.
- Add Invite Member behind `members:invite` using the existing compatible-role endpoint.
- Use plain-language role descriptions and filter roles server-side by organization type.
- Display email delivery result and safe Copy/Open activation-link fallbacks.
- Reuse the existing activation flow for new and existing identities.
- Add permitted role/status/scope updates and deactivation with protected-Owner safeguards.

Acceptance:

- Builder Owner can invite an internal Contractor Member, Supervisor, Project Manager, Sales User, or Viewer as allowed.
- Independent Contractor Owner can invite allowed Contractor-organization staff.
- Platform roles never appear.
- Existing email reuse creates a new membership, not a duplicate identity or password.

### Slice 3 — Mobile Projects And Member Assignment

Status: implemented; authenticated device verification remains pending.

- Add project list/detail from existing project APIs.
- Add project creation/editing only for `projects:create`/`projects:update`.
- Add Project Team behind `project-members:read`.
- Assign only ACTIVE members of the active organization behind `project-members:assign`.
- Support role label, start/end date, status updates, and unassignment where permitted.
- Preserve the existing fast project switcher for field users.

Acceptance:

- Owners/Admins can create a project and assign invited members after activation.
- Supervisors, Contractor Members, and Sales Users see only assigned projects unless organization-wide scope is granted.

### Slice 4 — Workers Mobile Completion

Status: assignment lifecycle implemented. Worker deactivation and attendance-aware rate changes remain deliberately gated.

- Preserve the current active-project Workers roster and online create flow.
- Add existing-worker assignment and assignment update/end with trade and base rate inherited from the Worker record.
- Add permitted rate update and worker deactivation only after their outstanding ownership/policy decisions are approved.
- Keep `workers:update-rate` separate from ordinary update permission.
- Do not add Attendance, Wages, or Kharchi behavior in this slice.

Acceptance:

- Builder Owner, Independent Contractor Owner, Contractor Member, or Supervisor can perform only the Workers actions granted to their active membership and project.
- Cross-project and cross-organization identifiers are rejected by the API.

### Slice 5 — Role-Aware Home Composition

Status: permission-driven composition implemented for currently available modules; future module cards remain deferred.

- Compose Home from permissions and active operating profile, not hard-coded role-name branches alone.
- Builder/Owner: team, projects, Workers, and later approval summaries.
- Contractor: assigned site work and Workers; later first-level review.
- Supervisor: selected project and daily quick actions.
- Sales: assigned projects and later CRM actions.
- Add an honest empty state when a valid user has no implemented module permission.

Acceptance:

- The same user sees different Home actions after switching organizations.
- Direct URLs remain API- and route-protected even when navigation is hidden.

### Slice 6 — Device And Authorization Verification

- Add shared contract tests for mobile-consumed response shapes.
- Add API authorization tests for every supported role/membership/project combination.
- Add mobile component/state tests for navigation visibility and switching.
- Run a disposable-data matrix for Builder Owner, Independent Contractor Owner, Contractor Member, Supervisor, Project Manager, Sales User, and Viewer.
- Verify invitation activation and organization/project switching in Expo Go on a physical Android device.
- Verify denied cross-tenant and cross-project ID manipulation.

## 6. Required API/Contract Work

Prefer existing endpoints. Add or change contracts only when the mobile client exposes a confirmed gap.

Required review items:

- Export organization member/invitation and project member types from `packages/shared` instead of duplicating web-only types.
- Normalize list/envelope response shapes for mobile.
- Confirm whether organization switching should call `POST /organizations/:id/switch` or resolve solely through `GET /auth/session?organizationId=...`; keep one authoritative behavior.
- Define stable error codes for invitation, last Owner, project assignment, and access-loss states.
- Ensure permission changes are reflected after refresh without requiring application reinstall or cached-session deletion.

## 7. Explicitly Deferred

- Attendance, Wages, Kharchi, Materials, Expenses, Progress, Gallery, Leads, Follow-ups, Site Visits, Inventory, and Booking implementation.
- Cross-organization Builder/Contractor project linking.
- Platform Super Admin customer-operation views in mobile.
- Organization-scoped custom roles until their persistence/API contract is approved.
- Offline write queues until the Offline Sync Foundation is approved.
- Fake placeholder screens for deferred modules.

## 8. Verification Per Slice

Minimum non-mutating checks:

```text
pnpm --filter @nirman-app/shared type-check
pnpm --filter @nirman-app/shared build
pnpm --filter @nirman-app/api type-check
pnpm --filter @nirman-app/mobile type-check
git diff --check
```

Runtime and database verification must use an explicitly approved local or disposable target. No migration, seed, invitation creation, member assignment, worker write, or remote database mutation is implied by this plan.

## 9. Recommended Execution Order

```text
Complete Slice 6 role/device verification for the implemented mobile foundation
-> resolve Workers deactivation and Attendance/Wages rate-history ownership
-> approve the next operational module contract
```
