# Current Repository State

> Historical snapshot warning: this document records the 2026-08-05 pre-Workers baseline and is no longer a current implementation inventory. Use `docs/tasks/current-task.md`, `docs/tasks/PROGRESS_LEDGER.md`, and module `STATUS.md`/`REVIEW.md` files for current state.

> Date: 2026-08-05
>
> Purpose: establish the current technical baseline before starting the first mature MVP business module.
>
> Scope: repository assessment only. No application code, database schema, seed data, or runtime behavior was changed.

## 1. Current Architecture

### Monorepo

- Root package is `nirman-app`; workspace packages use `@nirman-app/*`.
- Package manager is `pnpm@11.5.2`.
- Workspace members are `apps/*` and `packages/*` from `pnpm-workspace.yaml`.
- Turborepo runs `build`, `dev`, `lint`, and `type-check` tasks from `turbo.json`.
- Root scripts delegate to package filters: `@nirman-app/shared`, `@nirman-app/api`, `@nirman-app/web`, and `@nirman-app/mobile`.

Evidence:

- `package.json`
- `pnpm-workspace.yaml`
- `turbo.json`

### API

- Framework: NestJS 11 with TypeScript.
- Package: `apps/api`, package name `@nirman-app/api`.
- Runtime database access: API-local `mysql2/promise` through `apps/api/src/database/database.service.ts`.
- Modules currently wired in `apps/api/src/app.module.ts`: auth, users, roles, settings, upload, organizations, projects, database.
- API prefix: `/api/v1` from `apps/api/src/main.ts`.
- Global auth guard: `JwtAuthGuard`.
- Permission guard: opt-in `PermissionsGuard` with `@RequirePermissions(...)`.
- Validation: global `ValidationPipe` with whitelist, transform, and non-whitelisted field rejection.
- Error envelope: `GlobalExceptionFilter` returns `{ success: false, message, errors }`.
- Success envelope is implemented per controller, usually `{ success: true, message, data }`; list endpoints may spread pagination fields.

Evidence:

- `apps/api/package.json`
- `apps/api/src/app.module.ts`
- `apps/api/src/main.ts`
- `apps/api/src/database/database.service.ts`
- `apps/api/src/common/filters/global-exception.filter.ts`
- `apps/api/src/modules/auth/guards/permissions.guard.ts`

### Web

- Framework: Next.js 16 App Router, React 19, TypeScript.
- Package: `apps/web`, package name `@nirman-app/web`.
- API client: Axios wrapper in `apps/web/src/lib/api/api-client.ts`.
- Auth refresh: web client retries 401 through `/auth/refresh` with credentials/cookie support.
- Routes exist for login, dashboard, users, roles, organizations, projects, settings, profile, and design-system.
- Navigation is configured in `apps/web/src/config/navigation.ts` and permission-gates admin entries.
- UI components are local to web under `apps/web/src/components/ui` and `apps/web/src/components/common`.
- Web consumes `@nirman-app/shared`.

Evidence:

- `apps/web/package.json`
- `apps/web/src/app`
- `apps/web/src/config/navigation.ts`
- `apps/web/src/lib/api/api-client.ts`
- `apps/web/src/components/ui`

### Mobile

- Framework: Expo 54, Expo Router 6, React Native 0.81, React 19.
- Package: `apps/mobile`, package name `@nirman-app/mobile`.
- API client: `fetch` wrapper in `apps/mobile/src/lib/api/api-client.ts`.
- Session storage: Expo SecureStore on native with localStorage fallback on web through `apps/mobile/src/lib/storage/secure-storage.ts`.
- Session payload includes user, active organization, memberships, permissions, project access, feature flags, server time, and active project.
- Mobile project switching exists in `apps/mobile/src/features/projects/components/project-switcher.tsx`.
- Mobile UI primitives exist under `apps/mobile/src/components/ui`, including sync/offline display primitives.
- Mobile currently stores the access-token session payload. A mobile refresh-token rotation strategy is not implemented.

Evidence:

- `apps/mobile/package.json`
- `apps/mobile/app`
- `apps/mobile/src/lib/auth/session.ts`
- `apps/mobile/src/providers/session-provider.tsx`
- `apps/mobile/src/lib/api/api-client.ts`
- `apps/mobile/src/components/ui/sync-status.tsx`

### Database

- Active database access is MySQL/MariaDB via API-local `mysql2/promise`.
- Active SQL migrations live in `apps/api/src/database/sql/migrations`.
- Migration runner lives in `apps/api/src/database/migrations` and supports `schema_migrations`, checksum checks, draft blocking, locking, and mutation safety checks.
- Remote development database status was checked with `pnpm db:migrate:status`: current, 2 local migrations, 2 applied, 0 pending, 0 drafts.
- `packages/database` is archived inherited Prisma history only. Its README explicitly says not to run Prisma generate, migrate, push, studio, or seed for new NirmanSite work.
- Archived Prisma schema remains under `packages/database/prisma/schema.prisma` and should not drive new implementation.

Evidence:

- `docs/decisions/004-database-access-mysql2.md`
- `packages/database/README.md`
- `packages/database/prisma/schema.prisma`
- `apps/api/src/database/sql/migrations/000_inherited_foundation_compatibility_tables.sql`
- `apps/api/src/database/sql/migrations/001_phase1_identity_project_setup.sql`
- `apps/api/src/database/migrations/migration-runner.ts`

### Shared Packages

- `packages/shared` owns platform-neutral constants, status enums, permission types, theme tokens, and placeholder schemas/types.
- Permission format is `resource:action`.
- Foundation permission resources currently include organizations, members, users, roles, projects, project-members, settings, files, audit-logs, notifications, and reports.
- Construction permissions such as workers, attendance, wages, and kharchi are not yet present in shared constants.

Evidence:

- `packages/shared/package.json`
- `packages/shared/src/index.ts`
- `packages/shared/src/constants/permissions.ts`
- `packages/shared/src/constants/statuses.ts`
- `packages/shared/src/theme`

### UI Packages

- There is no separate UI workspace package.
- Web and mobile each own their own platform-specific components.
- Shared theme tokens live in `packages/shared/src/theme`, then are mapped separately by web and mobile.

Evidence:

- `apps/web/src/components/ui`
- `apps/mobile/src/components/ui`
- `packages/shared/src/theme`

### Tests

- API has Jest unit and e2e configuration.
- Web and mobile currently have type-check and lint/build scripts, but no dedicated test scripts found in their package manifests.
- Current API tests do not run successfully because Jest fails during runtime setup before executing assertions.

Evidence:

- `apps/api/package.json`
- `apps/api/src/app.controller.spec.ts`
- `apps/api/test/app.e2e-spec.ts`
- `apps/web/package.json`
- `apps/mobile/package.json`

### Deployment Configuration

- No production deployment configuration was found in the root file list beyond framework defaults.
- Web build is available through `next build`.
- API build is available through `nest build`.
- Mobile is Expo development-oriented with LAN/tunnel commands.

Evidence:

- `apps/api/package.json`
- `apps/web/package.json`
- `apps/mobile/package.json`

## 2. Foundation Status

| Capability | Status | Evidence |
| --- | --- | --- |
| Authentication | complete for email/password MVP foundation | `apps/api/src/modules/auth`, `apps/web/src/features/auth`, `apps/mobile/src/features/auth` |
| Refresh-token flow | partial | API issues HTTP-only refresh cookie and web retries refresh; mobile does not implement refresh-token storage/rotation yet. Evidence: `apps/api/src/modules/auth/auth.controller.ts`, `apps/web/src/lib/api/api-client.ts`, `apps/mobile/src/providers/session-provider.tsx` |
| Password recovery | missing | Change-password exists, but forgot/reset password flow was not found. Evidence: `apps/api/src/modules/auth/dto/change-own-password.dto.ts`, no reset module/routes found by repository scan |
| Users | complete for foundation | API/web user management exists. Evidence: `apps/api/src/modules/users`, `apps/web/src/features/user-management`, `apps/web/src/app/(app)/users` |
| Roles | complete for foundation | API/web role and permission management exists. Evidence: `apps/api/src/modules/roles`, `apps/web/src/features/user-management`, `apps/web/src/app/(app)/roles` |
| Permissions | partial | Foundation permissions exist and are seeded; construction module permissions are not yet added. Evidence: `packages/shared/src/constants/permissions.ts`, `apps/api/scripts/seed.ts` |
| Builder/tenant isolation | partial | Organizations and memberships exist and services enforce active membership; deeper tenant tests are not passing/running yet. Evidence: `apps/api/src/modules/organizations`, `apps/api/src/modules/project-access/project-access.service.ts` |
| Project scoping | partial | Projects and project members exist; `resolveProjectAccess` enforces assigned/all access. Business modules have not consumed it yet. Evidence: `apps/api/src/modules/projects`, `apps/api/src/modules/project-access/project-access.service.ts` |
| Audit logs | missing active runtime | Archived Prisma has `AuditLog`; no active API audit module/helper/table migration found. Evidence: `packages/database/prisma/schema.prisma`, `apps/api/src/modules` |
| Notifications | scaffold only | Permission resource and UI bell/showcase references exist; no active notification module/table/API found. Evidence: `packages/shared/src/constants/permissions.ts`, `apps/mobile/src/features/design-system`, `apps/api/src/modules` |
| Uploads/storage | partial | S3 storage service exists; active upload controller and file metadata ownership/access model were not found. Evidence: `apps/api/src/modules/upload/storage.service.ts`, migration note deferring `fileasset` relationships |
| API response standards | partial | Success/error envelopes exist by convention, but no central response helper/type standard was found. Evidence: controllers and `GlobalExceptionFilter` |
| Validation | complete for foundation | Global validation pipe plus DTOs. Evidence: `apps/api/src/main.ts`, module `dto` folders |
| Pagination/filtering | partial | Users/projects have query DTOs; no universal pagination/filter contract yet. Evidence: `apps/api/src/modules/users/dto/query-user.dto.ts`, `apps/api/src/modules/projects/dto/query-project.dto.ts` |
| Error handling | partial | Global exception filter exists; stable module error-code catalog is not implemented yet. Evidence: `apps/api/src/common/filters/global-exception.filter.ts`, `packages/shared/src/constants/errors.ts` |
| Web shell | complete for foundation | Protected shell, sidebar, top bar, routes. Evidence: `apps/web/src/app/(app)/layout.tsx`, `apps/web/src/components/common` |
| Mobile shell | complete for foundation | Expo Router auth/app groups, session provider, dashboard/menu/workflow routes. Evidence: `apps/mobile/app`, `apps/mobile/src/providers/session-provider.tsx` |
| Shared theme | complete for foundation | Shared, web, and mobile theme tokens exist. Evidence: `packages/shared/src/theme`, `apps/web/src/theme`, `apps/mobile/src/theme` |
| Shared contracts | partial | Foundation constants/statuses exist; module-specific contracts are mostly docs, not shared schemas yet. Evidence: `packages/shared/src/constants`, `packages/shared/src/schemas/index.ts` |
| Offline infrastructure | scaffold only | Secure storage and sync-status UI exist; no offline queue/local DB/conflict engine found. Evidence: `apps/mobile/src/components/ui/sync-status.tsx`, `apps/mobile/src/lib/storage` |
| Tests | inconsistent | Type-check/build pass, API Jest fails, web lint fails. Evidence: verification section below |
| CI/build verification | unverified | No CI config found; local build/type-check commands were run. Evidence: repository file list and verification section |

## 3. Existing Business Modules

| Module | Database | Backend | Web | Mobile | Tests | Readiness |
| --- | --- | --- | --- | --- | --- | --- |
| Auth/session | inherited tables plus refresh token table | implemented | login/profile integration | login/session storage | API tests failing at Jest runtime | foundation-ready, mobile refresh partial |
| Users | inherited `user` table | implemented | list/create/detail/edit | not a mobile business module | API tests failing | foundation-ready |
| Roles/permissions | inherited `role` and `permission` tables | implemented | list/create/detail/permissions | permission payload consumed | API tests failing | foundation-ready |
| Settings | inherited `systemsetting` table | implemented | settings page | not implemented | API tests failing | foundation-ready |
| Organizations | `organizations`, `organization_members` | implemented | list/detail/member basics | session consumes active organization | not verified by tests | partial but usable foundation |
| Projects/project assignments | `projects`, `project_members` | implemented | list/create/detail/member assignment | project switcher and session access | not verified by tests | partial but usable foundation |
| Upload/storage | no active file metadata table confirmed | storage service only | no complete module found | no complete module found | unverified | partial foundation |
| Workers | missing | missing | missing | missing | missing | not started |
| Attendance | missing | missing | placeholder copy only | missing | missing | not started |
| Wages | missing | missing | placeholder copy only | missing | missing | not started |
| Kharchi | missing | missing | placeholder copy only | missing | missing | not started |
| Materials | missing | missing | placeholder copy only | missing | missing | not started |
| Expenses | missing | missing | placeholder copy only | missing | missing | not started |
| Progress/gallery | missing | missing | missing | missing | missing | not started |
| Sales modules | missing | missing | missing | missing | missing | not started |
| Notifications | missing active table/module | missing | bell/showcase only | bell/showcase only | missing | scaffold only |
| Audit | missing active table/module | missing | no review UI found | not applicable yet | missing | missing |

## 4. Architecture Gaps That Block Safe Module Development

These gaps should be handled before or inside the first business module implementation plan:

1. Construction permissions are absent from `packages/shared/src/constants/permissions.ts`; Workers cannot be secured until `workers:*` permissions are added and seeded.
2. Active audit infrastructure is missing; worker create/update/deactivate/assignment changes should either implement a minimal audit helper in the Workers plan or explicitly defer non-financial worker audit until the Audit Foundation.
3. Offline sync infrastructure is scaffold-only; the Workers contract may define offline behavior, but implementation must either create a minimal queue/idempotency foundation or keep offline writes behind a later offline-sync slice.
4. Notification infrastructure is scaffold-only; Workers itself has few notification needs, so this does not block Workers if notifications are explicitly deferred for this module.
5. API and web lint/test gates are failing; module development can continue, but release acceptance cannot claim clean lint/tests until those existing gates are fixed.

Not blockers:

- Prisma references in `packages/database/prisma` are archived history, not active runtime.
- Upload storage partial state does not block Workers unless worker documents/photos are promoted into MVP scope.
- Mobile refresh-token strategy does not block Workers contract drafting, but should be solved before longer real field sessions are accepted.

## 5. Current Verification Results

Commands run on 2026-08-05:

| Command | Result | Notes |
| --- | --- | --- |
| `pnpm --filter @nirman-app/shared type-check` | passed | TypeScript no emit |
| `pnpm --filter @nirman-app/api type-check` | passed | TypeScript no emit |
| `pnpm --filter @nirman-app/web type-check` | passed | TypeScript no emit |
| `pnpm --filter @nirman-app/mobile type-check` | passed | TypeScript no emit |
| `pnpm --filter @nirman-app/database type-check` | passed | Archived package type-check |
| `pnpm --filter @nirman-app/shared build` | passed | `tsc` |
| `pnpm --filter @nirman-app/api build` | passed | `nest build` |
| `pnpm --filter @nirman-app/web build` | passed | `next build`, 15 static/dynamic routes generated |
| `pnpm --filter @nirman-app/api lint` | failed | 852 Prettier-format errors and 1 warning, mostly quote/style formatting |
| `pnpm --filter @nirman-app/web lint` | failed | 8 React hook lint errors for synchronous setState in effects, 2 `img` warnings |
| `pnpm --filter @nirman-app/api test` | failed | Jest runtime error: `this._moduleMocker.clearMocksOnScope is not a function` |
| `pnpm --filter @nirman-app/api test:e2e` | failed | Same Jest runtime error before tests execute |
| `pnpm db:migrate:status` | passed | Remote dev DB current: 2 local, 2 applied, 0 pending, 0 drafts |
| `git diff --check` | passed | No whitespace errors at time of check |

Formatting:

- No read-only format check script exists. `apps/api` has `format`, but it runs `prettier --write`, so it was not run during this documentation-only assessment.

Prisma validation:

- Not run. Active Prisma tooling is intentionally archived and removed from the active runtime path. `packages/database/README.md` says not to run Prisma commands for new NirmanSite work.

## 6. Actual Current Project Stage

The project is after foundation implementation and runtime smoke. Current stage:

```text
Foundation complete enough to begin first contract-driven MVP business module, with known quality-gate gaps.
```

The correct next gate is contract review for the first mature business module, not direct code implementation.
