# Backend Architecture

The backend is a NestJS application organized by module.

Each module should use this shape when useful:

- `*.controller.ts` for HTTP endpoints
- `*.service.ts` for business logic
- `*.repository.ts` for `mysql2` SQL access
- `dto/` for request validation
- `types/` for module-specific types

Global authentication uses JWT guards. Permission checks use shared permission keys.

## Database Access

NirmanSite backend database access is plain MySQL/MariaDB through `mysql2/promise`.

Rules:

- Keep database runtime code inside `apps/api`.
- Use one shared connection pool.
- Use repositories for SQL.
- Use parameterized queries.
- Use transactions for multi-table writes.
- Do not expose `mysql2` types through public controller contracts.
- Do not import database code from `apps/web`, `apps/mobile`, or `packages/shared`.
- Keep seed/database tooling inside `apps/api` unless a separate SQL package decision is approved.
