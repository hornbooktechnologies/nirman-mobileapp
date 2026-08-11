# NirmanSite / BuilderSaaS — MVP Product & Technical Requirements

> **Document type:** MVP functional and technical source of truth
>
> **Purpose:** Define the complete MVP scope, user models, module behavior, workflows, access control, project scoping, contracts, data requirements, mobile/web responsibilities, and acceptance criteria before implementation planning begins.
>
> **Primary product:** Mobile-first construction operating system
>
> **Supporting product:** Web back-office and administration portal
>
> **Architecture approach:** Contract-driven modular monolith in a pnpm/Turborepo monorepo
>
> **Status:** Requirements baseline for phase planning
>
> **Last updated:** 2026-08-10

---

## 1. Document Authority and AI Usage Rules

This document is the MVP source of truth for product and engineering planning.

All AI agents and developers must read this document before producing:

- implementation phases;
- epics and stories;
- database models;
- API contracts;
- permission matrices;
- mobile screens;
- web screens;
- test plans;
- migrations;
- application code.

### 1.1 Requirement precedence

When sources conflict, use this order:

1. This `MVP_REQUIREMENTS.md` document.
2. Approved architecture decision records under `docs/decisions/`.
3. Approved contracts in `packages/shared` for MVP.
4. The consolidated `REQUIREMENTS.md`.
5. Product requirements and design briefs.
6. Legacy backend and gap-analysis documents.
7. Existing legacy application behavior.

### 1.2 Change rule

No AI agent may silently change a business rule.

When a gap is found, the agent must:

1. record it under an open-decision section;
2. state the proposed reversible default;
3. obtain approval before treating it as final;
4. update this document or a linked decision record before implementation.

### 1.3 Contract-first rule

No backend, web, or mobile implementation may create its own independent:

- status values;
- permission keys;
- request types;
- response types;
- error codes;
- workflow transitions;
- notification types.

These must be defined centrally in shared contracts first.

### 1.4 Approved Phase 0 alignment decisions

The following decisions are approved for NirmanSite MVP planning and contracts:

1. Permission keys use `resource:action` format. Older dot-style examples are superseded notation and must not be copied into new contracts.
2. New SQL tables use plural `snake_case` physical names.
3. `apps/api` with `mysql2/promise` repositories is the only active database access path.
4. `packages/database/prisma` is archived inherited history only.
5. MVP contracts remain in `packages/shared` unless a later decision creates `packages/contracts`.
6. Future organisation and project access is modeled through `organization_members` and `project_members`; current global `users.roleId` compatibility is inherited only.
7. Customer organisation types are `BUILDER` and `CONTRACTOR`.
8. Platform Super Admin is the NirmanSite product/platform owner role, not a customer construction operations actor.
9. Platform Super Admin receives platform permissions, not normal module permissions such as `workers:*`, `attendance:*`, `kharchi:*`, `wages:*`, or `leads:*`, by default. Any support access to customer data must be separately approved, scoped, and audited.

---

## 2. Product Vision

NirmanSite is a mobile-first digital operating system for Builders, Contractors, Supervisors, and Sales teams in the Indian construction and real-estate market.

The MVP must replace the highest-friction manual processes currently handled through:

- paper notebooks;
- worker registers;
- handwritten attendance;
- verbal Kharchi records;
- informal material requests;
- manual site-expense records;
- WhatsApp follow-ups;
- disconnected lead records;
- Excel-based project tracking.

### 2.1 Core product promise

> Help a Builder or Contractor manage daily construction work and sales from a simple mobile application without forcing them to understand ERP terminology or complex organisational hierarchy.

### 2.2 Product principles

1. **Mobile is the main product.**
2. **Project is the primary operating context.**
3. **Users see only relevant modules.**
4. **The system adapts to real working models.**
5. **Independent Contractors can operate without Builder approval.**
6. **Contractors working under a Builder follow the Builder’s configured controls.**
7. **A Builder may personally perform Contractor and Supervisor responsibilities.**
8. **The UI must hide organisational complexity while the backend preserves integrity.**
9. **Offline field work must never be blocked by poor connectivity.**
10. **Every financial or approval action must remain traceable.**

---

## 3. MVP Scope Summary

The MVP includes these functional areas:

1. Account and organisation onboarding
2. Authentication and session management
3. Organisation membership and RBAC
4. Projects and project assignments
5. Worker management
6. Attendance
7. Wages and wage payments
8. Kharchi / worker advances
9. Materials
10. Site expenses
11. Project progress
12. Site gallery / project diary
13. Sales CRM
14. Follow-ups and reminders
15. Site visits
16. Unit inventory and unit blocking
17. Lead conversion / booking linkage
18. Notifications
19. Role-specific dashboards
20. Audit trail
21. Offline sync for field modules
22. Super Admin and subscription administration
23. Reports and exports required for MVP operations

### 3.1 Deferred from MVP

The following are intentionally deferred unless later promoted through an approved scope change:

- complex commission and payroll engine;
- external broker portal;
- WhatsApp Business automation;
- payment gateway integration;
- GST and accounting integration;
- customer post-booking portal;
- AI cost forecasting;
- AI lead scoring;
- advanced marketing attribution;
- full agency/subcontractor invoicing suite;
- complex work-order management;
- automated bank reconciliation;
- biometric attendance;
- facial recognition;
- GPS/geofencing enforcement;
- microservices.

---

## 4. Product Surfaces

## 4.1 Mobile application — primary customer product

The mobile app is used by:

- Builder Owner;
- Independent Contractor Owner;
- Contractor working under a Builder;
- Site Supervisor;
- Sales User;
- Builder Admin or Project Manager where mobile access is granted.

The mobile application provides:

- daily project operations;
- workers and attendance;
- wages and Kharchi;
- materials and expenses;
- project updates and gallery;
- leads and follow-ups;
- site visits;
- inventory viewing and unit blocking;
- approvals;
- notifications;
- concise dashboards.

It must not expose irrelevant modules to a user.

## 4.2 Web portal — supporting back-office

The web portal is used for:

- platform administration;
- organisation administration;
- subscription and billing administration;
- advanced member and permission management;
- project configuration;
- bulk worker or unit import;
- reports and exports;
- audit log review;
- detailed cross-project oversight;
- support and corrective operations.

The web portal may provide read, approve, correct, report, and bulk-management views for operational modules, but the MVP must not duplicate every mobile flow unless necessary.

## 4.3 Backend API

One backend serves:

- mobile app;
- web portal;
- public inquiry forms;
- future integrations.

The backend is the final authority for:

- authentication;
- organisation isolation;
- project access;
- permissions;
- workflow transitions;
- approval rules;
- financial calculations;
- conflict resolution;
- audit records.

---

## 5. Organisation and Operating Model

The system must not assume that every Contractor works under a Builder.

## 5.1 Organisation types

MVP organisation types:

```text
BUILDER
CONTRACTOR
```

### BUILDER organisation

A Builder organisation may:

- own multiple projects;
- manage projects directly;
- invite Contractors, Supervisors, Sales Users, and Admin users;
- configure approval responsibilities;
- view all project and sales activity within the organisation.

### CONTRACTOR organisation

An independent Contractor organisation may:

- create and own multiple projects;
- manage workers, attendance, wages, Kharchi, materials, expenses, and progress;
- operate without external approval;
- invite Supervisors or other staff;
- later collaborate with Builder organisations through project relationships.

## 5.2 Organisation owner

Every organisation has one or more Owner users.

The Owner:

- has full access to the organisation by default;
- can create projects;
- can invite members;
- can configure responsibilities;
- cannot be locked out by ordinary permission editing;
- is still subject to platform security and audit rules.

## 5.3 Operating profiles

The system should offer predefined profiles to simplify setup.

### Profile A — Independent Contractor

- Contractor owns workspace.
- Contractor has direct access to operational modules.
- No Builder approval is required.
- Expenses and materials are recorded directly.

### Profile B — Self-managed Builder

- Builder manages workers and site work personally.
- Builder has access to all required operational modules.
- Approval flows are simplified where no separate approver exists.

### Profile C — Builder + Contractor

- Contractor manages site operations.
- Builder has oversight and final approval where configured.
- Contractor may manage workers, attendance, Kharchi, materials, expenses, and progress.

### Profile D — Builder + Contractor + Supervisor

- Supervisor performs daily entries.
- Contractor performs first-level review or approval where configured.
- Builder performs final approval where configured.

### Profile E — Custom

- Organisation Owner configures roles, permissions, project assignments, and approval responsibilities.

## 5.4 Responsibility configuration

Onboarding should use plain-language questions rather than expose RBAC terminology.

Examples:

- Who manages workers?
- Who marks attendance?
- Who records Kharchi?
- Who approves expenses?
- Who requests materials?
- Who approves materials?
- Who handles leads?

The answers create default roles and permissions.

Advanced permission configuration is available later in the web portal.

---

## 6. Project-Centric Domain Model

Every operational activity must belong to a project unless explicitly platform- or organisation-level.

## 6.1 Records requiring project context

- worker assignment;
- attendance;
- wage entry;
- wage payment;
- Kharchi;
- material requirement/request;
- material purchase/delivery;
- site expense;
- project progress;
- gallery media;
- lead;
- follow-up;
- site visit;
- unit inventory;
- unit block;
- booking/conversion;
- project-specific notification;
- project reports.

## 6.2 Project access

A user may access only:

- projects owned by their organisation; and
- projects explicitly assigned to them; or
- all projects when their Owner/Admin profile grants organisation-wide access.

Backend access check:

```text
Authenticated user
+ active organisation membership
+ required permission
+ project assignment or organisation-wide scope
+ record belongs to same organisation/project
```

## 6.3 Multi-project support

Builders and Contractors may manage multiple projects.

Mobile behavior:

- one project: auto-select and open it;
- multiple projects: show project switcher and project cards;
- remember last selected project;
- show project name clearly on every operational screen;
- require confirmation before saving into a different project.

## 6.4 Cross-project reporting

Organisation Owners and authorised Admin users may view aggregate summaries across projects.

Operational entries remain project-specific.

---

## 7. Identity, Membership, RBAC, and Access Control

## 7.1 Access model

A user has:

```text
Identity
+ Organisation membership
+ Primary role
+ Additional permissions
+ Project assignments
+ Optional organisation-wide scope
```

## 7.2 Role layers and customer role templates

Platform roles are separate from customer organisation membership roles:

- Platform Super Admin manages organizations, subscriptions, platform users, platform role templates and permissions, support controls, and feature flags.
- Platform Support may access a named customer organisation only through an explicitly approved, scoped, and audited support policy.
- Neither platform role receives customer construction or sales module permissions by default.

Customer MVP role templates:

- ORGANIZATION_OWNER
- BUILDER_ADMIN
- INDEPENDENT_CONTRACTOR_OWNER
- CONTRACTOR_MEMBER
- SITE_SUPERVISOR
- PROJECT_MANAGER
- SALES_USER
- VIEWER

Roles are templates, not permanent constraints.

A Contractor may receive Supervisor capabilities.
A Builder Owner may perform all operational capabilities.
A Supervisor may receive selected additional permissions.
All customer operational access still requires active organisation membership, the required permission, and project access where the record is project-scoped.

## 7.3 Permission groups

### Projects

- `projects:read`
- `projects:create`
- `projects:update`
- `projects:archive`
- `projects:assign`

### Workers

- `workers:read`
- `workers:create`
- `workers:update`
- `workers:deactivate`
- `workers:assign-project`

### Attendance

- `attendance:read`
- `attendance:mark`
- `attendance:update`
- `attendance:correct-locked`
- `attendance:export`

### Wages

- `wages:read`
- `wages:generate`
- `wages:update`
- `wages:mark-paid`
- `wages:export`

### Kharchi

- `kharchi:read`
- `kharchi:create`
- `kharchi:approve`
- `kharchi:reject`
- `kharchi:mark-paid`
- `kharchi:adjust`

### Materials

- `materials:read`
- `materials:create`
- `materials:update`
- `materials:approve-level-1`
- `materials:approve-final`
- `materials:reject`
- `materials:record-purchase`
- `materials:record-delivery`

### Expenses

- `expenses:read`
- `expenses:create`
- `expenses:update`
- `expenses:approve`
- `expenses:reject`
- `expenses:export`

### Progress and gallery

- `progress:read`
- `progress:update`
- `gallery:read`
- `gallery:upload`
- `gallery:approve`
- `gallery:reject`

### Sales

- `leads:read-own`
- `leads:read-team`
- `leads:read-all`
- `leads:create`
- `leads:assign`
- `leads:reassign`
- `leads:update`
- `leads:convert`
- `followups:manage`
- `site-visits:manage`
- `inventory:read`
- `inventory:block`
- `inventory:book`
- `sales-reports:read`

### Administration

- `members:read`
- `members:invite`
- `members:update`
- `roles:manage`
- `settings:manage`
- `audit-logs:read`
- `reports:read`

## 7.4 Menu visibility

The mobile and web applications build navigation from permissions.

A hidden module is not considered secure by itself. The backend must enforce the same permission.

## 7.5 Project-level restriction

A user with `attendance:mark` may mark attendance only for assigned projects unless granted organisation-wide access.

## 7.6 Self-approval

The system must avoid fake multi-step approval by the same user.

Rules:

- A user must not approve their own request when the configured workflow requires separation.
- If no separate approver exists, the organisation must use a simplified workflow profile.
- The audit log must record the workflow profile and actor.

## 7.7 Default permission profiles

Default templates should be secure but useful.

The Owner can add or remove capabilities except protected Owner/platform capabilities.

---

## 8. Module: Account Registration and Onboarding

## 8.1 Purpose

Allow a non-technical Builder or Contractor to begin using the app with minimal setup.

## 8.2 Registration options

- Mobile number + OTP, preferred for customer-facing login where feasible.
- Email + password may be supported.
- Invited users join through invite link/OTP.

The final authentication mechanism must be decided before contract implementation.

## 8.3 Owner onboarding flow

```text
Register
→ Verify identity
→ Choose: Builder or Independent Contractor
→ Enter organisation name
→ Choose operating profile
→ Create first project
→ Optional: add workers
→ Enter mobile dashboard
```

### 8.3.1 Platform-provisioned Owner onboarding

Approved implementation path for organizations created by Platform Super Admin:

```text
Platform Super Admin enters organization and primary Owner details
→ system creates the organization as DRAFT
→ system creates or reuses the customer user identity
→ system creates an INVITED Owner membership
→ system generates a single-use, expiring activation invitation
→ a new customer creates a password; an existing active customer accepts the additional membership without re-entering or changing their password
→ membership and organization become ACTIVE
→ customer is redirected to Login with their email pre-filled and signs in with their account password
```

Rules:

- A `BUILDER` primary customer receives the `Organization Owner` role template.
- A `CONTRACTOR` primary customer receives the `Independent Contractor Owner` role template.
- Platform Super Admin must never become the customer organization Owner or member.
- The customer creates their own password; permanent passwords must not be sent by an administrator.
- An existing active NirmanSite user accepts the single-use invitation without re-entering or changing their password and receives the additional organization membership without a duplicate user account.
- Successful web and mobile activation must redirect to Login with the invited email address pre-filled. Invitation acceptance activates access but does not create an authenticated session.
- The initial implementation is email/password-first. OTP remains a later additive authentication method after provider and rate-limit approval.
- After the onboarding transaction commits, the system attempts to email the primary Owner from the configured Super Admin SMTP identity. The message includes the organization and role context, login email, invitation expiry, and both web and mobile activation links; it must never include a permanent password.
- Email acceptance or failure must not roll back organization creation. The Super Admin continues to receive the web and mobile activation links in the success response so they can be copied and securely shared when SMTP is unavailable or delivery fails.
- YOPmail addresses may be used as recipient inboxes during development, but a separate outbound SMTP sender must still be configured.
- Invitation tokens must be hashed at rest, expire, be single-use, and never appear in logs.

## 8.4 Minimum organisation fields

- organisation name;
- organisation type;
- owner name;
- owner mobile number;
- optional email;
- optional logo;
- default currency = INR;
- timezone = Asia/Kolkata;
- status.

## 8.5 Minimum project setup

- project name;
- project type;
- location/address;
- start date, optional;
- expected completion date, optional;
- active status.

## 8.6 Acceptance criteria

- An Owner can register and reach the first project dashboard without configuring permissions manually.
- Default permissions match the selected operating profile.
- Organisation and project data are isolated from all other tenants.

---

## 9. Module: Authentication and Session Management

## 9.1 Requirements

- secure login;
- access token and refresh token;
- refresh-token rotation preferred;
- device session listing where practical;
- logout current device;
- logout all devices;
- inactive member denied access;
- inactive organisation denied access;
- rate limiting;
- secure password/OTP handling;
- mobile token storage in platform-secure storage.

## 9.2 Login response

Must include:

- user profile;
- active organisation membership;
- primary role;
- resolved permission keys;
- project assignments or project scope;
- organisation branding;
- operating profile;
- feature flags;
- token information.

## 9.3 Acceptance criteria

- Login initializes navigation without additional permission guessing.
- Revoked permissions take effect after refresh/re-auth within an approved interval.
- A deactivated user cannot continue using a previously issued session indefinitely.

---

## 10. Module: Projects

## 10.1 Purpose

Provide the primary context for all construction and sales operations.

## 10.2 Project fields for MVP

- id;
- organisation_id;
- name;
- project_code, optional;
- type: residential, commercial, mixed, shed, other;
- address;
- latitude/longitude, optional;
- status: draft, active, on_hold, completed, archived;
- start_date, optional;
- expected_completion_date, optional;
- description, optional;
- cover_image, optional;
- created_by;
- timestamps.

## 10.3 Project member assignment

Owner/Admin can assign members to projects.

Assignment may include:

- project role label;
- project-specific permission overrides, future/advanced;
- assignment start and end dates;
- active status.

## 10.4 Mobile flow

```text
Home
→ Select project
→ Project dashboard
→ Open allowed module
```

## 10.5 Web responsibilities

- create/edit/archive project;
- assign members;
- bulk setup;
- view cross-project reporting.

## 10.6 Acceptance criteria

- Every operational API validates project ownership and access.
- Users cannot change `project_id` to access another project.
- Archived projects are read-only except for authorised restoration.

---

## 11. Module: Worker Management

## 11.1 Purpose

Create a reusable worker record and assign workers to projects.

Workers are not application users.

## 11.2 Data model

### Worker master

- id;
- organisation_id;
- name;
- worker_type/trade;
- mobile_number, optional;
- notes, optional;
- active status;
- created_by;
- timestamps.

### Worker project assignment

- worker_id;
- project_id;
- daily_rate;
- start_date;
- end_date, optional;
- active status;
- contractor/member responsible, optional;
- timestamps.

## 11.3 Mobile flow

```text
Project
→ Workers
→ Add Worker
→ Name + Trade + Daily Rate
→ Save
```

The system may match an existing organisation worker and create a new project assignment rather than duplicate the worker.

## 11.4 Rules

- Worker name is required.
- Daily rate is required before wage generation, not necessarily at initial creation.
- Inactive workers remain in history.
- Workers with financial history must not be hard deleted.
- Duplicate warnings should be shown for similar name/mobile combinations.

## 11.5 Acceptance criteria

- Builder Owner, Independent Contractor, Contractor, or Supervisor can add workers when permitted.
- Worker list is filtered by current project.
- Historical attendance and wages remain available after worker deactivation.

---

## 12. Module: Attendance

## 12.1 Who marks attendance

Attendance is marked by the authorised person currently responsible for workers on that project.

Possible actors:

- Builder Owner;
- Independent Contractor;
- Contractor under Builder;
- Site Supervisor.

Required permission: `attendance:mark`.

## 12.2 Daily flow

```text
Open project
→ Attendance
→ Select date, default today
→ Worker list loads
→ Mark all Present by default, optional
→ Change exceptions to Half Day / Absent / Holiday
→ Save
```

## 12.3 Attendance statuses

- PRESENT
- HALF_DAY
- ABSENT
- HOLIDAY

Optional later:

- PAID_LEAVE
- SITE_CLOSED

## 12.4 Attendance record fields

- id;
- organisation_id;
- project_id;
- worker_assignment_id;
- work_date;
- status;
- check_in, optional;
- check_out, optional;
- overtime_hours, deferred unless promoted;
- notes, optional;
- marked_by;
- marked_at;
- last_edited_by;
- last_edited_at;
- sync metadata;
- soft-delete metadata where required.

## 12.5 Rules

- Unique active record per project + worker assignment + date.
- Saving the same worker/date updates the record rather than creating a duplicate.
- Editing old or paid-period attendance may require elevated permission.
- Every correction records actor and previous value.
- Attendance works offline.

## 12.6 Mobile usability

- large touch targets;
- one-hand operation;
- “mark all present” action;
- quick search;
- clear unsynced indicator;
- never block saving because of no network.

## 12.7 Acceptance criteria

- Attendance can be completed for 50 workers with minimal taps.
- Offline records sync when connectivity returns.
- Duplicate attendance is prevented server-side.
- A user cannot mark attendance for an unassigned project.

---

## 13. Module: Wages and Worker Payments

## 13.1 Purpose

Generate worker wages from attendance and track payment history.

## 13.2 Calculation

Default rules:

- PRESENT = daily rate × 1.0
- HALF_DAY = daily rate × 0.5
- ABSENT = 0
- HOLIDAY = configurable; MVP default 0 unless manually included

```text
Gross wage
- Kharchi deduction applied
= Net payable
```

## 13.3 Wage generation flow

```text
Project
→ Wages
→ Select date range
→ Generate preview from attendance
→ Review rates and Kharchi balances
→ Confirm wage batch
→ Mark all or selected workers paid
```

## 13.4 Wage data

### Wage batch

- id;
- organisation_id;
- project_id;
- period_start;
- period_end;
- status: draft, confirmed, partially_paid, paid, cancelled;
- generated_by;
- timestamps.

### Wage item

- wage_batch_id;
- worker_assignment_id;
- present_days;
- half_days;
- holiday_days;
- gross_amount;
- kharchi_deduction;
- adjustment_amount;
- net_amount;
- paid_amount;
- payment_status;
- notes.

### Wage payment

- wage_item_id;
- amount;
- payment_date;
- payment_method;
- reference;
- recorded_by.

## 13.5 Rules

- Paid wage items are not hard deleted.
- Attendance changes after wage confirmation require recalculation or authorised adjustment.
- Partial payment support is preferred; if deferred, MVP must explicitly restrict to full payment.
- Financial calculations use decimal-safe arithmetic.
- Currency values use INR and smallest approved precision.

## 13.6 Acceptance criteria

- Wage preview matches attendance and rate rules.
- Kharchi deduction is traceable to specific advance records.
- Marking wages paid creates immutable payment history.
- Builder/Contractor can view project wage totals by period.

---

## 14. Module: Kharchi

## 14.1 Definition

Kharchi is an advance given to a worker against future wages.

It is not a loan product and the worker is not an app user.

## 14.2 Independent Contractor / self-managed flow

```text
Select project and worker
→ Enter amount
→ Record as given/paid
→ Outstanding balance increases
→ Deduct during wage payment
```

No separate approval is required.

## 14.3 Builder-managed flow

Possible configured flows:

### Supervisor request

```text
Supervisor creates
→ Contractor or Builder approves
→ Mark paid/given
→ Outstanding balance increases
```

### Contractor request under Builder

```text
Contractor creates
→ Builder approves, when required
→ Mark paid/given
```

## 14.4 Kharchi fields

- id;
- organisation_id;
- project_id;
- worker_assignment_id;
- amount;
- request_date;
- requested_by;
- status: draft, pending, approved, rejected, paid, partially_deducted, deducted, cancelled;
- approved_by, optional;
- approved_at, optional;
- paid_by, optional;
- paid_at, optional;
- rejection_reason, optional;
- notes;
- timestamps.

## 14.5 Deduction ledger

Use a separate deduction allocation record:

- kharchi_id;
- wage_item_id;
- deduction_amount;
- deducted_at;
- recorded_by.

This permits partial deduction and accurate balance calculation.

## 14.6 Rules

- Outstanding balance = paid Kharchi minus total deductions.
- A Kharchi record cannot be deducted beyond remaining balance.
- Rejected or cancelled Kharchi does not affect balance.
- The same actor cannot approve their own request when approval separation is configured.

## 14.7 Acceptance criteria

- Outstanding worker balance is accurate.
- Independent Contractor can record Kharchi without artificial approval.
- Builder-managed workflow respects configured approvers.
- Wage deduction links back to source Kharchi records.

---

## 15. Module: Materials

## 15.1 Purpose

Track material requirements, approvals, purchase, and delivery at project level.

## 15.2 Material modes

### Self-managed mode

Used by Independent Contractor or self-managed Builder.

```text
Create material requirement
→ Record purchase/order
→ Record delivery
→ Complete
```

Approval is optional and disabled by default.

### Builder-controlled mode

```text
Supervisor/Contractor creates request
→ Required approver reviews
→ Final approval, if configured
→ Purchase/order recorded
→ Delivery recorded
→ Complete
```

## 15.3 Material request fields

- id;
- organisation_id;
- project_id;
- title/material_name;
- category, optional;
- quantity;
- unit_of_measure;
- required_by_date, optional;
- estimated_cost, optional;
- vendor, optional;
- requested_by;
- responsible_contractor, optional;
- workflow_status;
- notes;
- timestamps.

## 15.4 Suggested statuses

- DRAFT
- SUBMITTED
- PENDING_LEVEL_1
- PENDING_FINAL
- APPROVED
- REJECTED
- ORDERED
- PARTIALLY_DELIVERED
- DELIVERED
- CANCELLED

Contracts must define allowed transitions for each operating profile.

## 15.5 Approval actions

Each approval records:

- actor;
- action;
- comment;
- previous status;
- next status;
- timestamp.

## 15.6 Rules

- No cross-project material request.
- No fake Contractor approval when the Contractor created the request and separation is required.
- Self-managed organisations may use direct workflow.
- Rejected request may be edited and resubmitted if policy permits.
- Delivered quantity may be recorded separately from requested quantity.

## 15.7 Acceptance criteria

- Independent Contractor completes the workflow without Builder permission.
- Contractor under Builder follows configured approval path.
- Builder can see who requested, approved, ordered, and received the material.
- Status timeline is visible on mobile.

---

## 16. Module: Site Expenses

## 16.1 Purpose

Replace petty-cash notebooks and informal expense messages.

## 16.2 Self-managed flow

```text
Record expense
→ Add optional receipt
→ Expense included in project cost
```

## 16.3 Builder-controlled flow

```text
Contractor/Supervisor records expense
→ Builder or configured approver reviews
→ Approve or reject
→ Approved expense included in recognised project cost
```

## 16.4 Expense fields

- id;
- organisation_id;
- project_id;
- expense_date;
- category;
- description;
- amount;
- payment_method, optional;
- vendor/payee, optional;
- receipt_media_id, optional;
- recorded_by;
- status: draft, pending, approved, rejected, cancelled;
- approved_by, optional;
- approved_at, optional;
- rejection_reason, optional;
- timestamps.

## 16.5 Default categories

- Transport
- Tools
- Food
- Safety
- Electrical
- Material purchase
- Labour-related
- Fuel
- Miscellaneous

Organisation-defined categories may be added later.

## 16.6 Rules

- Amount must be greater than zero.
- Approved expense changes require adjustment/correction history.
- Receipt is optional for MVP.
- Self-managed mode may auto-approve while recording audit actor and mode.

## 16.7 Acceptance criteria

- User can record expense offline.
- Builder can filter pending expenses.
- Project expense summary includes only statuses approved by the active operating model.

---

## 17. Module: Project Progress

## 17.1 Purpose

Provide simple stage-based visibility into construction progress.

## 17.2 Default stages

- Foundation
- Plinth
- Slab
- Brickwork
- Plastering
- Electrical
- Plumbing
- Finishing
- Handover

Projects may later customise stages.

## 17.3 Progress update fields

- project_id;
- stage;
- percentage 0–100;
- update_date;
- notes;
- updated_by;
- optional gallery media links;
- timestamps.

## 17.4 Rules

- percentage must be 0–100;
- progress update records actor and previous value;
- Builder/Contractor/Supervisor access depends on permission;
- overall project percentage calculation must be documented before implementation.

## 17.5 Acceptance criteria

- Mobile users can update progress quickly.
- Builder can see latest stage updates across projects.
- Progress history is retained.

---

## 18. Module: Site Gallery / Project Diary

## 18.1 Purpose

Create a chronological visual record of project activity.

## 18.2 Flow

```text
Open project
→ Gallery
→ Take/select photo
→ Add category/stage/caption
→ Save locally if offline
→ Upload when connected
→ Optional approval based on profile
```

## 18.3 Gallery fields

- id;
- organisation_id;
- project_id;
- media type;
- storage key/url;
- thumbnail metadata;
- caption;
- category;
- stage tag, optional;
- captured_at;
- uploaded_by;
- status: pending, approved, rejected, published/internal;
- reviewed_by, optional;
- rejection_reason, optional;
- timestamps.

## 18.4 Storage

Production must use persistent object storage through a storage abstraction.

Local application server disk must not be treated as durable production storage.

## 18.5 Acceptance criteria

- Photo can be captured offline and queued.
- Builder can review project diary by date.
- Media access is tenant- and project-secured.

---

## 19. Module: Sales CRM

## 19.1 Purpose

Allow Builder Owners to oversee the complete journey of every real-estate lead while allowing Sales users to perform their assigned work.

## 19.2 Users

### Builder/Owner

Can, according to permission:

- view all leads;
- see who created each lead;
- assign/reassign leads;
- see current status and history;
- view missed follow-ups;
- view site visits;
- view interested/blocked/booked unit;
- view salesperson performance.

### Sales User

Can, according to permission:

- create leads;
- view assigned leads;
- update customer information;
- schedule and record follow-ups;
- schedule site visits;
- update status;
- view inventory;
- block units;
- convert lead to booking.

## 19.3 Lead source

Default values:

- Website
- Walk-in
- Phone call
- Referral
- Facebook
- Instagram
- Google Ads
- Property portal
- Broker
- Existing customer
- Salesperson generated
- Other

## 19.4 Lead data

- id;
- organisation_id;
- project_id;
- customer_name;
- primary_mobile;
- alternate_mobile, optional;
- email, optional;
- preferred_unit_type, optional;
- budget_min/max, optional;
- purchase_purpose, optional;
- purchase_timeline, optional;
- source;
- source_detail, optional;
- created_by;
- assigned_to, optional;
- current_stage;
- priority;
- interested_unit_id, optional;
- lost_reason, optional;
- converted_at, optional;
- converted_by, optional;
- timestamps.

Do not include sensitive demographic fields unless separately approved and legally justified.

## 19.5 Lead stages

- NEW
- CONTACTED
- QUALIFIED
- SITE_VISIT_SCHEDULED
- SITE_VISIT_COMPLETED
- NEGOTIATION
- UNIT_BLOCKED
- BOOKED
- FOLLOW_UP_LATER
- NOT_INTERESTED
- LOST
- INVALID
- DUPLICATE

## 19.6 Created-by versus assigned-to

Both must be retained.

- `created_by` = user or public source that created the lead.
- `assigned_to` = salesperson currently responsible.

Reassignment must not erase prior ownership history.

## 19.7 Lead assignment

MVP supports:

- manual assignment;
- self-created auto-assignment;
- unassigned queue.

Round-robin is deferred.

## 19.8 Activity timeline

Every material sales action creates a timeline entry:

- lead created;
- assigned/reassigned;
- call outcome;
- note added;
- brochure shared, manually recorded;
- follow-up scheduled/completed;
- site visit scheduled/completed/cancelled;
- status changed;
- unit selected;
- unit blocked;
- lead booked/lost.

## 19.9 Lead access

- Sales user: assigned leads and optionally self-created leads.
- Sales Manager/Builder: team or all leads according to permission.
- Backend must enforce lead visibility.

## 19.10 Acceptance criteria

- Builder can identify the creator and current owner of every lead.
- Salesperson can complete daily lead work in mobile app.
- Timeline shows what happened without relying only on current status.
- Conversion is linked to booking/unit where unit inventory is used.

---

## 20. Module: Follow-ups and Reminders

## 20.1 Purpose

Prevent leads from being forgotten.

## 20.2 Follow-up fields

- lead_id;
- assigned_user_id;
- scheduled_at;
- type: phone, WhatsApp, email, site_visit, office_meeting, video_call, other;
- status: scheduled, completed, missed, cancelled, rescheduled;
- outcome;
- notes;
- next_follow_up_at, optional;
- completed_at, optional;
- created_by;
- timestamps.

## 20.3 Flow

```text
Open lead
→ Add follow-up
→ Date/time + type + note
→ Receive reminder
→ Mark completed
→ Record outcome
→ Schedule next follow-up
```

## 20.4 Rules

- Scheduled follow-up appears on salesperson dashboard.
- Overdue follow-ups are highlighted.
- Completing follow-up should prompt next action but must not force one.
- Duplicate exact follow-ups should be warned or prevented.
- Builder can view overdue counts by salesperson.

## 20.5 Notification timing

Exact reminder timing should be configurable. MVP default may include:

- at scheduled time;
- optional 30-minute advance reminder;
- overdue reminder.

## 20.6 Acceptance criteria

- Salesperson sees today’s and overdue follow-ups.
- Builder sees overdue follow-ups by owner.
- Completion creates activity timeline entry.

---

## 21. Module: Site Visits

## 21.1 Purpose

Track an important real-estate sales milestone.

## 21.2 Fields

- lead_id;
- project_id;
- scheduled_at;
- assigned_salesperson;
- attendee_count, optional;
- status: scheduled, completed, cancelled, rescheduled, no_show;
- customer_feedback;
- objections/concerns;
- next_action;
- completed_at, optional;
- timestamps.

## 21.3 Flow

```text
Lead
→ Schedule site visit
→ Reminder
→ Complete visit
→ Record feedback
→ Update lead stage
→ Schedule next follow-up
```

## 21.4 Acceptance criteria

- Visit is visible on lead timeline.
- Builder can view scheduled/completed visits by salesperson and project.
- Completion can advance lead to `SITE_VISIT_COMPLETED`.

---

## 22. Module: Unit Inventory

## 22.1 Purpose

Allow Builder and Sales users to see availability and prevent double booking.

## 22.2 Unit fields

- organisation_id;
- project_id;
- unit_number;
- unit_type;
- wing/tower, optional;
- floor, optional;
- area_sqft, optional;
- facing, optional;
- base_price, optional;
- status: available, blocked, booked, sold, unavailable;
- timestamps.

## 22.3 Access

- Builder: view and manage.
- Sales: view and block/book according to permission.
- Contractor/Supervisor: no access unless explicitly granted.

## 22.4 Unit block

Fields:

- unit_id;
- lead_id;
- blocked_by;
- blocked_at;
- expires_at;
- status: active, expired, released, converted;
- notes.

## 22.5 Rules

- Only one active block per unit.
- Server transaction/locking prevents double block.
- Default expiry = 24 hours, configurable later.
- Block expiry releases unit automatically.
- Booking requires customer/lead linkage.
- Unit status changes are audited.

## 22.6 Acceptance criteria

- Two sales users cannot block the same unit.
- Builder sees who blocked it and for which lead.
- Expired block returns unit to available.

---

## 23. Module: Lead Conversion and Booking

## 23.1 Conversion definition

For MVP:

> A lead is converted when a unit booking is confirmed, or an authorised user records a booking when unit inventory is not applicable.

A lead is not converted merely because:

- the customer was contacted;
- a site visit occurred;
- a quotation was shared;
- a unit was temporarily blocked.

## 23.2 Booking fields for MVP

- organisation_id;
- project_id;
- lead_id;
- unit_id, optional where not applicable;
- booked_by;
- booking_date;
- customer_name;
- customer_mobile;
- booking_amount, optional;
- booking_reference, optional;
- status: confirmed, cancelled;
- cancellation_reason, optional;
- timestamps.

## 23.3 Rules

- Confirmed booking updates lead stage to BOOKED.
- Confirmed booking updates unit status to BOOKED.
- Cancellation must restore or explicitly choose unit status.
- Conversion actor and date are immutable history.

## 23.4 Commission data preparation

MVP captures:

- converted_by;
- booking date;
- project;
- unit;
- booking amount, optional;
- lead source.

Complex incentive calculation is deferred.

## 23.5 Acceptance criteria

- Builder can see which salesperson converted the lead.
- Booking creates linked timeline and audit records.
- Unit and lead states remain consistent in one transaction.

---

## 24. Module: Notifications

## 24.1 Notification types

MVP includes:

- member invitation;
- material approval required/result;
- Kharchi approval required/result;
- expense approval required/result;
- gallery approval required/result;
- follow-up due/overdue;
- lead assigned/reassigned;
- site visit reminder;
- unit block expiry warning;
- unit booked;
- wage payment recorded;
- sync failure requiring attention.

## 24.2 Notification fields

- organisation_id;
- user_id;
- project_id, optional;
- type;
- title;
- message;
- reference_type;
- reference_id;
- deep_link;
- read_at;
- created_at.

## 24.3 Rules

- Notification visibility is user-specific.
- Deep link must revalidate permission.
- Notification cannot grant access to a forbidden record.
- Push notification delivery may be asynchronous; in-app record is source of truth.

## 24.4 Acceptance criteria

- User can open the correct record from notification.
- Unread count is accurate.
- Permission changes do not leave accessible stale deep links.

---

## 25. Module: Dashboards

## 25.1 Builder / Owner mobile dashboard

Project-context and organisation summary may show:

- workers present today;
- wage estimate;
- outstanding Kharchi;
- pending material approvals;
- pending expenses;
- latest progress;
- recent gallery updates;
- new leads;
- overdue follow-ups;
- site visits today;
- units blocked/booked.

## 25.2 Independent Contractor dashboard

- active projects;
- workers present;
- wage estimate;
- Kharchi balance;
- material status;
- site expenses;
- progress updates.

## 25.3 Supervisor dashboard

- assigned project;
- attendance pending;
- worker count;
- quick Kharchi;
- material request;
- expense entry;
- upload photo;
- offline/sync status.

## 25.4 Sales dashboard

- new assigned leads;
- follow-ups today;
- overdue follow-ups;
- site visits today;
- pipeline summary;
- unit blocks nearing expiry;
- quick add lead.

## 25.5 Web dashboard

- cross-project operational summary;
- sales performance;
- pending approvals;
- reports;
- system administration for authorised users.

## 25.6 Acceptance criteria

- Dashboard payload is role and permission specific.
- User never sees data from inaccessible projects.
- Dashboard queries meet agreed performance budgets.

---

## 26. Module: Audit Trail

## 26.1 Audited actions

At minimum:

- role/permission change;
- project member assignment;
- attendance correction;
- wage confirmation/payment;
- Kharchi approval/payment/deduction;
- material approval/rejection/delivery;
- expense approval/rejection/correction;
- progress change;
- gallery approval/rejection;
- lead assignment/reassignment;
- lead status change;
- unit block/book/release;
- booking/cancellation.

## 26.2 Audit fields

- organisation_id;
- project_id, optional;
- actor_user_id;
- action;
- entity_type;
- entity_id;
- old_value, where appropriate;
- new_value, where appropriate;
- metadata;
- IP/device context where available;
- created_at.

## 26.3 Rules

- Audit records are immutable.
- No standard delete/update endpoint exists.
- Sensitive values must be redacted.
- Owner/Admin can view within scope; platform access is controlled.

---

## 27. Offline-First Requirements

## 27.1 Offline-capable MVP modules

- worker creation/assignment, subject to sync rules;
- attendance;
- Kharchi creation;
- site expense creation;
- material request creation;
- project progress updates;
- gallery capture queue;
- lead note/follow-up entry where feasible.

Critical server-authoritative operations such as unit blocking require connectivity.

## 27.2 Offline UX

States:

- Online — All saved
- Offline — Site Mode Active
- Syncing — Sending updates
- Attention needed — Some updates could not sync

Users can continue field entry while offline.

## 27.3 Sync metadata

Sync-capable entities require:

- stable client-generated UUID;
- created_at;
- updated_at;
- deleted_at where applicable;
- client_updated_at;
- server_version or equivalent;
- created_by/updated_by;
- sync status locally.

## 27.4 Conflict rules

### Attendance

- unique project + worker + date;
- server compares versions;
- latest authorised edit may win;
- conflicts are logged.

### Financial/approval records

- server authoritative;
- no blind last-write-wins;
- conflicting update is rejected and surfaced.

### Unit blocks/bookings

- online only;
- transactional server lock;
- client never overrides server.

### Media

- metadata can queue offline;
- binary upload occurs when connected;
- failed upload is retryable.

## 27.5 Acceptance criteria

- App survives restart with unsynced records intact.
- Duplicate sync does not duplicate server records.
- User receives a clear error for records requiring manual resolution.

---

## 28. Web Back-Office MVP Scope

## 28.1 Platform Super Admin

- organisations list;
- create/activate/suspend organisation;
- plans and subscription assignment;
- user/usage limits;
- platform role templates and permission sets;
- platform dashboard;
- support access with strict audit;
- feature flags, if implemented.

## 28.2 Organisation administration

- members;
- invitations;
- role templates;
- advanced permissions;
- project assignments;
- organisation settings;
- project setup;
- workflow profile configuration.

## 28.3 Operational oversight

- attendance report/corrections;
- wages and payment report;
- Kharchi report;
- material approvals/history;
- expenses approvals/report;
- progress/gallery review;
- sales pipeline and salesperson activity;
- inventory bulk setup;
- audit log.

## 28.4 Bulk operations

Priority bulk operations:

- project units CSV import;
- worker import, optional if time permits;
- report CSV export.

---

## 29. Reports and Exports

MVP reports:

- project worker list;
- attendance by date range;
- worker attendance summary;
- wage summary;
- wage payment history;
- outstanding Kharchi by worker;
- project expense summary;
- material request status report;
- project progress history;
- lead pipeline report;
- follow-up overdue report;
- salesperson activity/conversion summary;
- unit inventory status.

Exports should support CSV. PDF is optional unless explicitly required.

All reports are organisation- and project-scoped.

---

## 30. API and Contract Standards

## 30.1 `packages/shared` owns MVP contracts

- DTO schemas;
- response schemas;
- enums;
- status transitions;
- permission keys;
- error codes;
- pagination;
- filters/sorts;
- notification types;
- audit actions;
- sync schemas.

## 30.2 API envelope

Success:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Error:

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

## 30.3 Pagination

- cursor pagination preferred for activity feeds and sync-heavy lists;
- page/limit acceptable for admin tables;
- contract must define each endpoint’s method.

## 30.4 Idempotency

Required for:

- mobile offline creates;
- wage confirmation/payment;
- unit booking;
- other financial writes.

## 30.5 Validation

- client validation improves UX;
- server validation is authoritative;
- shared schemas reduce drift.

---

## 31. Suggested Domain Modules in Backend

```text
identity
organisations
memberships
roles-permissions
projects
workers
attendance
wages
kharchi
materials
expenses
progress
media-gallery
crm-leads
followups
site-visits
unit-inventory
bookings
notifications
analytics
reports
audit
sync
subscriptions
```

Use a modular monolith.

Each module owns its domain logic and exposes approved interfaces/events.

---

## 32. Suggested Monorepo Structure

```text
apps/
  api/          NestJS API
  web/          Next.js back-office portal
  mobile/       Expo / React Native primary app
packages/
  shared/       MVP schemas, DTOs, enums, errors, permissions, constants, tokens, utilities
  database/     archived inherited Prisma history only
  ui/           shared design tokens/primitives where compatible
  config/       lint/TypeScript/tooling configs

docs/
  requirements/
  phases/
  modules/
  decisions/
  api/
```

---

## 33. Security and Integrity Requirements

- strict organisation isolation;
- strict project scoping;
- backend permission checks;
- least-privilege default profiles;
- encrypted transport;
- secure token storage;
- hashed passwords/secure OTP;
- rate limiting;
- input validation;
- safe file type and size validation;
- object-storage access control;
- audit of critical actions;
- no silent financial overwrite;
- no hard deletion of paid/approved financial history;
- database transactions for state-coupled operations;
- unit block/booking concurrency protection;
- log redaction.

---

## 34. Mobile UX Requirements

The mobile app is designed for non-technical users working in sunlight and site conditions.

Mandatory principles:

- large touch targets, minimum approximately 50 px;
- strong contrast;
- simple wording;
- no ERP jargon in primary flows;
- one clear primary action per screen;
- progressive disclosure;
- short forms;
- sensible defaults;
- visible current project;
- visible offline/sync state;
- confirmations only for destructive or financial actions;
- role/permission-based navigation;
- quick actions from home;
- budget Android performance.

The application should feel closer to a daily assistant than an admin dashboard.

---

## 35. Non-Functional Requirements

## 35.1 Performance

- mobile initial usable screen should load quickly on mid/low-range Android devices;
- common API reads should target sub-second server response under normal load;
- heavy dashboards should use aggregated endpoints and caching where safe;
- lists must paginate;
- image uploads must compress appropriately.

## 35.2 Reliability

- offline data persists across restart;
- background or foreground retry is safe and idempotent;
- scheduled jobs are repeat-safe;
- financial writes are transactional;
- storage is durable.

## 35.3 Observability

- structured logs;
- request correlation IDs;
- error tracking;
- job/sync monitoring;
- metrics for failed sync and notification delivery;
- health endpoints.

## 35.4 Accessibility

- adequate color contrast;
- labels for icons;
- text scaling considerations;
- touch target sizing;
- status not communicated by color alone.

## 35.5 Localization

MVP language may begin with English, but architecture and copy must support future Hindi/Gujarati or other localisation.

Currency and dates must be India-friendly.

---

## 36. Testing Requirements

For every module:

- unit tests for business rules;
- integration tests for database and service behavior;
- contract tests;
- API authorization tests;
- tenant isolation tests;
- project isolation tests;
- workflow transition tests;
- mobile offline/sync tests where applicable;
- end-to-end happy path;
- critical failure path.

Mandatory scenarios include:

- Contractor under Builder cannot bypass approval;
- Independent Contractor can use direct workflow;
- Builder can perform Contractor/Supervisor operations when permitted;
- Sales user cannot see another salesperson’s leads without permission;
- duplicate attendance prevented;
- Kharchi deduction not duplicated;
- unit double-block prevented;
- booking updates lead and unit atomically;
- cross-tenant ID manipulation denied.

---

## 37. Definition of Done for a Module

A module is complete only when:

1. requirements and workflows are approved;
2. contracts are defined;
3. permissions are defined;
4. data model and migration are defined;
5. backend implementation is complete;
6. mobile implementation is complete where applicable;
7. web implementation is complete where applicable;
8. audit and notifications are implemented where required;
9. offline behavior is implemented where required;
10. tests pass;
11. OpenAPI/documentation is updated;
12. no tenant/project access gap remains;
13. acceptance criteria are verified.

---

## 38. Recommended MVP Delivery Order

This is not yet the final implementation plan, but it is the recommended dependency order for phase planning.

### Foundation

- monorepo and CI;
- shared MVP contracts in `packages/shared`;
- API-local `mysql2/promise` database foundation;
- authentication;
- organisations;
- memberships;
- RBAC;
- projects;
- project assignments;
- audit foundation;
- notification foundation.

### Construction operations core

- workers;
- attendance;
- offline sync foundation;
- wages;
- Kharchi;
- materials;
- expenses;
- progress;
- gallery.

### Sales core

- leads;
- lead assignment;
- activity timeline;
- follow-ups;
- reminders;
- site visits;
- units;
- unit blocks;
- booking/conversion.

### Oversight and release readiness

- dashboards;
- reports;
- web back-office;
- subscription administration;
- exports;
- security hardening;
- end-to-end testing;
- deployment and monitoring.

---

## 39. Open Decisions Before Implementation Planning

These decisions must be resolved during phase planning or module specification:

1. OTP-first versus email/password-first authentication.
2. Exact MVP wage payment support: full only or partial.
3. Holiday wage default.
4. Exact approval-profile configuration UI.
5. Whether material purchase cost is part of MVP.
6. Whether progress stages are fixed or project-configurable in MVP.
7. Exact notification reminder timings.
8. Exact unit block expiry configuration.
9. Booking amount and document requirements.
10. Whether public website inquiry endpoint is included in first MVP release.
11. Whether worker import is included.
12. Object storage provider.
13. Offline database/sync library for Expo compatibility.
14. Whether Builder organisation can invite an external Contractor organisation in MVP or only create Contractor members internally.
15. Exact subscription billing behavior for MVP.

Until resolved, AI agents must not hard-code irreversible assumptions.

---

## 40. Next Documentation Outputs

After approval of this document, create:

```text
docs/phases/MVP_PHASES.md
```

Then, for every module:

```text
docs/modules/<module>/REQUIREMENTS.md
docs/modules/<module>/FLOWS.md
docs/modules/<module>/CONTRACTS.md
docs/modules/<module>/DATA_MODEL.md
docs/modules/<module>/PERMISSIONS.md
docs/modules/<module>/TEST_PLAN.md
```

The phase plan must group backend, mobile, and web work by vertical business capability. It must not create a complete backend first and postpone all clients.

For each vertical slice:

```text
Requirements
→ Contracts
→ Data model
→ Backend
→ Mobile/Web UI
→ Integration
→ Tests
→ Acceptance
```

---

## 41. Final MVP Product Statement

> NirmanSite is a mobile-first, project-centric construction and real-estate operating system. It supports Independent Contractors, self-managed Builders, Builder-Contractor teams, Supervisors, and Sales users without forcing a universal hierarchy. Organisation Owners receive appropriate full access, invited users receive role- and project-scoped capabilities, and approval workflows activate only where a separate authority exists. The MVP focuses on replacing paper-based worker, attendance, wage, Kharchi, material, expense, progress, and sales-follow-up processes while preserving strong access control, auditability, offline operation, and product integrity.
