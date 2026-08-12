# Mobile Architecture

NirmanSite mobile has an Expo / React Native field application in `apps/mobile` with authenticated session resolution, active organization/project context, and an initial Workers project workflow.

The current application includes routing, secure session helpers, API/storage helpers, mobile-only UI primitives, project switching, and a Workers roster/quick-create flow. Persisted offline cache, queued writes, idempotency, sync, and conflict handling are not implemented.

## Responsibilities

The mobile app should focus on field and fast-response workflows:

- Site progress updates with photos, notes, percentage completion, and location or timestamp metadata where required.
- Task and issue status updates for project managers, site engineers, contractors, and supervisors.
- Daily activity capture, checklist completion, and evidence upload.
- Lead, customer, booking, and follow-up actions that sales teams need while away from the office.
- Push notifications for approvals, assigned tasks, overdue follow-ups, payment reminders, and document requests.
- Read-only project, unit, customer, and payment summaries for authorized users.

## Architecture Assumptions

- Use Expo with React Native and TypeScript.
- Use Expo Router with route groups:
  - `app/(auth)` for unauthenticated screens.
  - `app/(app)` for protected screens.
- Reuse `packages/shared` for permission keys, statuses, schema contracts, and domain types.
- Use the same NestJS API as the web portal.
- Use token-based auth compatible with mobile secure storage. Refresh-cookie behavior from web may need a mobile-specific refresh-token strategy.
- Treat offline support as a generic foundation decision. Do not claim data is cached or writes are queued until persisted storage, connectivity, idempotency, sync, and conflict contracts exist.
- Use API-generated or shared validation contracts rather than duplicating request shapes inside the mobile app.

## Current Foundation Structure

- `apps/mobile/app/_layout.tsx`: root Expo Router layout and providers.
- `apps/mobile/app/index.tsx`: session/loading redirect.
- `apps/mobile/app/(auth)`: login and invitation activation routes.
- `apps/mobile/app/(app)`: protected dashboard, project, profile, and Workers routes.
- `apps/mobile/src/config`: mobile app configuration.
- `apps/mobile/src/providers`: app and session providers.
- `apps/mobile/src/lib/api`: API request helper.
- `apps/mobile/src/lib/auth`: mobile session helpers.
- `apps/mobile/src/lib/storage`: secure storage wrapper.
- `apps/mobile/src/features/auth`: authentication and activation flows.
- `apps/mobile/src/features/projects`: active project selection and project views.
- `apps/mobile/src/features/workers`: active-project roster and online create-and-assign quick flow.
- `apps/mobile/src/components/ui`: mobile UI primitives.
- `apps/mobile/src/components/common`: shared mobile shell components.

## Boundaries

- Mobile should not own business rules that belong in the API.
- Mobile should not define independent permission names or statuses.
- Mobile screens should be workflow-first, not a full copy of every back-office page.
- Mobile should not reuse web React components.
- Mobile should not add offline-first sync before a dedicated sync plan is approved.
- Workers writes are online-only. A failed read may retain only the roster already loaded in the current process; this is not a persisted offline cache.

## Early Mobile Modules

- Authentication and profile.
- Assigned tasks and issues.
- Site progress update capture.
- Checklist completion.
- Photo and document upload.
- Sales follow-ups and customer quick view.
- Notifications.
