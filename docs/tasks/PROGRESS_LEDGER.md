# NirmanSite Progress Ledger

## 1. Purpose

This ledger records the path followed to build NirmanSite.

AI agents must update this file after every approved contract, implementation slice, verification pass, or blocker.

## 2. Current Gate

Current gate:

```text
Role-specific Dashboard contract/API, migration `023`, guarded role sync, aggregate Expo integration, and premium layered Mobile presentation are verified. Supervisor/Sales role matrix and physical-device acceptance remain pending.
```

Next recommended task:

```text
Run authenticated Supervisor and Sales dashboard responses, then complete narrow/large-phone, accessibility, reduced-motion, landscape, and en/hi/gu device review.
```

## 3. Completed Path

| Order | Stage | Status | Evidence | Verification |
| --- | --- | --- | --- | --- |
| 1 | MVP requirements baseline | completed | `MVP_REQUIREMENTS.md` | Documented baseline |
| 2 | MVP phase plan | completed | `docs/phases/MVP_PHASES.md` | Planning review |
| 3 | Phase 0 alignment | completed | `docs/tasks/current-task.md`, updated templates/docs | Documentation review |
| 4 | Identity Access contract | completed | `docs/modules/foundation/identity-access/CONTRACTS.md` | Contract review |
| 5 | Project Setup And Assignment contract | completed | `docs/modules/foundation/project-access/CONTRACTS.md` | Contract review |
| 6 | Phase 1 technical plan | completed | `docs/tasks/phase-1-identity-project-technical-plan.md` | Planning review |
| 7 | Slice 1 shared constants | completed | `packages/shared/src/constants` | `pnpm --filter @nirman-app/shared type-check` |
| 8 | Slice 2 SQL draft | completed | `apps/api/src/database/sql/migrations/001_phase1_identity_project_setup_draft.sql` | Draft review |
| 9 | Slice 2A SQL compatibility | completed | revised SQL draft and `docs/tasks/current-task.md` | Non-mutating review |
| 10 | Slice 3 API foundation | completed | `apps/api/src/modules/organizations`, `apps/api/src/modules/projects`, `apps/api/src/modules/project-access` | API type-check and build passed |
| 11 | Slice 4 safe DB verification and seed update | completed | `apps/api/scripts/seed.ts`, safe DB work reported by prior AI chat | Safe DB/API details should be summarized in foundation review |
| 12 | Slice 5 web admin integration | completed | `apps/web/src/features/organizations`, `apps/web/src/features/projects`, web routes/navigation | Web/API type-check and API build passed |
| 13 | Slice 6 mobile session and project switcher | completed | `apps/mobile/src/providers/session-provider.tsx`, `apps/mobile/src/features/projects` | Mobile/shared/API type-check passed |
| 14 | mysql2 migration runner tooling | completed | `apps/api/src/database/migrations`, `apps/api/scripts/migrate.ts`, `apps/api/scripts/migration-status.ts`, `docs/tasks/mysql2-migration-runner-implementation-plan.md` | API type-check/build passed; safety probes passed |
| 15 | Phase 1 remote schema migration | completed | `apps/api/src/database/sql/migrations/000_inherited_foundation_compatibility_tables.sql`, `apps/api/src/database/sql/migrations/001_phase1_identity_project_setup.sql`, `schema_migrations` on `vishwlt9_nirmansite` | `pnpm db:migrate:status`, `pnpm db:migrate`, final status current; seed not run |
| 16 | Remote foundation seed | completed | `apps/api/scripts/seed.ts`, `role`, `permission`, `systemsetting`, `user` on `vishwlt9_nirmansite` | `pnpm db:seed`; non-secret DB summary confirmed 3 roles, 37 role-permission links, 15 settings, 1 active admin |
| 17 | Package identity rename | completed | `package.json`, workspace package manifests, shared constants, imports, docs, `pnpm-lock.yaml` | `pnpm install`, `@nirman-app/*` shared/API/web/mobile checks, `git diff --check` passed |
| 18 | Repository state and Workers contract drafting | completed | `docs/execution/CURRENT_REPOSITORY_STATE.md`, `docs/modules/MODULE_CONTRACT_STANDARD.md`, `docs/modules/construction/workers/CONTRACT.md`, `docs/modules/construction/workers/DECISIONS.md`, `docs/modules/construction/workers/IMPLEMENTATION_PLAN.md` | Type-check/build/migration status recorded; lint/test gaps documented; no Workers implementation started |
| 19 | Role and permission model gate | completed | `docs/modules/foundation/role-permission-model/PLAN.md`, `docs/architecture/auth-rbac.md`, updated Workers role sections | Platform-vs-customer decision approved on 2026-08-10 |
| 20 | RBAC preparation Slices A-C | completed | aligned requirements/docs, `packages/shared/src/constants/permissions.ts`, `apps/api/scripts/seed.ts` | Shared type-check/build and API type-check passed; no seed, migration, or DB mutation |
| 21 | RBAC runtime visibility and role-user seed | completed | API platform-only session boundary, web/mobile permission visibility, guarded mysql2 seed, 11 role logins | Remote seed committed on explicit approval; API/web/mobile checks passed; live login/session verification passed |
| 22 | Platform-provisioned primary Owner onboarding | implementation_complete_migration_applied | shared invitation contracts, migration 003, transactional API invitation flow, Super Admin web form/link handoff, web/mobile activation screens | Migration 003 explicitly applied; status reports 4/4 current; automated end-to-end invitation smoke remains unrecorded |
| 23 | RBAC Slice D/E/F source correction | implementation_complete_seed_pending | platform-prefixed global administration, membership-authoritative web session, profile validation, protected Owner fixes, web/mobile boundary corrections | Shared/API/web/mobile type-checks and API/web builds passed; focused lint/test retain documented baseline failures; no seed or database mutation in this slice |
| 24 | Platform Roles and Permissions restoration | implementation_complete | protected Platform Super Admin role-management compatibility, custom-role permission editor, requirement clarification | Shared/API/web type-checks and focused API/web lint passed; no seed, migration, or database mutation |
| 25 | Custom role lifecycle controls | implementation_complete | custom-role name/description editing, guarded deletion dialog, transactional permission cleanup | API/web type-checks and focused lint passed; no role record was changed during verification |
| 26 | Custom role list actions | implementation_complete | edit/delete icons moved to the Roles list Actions column; system roles remain action-free | Web type-check and focused lint passed; no database mutation |
| 27 | Profile action layout refinement | implementation_complete | balanced Profile cards, consistent section headers, bottom-aligned responsive Save Profile and Change Password actions | Web type-check, focused lint, diff check, and live route HTTP 200 passed |
| 28 | Primary Owner invitation email delivery | implementation_complete_runtime_pending | post-commit SMTP delivery, shared delivery status, HTML/text onboarding email, unchanged manual web/mobile link fallback | Shared/API/web checks and pure fallback/template runtime probes passed; focused Jest remains blocked by the pre-existing Jest runtime mismatch; no DB write or real email was performed |
| 29 | Platform Settings access restoration | completed | added the missing `platform-settings:read` and `platform-settings:update` live grants to the existing Platform Super Admin role | Read-only role-permission query confirmed both grants; API health and web Settings route returned HTTP 200; no seed or migration |
| 30 | Platform Settings save correction | implementation_complete_browser_confirmation_pending | removed the unbound service-method failure, allowed blank optional emails, added save feedback and SMTP field guidance | API/web type-checks, API build, focused lint, validator probe, diff check, and live HTTP checks passed; no setting row was changed during verification |
| 31 | Gmail SMTP delivery diagnosis | code_hardened_external_credential_pending | confirmed Gmail `535 5.7.8`, normalized App Password display spaces, improved configuration/failure guidance | SMTP endpoint was reachable but rejected both raw and normalized saved credentials; static checks and API health passed; no email or DB write |
| 32 | Expo Go invitation email button | implementation_complete_device_confirmation_pending | HTML `Open Mobile App` button plus optional local `EXPO_GO_PROJECT_URL` and installed-app scheme fallback | API/mobile checks, generated HTML/link probes, diff check, and API/web/Metro HTTP 200 passed; no invitation or email was created during verification |
| 33 | Owner activation login prefill and identity reuse | implementation_complete_runtime_pending | optional existing-account acceptance password, automatic second-membership activation, web/mobile Login redirect with invited email | Static and pure service checks passed; no invitation, membership, organization, user, seed, migration, or other DB write during verification |
| 34 | Workers vertical-slice reconciliation and completion | partial_owner_decision | shared/API/web/mobile corrections, API tests, `docs/modules/construction/workers/STATUS.md`, `REVIEW.md` | Shared/API/web/mobile gates and API unit/E2E pass; no DB mutation; deactivation lifecycle decision remains |
| 35 | Mobile customer-product refocus and implementation plan | implementation_complete_plan_review | approved internal Contractor membership decision, real-data permission-aware Expo shell, `mobile-customer-experience-implementation-plan.md` | Mobile type-check and non-mutating source checks passed; no DB operation; device/role matrix pending |
| 36 | Mobile customer foundation parity | implementation_complete_device_verification_pending | mobile Organization Members, subscriptions capacity, project create/edit, Draft Team access, member permissions, and Worker assignment lifecycle | Shared/API/mobile static checks and 57 API tests passed; Expo web export timed out without output; no database write; authenticated physical-device matrix pending |
| 37 | Mobile Localization Foundation contract | contract_approved | `docs/modules/foundation/localization/CONTRACTS.md`, `GLOSSARY.md`, and `docs/tasks/mobile-multilingual-implementation-plan.md` | Documentation/source/font coverage review; no dependency, asset, application, API, schema, seed, or database change |
| 38 | Mobile Localization common/auth/navigation pilot | implementation_complete_native_review_pending | Expo localization/i18next/AsyncStorage runtime, local Manrope/Noto fonts, typed locale resources, formatters, localized API error mapping, Login/activation/navigation/Menu selectors | Locale key/placeholder validator, mobile/shared type-checks, Expo config resolution, scoped literal review, Expo web export, and diff check passed; browser unavailable; physical device and fluent review pending |
| 39 | Mobile Localization Home/dashboard namespace | implementation_complete_native_review_pending | localized welcome/workspace copy, Project context switcher, access/status/scope/count labels, metric cards, empty state, and accessibility labels | Locale parity, mobile/shared type-checks, Expo web export with bundled Noto fonts, scoped literal review, and diff check passed; physical-device layout, screen-reader, and fluent review pending |
| 40 | Mobile Localization Projects namespace | implementation_complete_native_review_pending | localized Project Detail, Add/Edit Project form, validation/recovery copy, enum display mappings, shared modal/card typography, and responsive field/chip wrapping | Six-namespace locale parity, mobile/shared type-checks, Expo web export with eight Noto fonts, scoped literal review, and diff check passed; physical-device layout, screen-reader, and fluent review pending |
| 41 | Mobile Localization current customer surface completion | implementation_complete_native_review_pending | localized Members/invite/access/Project assignments, Team/Assign/permission editor, Workers/Add-Edit-Assign-End, shared sync/progress/form/card/header UI, errors/statuses, and accessibility copy | Nine-namespace locale parity, mobile/shared type-checks, full mobile literal audit, Expo web export with eight Noto fonts, and diff check passed; authenticated device, screen-reader, large-text, and fluent review pending |
| 42 | Organization-owner permanent Worker deletion | implementation_complete_seed_runtime_pending | organization-wide `workers:delete`, dependency-ordered API transaction, Web danger action/confirmation/success state, Workers contract and decision update | Shared/API/web type-checks, 18 API suites with 98 tests, API and isolated web production builds, focused web lint, and diff check passed; no seed, database deletion, or authenticated browser flow was run |
| 43 | Kharchi / Worker Advances API and runtime prerequisites | implementation_complete_runtime_acceptance_pending | direct-paid endpoints, immutable signed adjustments, idempotency fingerprints, transactional audit events, automatic oldest-first Wage allocations, migrations `012`/`013`, and 22 approved grants | Shared/API checks and focused tests passed; approved remote migrations/tables/grants verified; health `200` and unauthenticated route `401`; authenticated role/concurrency pending |
| 44 | Kharchi Mobile integration | implementation_complete_device_acceptance_pending | permission-aware navigation, summary/list/search/filter/export, record-paid flow, immutable detail/adjustment/Wage history, shared list-filter controls, and en/hi/gu | Locale parity, Mobile type-check, Android Expo export, and diff check passed; authenticated physical-device, accessibility, largest-text, timeout, and fluent-language review pending |
| 45 | Site Expenses API foundation | runtime_registered_authenticated_acceptance_pending | approved Direct/Approval contract, shared contracts, guarded roles, migration `018`, transactional API, immutable adjustments/audit, notifications, scoped idempotency, and concurrency guards | Shared/API checks plus 143 tests passed; approved target is 19/19 current, five tables and grants verified; current listener health `200` and unauthenticated Expenses route `401`; authenticated acceptance pending |
| 46 | Site Expenses Mobile integration | implementation_complete_device_acceptance_pending | permission-aware navigation, spend summary, list/search/filter/export, workflow settings, create/draft/edit, detail/actions, immutable adjustments/timeline, error mapping, and en/hi/gu | Locale parity, Mobile type-check, Expo web and Android production exports, and diff check passed; authenticated API/device, accessibility, largest-text, landscape, timeout, and fluent-language acceptance pending |
| 47 | Project Progress API and database | runtime_verified_write_acceptance_pending | contract/plan, shared nine-stage contracts, migration `019`, immutable/idempotent/concurrency-safe API, Audit integration, guarded role sync, summary/history/export/portfolio | Remote 20/20 current, table/grants verified, 27 suites/149 tests and API build passed; health and authenticated read summary `200`; authenticated business-data writes pending |
| 48 | Project Progress Mobile integration | implementation_complete_device_acceptance_pending | permission-aware route/Menu/Home data, overall/stage cards, stage-filtered history, export, update sheet, errors/success, and en/hi/gu | 17-namespace parity, Mobile type-check, Android Expo export, and diff check passed; physical-device/accessibility/large-text/landscape/fluent review pending |
| 49 | Notifications vertical slice | implementation_complete_device_acceptance_pending | formal contract, shared contracts/errors, migration `022`, recipient-safe list/read/summary/device APIs, transactional Expo push outbox with retry, nine customer role grants, localized Mobile inbox/badge/deep links | Remote 23/23 current; schema/grants verified; focused 5/5 and full 31-suite/164-test API passes; shared/API/Mobile checks, 18-namespace locale parity, Android Expo export, and diff check passed; authenticated real-device push/accessibility acceptance pending |
| 50 | Role-specific Dashboards vertical slice | implementation_complete_device_acceptance_pending | shared role/profile/action contract, aggregated permission-aware API, migration `023`, nine operational role grants, single-request Expo integration, layered blueprint background, role command hero/actions, en/hi/gu | Remote 24/24 current; grants/four indexes verified; focused 2/2 API test, API build/type-check, authenticated Owner six-section smoke, Mobile type-check and locale parity passed; Supervisor/Sales and physical-device acceptance pending |

## 4. Verification Commands Recorded

Commands run during this development path include:

```bash
pnpm --filter @nirman-app/shared type-check
pnpm --filter @nirman-app/api type-check
pnpm --filter @nirman-app/api build
pnpm --filter @nirman-app/web type-check
pnpm --filter @nirman-app/mobile type-check
```

Runtime smoke tests depend on a confirmed local or throwaway database and should be summarized in the foundation review.

The mysql2 migration runner adds the intended command flow:

```bash
pnpm db:migrate:status
pnpm db:migrate
pnpm db:seed
```

Do not run these database commands against a remote, shared, staging, or production target without explicit approval. `pnpm db:migrate` also requires confirmation environment variables before mutation.

On 2026-07-31, the user explicitly approved running the Phase 1 migration on `vishwlt9_nirmansite`. The remote database now has these tables:

```text
organizations
organization_members
permission
projects
project_members
refreshtoken
role
schema_migrations
systemsetting
user
```

Applied migration records:

```text
000_inherited_foundation_compatibility_tables.sql
001_phase1_identity_project_setup.sql
```

`pnpm db:seed` was later run after explicit user request. It seeded:

```text
Roles: Member, Super Admin, User Manager
Role-permission links: 37 total
System settings: 15
Admin users: 1 active System Administrator
```

The seed source is `apps/api/scripts/seed.ts`. Password values must be read from the local environment/source by the repository owner and should not be pasted into chat.

On 2026-08-05, repository assessment and first mature business-module contract drafting were completed. `pnpm db:migrate:status` reported the remote development database current with 2 local migrations, 2 applied migrations, 0 pending migrations, and 0 draft migrations. No migration, seed, schema, API, web, or mobile implementation changes were made for Workers.

On 2026-08-10, the product owner approved the platform-vs-customer RBAC decision and preparation Slices A-C. Shared permissions were separated into platform, organization, project, legacy user-management compatibility, and Workers groups. The mysql2 seed now prepares distinct platform and organization role templates and synchronizes system-template defaults so Platform Super Admin has no normal Workers permissions. The seed was not run and no database or migration command was executed. Shared type-check/build and API type-check passed after rebuilding shared before the API check.

Later on 2026-08-10, the product owner explicitly authorized the seed and the web/mobile visibility correction. The configured remote development target `vishwlt9_nirmansite` was current with 3 applied migrations before the run. The guarded mysql2 seed committed successfully, created or rotated 11 role-user logins, prepared two demo organizations/projects for customer-role testing, and left Platform Super Admin with 0 Workers permissions. Live API verification confirmed Platform Super Admin resolves no customer workspace while all 11 generated accounts can log in with their expected role. No migration was executed.

Later on 2026-08-10, migration 003 was explicitly approved and applied to `vishwlt9_nirmansite`; read-only status then reported 4 local, 4 applied, 0 pending, and 0 draft. A subsequent read-only RBAC audit found that operating profiles were metadata-only, global Roles/Settings were not tenant-safe customer surfaces, web used inherited global-role permissions, invalid organization/profile combinations existed, Owner counting treated every system role as an Owner, and assigned-project users could create unassigned workers. Slice D/E/F source corrections now address those foundation boundaries. The updated seed was not run and no database row was changed during that correction slice.

Static verification for the Slice D/E/F correction passed shared/API/web/mobile type-checks plus API and web production builds. Focused API semantic lint passed when the repository's existing Prettier mismatch was disabled. Focused web lint remained blocked only by the known synchronous form-hydration effects, and the focused onboarding test remained blocked before test execution by the existing Jest 30/ts-jest `clearMocksOnScope` incompatibility. `git diff --check` passed within the tracked portion of this mostly untracked checkout.

The Platform Super Admin Roles & Permissions surface was subsequently restored as a protected platform capability. The web navigation now consistently exposes the surface to Platform Super Admin, custom roles can be created and assigned permission sets, system role templates remain read-only, and the API enforces the platform-role boundary even for pre-seed compatibility sessions. Customer `roles:*` permissions do not authorize the global platform role manager.

Custom-role lifecycle management now includes editing role details and deleting unassigned custom roles from the same permission screen. The API continues to reject system-role changes and assigned-role deletion, while repository deletion removes dependent permission rows and the role in one mysql2 transaction.

## 5. Open Decisions

- Authentication beyond the approved email/password-first Owner activation: whether and when to add OTP.
- Mobile refresh strategy.
- Cross-organization Contractor project sharing remains deferred; the MVP internal `Contractor Member` model is resolved.
- Organization-scoped custom-role persistence and migration design.
- Permission override scope for member/project grants and denials.
- Active organisation/project persistence strategy.
- Support/admin impersonation scope.
- Session expiry and permission refresh interval.
- Outbound SMTP provider credentials and delivery monitoring remain environment/operations configuration; secure manual activation-link handoff remains the fallback.
- Target MySQL/MariaDB version and whether DB-level `CHECK` constraints should be reintroduced.
- Whether `fileasset` or a future `file_assets` table is active before adding logo/cover image foreign keys.
- Workers: when deactivating a worker with active assignments, choose block, atomic end-after-confirmation, or preserve active assignments while roster filtering follows worker status.
- Workers: which Expo-compatible offline database/sync library should be used.
- RBAC: decide whether support impersonation/access is included in MVP or deferred.
- RBAC: decide whether mobile blocks platform-only users after login or shows a no-field-workspace state.
- RBAC: review and explicitly run the updated platform-prefixed permission seed, then execute the runtime role matrix.

## 6. Next Task Template

For the next AI chat:

```text
Read MVP_REQUIREMENTS.md, docs/decisions/005-internal-contractor-membership.md, docs/tasks/mobile-customer-experience-implementation-plan.md, docs/modules/MODULE_INDEX.md, docs/tasks/PROGRESS_LEDGER.md, and docs/tasks/current-task.md.

Review and approve Mobile Slice 1: multi-organization switching. Implement it without starting later operational modules, then update the plan evidence and request approval for Slice 2 Members/Invitations.

Do not begin Attendance, Wages, Kharchi, Materials, Expenses, Progress, Gallery, Sales, Audit, Offline Sync, or another operational module during these foundation slices.
```

On 2026-08-10, primary Owner onboarding gained additive post-commit SMTP delivery. The email contains the organization and Owner access context, login email, expiry, and both existing activation links, but no password. Missing SMTP configuration returns `MANUAL`; SMTP failure returns `EMAIL_FAILED`; neither condition rolls back organization creation or removes the manual links. Shared/API/web static checks and pure runtime fallback/template probes passed. No migration, seed, organization creation, database write, or real outbound email was run.

Later on 2026-08-10, the user explicitly requested Platform Settings access. A read-only audit showed that the live `Platform Super Admin` role had no `platform-settings` grants even though the checked-in seed already defines them. Exactly two permission rows, `platform-settings:read` and `platform-settings:update`, were inserted into `vishwlt9_nirmansite`. No seed, migration, credential rotation, or organization data mutation was performed. A post-write query confirmed both grants.

The Settings save path was then corrected after its mutation callback was found to depend on an unbound `this`, preventing requests from being issued. Optional blank email fields now pass validation, the UI reports success or the API error, and SMTP examples are shown inline. Static checks and pure validation passed; no setting row was changed during verification.

Live email delivery was subsequently diagnosed against the configured Gmail SMTP endpoint. Gmail was reachable but rejected authentication with `535 5.7.8`; the saved password had the visual shape of a grouped Google App Password, but the same credential was also rejected after removing display spaces. NirmanSite now removes those spaces automatically, while the external account owner must generate a new App Password for the exact SMTP Username. No message was sent and no credential or setting row was changed during diagnosis.

The onboarding email's mobile target is now rendered as an `Open Mobile App` button. In the current local environment it uses Expo Go's `exp://192.168.1.33:8081/--/activate?token=...` route; without `EXPO_GO_PROJECT_URL`, the existing `nirmansite://` installed-app scheme remains active. Metro, API, and web were all reachable after the API restart, while a physical-device button tap remains the final confirmation.

Primary Owner activation now sends both successful client paths directly to Login with the invited email pre-filled. New or inactive identities must create a password; an existing active identity accepts the linked additional organization membership using the invitation token without re-entering or changing its password, then signs in with that existing password. Acceptance remains token-bound, expiring, single-use, and non-authenticating. No database write was performed while implementing or statically verifying this behavior.

On 2026-08-12, the product owner resolved the Contractor model: Builders invite hired individuals as internal `Contractor Member` memberships, while independently subscribed Contractors own isolated `CONTRACTOR` organizations. The Expo customer shell was then cleaned of demo routes, fake data, and dead navigation. Home and Project now use only live session/project data and permission-backed routes. The mobile implementation plan sequences organization switching, member invitations, project assignments, Workers completion, role-aware Home, and device/authorization verification. No database operation was performed.

The supporting web workspace now treats INR as fixed MVP configuration instead of an arbitrary onboarding input. Project list/create/detail use the authenticated active organization: single-active-membership users see organization context without a page filter, while users with multiple ACTIVE memberships in ACTIVE organizations switch once in the shared header. Organization create/update DTOs reject non-INR currency values. Web/API type-checks, the web production build, 11 focused organization tests, DTO validation probes, and `git diff --check` passed. No database, seed, or migration command was run.

## 2026-08-14: Project Team, Project Grants, And Subscription Capacity

The Project Team and subscription contracts were approved and implemented. Project assignments now support `ROLE_DEFAULT` compatibility or `CUSTOM` permission grants intersected with the Organization Role ceiling. Web has a dedicated Project Team route with Members/Workers tabs, Project-specific permission editors, responsibility/date/status editing, and shared ellipsis row actions. Member-to-many-Projects and Project-to-many-Members transaction boundaries both exist.

Builder Supervisor is now a distinct Builder-side oversight role. Contractor Member is an operational assigned-Project ceiling and can be narrowed by the Project permission matrix. Broad Organization invitation authority was not added to Contractor Member.

Subscription persistence and Platform administration now support configurable active-Project, active-Member, and storage capacity without hard-coded commercial plan values. Active Project and invitation-activation capacity checks lock the Organization subscription row transactionally. Workers remain unlimited, and storage enforcement remains deferred to Files And Media accounting.

Migration `004_project_permissions_subscriptions.sql` was applied to `vishwlt9_nirmansite`; read-only status reported 5 local, 5 applied, 0 pending, 0 draft, and current. The guarded mysql2 seed completed. Live verification confirmed the new tables, nine existing Project assignments preserved as `ROLE_DEFAULT`, the Builder Supervisor permission foundation, the operational Contractor Member ceiling, and zero seeded commercial plans.

Static/runtime verification: shared build, API/web/mobile type-checks, 50 API tests, web production build, `git diff --check`, live API/database health, and route registration passed. The in-app browser had no available backend, so authenticated visual verification did not run. Physical-device verification and disposable-data authorization matrices remain outstanding.

## 2026-08-17: Project Team Assignment UX And Date Enforcement

The Project Team Members flow now distinguishes searching the assigned roster from finding
an Organization Member to assign. The assignment modal has a searchable member picker,
available/already-assigned context, visible Start/End Date labels, clearer access-mode and
preset wording, human-readable permission actions, a selected-access summary, and a Draft
Project warning. Assignment configuration is progressively disclosed after selecting a
member.

Optional assignment start/end dates now participate in Project discovery and authorization;
an `ACTIVE` assignment outside its date window no longer grants access. Site Supervisor was
narrowed from the Contractor Member ceiling to Project/Team read plus Worker
read/create/update/Project-allocation. The guarded seed synchronized this role on the
configured remote development database, and a read-only query confirmed the intended nine
permissions.

Verification passed: API/web type-checks, 12 API suites with 54 tests, API and web production
builds, migration status current, `git diff --check`, and restarted API health with database
status `ok`. The in-app browser again reported no available browser backend, so an authenticated
visual click-through remains outstanding.

## 2026-08-17: Worker Row Assignment And Base Daily Rate

The Project Team Workers tab now lists active Organization workers rather than only the
current Project roster. Assigned rows show assignment state and retain edit/end operations
in the ellipsis menu; unassigned rows expose a visible `Assign` CTA. The Assign dialog asks
only for the start date. Assignment editing asks only for start/end dates. Search covers the
Organization worker list, and scheduled future assignments remain classified as Assigned in
this management view.

Migration `005_worker_base_daily_rate.sql` added the optional Worker-master
`base_daily_rate` and backfilled it from each Worker's latest available assignment rate.
Worker create/edit owns trade and base daily rate. New Project assignments copy that rate into
the existing assignment snapshot while storing no duplicate role label. Historical assignment
role/rate values remain intact for future Attendance/Wages compatibility.

Verification passed: shared build; API/web/mobile type-checks; 12 API suites with 57 tests;
API and web production builds; migration status current with 6 local and 6 applied migrations;
live read-only rate-backfill verification; restarted API/database health; and `git diff --check`.
The in-app browser reported no available backend, so authenticated visual verification did not
run.

## 2026-08-26: Sales CRM API Vertical Slice

The Sales API contract and source implementation now cover Project-scoped Leads, own/team/all
visibility, assignment history, timeline activities, follow-ups, site visits, unit inventory,
transactional unit blocking, and idempotent booking conversion/cancellation. Shared canonical
statuses, permission keys, stable errors, and Project-delegatable Sales permissions were added.

Migration `011_sales_crm.sql` defines the eight Sales tables, composite Organization/Project
foreign keys, one-active-block and one-confirmed-booking constraints, booking idempotency, and
default customer-role grants while excluding platform roles. Mobile/Web Sales clients,
notifications, background expiry jobs, commission calculation, and Audit integration remain
outside this API slice.

Verification recorded for the source slice: shared build, API type-check, focused Sales lint,
seven focused Sales service tests, all 19 API suites/105 tests, and API production build passed.
The source slice initially ran no database or runtime verification. On 2026-08-27, migrations
`010` and `011` and the updated guarded seed were explicitly approved and completed against
`md-in-30.webhostbox.net/vishwlt9_nirmansite`; see the runtime addendum below.

## 2026-08-27: Worker Permission And Sales Server Rollout

Read-only status first confirmed the configured remote target, 12 local/10 applied migrations,
and exactly `010` and `011` pending. A read-only preflight confirmed MySQL `5.7.23-23`, zero
Sales tables, both required Project indexes, and zero existing Sales grants for the checked
roles. After explicit approval, the guarded migration runner applied both files in order and
reported 12 applied, zero pending, zero drafts, and current state. The updated seed committed
with `SEED_ROLE_USERS=false`, so no demo-user generation or password-output flow ran.

Post-write verification confirmed all eight Sales tables, two stored generated columns, three
required unique workflow indexes, zero duplicate role permissions, 15 Sales grants each for
Organization Owner/Builder Admin/Independent Contractor Owner, nine for Sales User, and zero
for Site Supervisor/Platform Super Admin. Migration `010` left exactly one `workers:delete`
grant on each owner/admin role. All Sales tables contain zero rows. API health reports
app/database `ok`; the registered Sales Leads route returns `401` without authentication.
Authenticated Sales behavior, live block concurrency, browser, and device acceptance were not
run.

## 2026-08-31: Sales Unit Interest, Inventory Import, And Pricing

Sales inventory now supports non-exclusive interest from multiple Leads, approval-based
exclusive holds, manual Unit entry, and an all-or-nothing CSV import of 1-500 Units. The mobile
import flow validates locally, previews server conflicts, and confirms one transactional insert.
Pricing is explicit: `TOTAL` accepts Rupee/Lakh/Crore input normalized to rupees, while
`PER_SQFT` requires positive area and rate and derives the stored total server-side. Mobile
pricing and status categories use wrapped chips and existing NirmanSite operational primitives.

After separate exact-target approvals, migrations `014_sales_unit_interest_hold_workflow.sql`
and `015_sales_unit_pricing.sql` were applied to
`md-in-30.webhostbox.net/vishwlt9_nirmansite`. The guarded runner reports 16 local and 16
applied migrations with zero pending/draft files. Read-only verification confirmed
`price_basis VARCHAR(20) NOT NULL DEFAULT 'TOTAL'`, nullable `rate_per_sqft DECIMAL(15,2)`,
and one pre-existing Unit retained with the `TOTAL` default; migration `015` inserted no
business records.

Verification passed: shared build, API/mobile type-checks, focused Sales lint, en/hi/gu locale
parity, all 21 API suites/120 tests, Android Expo export, and `git diff --check`. Authenticated
role/workflow, live hold concurrency, and physical-device acceptance remain pending.

## 2026-09-01: Kharchi Runtime And Mobile Delivery Reconciliation

The Kharchi documentation was reconciled with the delivered API, approved remote rollout, and
Mobile source. The direct-paid meaning remains authoritative: `Date paid` is when money was
actually given or transferred, while the server timestamp records when the entry was added to
NirmanSite. There is no request, approval, later mark-paid, edit, cancel, or delete workflow;
corrections remain immutable adjustments.

Separately approved migrations `012_audit_foundation.sql` and `013_kharchi.sql` were applied to
`md-in-30.webhostbox.net / vishwlt9_nirmansite`; four expected Kharchi/Audit tables, both migration
records, and 22 approved role grants were verified. API/database health returned `200`/`ok`, and
the rebuilt unauthenticated Kharchi route returned `401 AUTH_SESSION_REQUIRED` rather than `404`.
This proves runtime registration, not authenticated role or concurrency acceptance.

Mobile now includes permission-aware navigation, Project summary, paginated list, search and
shared filters, CSV integration, record-paid form, immutable detail/adjustment history, and Wage
allocation history. The shared listing-filter pattern provides an active count, labelled sheet
groups, 48dp radio rows, Apply/Clear actions, and removable applied chips; Clear all immediately
clears committed filters and listing chips. English, Hindi, and Gujarati locale parity, Mobile
type-check, Android Expo export, and diff checks passed. Authenticated workflows, live concurrency,
physical-device/accessibility/large-text/timeout testing, and fluent Hindi/Gujarati review remain
pending. See `docs/modules/construction/kharchi/STATUS.md` for the reconciled evidence matrix.

## 2026-09-02: Site Expenses API Foundation

The Product Owner approved all Site Expenses contract decisions. The API-first implementation adds
Direct and Approval-required Project workflow settings; draft, pending, approved, rejected, and
cancelled states; fixed categories/payment methods; Project list, summary, detail, CSV, review, and
immutable signed-correction flows. Approved originals plus adjustments are the only recognised cost.

Shared permissions and guarded customer-role defaults are present. Platform Super Admin receives no
customer Expense permission. The additive `018_site_expenses.sql` draft creates workflow settings and
immutable setting history, expenses, domain events, and adjustments. Project Access, reusable Audit,
and Notifications are integrated transactionally with scoped retry fingerprints and row locking.

Shared/API compilation, focused lint, 10 focused tests, the full 25-suite API run, production build,
and whitespace validation passed. After exact-target approval, migration `018` and the guarded full
seed ran with `SEED_ROLE_USERS=false`. The remote ledger is 19/19 current; five tables, expected
role grants, zero permission duplicates, and zero Expense business rows were verified. Health is
`200`/`ok`. The API listener was restarted from the current `dist` build and the unauthenticated
Expenses route now returns `401 AUTH_SESSION_REQUIRED`, confirming route registration. Authenticated
workflow, Web, offline, browser, and Mobile physical-device acceptance remain pending.

## 2026-09-02: Site Expenses Mobile Integration

The approved API contract is now consumed by an Expo vertical slice. The Mobile app adds Expenses to
permission-aware navigation and exposes a compact Project-scoped spend summary, paginated operational
cards, search, status/category/payment/date filters, refresh, and CSV export. Authorized users can
configure Direct or Approval-required workflow, record or draft an expense, edit server-eligible
records, and execute only server-derived submit/approve/reject/cancel/adjust actions. Detail preserves
the original amount while presenting recognized spend, immutable signed adjustments, and the event
timeline.

The UI reuses established NirmanSite primitives and semantic tokens, keeps one primary action per
surface, provides inline field errors and explicit destructive confirmations, and ships complete
English/Hindi/Gujarati navigation, screen, accessibility, and API-error copy. Mobile locale parity,
TypeScript, Expo web (1,075 modules) and Android (1,444 modules) production exports, and whitespace
validation pass. Authenticated
runtime, physical-device, screen-reader, largest-text, landscape, slow-network, and fluent-language
acceptance remain separate pending gates.

## 2026-09-02: Project Progress Vertical Slice

The Product Owner authorized the Project Progress contract, database rollout, seed synchronization,
API integration, and Mobile UI in one delivery. The module uses the MVP's nine fixed stages and
retains every update. Overall completion is the equal-weight mean of the latest stage values, with
untouched stages at zero. A reduction is a new correction requiring a note; no history is edited or
deleted.

Migration `019` is applied to the configured remote database and the ledger is 20/20 current. The
new table and intended Progress grants for eight customer role templates are verified. Platform
Super Admin and Sales User remain outside this customer operational module. The current built API
listener reports database health `ok`; unauthenticated access returns `401 AUTH_SESSION_REQUIRED`,
and a read-only authenticated Project summary returns `200` with all nine stages.

The Expo screen reuses NirmanSite semantic tokens and operational primitives for the overall card,
horizontal stage progress, immutable history, export, and an update bottom sheet with quick presets,
exact percentage, date, notes, inline errors, concurrency recovery, and explicit success. English,
Hindi, and Gujarati navigation/screen/accessibility/error copy is complete. Shared/API/Mobile static
checks, 27 API suites with 149 tests, API build, locale parity across 17 namespaces, Android export,
and whitespace checks pass. Authenticated write testing against deliberate business fixtures and
physical-device/accessibility/large-text/landscape/fluent-language acceptance remain pending.

## 2026-09-03: Site Gallery / Project Diary Vertical Slice

The full Gallery contract, Files/Media ownership subset, shared vocabulary/RBAC, migration 020,
NestJS API, guarded role seed, and multilingual Expo capture/queue/diary/review experience are
implemented. The remote target is 21/21 current; both new tables and the intended eight customer
role grants are verified, with no demo users or Gallery business records created.

Shared/API/Mobile type checks, API build, 28 suites/153 tests, 18-namespace locale parity, Android
Expo export, API/database health, and the unauthenticated Gallery guard pass. Real S3 upload/media
streaming, authenticated workflow, and physical-device/accessibility/fluent-language acceptance
remain pending because the current environment does not contain a storage bucket or credentials.

## 2026-09-03: Site Visits Completion

An audit confirmed that Site Visits already existed inside the Sales CRM contract, migration `011`,
NestJS API, seed, and Expo Sales screen. The existing slice was completed rather than duplicated:
Project lists now filter by status, salesperson, and schedule range; own-salesperson scoping cannot be
overridden; rescheduling requires a new time; terminal outcomes are immutable; and the mobile workflow
captures all statuses, attendee count, feedback, objections, and next action in English, Hindi, and Gujarati.

The configured remote target remains 21/21 current with no pending/draft migrations. The guarded role
seed was synchronized, an unintended Viewer `site-visits:manage` grant was removed, and read-only
verification confirmed all 15 table columns, the four intended operational role grants, and zero Site
Visit business rows. Shared/API checks, focused lint, 28 API suites / 156 tests, Android export,
locale parity, and whitespace checks pass. Mobile type-check passed for this slice, then a final rerun
reported only two concurrently introduced Expenses style errors outside Site Visits. Authenticated write
and physical-device/accessibility acceptance remain pending.

## 2026-09-03: Unit Inventory And Unit Blocking Reconciliation

The requested Unit Inventory and Unit Blocking module was found already implemented within the
Sales CRM vertical slice and was completed in place rather than recreated. Current source includes
Project-scoped manual and CSV inventory, total/per-square-foot pricing, non-exclusive Lead interest,
approval-based exclusive holds, direct manager blocks, release/expiry reconciliation, booking
conversion, transactional row locking, unique active-workflow indexes, audit/timeline evidence,
permission-aware Expo workflows, and English/Hindi/Gujarati copy.

The approved remote target remained 21/21 current after the guarded migration runner. The guarded
seed synchronized successfully with demo-user generation disabled. A repeatable read-only verifier
now confirms the four Unit inventory/hold tables, pricing columns, all four unique workflow indexes,
admin and Sales User inventory grants, removal of `inventory:block` from Sales User, and exclusion
of Platform Super Admin. The target contains one existing Unit and zero active blocks; verification
did not mutate business data. Focused Sales tests (16/16) and shared/API/Mobile type checks pass.
Authenticated approval/release/booking workflows, a live concurrent-hold race, and physical-device,
screen-reader, large-text, landscape, dark-mode, and fluent-language acceptance remain pending.

## 2026-09-03: Lead Conversion And Booking Linkage Completion

The requested Lead conversion/booking module was found inside the Sales CRM vertical slice and was
completed in place. The API now exposes filtered booking lists and visible booking detail, derives
customer and Lead-source snapshots from locked server records, fingerprints logical booking requests,
returns the existing row after identical concurrent retries, and records confirmation/cancellation in
immutable `audit_events` within the same transaction as Lead, Unit, block, interest, and Booking state.

Migration `021_sales_booking_linkage.sql` was the only pending migration and was applied to the
approved remote target. The guarded seed synchronized with demo-user generation disabled. The target
is 22/22 current; read-only verification confirms all six linkage/restoration columns, all three
booking integrity/query indexes, `audit_events`, the intended Sales User booking grants, no Platform
Super Admin booking grants, and zero existing Booking rows. Mobile now keeps one idempotency key across
uncertain retries and adds a multilingual Booking detail/cancellation experience using existing
NirmanSite operational primitives. API/Mobile type checks, locale parity, and focused Sales tests pass.
Authenticated live booking/idempotency/cancellation workflows and physical-device, screen-reader,
large-text, landscape, dark-mode, and fluent-language acceptance remain pending.
