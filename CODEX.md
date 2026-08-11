# Codex Instructions

You are working inside the NirmanSite repository.

Before changing code, inspect the relevant app, package, and Markdown context. Prefer existing patterns over new abstractions. Keep changes small, testable, and aligned with the approved NirmanSite planning docs.

Core rules:

- Use `pnpm` workspace commands.
- Keep package imports under `@nirman-app/*`. Product-facing copy may still say NirmanSite where that is intentional.
- Add reusable frontend work under `apps/web/src/components`, `apps/web/src/features`, or `apps/web/src/config`.
- Add reusable backend work under `apps/api/src/modules` or `apps/api/src/common`.
- Add shared constants and contracts under `packages/shared`.
- Runtime database access belongs in `apps/api` repositories using parameterized `mysql2` queries and API-local transactions.
- Update AI context docs when architecture, workflow, or development rules change.
- `apps/mobile` exists for mobile foundation work; do not add mobile business modules until their contracts are approved.

Do not implement product-specific modules before the related Markdown contract, permissions, and data model proposal are written.
