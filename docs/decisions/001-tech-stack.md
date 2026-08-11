# Decision 001: Technology Stack

## Decision

Use a TypeScript monorepo with Next.js, NestJS, pnpm, and Turborepo.

Database architecture is superseded by `docs/decisions/004-database-access-mysql2.md`: NirmanSite should use MySQL/MariaDB through `mysql2`, not Prisma.

## Reason

This stack supports full-stack type sharing, clear app boundaries, modular backend architecture, and AI-friendly documentation-driven development.

## Consequences

- Workspace package names must stay consistent.
- Database changes must be planned as SQL/table changes and implemented through `mysql2` repositories after approval.
- Product modules should be isolated from reusable platform modules.
