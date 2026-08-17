# Decision 006: Subscription, Capacity, Supervisor, And Initial Commercial Provisioning Model

## Status

Approved on 2026-08-13.

This decision records product and commercial direction only. It does not approve application implementation, database changes, migrations, seeds, subscription enforcement, billing, payment integration, storage enforcement, role-template changes, or UI work.

## Context

NirmanSite serves two primary paying customer types:

- Builder organizations.
- Independent Contractor organizations.

Earlier requirements established organization membership, role templates, project assignment, operating profiles, and platform subscription administration, but they did not define a launch subscription model. Some planning also treated operating-profile combinations as if they might become commercial packages, and the current profile catalog does not represent the important Builder-side Supervisor responsibility.

The initial commercial model must stay simple while NirmanSite learns how real customers use projects, login members, Workers, media, reports, synchronization, and future high-cost services. It must also preserve the security boundary between commercial capacity and runtime authorization.

## Approved Decisions

### 1. Customer Types And Subscription Ownership

The primary customer organization types remain:

```text
BUILDER
CONTRACTOR
```

A subscription belongs to an Organization, which is the paying customer workspace.

The customer purchases NirmanSite access and commercial capacity for that Organization. The customer does not purchase an Organization Role or a named person's authority.

The same login identity may hold memberships in more than one Organization, but each Organization has its own subscription, limits, records, memberships, permissions, and project scope. Nothing transfers automatically between subscriptions or Organizations.

### 2. Subscription And Operating Model Are Separate

An Operating Profile is a working/responsibility preset. It describes who normally manages daily work, represents the Builder, executes work, verifies requests, supervises Workers, and performs approvals.

An Operating Profile is not a Subscription Plan and must not directly determine price.

Approved business/workflow combinations that the product model must recognize are:

- Self-Managed Builder.
- Builder + Builder Supervisor.
- Builder + Contractor.
- Builder + Builder Supervisor + Contractor.
- Builder + Builder Supervisor + Contractor + Site Supervisor.
- Independent Contractor.
- Independent Contractor + Site Supervisor.

These seven combinations must not be converted into seven commercial plans.

They describe responsibility and approval topology. The eventual implementation may use profiles, responsibility configuration, project assignments, role templates, or a combination, but that technical mapping requires a later approved contract.

### 3. Builder Supervisor Is A Distinct Responsibility

Many Builders employ their own Supervisor to act as the Builder's representative at a project/site.

A Builder Supervisor may, where authorized:

- verify Contractor requests;
- review quantities and site requirements;
- monitor work on behalf of the Builder;
- review progress;
- verify deliveries;
- review Attendance or workforce information;
- perform delegated decisions granted by the Builder.

A Builder Supervisor is conceptually distinct from a Contractor-side Site Supervisor:

| Responsibility | Builder Supervisor | Site Supervisor |
| --- | --- | --- |
| Represents | Builder | Site execution/Contractor workflow |
| Primary purpose | Oversight, verification, and delegated Builder decisions | Daily field execution and supervision |
| Typical position in approval flow | Verifies before Builder's final approval | Creates or performs daily operational entries |
| Commercial authority | Only when separately delegated; verification is not final commercial approval | None by default |

Verification and final commercial approval are separate actions. A workflow must not treat a Builder Supervisor's site verification as the Builder's final commercial approval unless an approved module contract explicitly grants that authority.

Example future Materials workflow:

```text
Contractor raises material requirement
-> Builder Supervisor verifies the requirement on site
-> Builder Supervisor verifies, rejects, or returns it
-> Builder receives the verified request
-> Builder gives final commercial approval
-> Builder arranges or disburses money outside NirmanSite for the initial model
-> purchase or dispatch occurs
-> Builder Supervisor may verify delivery
```

This decision does not create a new permission key, role seed, status, or workflow transition. Materials, Attendance, Progress, Expenses, and other module contracts must define the exact verification and approval actions before implementation.

### 4. Supervisor Capability Is Available To Every Paid Organization

Every paid Organization must be able to use an appropriate Supervisor role/responsibility without purchasing a premium Supervisor feature.

This means the Organization Owner may invite a login Member and assign the appropriate Supervisor responsibility when required.

It does not mean:

- a Supervisor account is created automatically;
- every Organization must use a Supervisor;
- every workflow requires a Supervisor;
- the subscription is tied to a fixed person;
- the Supervisor bypasses member capacity, RBAC, project assignment, or lifecycle rules.

Depending on the workflow, the responsibility may be Builder Supervisor or Site Supervisor. Exact role-template representation remains a later RBAC/Identity Access contract decision.

### 5. All Core MVP Modules Are Available In Every Initial Paid Plan

Initial paid plans are not differentiated by withholding core MVP modules.

Every initial paid plan receives access to the core MVP product as those modules become available, including the currently approved product areas:

- Projects and Project Setup/Assignment.
- Members and Project Team.
- Workers / Labour Management.
- Attendance.
- Wages and Worker Payments.
- Kharchi.
- Materials.
- Site Expenses.
- Project Progress.
- Site Gallery / Project Diary.
- Sales CRM, Follow-ups, Site Visits, Unit Inventory, and Lead Conversion/Booking.
- Notifications.
- Dashboards.
- Audit Trail.
- Standard Reports and Exports.
- Other standard operational functionality included in the approved MVP requirements.

Commercial entitlement does not mean that an unimplemented module is available in the current application. Module availability still depends on approved contracts, implementation, verification, release readiness, and any applicable Feature Flag.

Possible future premium or high-cost capabilities may include AI, WhatsApp/SMS, OCR/document processing, advanced reports/exports, third-party integrations, larger storage, large-file/video features, or other high-cost functionality. None is an approved launch-plan entitlement or premium rule merely because it is listed here.

### 6. Initial Plan Differentiation Uses Capacity

Initial plan differentiation should be based primarily on Organization capacity rather than module or role names.

Candidate initial capacity dimensions are:

- Maximum active Projects.
- Maximum active login Members.
- Storage allowance.
- Subscription validity and status.
- Later premium capabilities only after separate approval.

Exact plan names, prices, limits, allowances, and renewal rules remain unresolved Product Owner decisions.

### 7. Workers Are Unlimited For The Initial Plan Model

Workers are not application login users and are not Organization membership seats.

For the initial commercial model:

- No Worker-count subscription limit is enforced.
- Worker records do not consume the active Member/login-user limit.
- An Organization may create as many Worker records as operationally required.
- Workers remain Organization-owned workforce records.
- Subscription changes must not delete Workers or Worker history.

NirmanSite should observe Worker volume internally for product and infrastructure analysis, but must not currently charge or restrict customers by Worker count.

This decision may be revisited only after real usage evidence is available and a later approved decision explicitly changes it.

### 8. Active Member Capacity Applies To Login Organization Members

A plan may limit active login Members of an Organization.

Member capacity may include:

- Organization Owner.
- Builder Admin.
- Builder Supervisor.
- Independent Contractor Owner.
- Contractor Member.
- Site Supervisor.
- Project Manager.
- Sales User.
- Viewer.
- Other approved login roles.

Capacity must not be sold as fixed role quantities such as:

```text
1 Contractor
2 Supervisors
1 Sales User
```

Instead, the Organization receives a Member capacity and assigns roles according to its operating model. Role availability and commercial capacity are separate.

Whether invited but not yet active memberships consume capacity remains unresolved.

### 9. Active Project Capacity

A plan may limit the number of active Projects in an Organization.

Reaching a Project limit must not delete, archive, or alter existing Projects automatically. Exact treatment of Draft, On Hold, Completed, and Archived Projects for capacity counting requires a later subscription contract.

### 10. Storage Is A Meaningful Commercial Capacity

Storage may be an initial plan constraint because NirmanSite is expected to store:

- site and progress photographs;
- receipt images;
- project images;
- documents;
- gallery content;
- videos;
- other uploaded files.

Plans may have different storage allowances. Exact allowances, measurement rules, overage behavior, upload behavior at the limit, and additional-storage packages are not approved by this decision.

### 11. Pricing Is Not Raw Usage-Based Billing

NirmanSite must not be described as charging customers per:

- API request;
- Attendance record;
- database row;
- transaction;
- Worker;
- megabyte processed;
- generated report.

Infrastructure consumption may influence future capacity design and pricing analysis internally, but customers are not billed from raw technical consumption under this approved launch model.

### 12. Initial Commercial Onboarding Is Manually Assisted

The initial public NirmanSite website supports product discovery and lead capture, not automated purchase/provisioning.

Initial commercial flow:

```text
Customer visits the public NirmanSite website
-> reviews Builder and Contractor use cases
-> reviews plans/pricing
-> submits an enquiry, request, or contact form
-> NirmanSite team receives the request by email
-> team discusses and accepts the customer requirement
-> Platform Super Admin manually creates the Organization
-> Platform Super Admin manually assigns the selected Subscription Plan
-> Platform Super Admin enters the primary Owner details
-> system sends the approved Owner invitation/activation flow
-> Owner activates the account
-> Owner logs in
-> Owner creates/configures Projects and Team
-> Organization starts using NirmanSite
```

The existing platform-provisioned Owner invitation flow remains the approved activation boundary:

- Platform Super Admin does not become a customer Organization Member.
- A Builder customer receives the protected Organization Owner membership.
- A Contractor customer receives the Independent Contractor Owner membership.
- The Owner sets or retains their own credentials through the approved invitation flow.

The first release does not require:

- automated online checkout;
- payment-gateway integration;
- automatic Organization provisioning after payment;
- billing webhooks;
- self-service plan upgrade/downgrade;
- automated tax/GST invoice generation.

### 13. Subscription Does Not Replace Authorization

Commercial access and security authorization remain separate.

Conceptual runtime access is:

```text
active user
AND active Organization membership
AND active Organization and Subscription
AND requested creation remains within applicable plan capacity
AND required Organization Role permission
AND Project Assignment or valid Organization-wide scope
AND target record belongs to the same Organization/Project
AND valid record, Project, and workflow lifecycle state
= allowed operation
```

For the initial launch, all core modules are available in every paid plan, so plan-to-plan core-module entitlement differences are unnecessary.

Future premium features may introduce an additional entitlement check after approval. A Feature Flag remains a software rollout mechanism and is not a commercial entitlement or authorization grant.

### 14. Capacity Enforcement Must Preserve Data

When subscription capacity enforcement is designed later:

- Reaching a Member, Project, or storage limit must not delete existing records.
- Subscription changes must not delete Workers.
- Operational, financial, audit, and historical data must be preserved.
- Existing records must not be silently reassigned, deactivated, or archived.
- Downgrade, expiry, grace-period, read-only, and export behavior require a separate approved contract.

### 15. Observe Usage Before Evolving Packaging

NirmanSite should be architected so the team can later analyze real Organization usage, including:

```text
organization
plan
active projects
active login members
worker count
attendance volume
financial-record volume
media count
storage consumed
API and sync activity
notification volume
report and export activity
AI usage
third-party service usage
```

This is an analytics principle, not authorization to implement every metric now and not a decision to bill on those metrics.

The governing product principle is:

> First observe real customer behavior, then use evidence to evolve subscription limits and premium packaging.

## Concern Separation

Use these meanings consistently:

```text
Organization
= paying customer workspace

Subscription Plan
= commercial capacity/package assigned to an Organization

Member
= login identity with Organization membership

Worker
= non-login workforce record

Organization Role
= authorization/responsibility ceiling

Project Assignment
= where a Member works

Project/module responsibility
= what the Member handles within that Project, subject to approved permissions

Builder Supervisor
= Builder-side representative for supervision, verification, and delegated decisions

Site Supervisor
= field/site execution Supervisor

Operating Profile
= working/responsibility preset

Feature Flag
= software rollout mechanism, not commercial entitlement
```

Conceptually:

```text
Subscription -> commercial Organization capacity
Organization Role -> maximum authority/responsibility
Project Assignment -> Project scope
Project/module responsibility -> delegated work within the Project
Operating Profile -> default working and approval model
```

## Authorization Boundaries

- The API remains the authorization authority; hidden UI is not security.
- A paid Subscription does not grant a user operational permission by itself.
- An Organization Role does not grant cross-Organization access.
- A Project Assignment does not grant all module actions by itself.
- An Operating Profile does not bypass RBAC, Project access, lifecycle, or record ownership.
- Supervisor availability does not grant a Supervisor account automatically.
- All core modules being commercially included does not make unfinished modules callable or visible.
- Platform Super Admin remains a platform actor and receives no normal customer operational access through subscription administration.

## Initial Plan Model

The initial commercial plan model is therefore:

| Concern | Launch direction |
| --- | --- |
| Customer types | Builder and Independent Contractor Organizations |
| Core modules | Available in every initial paid plan as released |
| Primary differentiation | Active Projects, active login Members, storage, validity/status |
| Workers | Unlimited; excluded from Member seats |
| Roles | Available according to product/RBAC rules, not premium products |
| Supervisor capability | Available to every paid Organization |
| Operating profiles | Workflow presets, not plans |
| Billing model | Capacity/package based, not raw technical usage based |
| Provisioning | Manually assisted by NirmanSite team and Platform Super Admin |

## Consequences And Trade-Offs

Positive consequences:

- Builders and Contractors can buy the same core operating system without confusing role-based pricing.
- Customers can organize their team according to real project responsibilities.
- Unlimited Workers removes an early adoption barrier for labour-heavy projects.
- Capacity-based plans are easier to explain and administer manually.
- Storage provides a commercially meaningful constraint tied to real infrastructure cost.
- Builder Supervisor is represented as a genuine Builder-side verification responsibility.
- Manual provisioning allows the team to learn from early customers before automating billing.
- Internal usage observation creates evidence for later packaging decisions.

Trade-offs:

- Module-based upsell is intentionally limited at launch.
- Unlimited Workers can create unpredictable data volume, so internal monitoring and query/storage efficiency matter.
- Role and operating-model flexibility requires careful RBAC and Project-scoping contracts.
- Builder Supervisor introduces a conceptual responsibility that current role templates and profile enums do not yet fully represent.
- Manual sales and provisioning require operational discipline and may not scale indefinitely.
- Capacity enforcement cannot be implemented safely until counting, concurrency, lifecycle, and downgrade rules are contracted.

## Superseded Or Clarified Assumptions

This approved decision supersedes or clarifies the following earlier assumptions:

- The generic self-registration journey in `MVP_REQUIREMENTS.md` is not the initial commercial launch path. Initial launch uses the manually assisted Platform Super Admin provisioning and approved Owner invitation flow. Self-service purchase/provisioning is deferred.
- The five-profile catalogs in `MVP_REQUIREMENTS.md`, `docs/architecture/auth-rbac.md`, and `docs/modules/foundation/role-permission-model/PLAN.md` are incomplete for product planning because they do not distinguish Builder Supervisor combinations. Existing implemented enum values and validation remain unchanged until a separately approved contract and implementation task reconcile them.
- The phrase "Builder + Contractor + Supervisor" must not be interpreted as proving whether the Supervisor represents the Builder or the Contractor. Future contracts must name Builder Supervisor and Site Supervisor responsibilities explicitly.
- Any launch packaging suggestion that separates Core, Operations, Finance, or Sales modules into different paid plans is superseded. All core MVP modules are included in every initial paid plan.
- The candidate packaging examples in `docs/tasks/members-team-subscription-access-product-discussion-brief.md` were discussion-only and are superseded for the initial launch wherever they imply module-based plan differentiation.
- Subscription administration and Feature Flags remain separate: a Feature Flag does not prove purchase, and a Subscription does not force an unreleased feature to appear.

## Contracts Requiring Later Alignment

This decision does not modify the following contracts, but later approved work must reconcile them:

- **Super Admin And Subscriptions contract:** define plan, subscription, capacity counters, status, manual assignment, storage accounting, usage analytics, and safe enforcement. The module is currently only a candidate in `docs/modules/MODULE_INDEX.md`.
- **Identity Access contract:** incorporate active Subscription/capacity boundaries and decide how Builder Supervisor is represented without weakening protected Owner and membership rules.
- **Role And Permission Model:** distinguish Builder Supervisor from Site Supervisor, define safe role/responsibility mapping, and reconcile the expanded operating-model catalog.
- **Project Setup And Assignment contract:** define how project-level responsibility and future capacity checks interact with Project creation/assignment without turning assignment into permission.
- **Materials, Attendance, Expenses, Progress, Gallery, and other approval-heavy module contracts:** distinguish verification, review, and final commercial approval, including Builder Supervisor participation.
- **Files And Media contract:** define storage measurement, ownership, retention, limits, and access before quota enforcement.
- **Reports/Audit/Analytics contracts:** define usage observation, report scope, retention, and privacy without turning raw usage into billing by default.

## Deferred Subscription Capabilities

Deferred until separately approved:

- Automated checkout.
- Payment gateway/provider integration.
- Automatic provisioning after payment.
- Billing webhooks.
- Automated renewals.
- Self-service upgrades/downgrades.
- Tax/GST/invoice automation.
- Storage overage purchase/enforcement.
- Premium entitlement enforcement.
- AI, WhatsApp, SMS, OCR, third-party, or advanced report quotas.
- Usage-based billing.
- Worker-count billing or limits.

## Explicit Non-Goals

This decision does not:

- define plan names;
- define prices;
- define capacity numbers;
- create seven plans from seven operating combinations;
- create or modify an Organization Role;
- create a Builder Supervisor permission set or seed;
- change the current operating-profile enum;
- define project-level permission persistence;
- define exact module approval transitions;
- implement a public website or pricing page;
- implement subscriptions, billing, payments, capacity enforcement, storage accounting, or analytics;
- authorize database schema, migration, seed, API, web, or mobile changes.

## Open Decisions

The following remain explicitly unresolved and must not be invented by AI agents or developers:

1. Exact plan names.
2. Exact monthly/yearly prices.
3. Exact active-Project limits.
4. Exact active-Member limits.
5. Exact storage allowances.
6. Whether invited but not active memberships consume capacity.
7. Exact Subscription duration and renewal process.
8. Trial policy.
9. Expiry and grace-period behavior.
10. Storage overage behavior.
11. Exact future premium features.
12. Payment gateway/provider.
13. Tax/GST/invoice automation.
14. Timing of self-service purchase and provisioning.
15. Future Worker limits, if real usage ever justifies them.
16. AI, WhatsApp, SMS, and OCR quotas and commercial model.
17. Premium report/export rules.
18. Exact status/counting treatment for Draft, On Hold, Completed, and Archived Projects.
19. Exact technical representation of Builder Supervisor versus Site Supervisor.
20. Whether operating profile remains Organization-wide or later supports Project-level responsibility configuration.

