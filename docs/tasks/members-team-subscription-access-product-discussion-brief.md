# Members, Project Team, Subscription, Roles, And Access Product Discussion Brief

> Date: 2026-08-13
>
> Purpose: copy-ready context for a separate AI/product discussion.
>
> Status: discussion brief, not an approved implementation contract.
>
> Scope: product model, business model, member and worker flows, project staffing, subscriptions, permissions, operating profiles, scenarios, risks, and open decisions.

## 1. How To Read This Document

This document deliberately distinguishes four kinds of statements:

- **Current source**: behavior or structures visible in the current repository.
- **Agreed direction**: product direction discussed and accepted so far.
- **Recommendation**: proposed product/UX rule that still needs formal approval.
- **Open decision**: a question that must be answered before implementation.

Another AI must not treat a recommendation as implemented behavior or an open decision as settled policy.

## 2. Executive Summary

NirmanSite has two primary customer types:

1. Builders.
2. Independent Contractors.

Both customer types purchase a subscription for an organization. A subscription controls which modules and commercial limits the organization receives. The customer does not purchase a role. NirmanSite creates an appropriate owner membership, and that Owner then invites members, assigns predefined roles, assigns projects, and eventually grants project-level access to subscribed modules.

There are two visible business-control layers:

1. **Platform subscription control**: NirmanSite decides which modules and limits the customer organization purchased.
2. **Customer project-access control**: the Builder/Contractor Owner decides which member can work in which project and which purchased modules that member can use.

Predefined role templates remain between these layers as a safety ceiling. An Owner may delegate only modules included in the subscription and only actions compatible with the member's role.

The intended runtime access rule is:

```text
active user
AND active organization membership
AND active organization/subscription entitlement
AND role permission ceiling
AND project assignment or approved organization-wide scope
AND project/module grant where applicable
AND organization/project record ownership
AND valid lifecycle status/date
= allowed operation
```

Operating profiles such as `SELF_MANAGED_BUILDER` and `BUILDER_CONTRACTOR` describe responsibility and approval workflow. They are not subscription plans and should not independently bypass subscription, role, or project checks.

## 3. Core Terminology

### 3.1 Platform Super Admin

NirmanSite's internal platform operator. This actor manages customer organizations, subscription assignments, plan limits, feature rollout, and approved support workflows.

Platform Super Admin is not a normal construction-operations user and must not automatically receive customer permissions such as Workers, Attendance, Wages, Kharchi, Materials, or Sales.

### 3.2 Organization

The customer business/account. It is not a project and not a generic user group.

Current supported organization types:

- `BUILDER`
- `CONTRACTOR`

A customer with multiple projects normally has one organization containing those projects, members, workers, settings, and subscription entitlements.

### 3.3 Subscription Plan

A commercial package assigned to an organization. It controls:

- Available modules.
- Project/member/storage or other commercial limits.
- Add-ons.
- Billing and subscription lifecycle.

A plan does not by itself decide which individual member may use a module.

### 3.4 Module Entitlement

The organization's purchased ability to use a product module, such as:

- Projects and Team.
- Workers.
- Attendance.
- Wages.
- Kharchi.
- Materials.
- Expenses.
- Progress and Gallery.
- Sales/CRM.
- Reports and Exports.

An entitlement is organization-scoped. A user cannot carry an entitlement from one organization membership into another organization.

### 3.5 Organization Membership

The relationship between a login identity and a customer organization. It contains the member's role, status, and organization-wide project-scope flag.

The same login identity may have different memberships in different organizations.

Example:

```text
Contractor's own organization -> Independent Contractor Owner
Builder's organization        -> Contractor Member
```

Permissions must be recalculated when the active organization changes.

### 3.6 Organization Role

A platform-defined permission template such as:

- Organization Owner.
- Builder Admin.
- Independent Contractor Owner.
- Contractor Member.
- Project Manager.
- Site Supervisor.
- Sales User.
- Viewer.

The role defines the safe maximum actions that may be delegated. It should not identify a project or replace project assignment.

### 3.7 Designation

A descriptive organization-level job title such as `Senior Site Engineer` or `Supervisor`. It does not grant permissions.

### 3.8 Project Role Label

A descriptive responsibility for one member on one project, for example `Site Lead`, `Electrical Supervisor`, or `Billing Reviewer`.

The role label does not grant permissions. Permissions come from role templates and approved access grants. Renaming the label must never silently change authorization.

### 3.9 Project Assignment

The link between an active organization member and a project. It contains:

- Project.
- Status: `ACTIVE`, `INACTIVE`, or `ENDED`.
- Optional project role label.
- Optional start and end dates.

Assignment answers **where** the member works. It does not automatically answer everything the member can do.

### 3.10 Worker

A worker/labourer is an organization-owned workforce record, not a login identity or organization member.

Workers may be assigned to multiple projects using separate date-bounded worker-project assignments. Their historical records must survive project assignment endings and worker deactivation.

### 3.11 Operating Profile

An organization workflow preset describing who normally performs and reviews work.

Current values:

- `INDEPENDENT_CONTRACTOR`
- `SELF_MANAGED_BUILDER`
- `BUILDER_CONTRACTOR`
- `BUILDER_CONTRACTOR_SUPERVISOR`
- `CUSTOM`

Operating profile should influence sensible defaults, navigation, responsibility, and future approval routing. It should not unlock an unsubscribed module.

### 3.12 Feature Flag

A platform-controlled rollout mechanism used to enable, disable, test, or progressively release software behavior. It is not the same as a paid entitlement.

Example:

- Entitlement: this organization purchased Attendance.
- Feature flag: the new Attendance calendar UI is enabled for a beta cohort.

Both checks may be necessary, but they serve different business purposes.

## 4. Product Model: Two Visible Layers, Multiple Safe Checks

### 4.1 Layer One: NirmanSite Subscription Control

Controlled by the Platform Owner.

It answers:

- Is this a Builder or Contractor organization?
- Which plan is active?
- Which modules are included?
- What limits apply?
- Is the subscription trialing, active, past due, suspended, cancelled, or expired?
- Are any add-ons active?

It must not answer:

- Which Supervisor works on Project A?
- Whether a Contractor can see Project B.
- Who can edit a particular worker.

### 4.2 Layer Two: Customer Project And Module Delegation

Controlled by an authorized Organization Owner/Admin.

It answers:

- Which people are members of this organization?
- What safe role template does each member use?
- Which projects is each member assigned to?
- Which purchased modules can they use on each project?
- Is the member's access active, temporarily inactive, or ended?

### 4.3 Why Roles Still Exist

Roles prevent unsafe delegation and reduce configuration work.

Example:

- The subscription includes Workers and Finance.
- The Owner assigns a Site Supervisor to Project A.
- The Owner selects `Manage Workers` and `Manage Attendance`.
- The Site Supervisor role does not allow organization billing or owner administration.
- The Owner cannot accidentally give the Supervisor platform or subscription management rights.

### 4.4 Recommended Customer-Facing Access Presets

Do not initially show customers dozens of raw keys such as `workers:create` and `workers:update-rate`.

Recommended module-level choices:

- `No access`
- `View`
- `Manage`

The selected role converts these choices into a safe set of technical permission keys.

Advanced/custom action-level grants can be considered after the base product becomes stable.

## 5. Customer Types And Purchase Journeys

### 5.1 Builder Purchase Journey

Target flow:

1. Customer selects `I am a Builder`.
2. Customer compares plans and modules.
3. Customer purchases a plan or begins a trial.
4. NirmanSite creates a `BUILDER` organization.
5. The purchaser becomes the protected Organization/Builder Owner.
6. Onboarding asks how the Builder normally operates.
7. The Builder selects a compatible operating profile.
8. The Builder creates projects and invites members.

Recommended profile choices for a Builder:

- Self-managed Builder.
- Builder with Contractor.
- Builder with Contractor and Supervisor.
- Custom.

### 5.2 Independent Contractor Purchase Journey

Target flow:

1. Customer selects `I am a Contractor`.
2. Customer purchases Projects plus the required operational/finance modules.
3. NirmanSite creates a `CONTRACTOR` organization.
4. The purchaser becomes Independent Contractor Owner.
5. The Contractor creates and manages multiple projects without requiring a Builder account.
6. The Contractor invites Supervisors, Project Managers, staff, or Viewers.
7. The Contractor assigns each member to projects and allowed modules.

Recommended Contractor profile:

- Independent Contractor.
- Custom, if more complex behavior is eventually supported.

### 5.3 Platform-Assisted Versus Self-Service Sale

**Current source direction:** the platform can create a DRAFT organization and invite its primary Owner.

**Target business direction discussed:** customers discover the product on the website, purchase/download, and activate their organization.

**Open decision:** whether the first commercial release is fully self-service, sales-assisted, or a hybrid. Payment-provider checkout, tax invoices, trials, failed-payment behavior, refunds, and automated subscription provisioning require a separate subscription contract.

## 6. Subscription And Business Model Recommendations

### 6.1 Sell Modules And Limits, Not Roles

Marketing may offer Builder-specific and Contractor-specific plan names, but the entitlement engine should remain based on organization modules and limits.

Example packaging only, not approved plan names:

- Core: Organizations, Projects, Team, basic Workers.
- Operations: Attendance, Progress, Materials, Gallery.
- Finance: Wages, Kharchi, Expenses, approvals.
- Sales: Leads, site visits, inventory, bookings.
- Reporting add-on: exports, dashboards, advanced reports.

Different marketing bundles can map onto the same entitlement model.

### 6.2 Commercial Limits To Consider

- Number of active projects.
- Number of login/member seats.
- File/media storage.
- Report/export allowance if commercially useful.
- Advanced audit retention.
- Offline/device limits only if operationally justified.

Worker records should generally not count as paid login seats because workers are not app users.

### 6.3 A Person In Multiple Organizations

The same identity may own a Contractor subscription and also be invited into one or more Builder organizations.

Recommended commercial rule:

- Billing and entitlements belong to each organization.
- Membership/seat counting is evaluated per organization subscription.
- No module entitlement flows automatically from the person's own Contractor organization into a Builder organization.

### 6.4 Upgrade Behavior

Recommended:

- New modules become available after subscription confirmation.
- Owners see setup guidance for the newly available modules.
- Existing roles do not automatically receive access unless a clearly explained preset is applied.
- Audit the subscription and access changes.

### 6.5 Downgrade Or Expiry Behavior

Recommended safe policy:

- Never delete project, worker, attendance, wage, or financial history because of a downgrade.
- Disable new writes in unavailable modules.
- Preserve read/export access for an approved grace period or according to legal/business policy.
- If the organization exceeds a new limit, block creating additional records rather than deleting existing records.
- Show an explicit `Plan does not include this module` state, not a generic permission error.

Open decisions:

- Grace-period duration.
- Whether historical read/export remains permanently available.
- Past-due behavior versus fully suspended behavior.
- Which owners can download data after cancellation.

### 6.6 Subscription Versus Permission Error Messaging

The UI/API should distinguish:

- `MODULE_NOT_INCLUDED`: organization did not purchase the module.
- `PLAN_LIMIT_REACHED`: commercial limit reached.
- `MEMBER_PERMISSION_DENIED`: role does not allow the operation.
- `PROJECT_ACCESS_DENIED`: member lacks project scope.
- `MEMBER_MODULE_ACCESS_DENIED`: project/module grant is missing.
- `ORGANIZATION_SUSPENDED`: customer organization is not operational.
- `PROJECT_NOT_WRITABLE`: lifecycle status blocks the operation.

This distinction is important for both usability and upgrade conversion.

## 7. Operating Profiles And Responsibility

### 7.1 Independent Contractor

- Organization type: `CONTRACTOR`.
- Contractor Owner manages projects and operations directly.
- No Builder approval is required inside the Contractor's own organization.
- The Owner may invite Supervisors and staff.

### 7.2 Self-Managed Builder

- Organization type: `BUILDER`.
- Builder Owner/Admin manages projects and field operations directly.
- Builder can create, assign, edit, and manage workers when the subscription and role allow it.
- Approval flows are simplified when the same Owner performs and approves work.

### 7.3 Builder With Contractor

- Organization type: `BUILDER`.
- Builder retains ownership, visibility, governance, and configured approvals.
- Assigned Contractor handles site operations where delegated.
- Contractor access is restricted to assigned Builder projects.

### 7.4 Builder With Contractor And Supervisor

- Organization type: `BUILDER`.
- Supervisor performs daily site entries.
- Contractor reviews or manages operations.
- Builder oversees and provides final approval where configured.

### 7.5 Custom

- Used when default profiles cannot represent the customer's operating model.
- Must still respect subscription, role ceilings, project scope, and record ownership.

### 7.6 Organization Profile Versus Project-Level Variation

A Builder may self-manage Project A and hire a Contractor for Project B.

Recommendation:

- Keep an organization-level default operating profile.
- Eventually allow a project-level delivery/responsibility override.
- Do not change the entire organization's profile merely because one project operates differently.

Open decision:

- Whether project-level profile override belongs in the immediate MVP or a later phase.

### 7.7 Changing An Operating Profile

Changing a profile should not silently rewrite roles, terminate assignments, or grant permissions.

Recommended flow:

1. Show impact preview.
2. Explain proposed default changes.
3. Let the Owner approve staffing/module grant changes explicitly.
4. Preserve historical responsibility/audit data.

## 8. Actor Responsibility Matrix

| Actor | Organization scope | Normal responsibility | Must not receive automatically |
| --- | --- | --- | --- |
| Platform Super Admin | Platform | Organizations, plans, limits, support | Customer operational module rights |
| Organization/Builder Owner | Own organization | Governance, projects, members, oversight; direct operations when self-managed | Cross-organization access |
| Builder Admin | Own organization or configured scope | Back-office administration | Protected owner powers unless explicitly approved |
| Independent Contractor Owner | Own Contractor organization | Projects, staff, workers, operations, finance where subscribed | Builder organization access without separate membership |
| Contractor Member | Assigned projects in customer organization | Delegated site operations | Unrelated projects, owner/admin role grants, automatic worker writes |
| Project Manager | Assigned/all projects where granted | Project oversight and team management | Organization ownership or unrelated projects |
| Site Supervisor | Assigned projects | Daily field workflows and permitted worker operations | Owner/admin, subscription, export, deactivation, or rate overrides by default |
| Sales User | Assigned sales-enabled scope | Leads/sales workflows | Workers/finance merely because login exists |
| Viewer | Assigned/all read scope | Read-only viewing | Operational writes |
| Worker | Worker records only | Labour/workforce tracked by users | Login/member permissions by default |

## 9. Organization Members Directory

### 9.1 Agreed Information Architecture

- Use a dedicated organization-level `Members` page.
- Remove the Members section from Organization Details.
- Use one list, not separate Organization Members and Project Members tabs.
- List every organization member, including assigned and unassigned members.
- Delete remains parked for now.
- Common data tables use an ellipsis action menu for row actions.

### 9.2 Recommended Members Table

Columns:

- Member name and login email.
- Organization role.
- Designation.
- Project access.
- Status.
- Ellipsis actions.

Project access presentation:

- `All projects` badge for authorized organization-wide scope.
- One or more project badges for assigned members.
- `Unassigned · Assign` CTA for an active assignable member with no project assignment.
- Read-only `Unassigned` badge when the viewer lacks assignment permission.

Recommended filters/search:

- Search name/email/designation.
- Organization role.
- Member status.
- Assigned/unassigned.
- Project.
- Organization-wide access.

### 9.3 Invite Member Flow

Recommended fields:

- Name.
- Login email.
- Optional mobile.
- Organization role.
- Optional designation.
- Organization-wide project access only for authorized roles.

Rules:

- Invitation creates/reuses a global identity but creates a separate organization membership.
- Existing email must not create a duplicate identity.
- Invited members cannot operate until activation.
- Only compatible organization roles should be shown.
- Platform roles must never appear.
- Invitation links must be single-use, expire, and support revoke/resend rules.

Recommended UX improvement:

- Do not offer `Access all organization projects` casually for Contractor Members or Supervisors.
- Treat it as a powerful administrative option with explanation and audit.

### 9.4 Member Edit Flow

Current/editable concepts:

- Organization role.
- Designation.
- Organization-wide project access.

Rules:

- Role controls the permission ceiling.
- Designation is descriptive only.
- Turning off all-project access does not assign a project; it makes the member eligible for individual assignments.
- The UI must immediately direct the Owner to `Assign projects` after turning off all-project access.
- Members must not change their own protected role/project scope from this screen.
- The final active Owner cannot be demoted/deactivated.

### 9.5 Multi-Project Assignment Flow

Agreed behavior:

1. Owner selects `Assign projects` or `Manage projects` from the ellipsis menu, or selects `Unassigned · Assign`.
2. A dialog lists eligible projects with search and multi-select.
3. For each selected project, show independent fields:
   - Project role label.
   - Assignment status.
   - Start date.
   - End date.
4. Saving applies additions, updates, and removals atomically.
5. No partially saved project set should remain if any requested change fails.

Validation and edge rules:

- Member must be `ACTIVE`.
- Project and member must belong to the active organization.
- End date cannot be before start date.
- Archived/non-writable projects cannot receive new operational assignments.
- Duplicate project IDs are rejected.
- Removing a project ends/revokes access according to assignment policy.
- Existing historical assignment data must not be hard deleted.
- Organization-wide members do not need individual project assignments for access, but explicit assignments may still be useful for responsibility/reporting; this needs an approved rule.

### 9.6 Member Status Actions

Ellipsis menu actions:

- Edit member.
- Assign/Manage projects.
- Activate.
- Deactivate.
- Delete is intentionally parked.

Deactivation means losing organization and project access. It is different from ending one project assignment.

Recommended confirmation should state:

- All future organization/project access stops.
- Historical actions and assignments remain.
- The person may still have memberships in other organizations.

## 10. Project Details And Project Team

### 10.1 Agreed Direction

- Remove embedded member management from Project Details.
- Add a clear `Team` CTA on Project Details.
- Open a dedicated route, recommended as `/projects/:projectId/team`.
- The Team page has two tabs: `Members` and `Workers`.

Current checkout note:

- The embedded Project Members panel is removed from the current Project Details composition.
- A Workers panel is still embedded there.
- The dedicated Project Team route is not yet implemented.

### 10.2 Members Tab

Purpose: manage login users assigned to this project.

Recommended features:

- Search and filters.
- Assigned member list.
- Add/assign existing active organization members.
- Optional invite-new-member path when permitted.
- Role, project responsibility label, dates, and status.
- Ellipsis actions for edit assignment, activate/inactivate assignment, and end assignment.
- Do not globally deactivate an organization member from a project-scoped page unless clearly labeled as a separate organization-level administrative action.

Project-centric bulk assignment may require an inverse batch operation:

- Existing member-centric flow: one member to many projects.
- Team page flow: one project to many members.

Both should share the same authorization and transaction rules.

### 10.3 Workers Tab

Purpose: manage the workforce roster for this project.

Recommended features:

- List active/current project workers.
- Search/filter by worker code, name, trade, status, assignment dates.
- Assign an existing organization worker.
- Create and assign a new worker.
- Edit worker-project allocation.
- Update current assignment rate where permitted.
- End project assignment.
- Use ellipsis menus for row actions.

Important distinction:

- `End assignment` removes a worker from this project's active roster.
- `Deactivate worker` affects the organization-level worker master and every active roster.

Global worker deactivation should normally remain in the organization Workers directory or be clearly presented as a high-impact action.

### 10.4 Role-Aware Team Page

Use the same page structure for all roles, but show different actions.

Builder Owner in contractor-managed project:

- Full visibility and oversight.
- Assign/replace Contractor.
- Review staffing and activity.
- Approval/admin override according to the final governance policy.
- `Add Worker` should not be the primary action if the Contractor is responsible.

Contractor Member:

- See only assigned projects.
- Assign permitted Supervisors/members if delegated.
- Add/assign/edit Workers if delegated.
- Operate subscribed modules granted for the project.

Site Supervisor:

- See assigned project.
- Perform daily worker and site operations allowed by role/module grant.
- Cannot invite/promote higher-authority roles.

Viewer:

- Read-only team and worker roster if granted.

## 11. Standard End-To-End Processes

### 11.1 Platform Plan Setup

1. Platform Admin defines plan/module/limit catalog.
2. Plan is published for Builder, Contractor, or both customer segments.
3. Feature flags remain separate from paid entitlements.
4. Platform role templates define safe action ceilings.

### 11.2 Customer Organization Provisioning

1. Customer type selected.
2. Plan/trial assigned.
3. DRAFT organization created.
4. Primary Owner identity is created/reused.
5. Protected Owner membership is invited.
6. Owner activates account.
7. Organization and subscription become operational according to payment/onboarding policy.
8. Compatible operating profile is selected.

### 11.3 Project Creation And Staffing

1. Owner creates project.
2. Owner chooses or inherits project delivery profile when supported.
3. Owner invites organization members.
4. Members activate invitations.
5. Owner assigns members to one or more projects.
6. Owner chooses allowed subscribed modules using simple presets.
7. API validates entitlement, role ceiling, project ownership, assignment, dates, and status.
8. Team page reflects the resulting responsibility.

### 11.4 Self-Managed Builder Operation

1. Builder uses `SELF_MANAGED_BUILDER` defaults.
2. Builder Owner/Admin creates projects and workers.
3. Builder assigns Supervisors where needed.
4. Builder directly operates Workers and future Attendance/Finance modules included in the plan.

### 11.5 Builder Hires A Contractor

MVP internal-membership model:

1. Builder invites the person as `Contractor Member` into the Builder organization.
2. Contractor activates that Builder-organization membership.
3. Builder assigns one or more Builder projects.
4. Builder grants subscribed module access within the Contractor role ceiling.
5. Contractor sees only assigned Builder projects unless explicitly given organization-wide scope.
6. Contractor manages site operations and permitted staff/workers.
7. Builder retains visibility, governance, and configured approval responsibilities.

### 11.6 Contractor Adds A Supervisor

Recommended delegation model:

1. Contractor opens an assigned project's Team page.
2. Contractor selects `Add Supervisor` or assigns an existing member.
3. System displays only roles the Contractor is explicitly allowed to delegate.
4. Contractor cannot grant a permission/module they do not possess.
5. Supervisor is restricted to the Contractor's accessible project set.
6. Builder sees the staffing change and audit source.

Open decision:

- Whether routine Contractor invitations are direct, require Builder approval, or are configurable by organization/profile.

### 11.7 Independent Contractor Operation

1. Contractor Owner works inside own `CONTRACTOR` organization.
2. Creates Project A, B, and C.
3. Creates organization-level workers and assigns them across projects.
4. Invites Supervisors/staff.
5. Delegates subscribed modules per project.
6. No Builder approval is required.

### 11.8 Member Offboarding

For one project:

- End/inactivate the project assignment.
- Immediately deny future requests for that project.
- Clear stale active-project selection on refresh/revalidation.
- Preserve history.

For the whole organization:

- Deactivate membership.
- Deny all organization and project access.
- Preserve authored records, invitations, assignments, and audits.
- Do not affect memberships in other organizations.

## 12. Detailed Scenario Catalogue

### Scenario A: Self-Managed Builder

- Builder purchased Projects and Workers.
- Owner role plus self-managed profile makes direct worker operations sensible.
- Owner may invite Supervisor and assign selected projects.
- Supervisor remains limited to role and project scope.

### Scenario B: Builder Uses One Contractor For All Projects

- Contractor Member may receive organization-wide project scope only after a high-visibility Owner decision.
- Module rights remain bounded by role and subscription.
- Removing all-project scope must require explicit project assignments or the Contractor becomes unassigned.

### Scenario C: Builder Uses Different Contractors Per Project

- Contractor One is assigned Projects A and B.
- Contractor Two is assigned Project C.
- Neither can see the other's projects, workers, finance, or team data.
- Organization-wide scope should generally remain disabled.

### Scenario D: Builder Self-Manages One Project And Outsources Another

- Organization default may remain self-managed.
- Project B needs Contractor responsibility/module grants.
- Recommended future project delivery-profile override avoids changing the whole organization.

### Scenario E: Builder, Contractor, And Supervisor Chain

- Supervisor performs daily entries.
- Contractor reviews/manages.
- Builder oversees/approves where configured.
- Approval sequence belongs to each future module contract; operating profile alone must not invent financial approvals.

### Scenario F: Independent Contractor With Many Projects

- Contractor organization owns all projects and workers.
- Contractor Owner has organization-wide access in own organization.
- Supervisors receive selected projects/modules.
- No Builder entity is necessary.

### Scenario G: Contractor Is Also A Subscriber

- Same identity is Independent Contractor Owner in own organization.
- Same identity is Contractor Member in a Builder organization.
- Switching organization must atomically refresh role, permissions, projects, entitlements, and active project.
- No workers, staff, or subscriptions cross automatically.

### Scenario H: Contractor Wants To Bring Existing Staff Into Builder Project

Current MVP boundary:

- Staff from the Contractor's own organization do not automatically appear in the Builder organization.
- Each login user needs a separate Builder-organization membership.
- Workers remain owned by their source organization and are not automatically shared.

Cross-organization contractor-company linking and automatic staff/worker sharing are deferred and require a separate commercial, legal, ownership, and authorization model.

### Scenario I: Unassigned Active Member

- Member can log into the organization if otherwise allowed.
- Member sees no assigned project operations unless organization-wide scope exists.
- Members directory shows `Unassigned · Assign` to authorized managers.

### Scenario J: Invited But Not Activated Member

- Member appears with `INVITED` status.
- Cannot be assigned for active operational access until membership activation, according to current project contract.
- Owner may resend/revoke invitation under the final invitation policy.

### Scenario K: Project On Hold, Completed, Or Archived

- Project access alone does not permit writes.
- Each module must define behavior for `ON_HOLD` and `COMPLETED`.
- Archived project should be read-only for history and removed from active operational selectors.
- New staffing assignments to non-writable projects should be blocked.

### Scenario L: Subscription Downgrade While Work Exists

- Preserve all history.
- Stop unauthorized new writes.
- Communicate entitlement loss distinctly from role denial.
- Do not remove member/project assignments merely because a module is unavailable.

### Scenario M: Role Changed While User Is Logged In

- API applies new authority immediately on the next request.
- Session/client permission cache must refresh or handle forbidden response.
- Stale navigation must not remain a security path.

### Scenario N: Contractor Removed From Project

- Contractor immediately loses that project.
- Supervisor memberships/assignments do not automatically change unless an approved dependency rule says so.
- Builder must see an impact summary before removing a primary Contractor.
- Worker records and historical site data remain Builder-organization property.

### Scenario O: All-Projects Access Is Turned Off

- Member does not automatically receive any individual project.
- UI must offer immediate assignment flow.
- Until assignment completes, the member is unassigned.

## 13. Security Loopholes And Required Mitigations

### 13.1 Treating Hidden UI As Security

Risk: a user calls an API directly after a button is hidden.

Mitigation: server validates every entitlement, membership, permission, project, status, and ownership boundary.

### 13.2 Project Assignment Mistaken For Permission

Risk: assigning Project A accidentally grants every module/action.

Mitigation: assignment provides scope only; role and module/action access still apply.

### 13.3 Role Permission Mistaken For Project Scope

Risk: granting `workers:create` allows Worker creation across unrelated projects.

Mitigation: every project-scoped write must also pass project access and record ownership checks.

### 13.4 Subscription Bypass

Risk: an Owner grants a module not purchased by the organization.

Mitigation: entitlement check is server-authoritative and precedes role/module grant evaluation.

### 13.5 Permission Escalation Through Delegation

Risk: Contractor invites Owner/Admin or grants permissions the Contractor lacks.

Mitigation:

- Explicit delegable-role allowlist.
- Permission ceiling: grantor cannot grant above own authority.
- Project ceiling: grantor cannot assign outside own accessible projects.
- Module ceiling: grantor cannot delegate unsubscribed or ungranted modules.

### 13.6 Organization-Wide Access Misuse

Risk: one checkbox exposes every current and future project.

Mitigation:

- Restrict to trusted administrative roles.
- Warn that future projects are included.
- Audit every change.
- Prefer individual assignments for Contractors and Supervisors.

### 13.7 Cross-Tenant ID Manipulation

Risk: changing organization/project/member/worker IDs exposes another tenant's data.

Mitigation: validate organization and project ownership for every supplied ID; return safe forbidden/not-found errors without leaking records.

### 13.8 Stale Session After Organization Switch

Risk: permissions/projects from Organization A remain visible in Organization B.

Mitigation: atomically refresh active membership, role, permissions, subscription entitlements, projects, and active-project context; clear invalid cached data.

### 13.9 Self-Lockout Or Owner Loss

Risk: final Owner removes or deactivates themselves.

Mitigation: protect final active Owner; require ownership transfer/additional Owner before removal.

### 13.10 Profile Change As Silent Escalation

Risk: changing to self-managed automatically grants broad worker/finance rights.

Mitigation: profile suggests defaults and shows impact; explicit access update and audit are required.

### 13.11 Role Label Used As Authorization

Risk: changing project label to `Manager` grants manager rights.

Mitigation: label is descriptive only and never participates in permission evaluation.

### 13.12 Invitation Abuse

Risk: invitation forwarded, reused, or sent to wrong identity.

Mitigation: expiry, single-use token, revocation, identity/email verification, rate limits, and audit.

### 13.13 Contractor Staff Ownership Confusion

Risk: Builder believes Contractor's external organization staff/worker records are legally or technically part of Builder organization.

Mitigation: keep MVP internal membership explicit; do not imply cross-organization sharing. Future linking needs ownership, data-controller, billing, and offboarding rules.

### 13.14 Global Deactivation From Project Context

Risk: Owner intends to remove a worker/member from one project but deactivates them everywhere.

Mitigation: use `End project assignment` on Team page; reserve global deactivation for organization directories with high-impact confirmation.

### 13.15 Subscription Downgrade Data Loss

Risk: commercial downgrade deletes operational or financial history.

Mitigation: entitlements control future access/writes, never destructive data deletion.

### 13.16 Non-Atomic Multi-Project Saves

Risk: member gets half the selected projects when one assignment fails.

Mitigation: validate the whole request and commit assignment changes in one transaction.

### 13.17 Date And Time Boundary Errors

Risk: assignment appears active one day too early/late.

Mitigation: define dates as organization-timezone calendar dates; consistently evaluate start/end inclusion.

### 13.18 Archived/Completed Project Writes

Risk: project assignment exists, so a user modifies closed project data.

Mitigation: project lifecycle is a separate server-side write gate.

### 13.19 Platform Support Overreach

Risk: Platform Super Admin directly performs customer operations.

Mitigation: no normal customer module permissions; any support/impersonation must be explicit, scoped, time-bound, consent-aware, and audited.

## 14. Worker-Specific Rules And Open Risk

Settled direction:

- Workers are organization-owned records, not login users.
- Worker code is generated, immutable, and unique inside the organization.
- Worker assignment is separate from worker master.
- Worker can have multiple project assignments.
- Duplicate name/mobile is warning-only, not a hard uniqueness rule.
- No hard delete of workers or assignments in MVP.
- Online connectivity is required for worker writes in current MVP.
- Daily rate is project-assignment-specific for the current Workers module.
- Historical financial/attendance meaning must not be rewritten silently.

Current unresolved policy:

When deactivating a worker who still has active project assignments, choose one:

1. Block deactivation until assignments are ended.
2. Atomically end all active assignments after explicit confirmation and end date.
3. Allow active assignment rows to remain while inactive worker status excludes the worker from current rosters.

Current source behaves like option 3, but that behavior is not an approved final policy.

Recommended discussion preference: option 2 provides the clearest lifecycle if the Owner sees an impact list and supplies an end date, but it still requires explicit approval and downstream Attendance/Wages review.

## 15. Current Source Versus Proposed Product

### 15.1 Present In Current Source

- Organization types: Builder and Contractor.
- Compatible organization operating-profile values.
- Platform and customer `resource:action` permission taxonomy.
- Organization role templates.
- Organization invitations and member lifecycle.
- Organization-level Members page.
- Single combined member list.
- Assigned/unassigned project visibility.
- `Unassigned · Assign` CTA.
- Ellipsis member actions.
- Member edit/activate/deactivate.
- Multi-project member assignment with per-project role label, status, and dates.
- Atomic member-to-many-project API operation.
- Organization-level Workers module and project worker assignments.
- Project-scoped authorization through project access checks.
- Hired Contractor as internal Builder-organization `Contractor Member` for MVP.

### 15.2 Proposed But Not Yet Implemented/Approved As A Complete Contract

- Dedicated `/projects/:projectId/team` route.
- Members and Workers tabs on Project Team.
- Full project-centric batch member assignment.
- Subscription plan/module entitlement domain and enforcement.
- Per-member, per-project module grants.
- Customer-facing `No access / View / Manage` module presets.
- Project-level operating/delivery-profile override.
- Role-aware Team CTA hierarchy based on responsibility profile.
- Contractor direct invitation/delegation of Supervisor roles.
- Automated subscription checkout/provisioning.
- Profile-driven approval chains for future modules.

### 15.3 Explicitly Deferred

- Cross-organization Builder-to-Contractor-company project linking.
- Automatic sharing of Contractor organization staff or workers into Builder projects.
- Worker login accounts.
- Hard delete of workers/history.
- Full Attendance, Wages, Kharchi, Materials, Expenses, and approval behavior until their contracts are approved.
- Persisted offline write queues and conflict resolution.

### 15.4 Current Role-Template Gap

Current seeded `Contractor Member` has read-only Workers access by default. Therefore, the desired Contractor workflow—adding workers, assigning workers, and managing Supervisors—is not currently enabled merely by assigning the Contractor to a project.

Adding global Worker write permissions to the role would apply them to every project the Contractor can access. Supporting different module responsibilities per project requires an additional project/module delegation model or fixed project responsibility presets.

## 16. Candidate Future Data Model For Discussion Only

Do not implement this section without an approved contract.

Potential entities:

```text
subscription_plans
plan_module_entitlements
organization_subscriptions
organization_subscription_limits

organization_members
roles
role_permissions

project_members
project_member_module_grants

projects
workers
worker_project_assignments
```

Candidate `project_member_module_grants` fields:

```text
id
organization_id
project_id
member_id
module_key
access_level       // NONE | VIEW | MANAGE
starts_on
ends_on
status
granted_by
created_at
updated_at
```

Alternative simpler MVP:

- Use fixed project responsibility presets rather than storing a row per module.
- Expand to explicit module grants only after real customers require exceptions.

The next AI should compare these options for complexity, reporting, audit, and upgrade safety.

## 17. Recommended Phased Delivery

### Phase 1: Stabilize Terminology And Existing Team UX

- Finalize Member, Worker, Organization Role, Designation, Project Role Label, Assignment, and Operating Profile definitions.
- Complete the Members directory UX.
- Add the Project Team route and move project worker/member operations there.
- Keep current role/project authorization intact.
- Do not add granular project module permissions yet.

### Phase 2: Subscription Entitlement Foundation

- Approve subscription lifecycle, modules, limits, upgrades, downgrades, and error behavior.
- Add server-authoritative organization entitlement resolution.
- Make navigation and APIs entitlement-aware.
- Keep plan/feature flags distinct.

### Phase 3: Simple Project Module Delegation

- Add `No access / View / Manage` presets.
- Constrain choices by role ceiling and subscription.
- Add full audit and role/scope test matrix.
- Prefer presets over raw permission checkboxes.

### Phase 4: Responsibility And Approval Workflows

- Apply organization/project operating profiles to default staffing and UI composition.
- Add module-specific review/approval chains only inside the respective approved module contracts.
- Add project-level delivery-profile override if approved.

### Phase 5: External Contractor Organization Collaboration

- Design cross-organization contracts, data ownership, staff sharing, worker sharing, billing, revocation, and legal responsibilities.
- Do not retrofit this casually into internal memberships.

## 18. Open Product Decisions Requiring Owner/Team Approval

### Subscription

1. What are the launch plans, modules, add-ons, and limits?
2. Is first purchase self-service, sales-assisted, or hybrid?
3. What happens on trial expiry, payment failure, downgrade, and cancellation?
4. Are member seats billed per active membership? Are invited memberships counted?
5. How long is historical read/export available after module removal?

### Roles And Delegation

6. Can customer Owners customize role templates, or only use platform presets initially?
7. Does `Manage` map to a fixed action bundle per role/module?
8. Can Contractors directly invite Supervisors, or does Builder approval apply?
9. Which roles can each non-owner role delegate?
10. Should Contractors ever receive organization-wide project access?

### Operating Profiles

11. Is operating profile organization-only at launch?
12. Is project-level delivery-profile override required immediately?
13. Does Builder retain an emergency operational override in contractor-managed projects?
14. How does profile change affect existing projects and grants?

### Members And Team

15. Can invited members be pre-assigned before activation, or only after activation?
16. Do organization-wide members also maintain explicit assignments for responsibility/reporting?
17. Should Team page allow invite-new-member or only assign-existing-member?
18. What happens to subordinate Supervisor assignments when the primary Contractor is removed?

### Workers

19. Which worker-deactivation policy is approved?
20. Who can view/edit rates in each profile?
21. Should Contractor-created workers be clearly marked by creator/source?
22. When external contractor linking eventually exists, who owns worker master/history?

### Audit And Notifications

23. Which events require Builder notification?
24. Which staffing/module changes require approval?
25. What audit retention belongs to each plan?

## 19. Acceptance Principles For Any Future Implementation

- A subscription never grants a user access by itself.
- A project assignment never grants every module by itself.
- A role never grants access to unrelated projects by itself.
- An operating profile never bypasses subscription or authorization.
- UI visibility is never the security authority.
- Cross-organization IDs never reveal data.
- The final active Owner cannot be removed accidentally.
- Multi-project changes are transactional.
- Member/worker/project history is not hard deleted.
- Downgrades do not destroy customer data.
- Global deactivation and project assignment end are visibly different actions.
- Workers and login Members remain separate domains.
- Platform Super Admin remains separate from customer operations.
- Every `implemented` claim includes separate automated, database/runtime, browser, and device evidence.

## 20. Copy-Ready Prompt For The Next AI

```text
Act as a senior SaaS product architect, construction-operations domain designer,
RBAC/security architect, UX flow designer, and subscription business-model
advisor.

Read the attached NirmanSite Members, Project Team, Subscription, Roles, And
Access Product Discussion Brief completely before responding.

Important constraints:
- Do not treat proposals as implemented behavior.
- Preserve Builder and Independent Contractor as equal primary customer types.
- Preserve the separation between subscription entitlements, organization role
  ceilings, project scope, module delegation, and operating profiles.
- Workers are managed workforce records, not login users.
- A hired Contractor is an internal Contractor Member of the Builder organization
  for MVP; cross-organization staff/worker sharing is deferred.
- Platform Super Admin is not a normal customer-operations actor.
- Do not design granular complexity unless it solves a demonstrated use case.

Please perform a detailed product review that:
1. Identifies contradictions, unnecessary complexity, missing scenarios, and
   privilege-escalation risks.
2. Validates the two visible permission-control layers and recommends the
   simplest safe technical authorization model underneath them.
3. Proposes a launch-ready subscription/module/limit structure for both Builders
   and Independent Contractors without inventing prices.
4. Defines the recommended onboarding, Members directory, Project Team,
   Contractor delegation, Supervisor, Worker, upgrade, downgrade, and offboarding
   flows.
5. Resolves or recommends defaults for every open product decision.
6. Produces a role x module x project-scope matrix and a scenario-based access
   matrix.
7. Separates MVP, next phase, and future cross-organization collaboration.
8. Ends with a prioritized list of decisions the Product Owner must approve
   before database/API/UI implementation.

Do not write code or database migrations. This is a product and architecture
discussion only.
```

## 21. Source References Used For This Brief

- `docs/modules/foundation/identity-access/CONTRACTS.md`
- `docs/modules/foundation/project-access/CONTRACTS.md`
- `docs/modules/foundation/role-permission-model/PLAN.md`
- `docs/modules/construction/workers/CONTRACT.md`
- `docs/modules/construction/workers/DECISIONS.md`
- `docs/modules/construction/workers/STATUS.md`
- `docs/tasks/mobile-customer-experience-implementation-plan.md`
- `docs/decisions/005-internal-contractor-membership.md`
- `packages/shared/src/constants/permissions.ts`
- `packages/shared/src/constants/statuses.ts`
- `apps/api/scripts/seed.ts`
- Current Members, Projects, Organizations, Project Access, and Workers API/web source.
