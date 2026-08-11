# Database Package Archive

This package is no longer part of NirmanSite's active runtime or tooling path.

Prisma files under `packages/database/prisma` are retained only as inherited
schema and seed history while the mysql2 foundation replaces active database
access inside `apps/api`.

Do not run Prisma generate, migrate, push, studio, or seed commands for new
NirmanSite work. Active database access and seed tooling now live in `apps/api`.
