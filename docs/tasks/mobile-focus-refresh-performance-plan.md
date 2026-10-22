# Mobile focus refresh and startup stability plan

## Objective

Make Mobile open reliably on slower devices and show current server data whenever a user returns to an operational screen, without replacing useful content with a blank loader or changing existing write workflows.

## Confirmed causes

- Session hydration had a 1.2-second fallback that could release the protected router before SecureStore finished. On slower phones this could briefly render the wrong route and produce the reported startup blink.
- many retained Expo Router screens loaded only on first mount, so returning after an edit did not request current data.
- several screens cleared or hid their existing records during a refresh, producing a visible flash even when valid data was already available.
- overlapping list requests in high-traffic screens could allow an older response to replace newer filter or project data.

## Implementation phases

1. **Startup gate** — keep the protected application loading boundary active until stored session and project hydration completes or fails definitively.
2. **Shared focus lifecycle** — use one `useRefreshOnFocus` hook for route-focus reads, scope-change resets, blur cancellation, and rejected-promise containment.
3. **Module coverage** — migrate Dashboard, Workers, Wages, Calendar, Brochures, Progress, Attendance detail/marking, Expenses, Project Team, Gallery, Kharchi, Materials, and Members. Retain and review the existing focus refresh in Attendance, Total Expenses, Notifications, and Sales.
4. **Stale-while-refreshing UI** — preserve same-project records during automatic refresh; use blocking loaders only for an initial empty read or a genuine organization/project/filter scope change.
5. **Race protection** — invalidate request sequences on blur and ignore late list/detail responses where the screen can issue overlapping reads.
6. **Verification** — run Mobile type checking, locale parity, focused regression tests, route-lifecycle source audit, and diff checks. Perform final physical-device acceptance on at least one slower Android device.

## Acceptance criteria

- A slow SecureStore read cannot briefly redirect an authenticated user to Login or expose an incomplete Home route.
- Returning from create/edit/detail flows automatically fetches the latest data on every data-driven module screen.
- Same-scope refresh keeps current content visible and does not show a full-page loading flash.
- Changing organization, project, date/filter scope, or record identity cannot show data from the old scope.
- A late response cannot overwrite a newer Gallery, Workers, Materials, Expenses, Kharchi, Progress, or Dashboard read.
- Existing pull-to-refresh, refresh buttons, permissions, mutations, translations, and navigation remain intact.

## Non-goals

- No API contract, database schema, migration, production data, or deployment changes.
- No offline-first cache or background synchronization redesign.
- No alteration to create/edit/approve/payment command semantics.

## Implementation status

- Startup session hydration gate: implemented.
- Shared route-focus lifecycle: implemented.
- Operational module migration and existing-focus audit: implemented.
- Same-scope content preservation and key stale-response guards: implemented.
- Static verification: completed; see `current-task.md` and `PROGRESS_LEDGER.md`.
- Physical-device acceptance: pending on the user's target devices.
