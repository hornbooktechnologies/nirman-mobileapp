# NirmanSite Module Index

## 1. Purpose

This index tracks module priority, contract status, implementation status, and the next recommended module.

AI agents must read this file before starting new module work.

## 2. Status Legend

- `candidate`: identified from requirements, not contracted.
- `contract_draft`: contract exists but is not approved.
- `contract_approved`: contract approved, implementation not started.
- `in_progress`: implementation slices are active.
- `blocked`: cannot continue without decision, dependency, or environment.
- `verified`: implementation passed required checks.
- `accepted`: product owner accepted the module.
- `superseded`: replaced by a newer plan or contract.

## 3. Foundation Modules

| Priority | Module | Path | Status | Last Slice | Next Step |
| --- | --- | --- | --- | --- | --- |
| 1 | Identity Access | `docs/modules/foundation/identity-access/CONTRACTS.md` | in_progress | Internal Contractor membership approved; mobile customer shell cleaned and mobile member plan prepared | Implement multi-organization switching, then mobile member invitations |
| 2 | Project Setup And Assignment | `docs/modules/foundation/project-access/CONTRACTS.md` | in_progress | Mobile now exposes only real authorized project context; assignment APIs already exist | Implement mobile project creation and member assignment after invitation UI |
| 2A | Project Team And Permission Grants | `docs/modules/foundation/project-team-access/CONTRACTS.md` | in_progress | Contract approved with ROLE_DEFAULT compatibility and CUSTOM Project grants | Implement persistence, authorization, Team APIs, and web/mobile Team flows |
| 3 | Role And Permission Model | `docs/modules/foundation/role-permission-model/PLAN.md` | in_progress | Platform Settings access/save restored; Gmail delivery reaches SMTP but awaits a valid same-account App Password | Replace/test SMTP credential, then run the remaining full platform/customer role matrix |
| 3A | Mobile Localization Foundation | `docs/modules/foundation/localization/CONTRACTS.md` | in_progress | Current Expo customer surface localized across common/auth/navigation/Home/Projects/Members/Team/Workers; static checks passing | Run authenticated physical-device, accessibility, large-text, and fluent Hindi/Gujarati review |
| 4 | Audit Foundation | `docs/modules/foundation/audit/CONTRACTS.md` | candidate | none | Contract after Phase 1 review |
| 5 | File And Media Ownership | `docs/modules/foundation/files-media/CONTRACTS.md` | candidate | none | Contract before gallery/evidence |
| 6 | Notifications Foundation | `docs/modules/foundation/notifications/CONTRACTS.md` | candidate | none | Contract before approval-heavy modules |
| 7 | Offline Sync Foundation | `docs/modules/foundation/offline-sync/CONTRACTS.md` | candidate | none | Contract before offline writes |

## 4. Construction Operations Modules

| Priority | Module | Path | Status | Dependency | Next Step |
| --- | --- | --- | --- | --- | --- |
| 8 | Workers | `docs/modules/construction/workers/CONTRACT.md` | in_progress | Effective-dated primary-project allocation contract approved as a Workers extension | Implement and verify primary-project-period API in Slice A1; deactivation policy remains separately blocked |
| 8A | Work Calendar | `docs/modules/calendar/CONTRACT.md` | in_progress | Project Access | Formal contract reconciled; implement and verify Slice A1 API foundation |
| 9 | Attendance | `docs/modules/attendance/CONTRACT.md` | in_progress | Workers primary periods + Work Calendar + Project Access | Formal exception-model contract reconciled; implement and verify Slice A1 API foundation |
| 10 | Kharchi | `docs/modules/construction/kharchi/CONTRACTS.md`, `docs/modules/construction/kharchi/MOBILE_INTEGRATION_CONTRACT.md` | implementation_complete_migration_pending | Workers + Wages + reusable Audit Foundation | API source/tests and Mobile integration contract complete; migrations, guarded grants, authenticated runtime, and Mobile implementation remain |
| 11 | Wages | `docs/modules/construction/wages/CONTRACTS.md` | in_progress | Workers + Attendance + Kharchi | Derived Calendar/Attendance generation and transactional Kharchi allocation implemented; effective-dated rate history remains |
| 12 | Materials | `docs/modules/construction/materials/CONTRACTS.md` | candidate | Project Access + Audit + Notifications | Contract |
| 13 | Expenses | `docs/modules/construction/expenses/CONTRACTS.md` | candidate | Project Access + Audit + Notifications | Contract |
| 14 | Progress | `docs/modules/construction/progress/CONTRACTS.md` | candidate | Project Access + Files/Media | Contract |
| 15 | Gallery / Project Diary | `docs/modules/construction/gallery/CONTRACTS.md` | candidate | Files/Media + Project Access | Contract |

## 5. Sales Modules

| Priority | Module | Path | Status | Dependency | Next Step |
| --- | --- | --- | --- | --- | --- |
| 16-21 | Sales CRM vertical slice | `docs/modules/sales/CONTRACT.md` | in_progress | Project Access; Notifications/Audit integration remain downstream | Remote migration and role seed applied; complete authenticated role/workflow and concurrency acceptance |

## 6. Oversight Modules

| Priority | Module | Path | Status | Dependency | Next Step |
| --- | --- | --- | --- | --- | --- |
| 22 | Dashboards | `docs/modules/oversight/dashboards/CONTRACTS.md` | candidate | Core operations and sales data | Contract later |
| 23 | Reports And Exports | `docs/modules/oversight/reports/CONTRACTS.md` | candidate | Core operations and sales data | Contract later |
| 24 | Super Admin And Subscriptions | `docs/modules/platform/subscriptions/CONTRACTS.md` | in_progress | Configurable capacity contract approved; no hard-coded commercial values | Implement persistence, APIs, and manual Platform administration |

## 7. Current Recommendation

Calendar/Attendance Slices A0 through C2 are complete. Wages consumes derived Calendar/Attendance results and now creates traceable oldest-first Kharchi allocations during confirmation. Kharchi runtime enablement still requires separately approved migrations and guarded role-grant synchronization; effective-dated Wage rate history also remains.

Next document:

```text
docs/tasks/calendar-attendance-exception-model-implementation-plan.md
```

Migration `003_organization_owner_invitations.sql` is applied. Owner invitation delivery, existing-identity reuse, and Login email prefill are source-complete; live acceptance remains write-gated. RBAC Slices A-C are active in the shared database; Slice D/E/F source corrections remain separately runtime-gated.

Workers now has a reconciled vertical slice and passing automated static/API checks. It remains blocked from `verified` because the approved contract does not choose how worker deactivation handles active project assignments. Audit, Attendance/Wages rate history, and persisted offline behavior remain explicit downstream foundation dependencies.

The mobile customer shell no longer exposes mock workflows, design-system screens, fake project/team data, or dead tabs. The approved mobile plan now makes organization switching, member invitations, project assignment, and Workers completion the next foundation sequence for Builder, Contractor, Supervisor, Project Manager, and Sales identities.
