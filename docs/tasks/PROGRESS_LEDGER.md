# NirmanSite Progress Ledger

## 1. Purpose

This ledger records the path followed to build NirmanSite.

AI agents must update this file after every approved contract, implementation slice, verification pass, or blocker.

## 2. Current Gate

Current gate:

```text
Primary Owner activation now distinguishes new identities from existing active identities, redirects both successful paths to Login with email pre-filled, and preserves the existing invitation/email fallback behavior. Live acceptance and the independent RBAC runtime matrix remain approval-gated.
```

Next recommended task:

```text
Approve disposable onboarding writes and verify one new-email plus one same-email second-organization activation end to end on web and Expo Go; then complete the independent RBAC runtime role matrix.
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
- External Contractor collaboration model.
- Organization-scoped custom-role persistence and migration design.
- Permission override scope for member/project grants and denials.
- Active organisation/project persistence strategy.
- Support/admin impersonation scope.
- Session expiry and permission refresh interval.
- Outbound SMTP provider credentials and delivery monitoring remain environment/operations configuration; secure manual activation-link handoff remains the fallback.
- Target MySQL/MariaDB version and whether DB-level `CHECK` constraints should be reintroduced.
- Whether `fileasset` or a future `file_assets` table is active before adding logo/cover image foreign keys.
- Workers: whether worker mobile number is unique per organization or warning-only.
- Workers: whether trade is free text for MVP or a controlled organization list.
- Workers: whether worker import is included in the first Workers module.
- Workers: whether Contractor-created workers ever require Builder approval under configured operating profiles.
- Workers: which Expo-compatible offline database/sync library should be used.
- RBAC: decide whether support impersonation/access is included in MVP or deferred.
- RBAC: decide whether mobile blocks platform-only users after login or shows a no-field-workspace state.
- RBAC: review and explicitly run the updated platform-prefixed permission seed, then execute the runtime role matrix.

## 6. Next Task Template

For the next AI chat:

```text
Read docs/ai-development/AI_DEVELOPMENT_PIPELINE.md, docs/modules/MODULE_INDEX.md, docs/tasks/PROGRESS_LEDGER.md, and docs/tasks/current-task.md.

Review Slice D/E/F in docs/modules/foundation/role-permission-model/PLAN.md and the source split documented in docs/architecture/auth-rbac.md.

Do not start another operational module. Obtain explicit approval for disposable onboarding writes, then verify both a new-email Owner activation and a same-email second-organization activation on web and Expo Go. Afterward verify the complete platform/customer role matrix before planning general member invitations and organization-scoped custom roles.
```

On 2026-08-10, primary Owner onboarding gained additive post-commit SMTP delivery. The email contains the organization and Owner access context, login email, expiry, and both existing activation links, but no password. Missing SMTP configuration returns `MANUAL`; SMTP failure returns `EMAIL_FAILED`; neither condition rolls back organization creation or removes the manual links. Shared/API/web static checks and pure runtime fallback/template probes passed. No migration, seed, organization creation, database write, or real outbound email was run.

Later on 2026-08-10, the user explicitly requested Platform Settings access. A read-only audit showed that the live `Platform Super Admin` role had no `platform-settings` grants even though the checked-in seed already defines them. Exactly two permission rows, `platform-settings:read` and `platform-settings:update`, were inserted into `vishwlt9_nirmansite`. No seed, migration, credential rotation, or organization data mutation was performed. A post-write query confirmed both grants.

The Settings save path was then corrected after its mutation callback was found to depend on an unbound `this`, preventing requests from being issued. Optional blank email fields now pass validation, the UI reports success or the API error, and SMTP examples are shown inline. Static checks and pure validation passed; no setting row was changed during verification.

Live email delivery was subsequently diagnosed against the configured Gmail SMTP endpoint. Gmail was reachable but rejected authentication with `535 5.7.8`; the saved password had the visual shape of a grouped Google App Password, but the same credential was also rejected after removing display spaces. NirmanSite now removes those spaces automatically, while the external account owner must generate a new App Password for the exact SMTP Username. No message was sent and no credential or setting row was changed during diagnosis.

The onboarding email's mobile target is now rendered as an `Open Mobile App` button. In the current local environment it uses Expo Go's `exp://192.168.1.33:8081/--/activate?token=...` route; without `EXPO_GO_PROJECT_URL`, the existing `nirmansite://` installed-app scheme remains active. Metro, API, and web were all reachable after the API restart, while a physical-device button tap remains the final confirmation.

Primary Owner activation now sends both successful client paths directly to Login with the invited email pre-filled. New or inactive identities must create a password; an existing active identity accepts the linked additional organization membership using the invitation token without re-entering or changing its password, then signs in with that existing password. Acceptance remains token-bound, expiring, single-use, and non-authenticating. No database write was performed while implementing or statically verifying this behavior.
