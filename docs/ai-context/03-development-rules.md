# Development Rules

## Safety

- Do not edit generated files.
- Do not commit `.env`.
- Do not add product-specific logic to shared platform modules.
- Do not add a permission without a matching UI or API use case.

## Code Style

- Prefer TypeScript types close to their module.
- Keep API controllers thin and move business logic into services.
- Keep `mysql2` SQL access in API repositories.
- Use parameterized SQL for every user-provided value.
- Do not import database drivers from web, mobile, or shared packages.
- Keep frontend API calls in feature service files.
- Keep page route files small and delegate UI to feature components.

## Verification

Run targeted checks after changes:

```bash
pnpm lint
pnpm type-check
pnpm test
pnpm build
```

For database changes, also run:

```bash
pnpm --filter @nirman-app/api type-check
pnpm --filter @nirman-app/api build
```

Also scan for accidental Prisma usage and accidental database imports in web/mobile.

Do not reintroduce `@prisma/client`, `PrismaService`, Prisma package scripts, or generated Prisma client imports into active runtime/tooling.

### Search controls

Use Web SearchInput or native SearchField for existing search UI. They keep immediate text while applying trimmed queries after 300 ms; do not add a second debounce around them. Reset pagination together with a changed search, preserve other filters and tenant/access scope, and ignore obsolete responses. Native complete collection pickers must read later API pages. Attendance currently owns its query debounce and opts out at the field. See docs/architecture/frontend.md for details.
