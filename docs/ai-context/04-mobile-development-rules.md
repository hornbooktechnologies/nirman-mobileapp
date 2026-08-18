# Mobile Development Rules

## Scope

NirmanSite mobile uses Expo, React Native, TypeScript, and Expo Router.

The mobile app lives in `apps/mobile` and should remain focused on mobile workflows. Do not reuse web React components from `apps/web`.

## Safety

- Do not change database schema, SQL migration files, or backend repositories while working on mobile-only foundation tasks.
- Do not create NirmanSite business modules until the backend contracts and permissions are approved.
- Do not add offline-first sync until a dedicated mobile sync plan is approved.
- Do not duplicate business rules that belong in the NestJS API.
- Do not define independent permission names or statuses in mobile; use `packages/shared` when shared constants or types are needed.

## Structure

- Use `app/` for Expo Router routes.
- Use route groups for high-level shells:
  - `app/(auth)` for unauthenticated screens.
  - `app/(app)` for protected screens.
- Keep reusable native UI in `src/components/ui`.
- Keep shared mobile shell components in `src/components/common`.
- Keep provider setup in `src/providers`.
- Keep API helpers in `src/lib/api`.
- Keep session helpers in `src/lib/auth`.
- Keep secure persistence helpers in `src/lib/storage`.
- Keep feature code under `src/features`.
- Keep feature-specific reusable composites in `src/features/<feature>/components`; screen files should compose components and own workflow/orchestration logic, not duplicate visual controls.

## UI and theming

- Use semantic values from the shared mobile theme for color, typography, spacing, radius, elevation, and component states.
- Do not add raw colors or isolated one-off visual tokens inside screens or components.
- Build generic controls such as buttons, inputs, cards, badges, and list items once in `src/components/ui`, then reuse them across screens.
- Extend a shared component through typed props and variants when a reusable visual behavior is needed; do not copy its styles into a screen.
- Keep domain-specific composites close to their feature and build them from the shared UI primitives.

## Verification

For mobile-only changes, run:

```bash
pnpm --filter @nirman-app/mobile type-check
```

When dependencies change, run install first:

```bash
pnpm install
```

Full workspace checks can be run after larger cross-app work:

```bash
pnpm lint
pnpm type-check
pnpm build
```
