# Mobile Architecture

NirmanSite mobile now has an initial Expo / React Native foundation in `apps/mobile`.

The current foundation is intentionally small: routing, session placeholders, API/storage helpers, and mobile-only UI primitives. NirmanSite business modules and offline-first sync are not implemented yet.

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
- Treat offline support as a product decision. If approved, queue site updates, photos, checklist events, and issue changes locally until sync succeeds.
- Use API-generated or shared validation contracts rather than duplicating request shapes inside the mobile app.

## Current Foundation Structure

- `apps/mobile/app/_layout.tsx`: root Expo Router layout and providers.
- `apps/mobile/app/index.tsx`: session/loading redirect placeholder.
- `apps/mobile/app/(auth)/login.tsx`: login placeholder.
- `apps/mobile/app/(app)/dashboard.tsx`: protected dashboard placeholder.
- `apps/mobile/src/config`: mobile app configuration.
- `apps/mobile/src/providers`: app and session providers.
- `apps/mobile/src/lib/api`: API request helper.
- `apps/mobile/src/lib/auth`: mobile session helpers.
- `apps/mobile/src/lib/storage`: secure storage wrapper.
- `apps/mobile/src/features/auth`: auth feature placeholder.
- `apps/mobile/src/components/ui`: mobile UI primitives.
- `apps/mobile/src/components/common`: shared mobile shell components.

## Boundaries

- Mobile should not own business rules that belong in the API.
- Mobile should not define independent permission names or statuses.
- Mobile screens should be workflow-first, not a full copy of every back-office page.
- Mobile should not reuse web React components.
- Mobile should not add offline-first sync before a dedicated sync plan is approved.

## Early Mobile Modules

- Authentication and profile.
- Assigned tasks and issues.
- Site progress update capture.
- Checklist completion.
- Photo and document upload.
- Sales follow-ups and customer quick view.
- Notifications.
