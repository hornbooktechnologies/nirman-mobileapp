# NirmanSite AI-Driven Implementation Audit

> Audit date: 2026-08-11  
> Repository: `D:\NIRMANSITE\nirman-mobileapp`  
> Audited revision: `a9291269e5d5eb585768ea084fc35d895dc94725` (`main`)  
> Audit mode: read-only repository analysis; this report is the only intended file change  
> Live database mutation, remote migration/seed, SMTP delivery, browser interaction, and physical-device testing: not performed

## 1. Executive Summary

NirmanSite has a real and coherent foundation, but it is **not yet safe for a fresh AI agent to continue autonomous business-module implementation without a bounded reconciliation and verification gate**.

The repository contains unusually strong requirements, architecture guidance, module-contract standards, approval gates, and implementation evidence. The active implementation is a pnpm/Turbo monorepo with a NestJS/mysql2 API, Next.js web application, Expo/React Native mobile application, and a shared contract/theme package. Authentication, organization onboarding, organization and project access, platform administration, and a substantial Workers vertical slice exist in source.

The blocking issue is not a lack of documentation. It is that several documents which look authoritative describe an older repository state:

- the Identity and Project contracts still label themselves draft-only and say their implementations do not exist;
- the Workers contract and plan say implementation has not started, although migration, shared types, API, web, and mobile source exist;
- `docs/execution/CURRENT_REPOSITORY_STATE.md` says Workers is missing;
- the task ledger and module index contain newer evidence, but also retain contradictory open decisions and stale paths;
- the newer mature contract standard and the older contract template do not have the same depth or naming convention.

This creates a high probability that a fresh AI agent will either repeat completed work, treat incomplete code as verified, follow an obsolete gate, or choose the wrong source of truth.

### Verdict

**YES, AFTER SPECIFIC FIXES.**

The repository is ready for AI-driven **contract reconciliation, test repair, and foundation verification now**. It is not ready for the next operational module implementation until:

1. current-state documents and module statuses are reconciled with source;
2. the Jest/ts-jest mismatch is repaired and authorization/onboarding/Workers tests execute;
3. the approved safe database target is re-confirmed and the remaining role/scope/activation runtime matrix is recorded;
4. general member invitation and organization-scoped role behavior are contracted;
5. Audit, Notifications, Files/Media, and Offline foundations are sequenced before the modules that depend on them.

### Five most important findings

1. **Documentation handoff is materially stale.** The freshest sources (`docs/tasks/current-task.md`, `docs/tasks/PROGRESS_LEDGER.md`, `docs/modules/MODULE_INDEX.md`, and current code) conflict with contracts and the repository-state snapshot that still claim implemented foundations and Workers do not exist.
2. **Workers is partial, not verified.** All principal layers exist, but audit persistence is a no-op, attendance-aware rate enforcement is a stub, roster lifecycle filtering has a contract gap, native offline detection/cache is not real, and there are no Workers tests.
3. **RBAC is enforceable but not the final customer role model.** Platform access and customer membership/project access are separated, but organization membership uses global role records; tenant-scoped custom roles, per-member overrides, and general member invitations are absent.
4. **Quality gates are not green.** All package type checks and API/web production builds pass, but API tests run zero assertions due a Jest 30/ts-jest 29 incompatibility; API and web lint also fail. There is no CI definition and no web/mobile test suite.
5. **Most MVP business domains are requirements-only.** Attendance, Wages, Kharchi, Materials, Expenses, Progress, Gallery, the sales pipeline, unit inventory, booking, audit, notifications, reporting, subscriptions, and offline sync have no active end-to-end implementation.

## 2. Audit Method, Evidence Rules, and Status Vocabulary

### Method

The audit inspected:

- all repository Markdown outside dependencies;
- root/workspace/package manifests;
- active SQL migrations and database tooling;
- shared constants, types, schemas, and theme exports;
- API bootstrap, modules, controllers, services, repositories, guards, filters, seed, and tests;
- web routes, providers, features, API services, and shared UI primitives;
- mobile routes, providers, secure storage, API client, features, and Expo configuration;
- Git status and current revision;
- current static verification commands.

Broad documentation was treated as desired behavior only. A capability is marked Implemented only when executable source exists in the active application path. Archived Prisma content, static dashboard mock data, placeholder navigation, candidate file paths, and requirements prose are not implementation evidence.

### Classification

| Status | Meaning in this audit |
| --- | --- |
| Implemented | Executable source exists across the required layers and no material missing layer was found for the stated scope. This does not imply live production verification. |
| Partial | Useful executable source exists, but a required layer, workflow, safety property, test, or handoff artifact is missing. |
| Documented Only | Requirements/contract/plan exists, but no active implementation was found. |
| Not Implemented | The expected capability is absent from active source and lacks a sufficiently approved module contract. |
| Deferred | The repository explicitly excludes or postpones the capability. |
| Unresolved | A product or architecture choice remains open and materially changes the implementation. |

### Verification completed during this audit

| Check | Result |
| --- | --- |
| `pnpm --filter @nirman-app/shared type-check` | Passed |
| `pnpm --filter @nirman-app/api type-check` | Passed |
| `pnpm --filter @nirman-app/web type-check` | Passed |
| `pnpm --filter @nirman-app/mobile type-check` | Passed |
| `pnpm --filter @nirman-app/shared build` | Passed |
| `pnpm --filter @nirman-app/api build` | Passed |
| `pnpm --filter @nirman-app/web build` | Passed; Next generated 18 routes |
| `pnpm --filter @nirman-app/api test -- --runInBand` | Failed before executing tests: `this._moduleMocker.clearMocksOnScope is not a function` |
| `pnpm --filter @nirman-app/api test:e2e -- --runInBand` | Failed before executing tests with the same Jest runtime error |
| `pnpm --filter @nirman-app/api lint` | Failed: 1,118 findings, 1,115 auto-fixable; dominated by repository formatting rules |
| `pnpm --filter @nirman-app/web lint` | Failed: 10 `react-hooks/set-state-in-effect` errors and one image warning |

No conclusion in this report depends on an unapproved database connection. Runtime claims recorded by older task documents are identified as historical claims, not re-verified current facts.

## 3. Repository and Architecture Inventory

### Monorepo shape

| Area | Active path | Evidence and assessment |
| --- | --- | --- |
| Workspace orchestration | `package.json`, `pnpm-workspace.yaml`, `turbo.json` | pnpm 11/Turbo workspace over `apps/*` and `packages/*`; root `dev` builds shared then invokes Turbo. |
| API | `apps/api` | NestJS 11, TypeScript, mysql2/promise, JWT/Passport, class-validator, AWS S3 client. Active database ownership is here. |
| Web | `apps/web` | Next.js 16/React 19; administration and back-office surfaces. |
| Mobile | `apps/mobile` | Expo 54/React Native 0.81 with Expo Router and SecureStore; field-facing client. |
| Shared | `packages/shared` | Platform-neutral enums, permissions, error-code catalog, types, and design tokens. No UI components. |
| Database archive | `packages/database` | Prisma schema and history explicitly archived; not an active data-access package. |
| Dedicated UI package | absent | Web uses `apps/web/src/components/ui`; mobile uses `apps/mobile/src/components/ui`; this is appropriate because DOM and native components are not shared. |
| CI/deployment | absent | No `.github/workflows`, Docker, Render, or Vercel configuration was found. |

### Root command caveat

`pnpm dev` starts packages that define `dev`; it is not the clearest all-clients handoff. Expo has explicit root commands `pnpm mobile:lan` and `pnpm mobile:tunnel`, and can also be started with `pnpm --filter @nirman-app/mobile start`. A fresh agent should not assume one terminal starts and verifies API, web, and physical-device mobile together.

### Active API composition

`apps/api/src/app.module.ts` wires Auth, Users, Roles, Settings, Upload, Email, Organizations, Project Access, Projects, and Workers. `apps/api/src/main.ts` applies:

- `/api/v1` prefix;
- a global JWT guard with explicit public-route metadata;
- validation with whitelist, forbidden non-whitelisted properties, and transformation;
- a global exception filter;
- cookie parsing and CORS configuration.

The API is repository-oriented and parameterized through `apps/api/src/database/database.service.ts`. Transaction support is present. Migrations are owned by `apps/api/src/database/sql/migrations`, not Prisma.

## 4. Documentation Inventory and Authority Audit

### How a fresh agent is currently told what to read

- `AI_PROJECT_START_PROMPT.md` is the strongest root handoff and gives a 19-item reading sequence, source checks, approval gates, and vertical-slice rules.
- `CODEX.md` points to the project prompt and requirements, while `CLAUDE.md` contains a shorter older list.
- `docs/ai-development/AI_DEVELOPMENT_PIPELINE.md` independently requires the module index and progress ledger.
- There is no `AGENTS.md` or machine-enforced repository entrypoint. Therefore the reading sequence depends on the agent noticing and obeying tool-specific files.

A fresh agent can discover the process, but may miss newer workflow documents because the root mandatory list does not explicitly include all of `docs/ai-development`, `docs/modules/MODULE_INDEX.md`, `docs/modules/MODULE_CONTRACT_STANDARD.md`, and `docs/tasks/PROGRESS_LEDGER.md` as a single canonical bootstrap set.

### Product requirements and phase documents

| Path | Purpose | Currentness / conflict |
| --- | --- | --- |
| `MVP_REQUIREMENTS.md` | Authoritative product and module requirements; roles, workflows, API/UI/offline/audit/test expectations, definition of done, and open decisions. | Current product source, updated 2026-08-10. Its error envelope and module DoD are not met by current source. Section 37 makes Workers incomplete because audit, offline behavior, tests, and documentation handoff are not complete. |
| `docs/phases/MVP_PHASES.md` | Phase sequencing and delivery model. | Useful, but marked draft and older than current implementation. Treat sequencing as guidance unless restated by current gate. |
| `PLANNING.md` | Early high-level planning and approval boundaries. | Historical. Statements prohibiting mobile business modules predate approved Workers implementation. |
| `README.md` | Developer overview, applications, commands, and document pointers. | Broadly accurate architecture; its description of mobile as a placeholder foundation understates current Workers and activation source. |
| `NEW_APP_SETUP.md` | Minimal inherited setup note. | Historical/bootstrap-only; not a current NirmanSite implementation authority. |

### AI context and development rules

| Path | Purpose | Currentness / conflict |
| --- | --- | --- |
| `AI_PROJECT_START_PROMPT.md` | Primary AI handoff, mandatory reading order, foundation decisions, implementation workflow, approval gates. | Strong but its “Current Planned Phase” and completed-work narrative are stale. It warns about stale mobile prohibition, but does not resolve newer module status drift. |
| `CLAUDE.md` | Claude-specific startup pointer. | Valid but too shallow to be a standalone current-state guide. |
| `CODEX.md` | Codex-specific startup pointer and scope rules. | Valid; should point unambiguously to pipeline, ledger, module index, and current-state report. |
| `docs/ai-context/00-project-mission.md` | Mission and product guardrails. | Current product intent; no direct implementation status. |
| `docs/ai-context/01-product-vision.md` | Product vision, users, business outcomes. | Current product intent. |
| `docs/ai-context/01-product-vision-template.md` | Template for future vision documents. | Template only; not evidence. |
| `docs/ai-context/02-system-architecture.md` | Concise architecture boundaries. | Directionally current; source remains authoritative for exact paths. |
| `docs/ai-context/03-development-rules.md` | General coding, scoping, and approval rules. | Current rules. |
| `docs/ai-context/04-mobile-development-rules.md` | Mobile routing, storage, UI, offline, and API guidance. | Current principles; does not prove offline infrastructure exists. |
| `docs/ai-development/AI_DEVELOPMENT_PIPELINE.md` | Source priority, module states, gates, vertical-slice order, required handoff updates. | Strongest process document. It correctly requires current-source inspection and conflict escalation. |
| `docs/ai-development/CONTRACT_TO_IMPLEMENTATION_WORKFLOW.md` | Detailed conversion from approved contract to shared/DB/API/UI/test slices. | Current and useful. |
| `docs/ai-development/MODULE_AUTOMATION_RULES.md` | Mandatory module artifacts, commands, gates, and stopping conditions. | Current principles, but mandates `CONTRACTS.md` while Workers uses `CONTRACT.md`; it points to the weaker template. |

### Architecture and decision records

| Path | Purpose | Currentness / conflict |
| --- | --- | --- |
| `docs/architecture/auth-rbac.md` | Identity, platform/customer separation, membership/project authorization, operating-profile boundaries. | Most current architecture narrative. Correctly admits operating profiles are presently metadata/session fields. |
| `docs/architecture/backend.md` | NestJS/API conventions. | Concise and useful, but insufficient for canonical error/pagination/idempotency behavior. |
| `docs/architecture/database.md` | Active mysql2 ownership and SQL conventions. | Current. |
| `docs/architecture/domain-model.md` | Broad domain relationships. | Planning-level and older; many entities are requirements-only. Do not read as schema evidence. |
| `docs/architecture/frontend.md` | Web architecture guidance. | Extremely short; source gives more useful boundaries. |
| `docs/architecture/mobile.md` | Expo architecture and mobile module expectations. | Materially stale where it says mobile business modules are not implemented. |
| `docs/decisions/001-tech-stack.md` | Framework/tooling decision. | Implemented. |
| `docs/decisions/002-mobile-app-architecture.md` | Separate Expo application and shared-contract decision. | Implemented. |
| `docs/decisions/003-design-system-direction.md` | Visual language and component direction. | Implemented in separate web/mobile primitives and shared tokens. |
| `docs/decisions/003-nirmansite-product-direction.md` | Older product direction and web/mobile sequencing. | Partly superseded; retains now-resolved questions and old mobile timing. Duplicate ADR number `003` impairs traceability. |
| `docs/decisions/004-database-access-mysql2.md` | Replace active Prisma access with API-owned mysql2 and custom migration runner. | Implemented; its open-questions section and some proposed locations were not closed after execution. |

### Module contracts, status, and execution records

| Path | Purpose | Currentness / conflict |
| --- | --- | --- |
| `docs/modules/MODULE_INDEX.md` | Module priority, state, dependency, and next action. | One of the freshest indexes. Correctly marks foundation/Workers in progress and all later modules candidate. Candidate paths do not yet exist, which is acceptable but must not be read as artifacts. |
| `docs/modules/MODULE_CONTRACT_STANDARD.md` | Mandatory A-R mature contract structure. | Strong, comprehensive, and the best module-contract specification. |
| `docs/modules/foundation/identity-access/CONTRACTS.md` | Identity, organization, membership, invitation, session, and authorization contract. | Internally updated with current activation endpoints, but the header and early “current source evidence” still say draft-only and not implemented. This is a material contradiction. |
| `docs/modules/foundation/project-access/CONTRACTS.md` | Project lifecycle, membership, selection, and access contract. | Same drift: header and early evidence say draft/nonexistent while source and ledger show implementation. |
| `docs/modules/foundation/role-permission-model/PLAN.md` | Role boundary, seed, and verification plan. | Useful and mostly current; runtime matrix remains open. It is a plan rather than a versioned role contract/status artifact. |
| `docs/modules/construction/workers/CONTRACT.md` | Mature Workers business/technical/API/UI/test contract. | Approved and detailed, but falsely says “implementation status: not started.” Some acceptance statements are not met by source. |
| `docs/modules/construction/workers/DECISIONS.md` | Approved Workers decisions and explicit deferrals. | Current and important. It resolves items still listed as open elsewhere. |
| `docs/modules/construction/workers/IMPLEMENTATION_PLAN.md` | Ordered Workers slices, verification, and handoff. | Executed in substantial part, but still says “Do not execute” and has no per-slice completion status. |
| `docs/execution/CURRENT_REPOSITORY_STATE.md` | Baseline snapshot before Workers. | Materially stale. It records only migrations 000/001 and says Workers DB/API/web/mobile are missing. It should be archived with an as-of label or regenerated. |
| `docs/tasks/PROGRESS_LEDGER.md` | Append-style project gate and implementation evidence. | Richest history and generally freshest. It also contains stale paths and “open” Workers decisions already resolved in `DECISIONS.md`. Historical runtime claims were not re-tested in this audit. |
| `docs/tasks/current-task.md` | Most recent bounded objective and implemented scope. | Freshest narrative; currently activation/email/RBAC focused. It is too long to be the only current-status handoff and lacks a concise verified/unverified table. |
| `docs/tasks/phase-1-foundation-review.md` | Phase 1 review findings and gates. | Historical review; valuable evidence, but later fixes supersede parts. |
| `docs/tasks/phase-1-identity-project-technical-plan.md` | Identity/project slice plan. | Historical execution plan; implementation now exists. |
| `docs/tasks/phase-1-backend-foundation-plan.md` | Earlier backend/Prisma-oriented foundation plan. | Explicitly superseded by mysql2 direction; retain only as history. |
| `docs/tasks/mysql2-migration-runner-implementation-plan.md` | Custom migration runner plan and safety gates. | Implemented historical plan. |
| `docs/tasks/nirman-app-package-rename-plan.md` | Package-scope rename plan. | Implemented historical plan; active packages use `@nirman-app/*`. |
| `docs/tasks/local-run-setup.md` | Local startup and verification commands. | Useful; should explicitly distinguish API/web Turbo startup from Expo startup and physical-device LAN requirements. |

### Templates and operational knowledge

| Path | Purpose | Currentness / conflict |
| --- | --- | --- |
| `docs/templates/module-contract-template.md` | Generic 12-section module contract scaffold. | Too shallow compared with mandatory A-R standard. Pipeline references this template, creating two competing contract shapes. |
| `docs/templates/api-contract-template.md` | API contract format and response conventions. | Useful, but its canonical error envelope conflicts with the active global exception filter. |
| `docs/templates/db-change-template.md` | Migration/change planning and safeguards. | Current and aligned with approval-gated DB work. |
| `docs/templates/implementation-slice-template.md` | Bounded implementation slice format. | Current. |
| `docs/templates/review-report-template.md` | Completion review format. | Current but not used for Workers handoff. |
| `docs/templates/technical-plan-template.md` | Technical plan format. | Current. |
| `docs/knowledge-base/common-issues.md` | Small operational troubleshooting list. | Useful but sparse relative to known Jest, Next generated types, mysql2 URL parsing, and Expo LAN issues. |
| `packages/database/README.md` | Marks Prisma package as archived history. | Current and important to prevent accidental Prisma resurrection. |

### Required source-of-truth correction

The repository needs an explicit two-axis precedence rule:

1. **Desired behavior:** current approved product requirements → approved ADRs/owner decisions → approved module contract.
2. **Implemented fact:** current executable source/migrations → current test/runtime evidence → current status/handoff documents.

If desired behavior and implemented fact differ, the difference is a gap to record, not permission to silently change either side.

## 5. Database and Persistence Audit

### Active schema

| Migration | Capability | Assessment |
| --- | --- | --- |
| `000_inherited_foundation_compatibility_tables.sql` | Inherited `user`, `role`, `permission`, `refreshtoken`, and `systemsetting` compatibility tables | Active compatibility foundation; singular/camel names are deliberately inherited exceptions. |
| `001_phase1_identity_project_setup.sql` | `organizations`, `organization_members`, `projects`, `project_members` | Implements tenant and project membership foundation with composite ownership FKs. Status columns use varchar values without DB CHECK constraints. |
| `002_workers.sql` | `workers`, `worker_project_assignments` | Implements organization ownership and project assignment. `client_created_id` exists but is unused; no audit/rate-history tables. |
| `003_organization_owner_invitations.sql` | Single-use organization Owner invitations | Token hashes, membership link, expiry/accepted/revoked fields, and uniqueness are present. |

### Data-access quality

- `apps/api/src/database/database.service.ts` provides typed parameterized query/execute and transaction helpers over `mysql2/promise`.
- Repository methods consistently pass values through placeholders.
- Tenant relationships in new tables use organization IDs and composite foreign keys, which is a sound base for service-side scope enforcement.
- Migration tooling validates target/confirmation before mutation. The seed is also guarded by an exact database confirmation, but its remote/production safety contract is less explicit than migration execution.
- `packages/database/prisma` is not active and must remain archival unless a new ADR explicitly reverses the decision.

### Missing persistence foundations

No active tables were found for audit events, notifications, files/media ownership, offline mutations/conflicts, attendance, wages, Kharchi, materials, expenses, progress, gallery, sales, units, bookings, reports, or subscriptions.

### Risks

- Worker code generation reads `MAX(...) + 1` inside a transaction without a locking counter; concurrent creates can collide on the unique organization/code key and surface a generic error.
- The worker schema has `client_created_id`, but clients and repositories do not use it for idempotency.
- Worker rate changes overwrite the assignment’s current rate. Effective date and reason are accepted at the API boundary but are not persisted as history.
- Status constraints are primarily application-level. The database does not consistently enforce allowed status values.

## 6. Shared Contracts and API Convention Audit

### Implemented

- `packages/shared/src/constants/permissions.ts` defines platform, organization, project, legacy compatibility, and Workers permissions using `resource:action` keys.
- `packages/shared/src/constants/statuses.ts` defines organization types, five operating profiles, compatibility mappings, member/project/worker/invitation/session statuses, and project transitions.
- `packages/shared/src/constants/errors.ts` contains a substantial stable error-code catalog.
- `packages/shared/src/types/workers.ts` and `packages/shared/src/types/onboarding.ts` provide cross-client DTO-like TypeScript shapes.
- `packages/shared/src/theme` supplies platform-neutral design tokens while web and mobile maintain native component implementations.

### Gaps

- `packages/shared/src/schemas/index.ts` is empty. The documented ownership of executable shared validation schemas has not been realized.
- API DTO validation is local class-validator code. Web/mobile types reduce drift but do not provide runtime contract validation.
- Success responses commonly use `{ success, message, data }`, but list payload nesting varies by service.
- `apps/api/src/common/filters/global-exception.filter.ts` returns `{ success: false, message, errors }`, while `MVP_REQUIREMENTS.md` and `docs/templates/api-contract-template.md` specify `{ success: false, error: { code, message, details } }`.
- Shared error codes are largely not connected to thrown exceptions or serialized API errors.
- No OpenAPI artifact, generated client, API schema test, or compatibility test protects contracts from drift.

**Classification: Partial.** Shared constants/types are a useful reference, but the executable schema and error-envelope contract are not complete.

## 7. Authentication and Session Lifecycle

### Implemented flow

`apps/api/src/modules/auth/auth.service.ts`, `auth.repository.ts`, and `auth.controller.ts` implement email/password login, access JWTs, refresh JWTs, hashed refresh-token persistence, rotation, logout, current-user/session endpoints, and password change. Access tokens are short-lived; refresh tokens are longer-lived. The web client uses an HTTP-only, same-site refresh cookie and holds the access token client-side.

`apps/api/src/modules/project-access/project-access.service.ts` resolves active organization membership, role permissions, organization-wide versus assigned-project scope, and accessible projects for `/auth/session`. Platform users resolve a platform session without an ordinary customer workspace.

### Mobile gap

The mobile session provider stores its access token/session in SecureStore but does not implement refresh rotation. Mobile logout clears local state and does not revoke the server refresh session. An expired access token therefore has no complete native recovery flow. Cached session display is not the same as authenticated offline access.

### Missing lifecycle/security capabilities

- forgot/reset password;
- OTP authentication and rate limiting;
- device/session inventory and logout-all;
- refresh-token family/reuse detection;
- transactional refresh rotation;
- explicit session/permission freshness policy after membership or role changes;
- brute-force/rate-limit controls in source;
- verified mobile refresh-cookie or refresh-token strategy.

**Classification: Web/API Implemented for basic email/password auth; mobile lifecycle Partial; broader MVP auth Partial/Unresolved.**

## 8. Organization Onboarding and Activation

### Implemented Owner invitation path

`apps/api/src/modules/organizations/organization-onboarding.service.ts` and `.repository.ts` implement the platform-provisioned primary Owner flow:

1. platform permission is asserted;
2. the organization is created as DRAFT;
3. a new inactive user or eligible existing identity is used;
4. an INVITED Owner membership is created;
5. a random token is stored only as a SHA-256 hash with expiry;
6. email delivery is attempted after transaction commit;
7. manual web and mobile links remain available when SMTP is absent/fails;
8. acceptance locks and atomically activates the invitation, membership, organization, and new user password where required.

Public preview/accept routes exist in `organization-onboarding.controller.ts`. Web and mobile activation routes exist. Existing active users may accept an additional membership without replacing their password. Success returns the user to login with the invited email.

### Missing/partial behavior

- No resend or revoke API exists despite schema support for revocation.
- Expiration is derived but not necessarily persisted as an EXPIRED transition.
- No general organization-member invitation workflow exists for Contractor, Supervisor, Accountant/Admin, Sales, or other members.
- No invitation delivery history, audit log, or admin queue exists.
- `apps/mobile/app.json` defines the `nirmansite` custom scheme but no Android App Links intent filter or iOS associated domains. Installed-app routing, install fallback, and browser-to-store behavior are unverified.
- No live web/Expo disposable-invitation acceptance was performed in this audit.

**Classification: Primary Owner activation Partial (substantial source, incomplete operational lifecycle and runtime proof); general member onboarding Not Implemented.**

## 9. Organization Membership, Project Membership, and Role Model

### Organization membership

Organization listing/detail/update/switch and member list/update/deactivate routes exist. The service prevents self role/status mutation, protects the last Owner, prevents platform/global custom roles from being assigned as customer membership roles, and validates operating-profile compatibility.

Gaps:

- no member create/invite/resend/revoke/reactivate/end-membership path;
- web shows member state and access but does not provide a complete tenant-safe role lifecycle;
- no membership history/audit persistence;
- no multi-role membership;
- no per-member permission allow/deny model;
- no ownership transfer workflow.

### Project membership and access

Projects support list/create/get/update/archive/restore, active project switching, context, member list/assign/update/unassign, and access discovery. `ProjectAccessService` is the central API authority for organization and project scope. Composite tenant keys reinforce repository boundaries.

This is a sound reference pattern for future project-scoped services. However, no dedicated project-access integration tests execute, and selected organization/project persistence is primarily a client concern rather than a durable server-side preference.

### Role management

Platform Roles & Permissions source supports listing, custom-role creation/edit/delete, permission assignment, and protects system templates. These are global platform records. Customer memberships also point at that global role table.

Therefore:

- platform role management is Implemented;
- fixed customer role-template assignment is Partial/Implemented for current seed-based roles;
- organization-scoped custom roles are Not Implemented;
- member overrides/denials and workflow responsibility rules are Not Implemented;
- the final customer RBAC model remains Unresolved.

### Seeded role intent

The seed defines Platform Super Admin and User Manager platform roles plus customer templates such as Organization Owner, Builder Admin, Independent Contractor Owner, Project Manager, Contractor Member, Site Supervisor, Sales User, Viewer, and Member. Platform Super Admin receives no ordinary Workers permissions. The documented Finance/Admin and Sales Manager personas are not distinct seeded role templates.

One boundary needs an explicit test: all platform-only roles—not only names containing Super Admin—must be prevented from becoming ordinary customer owners/members unless an approved support policy says otherwise.

## 10. Operating Profiles and Organizational Behavior

The five profiles are defined and validated:

- self-managed builder;
- builder with contractors;
- supervisor-led builder;
- independent contractor;
- custom.

The API prevents invalid organization-type/profile combinations. Web choices are filtered, and session payloads expose the profile.

What profiles do **not** currently do:

- create different default role bundles;
- change default project access;
- create responsibility/approval chains;
- determine who may self-approve;
- alter module navigation or feature availability in a systematic policy engine;
- assign contractors/supervisors automatically;
- change notifications, offline policy, or reporting visibility.

The current model is metadata plus compatibility validation. Any text implying that all five profiles already create distinct runtime behavior is aspirational.

**Classification: Partial.** The representation is implemented; behavioral policy is Documented Only/Unresolved.

## 11. Workers Module Deep Audit

### End-to-end layer trace

| Layer | Evidence | Status |
| --- | --- | --- |
| Requirements | `MVP_REQUIREMENTS.md`; `docs/modules/construction/workers/CONTRACT.md`; `DECISIONS.md` | Approved contract and owner decisions exist. |
| Database | `002_workers.sql` | Worker master and assignment tables exist with tenant/project FKs and indexes. |
| Shared | permissions/statuses/errors and `types/workers.ts` | Constants and TS types exist; executable schemas absent. |
| API | `workers.controller.ts`, `.service.ts`, `.repository.ts`, DTOs/module | List, duplicate candidates, create, get, update, deactivate, roster, assign, update assignment, rate change, end assignment exist. |
| Authorization | `WorkersService` delegates to `ProjectAccessService` | Organization/project access and explicit Worker permissions are checked in services. |
| Web | `apps/web/src/features/workers`, project Workers panel, routes/navigation | Organization list/create/detail/edit/rate/deactivate plus project roster/assignment operations exist. |
| Mobile | `apps/mobile/src/features/workers`, `app/(app)/workers.tsx` | Current-project roster, duplicate check, and quick create/assign exist. Other writes are intentionally unavailable. |
| Tests | none | No Workers unit/integration/E2E tests. |
| Handoff | contract/plan still say not started; no review report | Failed. |

### Contract alignment that is good

- Workers are organization-owned business records, not login users.
- `worker_code` is generated per organization.
- duplicate matching is warning-oriented rather than a hard uniqueness rule on name/mobile.
- trade remains free text.
- the API scopes project operations through central project access.
- worker deletion is avoided; deactivation and assignment ending are explicit.
- the interim daily rate lives on the project assignment.
- Platform Super Admin does not receive normal Workers permissions.
- mobile scope is smaller than web and uses the current project.

### Material gaps and defects

1. **Audit is a no-op.** `WorkersService.recordAudit()` explicitly records nothing because no Audit foundation exists. Contractual audit events therefore do not persist.
2. **Attendance-aware rate protection is a stub.** `WorkersRepository.hasAttendanceForAssignment()` always returns false. The elevated `workers:update-rate` rule never activates until Attendance integration.
3. **Rate history is absent.** `effectiveDate` and `reason` are validated/accepted but the repository overwrites `daily_rate`; there is no durable history or audit event.
4. **Roster lifecycle does not match the contract.** `findProjectRoster()` scopes organization/project but does not restrict assignment status, and worker status is filtered only when the caller supplies it. Ended assignments and inactive workers can remain in the default roster even though the contract expects the active roster to exclude deactivated workers.
5. **Deactivation does not end active assignments.** `WorkersRepository.deactivate()` updates only the worker. The resulting cross-lifecycle state is not explicitly resolved by the contract or UI.
6. **Worker-code generation is race-prone.** `MAX(SUBSTRING(...)) + 1` has no counter row/lock/retry strategy; concurrent creates can collide.
7. **Offline behavior is not truly implemented on native.** The screen checks `navigator.onLine` when available and otherwise assumes online. No NetInfo dependency, persisted roster cache, mutation queue, or conflict mechanism exists.
8. **Idempotency is scaffold-only.** `client_created_id` exists in SQL but is not used by DTOs/repositories/mobile.
9. **Duplicate acknowledgement is primarily UI behavior.** The API can create after returning candidates without enforcing an explicit acknowledgement contract.
10. **No automated tests execute.** Tenant isolation, project scope, permission matrix, duplicate warning, lifecycle transitions, rate rules, and concurrency are unprotected.
11. **No completion handoff.** Contract and plan headers remain pre-implementation; no required review report or verified module status exists.

### Verdict on Workers as a reusable reference

Workers is a good reference for **vertical-slice shape, folder ownership, tenant/project access delegation, separate web/mobile scope, and repository patterns**. It is not yet a safe reference for **completion criteria, auditing, offline behavior, lifecycle invariants, concurrency, or automated verification**.

**Overall Workers classification: Partial / in progress.** It must not be labelled verified or accepted.

## 12. Feature-by-Feature Implementation Matrix

| Domain/capability | Classification | Evidence and missing boundary |
| --- | --- | --- |
| Email/password auth | Implemented | API and web flow exist; current static checks pass. Broader security hardening is separate. |
| Mobile auth session lifecycle | Partial | Login and SecureStore session exist; refresh/revocation recovery absent. |
| Primary Owner invitation/activation | Partial | Transactional API plus web/mobile activation exist; resend/revoke/install fallback/audit/live acceptance proof absent. |
| General member invitations | Not Implemented | No member invitation endpoints or clients. |
| Organization administration | Partial | Platform create/list/detail/update and customer access exist; full lifecycle/ownership transfer/audit absent. |
| Organization membership | Partial | List/update/deactivate and Owner protections exist; invitation/reactivation/end/history absent. |
| Project administration | Implemented for current foundation scope | CRUD-like lifecycle and access endpoints/web/mobile selection exist; tests/runtime matrix are missing. |
| Project membership | Partial | Assign/update/unassign exists; invitation and role-policy depth absent. |
| Platform roles/permissions | Implemented | Protected global management source exists. Runtime matrix not re-verified here. |
| Customer organization-scoped roles | Not Implemented / Unresolved | Memberships use global role rows; tenant custom-role ownership absent. |
| Operating profiles | Partial | Enum/validation/display/session only; runtime behavior not implemented. |
| Profile/account settings | Partial | Web profile and password changes exist; mobile profile workflow absent. |
| Platform settings/email | Partial | API/web and SMTP service exist; delivery/audit/security operations remain environment-dependent. |
| Workers | Partial | Substantial end-to-end slice; gaps detailed in section 11. |
| Attendance | Documented Only | Candidate requirements and Workers forward references; no active module/schema/UI. |
| Wages | Documented Only | Requirements only; depends on Attendance/Kharchi and rate history. |
| Kharchi | Documented Only | Requirements only; depends on Workers/Attendance/Audit. |
| Materials | Documented Only | Requirements only; no module/schema. |
| Expenses | Documented Only | Requirements only; no module/schema. |
| Progress tracking | Documented Only | Requirements plus static dashboard/design data; no operational source. |
| Gallery/media evidence | Documented Only | Requirements and generic S3 service only; no owned file asset/module. |
| Leads | Documented Only | Requirements/static mock references only. |
| Follow-ups | Documented Only | Requirements only. |
| Site visits | Documented Only | Requirements only. |
| Unit inventory | Documented Only | Requirements only. |
| Blocks/bulk operations | Documented Only / Unresolved | Requirements only; idempotent bulk/job behavior unresolved. |
| Booking | Documented Only | Requirements only; depends on lead/unit/audit and open document/payment choices. |
| Notifications | Documented Only | Permission/candidate contract path only; no module/table/channel orchestration. |
| Audit trail | Documented Only | Permission and no-op hooks only; archived Prisma model is not active evidence. |
| Reports | Documented Only | Permission/requirements only. |
| Subscription/platform commercial model | Documented Only / Unresolved | Requirements only. |
| Offline sync | Not Implemented / Unresolved | Secure storage/sync-status UI scaffolds exist; no local DB, queue, idempotency, conflict contract, or sync engine. |
| File/media ownership | Partial scaffold | S3 storage service exists, but no controller, metadata table, tenant/project ownership, retention, or authorization contract. |
| Web dashboard analytics | Not Implemented | Current dashboard data are static presentation data, not module-backed metrics. |
| Mobile dashboard analytics/workflows | Not Implemented | Real project/session labels are mixed with design-system/mock data; no operational metrics. |

No source evidence was found for additional named operational modules such as labour agencies, contractor work orders, or announcements as implemented MVP domains. References to them should be treated as deferred ideas unless promoted through the contract pipeline.

## 13. End-to-End Architecture Trace for Implemented Foundations

```text
SQL migrations 000/001/003
  -> API repositories (auth, organizations, project access, projects)
    -> services enforce platform or membership/project boundaries
      -> controllers return session/organization/project/onboarding data
        -> web providers/services and mobile session/project providers
          -> organization/project/activation UI
            -> sparse API tests (currently unable to execute)

SQL migration 002
  -> shared Worker constants/types + API DTOs
    -> Workers repository/service/controller
      -> ProjectAccessService authorization
        -> web Workers + project roster
        -> mobile current-project roster/create
          -> no Workers tests; no durable audit/offline layer
```

The strongest reusable architectural rule is: future project-scoped modules should not recreate tenant logic. They should resolve organization/project authority through `ProjectAccessService`, query through organization/project keys, and use shared status/permission identities. The weakest layer is verification and completed-module handoff.

## 14. Tenant Isolation and Security Assessment

### Strengths

- Global JWT authentication is default; public routes require explicit metadata.
- New repositories use parameterized SQL.
- Organization/project ownership appears in both services and composite schema relationships.
- `ProjectAccessService` centralizes active membership, permission, and assigned-project resolution.
- Platform permissions are separately named and platform sessions do not receive a normal customer workspace.
- Onboarding tokens are random, hashed at rest, expiring, and single-use.
- Owner acceptance is transactional and locks the invitation.
- Web refresh token is HTTP-only and same-site strict.

### Gaps requiring tests or design

- Controller-level `PermissionsGuard` alone is not enough on Workers because methods do not declare decorator requirements; security relies on every service method performing the correct access check. This can be valid, but requires exhaustive service/integration tests.
- Organization-scoped custom roles do not exist, so global role records remain a compatibility coupling.
- Role/membership changes need an explicit token/session freshness contract.
- Platform support impersonation or break-glass customer access is not designed; this should remain denied until separately approved and audited.
- General invitation abuse controls, login throttling, token-family reuse detection, and security-event audit persistence are absent.
- No automated tenant isolation matrix currently executes.

No confirmed cross-tenant data leak was established through static inspection. The confidence level is limited by the non-executing test suite and lack of live matrix testing.

## 15. Test, Lint, Build, and Operational Readiness

### Test inventory

Only three test files exist:

- `apps/api/src/app.controller.spec.ts`;
- `apps/api/src/modules/organizations/organization-onboarding.service.spec.ts`;
- `apps/api/test/app.e2e-spec.ts`.

There are no Workers, project-access, organization-membership, RBAC, repository tenant-isolation, web, or mobile tests. The existing API suite currently executes zero tests because Jest 30.4.2 and ts-jest 29 are incompatible at runtime.

### Static health

Type checking passes in shared, API, web, and mobile. Shared, API, and web production builds pass. This is useful structural evidence, not behavioral verification.

Lint is not an enforceable gate today. API lint reports mostly formatting drift; web lint reports synchronous effect-based form hydration issues in organization, project, settings, and Workers components plus an image warning.

### Missing operations

- no CI workflow;
- no disposable test database orchestration;
- no fixture/factory strategy;
- no migration parity test in CI;
- no API contract tests;
- no browser E2E suite;
- no mobile component/integration/device test strategy;
- no automated dependency/security checks recorded;
- no runtime health/smoke command that covers all apps and records evidence.

## 16. Documentation Drift and Ambiguity Register

| Severity | Conflict | Risk to AI implementation | Required disposition |
| --- | --- | --- | --- |
| Critical | Identity/Project contracts say draft and not implemented; source implements them. | Agent may recreate migrations/APIs or refuse valid extension work. | Reconcile headers, implementation evidence, unresolved items, and status. |
| Critical | Workers contract/plan say not started; source is substantial; current-state snapshot says missing. | Agent may duplicate module or treat a partial module as complete depending which file it reads. | Produce a Workers review/status, mark completed/partial slices, archive stale snapshot. |
| High | API error template/requirements differ from global exception output. | Every new module may invent a third response shape. | Approve one canonical envelope and migration/compatibility policy. |
| High | Mandatory contract standard is A-R; referenced template is a shallow 12-section form; singular/plural filename conventions differ. | New modules will have inconsistent artifacts and automation. | Merge template into the standard and choose `CONTRACT.md` or `CONTRACTS.md`. |
| High | Ledger retains Workers “open” choices resolved in `DECISIONS.md`. | Agent may re-ask or reverse approved owner decisions. | Add decision IDs/status/supersession and remove resolved items from open register. |
| High | `CURRENT_REPOSITORY_STATE.md` is named current but is an Aug-05 pre-Workers snapshot. | Looks authoritative and defeats source inspection. | Rename/archive as dated snapshot or regenerate automatically. |
| Medium | `docs/architecture/mobile.md` and README understate implemented mobile features. | Agent may delete/replace valid source or mis-scope client work. | Update current architecture statements. |
| Medium | Duplicate ADR number `003`. | Poor decision citation and supersession. | Renumber or add a stable decision index. |
| Medium | Candidate module paths in MODULE_INDEX do not exist. | An agent may mistake planned paths for missing/deleted docs. | Clearly label as proposed and create only when contract work is approved. |
| Medium | Root agent files have different mandatory-reading depth. | Different coding agents start with different context. | Add one canonical repository entrypoint and link all tool-specific files to it. |

## 17. AI-Driven Development Readiness Grade

### Grade: C — partially documented

The repository scores above “mostly chat/manual” because it has durable, detailed product requirements, ADRs, architecture guidance, a mature module standard, an explicit contract-to-implementation pipeline, a progress ledger, and real vertical-slice source.

It does not qualify for B because a fresh AI agent cannot reliably determine the implemented truth from documents alone, the required test/review gates do not run, Workers lacks its completion handoff, and important customer RBAC/onboarding/offline/audit contracts remain unresolved.

| Readiness dimension | Grade | Reason |
| --- | --- | --- |
| Product requirements | B | Comprehensive and recent, with explicit open decisions. |
| Architecture boundaries | B | Clear active stack and platform separation; some architecture docs stale. |
| Contract discipline | B | Mature standard and approved Workers contract; template/status drift lowers confidence. |
| Current-state discoverability | D | Multiple authoritative-looking documents conflict materially. |
| Vertical-slice implementation | C | Foundation and Workers exist; most MVP domains do not. |
| Authorization/tenant model | C | Strong central service pattern; final customer role/member model incomplete and untested. |
| Automated verification | D | Builds/type checks pass, but tests execute zero assertions and CI is absent. |
| Offline/audit/notifications foundations | D | Mostly candidate requirements or scaffolds. |
| AI handoff discipline | C | Process is defined but not completed after Workers implementation. |

## 18. Recommended Contract and Implementation Process

### Minimal canonical artifact set

Do not add more parallel process documents. Consolidate the existing process around:

```text
AGENTS.md (or one canonical repository bootstrap file)
  -> MVP_REQUIREMENTS.md
  -> docs/decisions/DECISION_INDEX.md + approved ADRs
  -> docs/modules/MODULE_INDEX.md
  -> docs/tasks/PROGRESS_LEDGER.md + docs/tasks/current-task.md
  -> docs/modules/<area>/<module>/CONTRACT.md
  -> docs/modules/<area>/<module>/PLAN.md
  -> docs/modules/<area>/<module>/STATUS.md
  -> docs/modules/<area>/<module>/REVIEW.md when a gate is claimed complete
```

Use the existing A-R `MODULE_CONTRACT_STANDARD.md` as the source template; replace or expand the older module-contract template. Standardize the filename once. A module status must distinguish:

- desired contract state;
- implemented slices by layer;
- verification actually run at the current revision;
- deferred items;
- known gaps/defects;
- next approved action.

### Required slice checklist

Every implementation slice should record:

1. approved contract clauses and owner decisions;
2. exact entities and tenant/project ownership;
3. shared runtime schemas/types/statuses/permissions/errors;
4. migration and rollback/recovery plan;
5. repository queries and authorization path;
6. API success/error/list contracts;
7. deliberately different web/mobile responsibilities;
8. audit events and notification/file/offline dependencies;
9. unit/integration/E2E acceptance tests;
10. verification commands and results;
11. status/index/ledger/review updates in the same change.

### Approval gates

- No source work from a candidate requirement.
- No migration status connection without an approved named target.
- No DB mutation without explicit approval for that target and run.
- No offline writes without the Offline contract.
- No financial/approval module without Audit ownership and approval semantics.
- No media module without File/Media ownership.
- No “verified” status unless tests/runtime evidence actually executed.
- Any approved-contract/source mismatch stops implementation and becomes a recorded gap.

## 19. Dependency Map and Next Five Slices

### Dependency map

```text
Identity/Auth
  -> Organization + Membership + Customer RBAC
    -> Project + Project Membership/Access
      -> Workers
        -> Attendance
          -> Kharchi
            -> Wages + rate history

Audit Foundation
  -> Workers completion
  -> Attendance/Kharchi/Wages
  -> Materials/Expenses
  -> Progress/Gallery
  -> Sales/Units/Booking

Notifications Foundation
  -> approval workflows
  -> Follow-ups/reminders
  -> invitation lifecycle

File/Media Ownership
  -> Gallery
  -> Progress evidence
  -> expense/material/booking documents

Offline Sync + idempotency
  -> any approved mobile offline write
  -> Attendance and field capture

Project + Customer RBAC
  -> Materials/Expenses/Progress
  -> Leads -> Follow-ups -> Site Visits
  -> Units -> Blocks -> Booking (also depends on Leads and Audit)

Operational modules
  -> trustworthy Dashboards/Reports
```

### Recommended next five bounded slices

#### Slice 1 — Source-of-truth reconciliation and Workers handoff

Documentation-only. Reconcile Identity, Project, Workers, mobile architecture, README, current-state snapshot, ledger, index, decision register, and contract template. Create a Workers `STATUS`/`REVIEW` artifact that marks each layer complete/partial with current evidence.

Acceptance: a fresh agent following one bootstrap path reaches one non-contradictory current gate and cannot mistake Workers for not-started or verified.

#### Slice 2 — Restore executable quality gates

Align Jest and ts-jest, keep current tests executing, add test database isolation rules, and establish CI for shared/API/web/mobile type checks, builds, lint policy, tests, migration integrity, and `git diff --check`.

Acceptance: tests execute assertions; a failed setup cannot be reported as a passing module; CI has no live remote DB dependency.

#### Slice 3 — Foundation authorization and activation verification

Add integration tests for platform/customer separation, organization membership state, project scope, last-Owner protection, role assignment boundaries, Owner invitation new/existing identity paths, token reuse/expiry, and Workers tenant/project matrix. After separate approval, run only against a named disposable/local database and record results.

Acceptance: every seeded role has allow/deny evidence, cross-tenant IDs fail, project assignments are enforced, and both activation paths are verified without exposing secrets.

#### Slice 4 — General member onboarding and customer-role contract

Contract before code. Decide organization-scoped roles, membership invitations, role/project assignment timing, resend/revoke/expiry, Contractor/Supervisor onboarding, ownership transfer, overrides/denials, and external Contractor-organization collaboration.

Acceptance: no role or invitation behavior remains implicit; platform roles cannot leak into customer operation; web/mobile responsibilities are explicit.

#### Slice 5 — Audit foundation, then Workers closure

Approve and implement a generic tenant/project-aware Audit foundation, connect Workers events, persist rate-change context, resolve worker/assignment lifecycle invariants and active-roster semantics, make worker-code allocation concurrency-safe, and add Workers tests/review evidence.

Acceptance: Workers meets its approved DoD and becomes a genuinely verified reference slice. Only then begin the Attendance contract. Notifications, Files/Media, and Offline may be contracted in parallel as independent documentation slices, but their implementations should precede dependent modules.

### First business-module sequence after those slices

The recommended construction sequence remains:

1. Attendance;
2. Kharchi;
3. Wages and durable rate history;
4. Materials;
5. Expenses;
6. Progress;
7. Gallery.

The sales stream can begin after the customer-role/member model is settled: Leads → Follow-ups → Site Visits, while Units → Blocks can proceed before Booking. Booking must wait for Leads, Units, Audit, document ownership, and its open payment/document decisions.

## 20. Owner Decisions and Final Recommendation

### Decisions required before Codex implements further business behavior

1. **Approve the next gate:** documentation reconciliation + executable test/foundation verification, rather than another feature module.
2. **Customer role model:** fixed global templates only, organization-owned custom roles, or a hybrid; and whether per-member/project grants or denials are allowed.
3. **General member onboarding:** invite lifecycle, role/project assignment timing, resend/revoke, ownership transfer, and who may invite whom.
4. **External contractors:** internal organization membership versus cross-organization collaboration.
5. **Operating-profile behavior:** which defaults and approval responsibilities each profile creates; whether self-approval is permitted.
6. **Mobile session strategy:** refresh-token storage/rotation/revocation and permission freshness after access changes.
7. **Audit foundation:** minimum event schema, actor/tenant/project/record context, before/after data policy, retention, and sensitive-field exclusions.
8. **Offline foundation:** local store/library, idempotency keys, conflict resolution, retry semantics, and which first module may write offline.
9. **Canonical API errors:** retain current envelope or migrate to the requirements/template envelope, including stable error codes.
10. **Module-specific product choices:** decide the unresolved items in `MVP_REQUIREMENTS.md` only before their affected module—such as full/partial wage payments, holiday handling, materials-cost entry, block generation/reversal, booking documents/amount, storage provider, and reminder behavior.

### Exact next owner decision

**Approve or reject a bounded “Repository Truth and Foundation Verification” phase containing Slices 1–3 above, with no new business module and no database mutation unless a separate named disposable/local target is approved.**

That decision gives Codex a safe, narrow next action and produces the evidence needed to decide whether Workers can be accepted and Attendance contracting can start.

### Final answer

**Is the repository ready for further AI-driven module implementation?**  
**YES, AFTER SPECIFIC FIXES.**

It is ready now for documentation reconciliation, test-toolchain repair, and foundation verification. It is not ready for autonomous implementation of Attendance or another business domain until those gates are complete and the customer member/role model is approved.

## Audit Change and Inspection Record

### Files changed

- `docs/audits/NIRMANSITE_AI_IMPLEMENTATION_AUDIT.md` — added as the single permitted audit artifact.
- No application source, package manifest, migration, seed, configuration, or existing documentation file was intentionally changed.

### Files inspected

The audit inspected every repository Markdown file listed in section 4, root/workspace manifests and Git metadata, and the relevant active source under:

- `apps/api/src/main.ts`, `apps/api/src/app.module.ts`;
- `apps/api/src/common`, `apps/api/src/config`, `apps/api/src/database`, `apps/api/src/modules`, `apps/api/scripts`, `apps/api/test`, and `apps/api/package.json`;
- `apps/web/src/app`, `apps/web/src/components`, `apps/web/src/features`, `apps/web/src/lib`, `apps/web/src/providers`, and `apps/web/package.json`;
- `apps/mobile/app`, `apps/mobile/src`, `apps/mobile/app.json`, and `apps/mobile/package.json`;
- `packages/shared/src` and `packages/shared/package.json`;
- `packages/database` and its archived Prisma history;
- all four active SQL migration files and the mysql2 seed/migration tooling.

Dependency contents under `node_modules`, generated build outputs, binaries/media assets, lockfile internals, and secret environment values were not treated as auditable product source. The lockfile was used only indirectly by installed-tool behavior; no secrets were printed or modified.
