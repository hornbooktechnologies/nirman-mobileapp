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
| 1 | Identity Access | `docs/modules/foundation/identity-access/CONTRACTS.md` | in_progress | New and existing Owner activation paths now redirect to Login with email pre-filled; existing identities reuse their password | Verify both paths with disposable invitations on web and Expo Go, then implement general member invitations |
| 2 | Project Setup And Assignment | `docs/modules/foundation/project-access/CONTRACTS.md` | in_progress | Slice 6 mobile session/project switcher | Phase 1 foundation review |
| 3 | Role And Permission Model | `docs/modules/foundation/role-permission-model/PLAN.md` | in_progress | Platform Settings access/save restored; Gmail delivery reaches SMTP but awaits a valid same-account App Password | Replace/test SMTP credential, then run the remaining full platform/customer role matrix |
| 4 | Audit Foundation | `docs/modules/foundation/audit/CONTRACTS.md` | candidate | none | Contract after Phase 1 review |
| 5 | File And Media Ownership | `docs/modules/foundation/files-media/CONTRACTS.md` | candidate | none | Contract before gallery/evidence |
| 6 | Notifications Foundation | `docs/modules/foundation/notifications/CONTRACTS.md` | candidate | none | Contract before approval-heavy modules |
| 7 | Offline Sync Foundation | `docs/modules/foundation/offline-sync/CONTRACTS.md` | candidate | none | Contract before offline writes |

## 4. Construction Operations Modules

| Priority | Module | Path | Status | Dependency | Next Step |
| --- | --- | --- | --- | --- | --- |
| 8 | Workers | `docs/modules/construction/workers/CONTRACT.md` | in_progress | API/web/mobile Workers source exists with organization/project authorization | Runtime role/scope matrix after RBAC seed |
| 9 | Attendance | `docs/modules/construction/attendance/CONTRACTS.md` | candidate | Workers + Project Access | Contract |
| 10 | Kharchi | `docs/modules/construction/kharchi/CONTRACTS.md` | candidate | Workers + Attendance + Audit | Contract |
| 11 | Wages | `docs/modules/construction/wages/CONTRACTS.md` | candidate | Workers + Attendance + Kharchi | Contract |
| 12 | Materials | `docs/modules/construction/materials/CONTRACTS.md` | candidate | Project Access + Audit + Notifications | Contract |
| 13 | Expenses | `docs/modules/construction/expenses/CONTRACTS.md` | candidate | Project Access + Audit + Notifications | Contract |
| 14 | Progress | `docs/modules/construction/progress/CONTRACTS.md` | candidate | Project Access + Files/Media | Contract |
| 15 | Gallery / Project Diary | `docs/modules/construction/gallery/CONTRACTS.md` | candidate | Files/Media + Project Access | Contract |

## 5. Sales Modules

| Priority | Module | Path | Status | Dependency | Next Step |
| --- | --- | --- | --- | --- | --- |
| 16 | Leads | `docs/modules/sales/leads/CONTRACTS.md` | candidate | Project Access | Contract |
| 17 | Follow-ups | `docs/modules/sales/followups/CONTRACTS.md` | candidate | Leads + Notifications | Contract |
| 18 | Site Visits | `docs/modules/sales/site-visits/CONTRACTS.md` | candidate | Leads + Follow-ups | Contract |
| 19 | Unit Inventory | `docs/modules/sales/unit-inventory/CONTRACTS.md` | candidate | Project Access | Contract |
| 20 | Unit Blocking | `docs/modules/sales/unit-blocking/CONTRACTS.md` | candidate | Unit Inventory + Idempotency | Contract |
| 21 | Booking / Conversion | `docs/modules/sales/bookings/CONTRACTS.md` | candidate | Leads + Unit Inventory + Audit | Contract |

## 6. Oversight Modules

| Priority | Module | Path | Status | Dependency | Next Step |
| --- | --- | --- | --- | --- | --- |
| 22 | Dashboards | `docs/modules/oversight/dashboards/CONTRACTS.md` | candidate | Core operations and sales data | Contract later |
| 23 | Reports And Exports | `docs/modules/oversight/reports/CONTRACTS.md` | candidate | Core operations and sales data | Contract later |
| 24 | Super Admin And Subscriptions | `docs/modules/platform/subscriptions/CONTRACTS.md` | candidate | Identity Access + Role And Permission Model | Contract later |

## 7. Current Recommendation

Explicitly approve disposable onboarding writes and verify both a new-email Owner activation and a same-email second-organization activation on web and Expo Go. Then complete the RBAC runtime role matrix before starting another operational module.

Next document:

```text
docs/modules/foundation/role-permission-model/PLAN.md
```

Migration `003_organization_owner_invitations.sql` is applied. Owner invitation delivery, existing-identity reuse, and Login email prefill are source-complete; live acceptance remains write-gated. RBAC Slices A-C are active in the shared database; Slice D/E/F source corrections remain separately runtime-gated.
