# NirmanSite Setup Notes

Use this checklist when turning the inherited monorepo foundation into NirmanSite.

1. Keep package scopes under `@nirman-app/*` unless a separate package-scope decision is approved.
2. Replace `NEXT_PUBLIC_APP_NAME` and related branding values in `.env.example` after branding approval.
3. Keep `docs/ai-context/00-project-mission.md` and `docs/ai-context/01-product-vision.md` current as product decisions change.
4. Add new business modules under `apps/api/src/modules` and `apps/web/src/features` only after module contracts are documented.
5. Add SQL table/migration plans only after writing and approving a database change note in `docs/tasks`; do not use Prisma for new NirmanSite work.
6. Extend shared permission resources in `packages/shared/src/constants/permissions.ts` only with matching API and UI workflows.
7. Add navigation entries in `apps/web/src/config/navigation.ts` only after permissions and routes are defined.
8. Add mobile business workflows only after Expo architecture, auth behavior, and the specific workflow contract are approved.
9. For database foundation work, run the targeted verification in `docs/tasks/current-task.md` and keep web/mobile as API clients only.

Keep shared packages deliberate. Product-specific terms may belong in shared constants, schemas, and contracts when API, web, and mobile must agree on the same language.
