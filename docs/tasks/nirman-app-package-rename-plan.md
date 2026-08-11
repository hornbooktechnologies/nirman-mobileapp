# Nirman App Package Rename Plan

## 1. Purpose

Plan a safe, mechanical rename of the inherited monorepo package identity from `enterprise-app-template` / `@enterprise-template/*` to `nirman-app` / `@nirman-app/*`.

This is a package identity cleanup only. It should make package names, workspace dependency references, package filter commands, shared app constants, and command documentation match the approved Nirman App identity without changing product behavior.

## 2. Current Problem

The repository already documents and implements NirmanSite product work, but inherited template naming still appears in package metadata, workspace dependency names, TypeScript import paths, shared constants, command examples, and the lockfile.

Current examples found by read-only inspection:

- Root package name is `enterprise-app-template`.
- Workspace package names are `@enterprise-template/api`, `@enterprise-template/web`, `@enterprise-template/mobile`, `@enterprise-template/shared`, and `@enterprise-template/database`.
- Root package scripts delegate through `pnpm --filter @enterprise-template/...`.
- Runtime imports reference `@enterprise-template/shared`.
- `packages/shared/src/constants/app.ts` exports `DEFAULT_APP_NAME = 'Enterprise App'` and `APP_STORAGE_NAMESPACE = 'enterprise-template'`.
- Documentation still contains `@enterprise-template/*` verification and run commands.
- `pnpm-lock.yaml` contains existing `@enterprise-template/shared` workspace references.

Leaving this mixed identity in place makes future package filters, imports, onboarding docs, and generated AI plans more error-prone.

## 3. Approved Target Names

| Current name | Target name |
| --- | --- |
| `enterprise-app-template` | `nirman-app` |
| `@enterprise-template/api` | `@nirman-app/api` |
| `@enterprise-template/web` | `@nirman-app/web` |
| `@enterprise-template/mobile` | `@nirman-app/mobile` |
| `@enterprise-template/shared` | `@nirman-app/shared` |
| `@enterprise-template/database` | `@nirman-app/database` |
| `Enterprise App` | `Nirman App` |
| `enterprise-template` storage namespace | `nirman-app` |

Product/UI text that intentionally says `NirmanSite` should remain `NirmanSite` unless a separate product-branding decision is approved.

## 4. Files Likely To Change

Package metadata:

- `package.json`
- `apps/api/package.json`
- `apps/web/package.json`
- `apps/mobile/package.json`
- `packages/shared/package.json`
- `packages/database/package.json`

Shared identity constant:

- `packages/shared/src/constants/app.ts`

TypeScript import consumers found in the current scan:

- `apps/api/scripts/seed.ts`
- `apps/api/src/app.service.ts`
- `apps/api/src/modules/organizations/dto/create-organization.dto.ts`
- `apps/api/src/modules/organizations/dto/update-member.dto.ts`
- `apps/api/src/modules/organizations/dto/update-organization.dto.ts`
- `apps/api/src/modules/organizations/organizations.service.ts`
- `apps/api/src/modules/organizations/types/organizations.types.ts`
- `apps/api/src/modules/project-access/project-access.service.ts`
- `apps/api/src/modules/project-access/types/project-access.types.ts`
- `apps/api/src/modules/projects/dto/create-project.dto.ts`
- `apps/api/src/modules/projects/dto/query-project.dto.ts`
- `apps/api/src/modules/projects/dto/update-project.dto.ts`
- `apps/api/src/modules/projects/dto/upsert-project-member.dto.ts`
- `apps/api/src/modules/projects/projects.service.ts`
- `apps/api/src/modules/projects/types/projects.types.ts`
- `apps/api/src/modules/roles/dto/set-permissions.dto.ts`
- `apps/mobile/src/lib/auth/session.ts`
- `apps/mobile/src/theme/tokens.ts`
- `apps/web/src/components/common/sidebar.tsx`
- `apps/web/src/features/organizations/components/organization-detail-page.tsx`
- `apps/web/src/features/organizations/components/organization-list-page.tsx`
- `apps/web/src/features/organizations/types/organizations.types.ts`
- `apps/web/src/features/projects/components/project-form-fields.tsx`
- `apps/web/src/features/projects/components/project-list-page.tsx`
- `apps/web/src/features/projects/components/project-members-panel.tsx`
- `apps/web/src/features/projects/types/projects.types.ts`
- `apps/web/src/features/user-management/components/role-detail-page.tsx`
- `apps/web/src/providers/auth-provider.tsx`
- `apps/web/src/theme/tokens.ts`
- `packages/database/prisma/seed.ts`

Generated dependency state:

- `pnpm-lock.yaml` after `pnpm install` in the implementation task.

Documentation references likely to change are listed in section 7.

## 5. Import Paths Likely To Change

Replace active package imports from:

```ts
@enterprise-template/shared
```

to:

```ts
@nirman-app/shared
```

No import shape, exported symbol, business logic, route, DTO, repository, service, screen, or component behavior should change. This should be a source-string replacement only after the workspace package name and dependency references are updated.

The archived Prisma seed at `packages/database/prisma/seed.ts` also imports `@enterprise-template/shared`. Because `packages/database` is archived history, update only the import/package reference needed for workspace consistency; do not resume Prisma tooling or run Prisma commands.

## 6. Package Scripts Likely To Change

Root scripts in `package.json` should move from `@enterprise-template/*` filters to `@nirman-app/*` filters:

- `dev`: build `@nirman-app/shared` before `turbo dev`.
- `mobile:lan`: delegate to `@nirman-app/mobile`.
- `mobile:tunnel`: delegate to `@nirman-app/mobile`.
- `db:migrate`: delegate to `@nirman-app/api`.
- `db:migrate:status`: delegate to `@nirman-app/api`.
- `db:seed`: delegate to `@nirman-app/api`.

Verification and documentation commands should likewise use `pnpm --filter @nirman-app/...` after the rename is implemented.

## 7. Documentation References Likely To Change

Update documentation where the text describes current package identity, package-filter commands, onboarding commands, or verification commands:

- `README.md`
- `CODEX.md`
- `NEW_APP_SETUP.md`
- `docs/ai-development/MODULE_AUTOMATION_RULES.md`
- `docs/ai-context/03-development-rules.md`
- `docs/ai-context/04-mobile-development-rules.md`
- `docs/decisions/004-database-access-mysql2.md`
- `docs/phases/MVP_PHASES.md`
- `docs/tasks/PROGRESS_LEDGER.md`
- `docs/tasks/current-task.md`
- `docs/tasks/local-run-setup.md`
- `docs/tasks/mysql2-migration-runner-implementation-plan.md`
- `docs/tasks/phase-1-backend-foundation-plan.md`
- `docs/tasks/phase-1-foundation-review.md`
- `docs/tasks/phase-1-identity-project-technical-plan.md`

Historical notes may keep old names only when they are explicitly describing prior state, prior command output, or an audit trail. If retained, add a short note that the old package scope was inherited and has since been renamed.

Do not rename intentional `NirmanSite` product/domain references to `Nirman App` as part of this task. Product naming is a separate branding decision.

## 8. Lockfile Handling

Do not edit `pnpm-lock.yaml` manually.

During implementation, package metadata and dependency references should be changed first. Then run `pnpm install` once in a dedicated lockfile slice to let pnpm rewrite workspace package snapshots and importers.

Before the lockfile slice, expect `pnpm-lock.yaml` to still contain `@enterprise-template/shared`. That is acceptable until `pnpm install` is explicitly run. After the lockfile refresh, scan the lockfile to confirm inherited package names are gone except any intentionally retained historical references elsewhere in docs.

## 9. Safe Implementation Order

1. Confirm the working tree and re-run the inherited-name scan.
2. Rename package names in root and workspace `package.json` files.
3. Update workspace dependency references from `@enterprise-template/shared` to `@nirman-app/shared`.
4. Update `packages/shared/src/constants/app.ts` to `DEFAULT_APP_NAME = 'Nirman App'` and `APP_STORAGE_NAMESPACE = 'nirman-app'`.
5. Replace active TypeScript imports from `@enterprise-template/shared` to `@nirman-app/shared`.
6. Update root package scripts and documentation command references from `@enterprise-template/*` to `@nirman-app/*`.
7. Run `pnpm install` once to refresh `pnpm-lock.yaml`.
8. Run verification commands in section 10.
9. Re-scan for inherited strings and classify any remaining references as either intentional historical notes or missed rename targets.
10. Update progress/current-task documentation with exact verification status.

## 10. Verification Commands

Use these checks after implementation and lockfile refresh:

```bash
pnpm --filter @nirman-app/shared build
pnpm --filter @nirman-app/shared type-check
pnpm --filter @nirman-app/api type-check
pnpm --filter @nirman-app/api build
pnpm --filter @nirman-app/web type-check
pnpm --filter @nirman-app/mobile type-check
git diff --check
```

Recommended read-only confirmation scans:

```bash
rg -n "enterprise-app-template|@enterprise-template|Enterprise App|enterprise-template|pnpm --filter @enterprise-template" -g "!node_modules" -g "!dist" -g "!build"
rg -n "@nirman-app|nirman-app|Nirman App" package.json apps packages docs README.md CODEX.md NEW_APP_SETUP.md
```

Do not run database migration, seed, or live smoke commands for this package rename unless a separate task explicitly requires them.

## 11. Risks

- Workspace package filters will fail until all package names, dependency references, scripts, and lockfile entries are aligned.
- TypeScript imports will fail if any `@enterprise-template/shared` reference remains after the package rename.
- `packages/shared/dist` declarations may be stale until `@nirman-app/shared` is rebuilt.
- Mobile secure storage namespace change from `enterprise-template` to `nirman-app` can effectively log users out or make older local tokens inaccessible. That is acceptable only if treated as an intentional namespace reset.
- Documentation may contain historical `@enterprise-template/*` references that should not be blindly rewritten if they are audit-history evidence.
- Renaming `NirmanSite` product copy to `Nirman App` would create a branding change beyond the approved package identity cleanup.
- Manual lockfile edits can create pnpm inconsistencies; use `pnpm install`.

## 12. Rollback Notes

If implementation fails before `pnpm install`, revert only the package metadata, dependency references, imports, scripts, and shared constants changed in that slice.

If implementation fails after lockfile refresh, revert the same source/doc changes and rerun `pnpm install` to regenerate the lockfile back to the previous workspace package identity.

If the storage namespace change causes unacceptable local-session disruption during manual testing, either restore `APP_STORAGE_NAMESPACE = 'enterprise-template'` temporarily or plan a deliberate migration/dual-read strategy as a separate task.

Do not use broad destructive git commands. Roll back by reviewing the focused diff and applying targeted reversions.

## 13. Explicitly Out Of Scope

- Implementing this rename during this planning task.
- Editing package manifests during this planning task.
- Editing imports during this planning task.
- Running `pnpm install` during this planning task.
- Editing `pnpm-lock.yaml` during this planning task.
- Changing database schema, migrations, seed data, API behavior, web screens, or mobile screens.
- Running builds, type-checks, tests, migrations, seeds, or live smoke checks during this planning task.
- Renaming product/domain documentation from `NirmanSite` to `Nirman App`.
- Adding dependencies or changing package structure beyond package names and workspace references.
- Publishing packages.

## 14. Implementation Slices

### Slice 1: Package Identity Metadata

Scope:

- Rename package names in root and workspace `package.json` files.
- Update workspace dependency references.
- Update `packages/shared/src/constants/app.ts`.
- Do not update all docs yet.

Expected files:

- `package.json`
- `apps/api/package.json`
- `apps/web/package.json`
- `apps/mobile/package.json`
- `packages/shared/package.json`
- `packages/database/package.json`
- `packages/shared/src/constants/app.ts`

Verification:

- Read-only scan of package metadata and shared constants.
- No `pnpm install` yet.
- No builds/type-checks yet.

### Slice 2: Active Imports And Package Filters

Scope:

- Replace TypeScript imports from `@enterprise-template/shared` to `@nirman-app/shared`.
- Update package scripts using `pnpm --filter @enterprise-template/*` to `@nirman-app/*`.

Expected files:

- Active API, web, mobile, and archived database TypeScript files listed in section 4.
- Root `package.json` scripts.

Verification:

- `rg -n "@enterprise-template/shared" apps packages`
- `rg -n "pnpm --filter @enterprise-template" package.json`

### Slice 3: Documentation References

Scope:

- Update docs where they describe package identity, package filters, onboarding commands, or verification commands.
- Preserve historical notes where needed and label them as inherited/pre-rename history.
- Keep `NirmanSite` product naming unless a separate product-branding task approves a change.

Expected files:

- Documentation files listed in section 7.

Verification:

- `rg -n "enterprise-app-template|@enterprise-template|Enterprise App|enterprise-template|pnpm --filter @enterprise-template" README.md CODEX.md NEW_APP_SETUP.md docs`
- Review remaining hits one by one.

### Slice 4: Lockfile Refresh And Verification

Scope:

- Run `pnpm install` to refresh `pnpm-lock.yaml`.
- Run the approved verification command set.
- Update task/progress docs with exact outcomes.

Expected files:

- `pnpm-lock.yaml`
- `docs/tasks/current-task.md`
- `docs/tasks/PROGRESS_LEDGER.md`
- Any missed package/doc references found by verification.

Verification:

```bash
pnpm --filter @nirman-app/shared build
pnpm --filter @nirman-app/shared type-check
pnpm --filter @nirman-app/api type-check
pnpm --filter @nirman-app/api build
pnpm --filter @nirman-app/web type-check
pnpm --filter @nirman-app/mobile type-check
git diff --check
```

Final report should list all changed files, the remaining inherited-name scan results, verification command results, and any historical references intentionally preserved.
