# Mobile Sales lead-detail loading fix - 2026-09-23

`SalesLeadScreen` depended on the entire project object in its loading callback. `getActiveProject` normalizes projects into new objects on every render, so loading/data state changes recreated the callback and restarted the effect indefinitely.

The callback now depends on organization/project IDs, lead ID, access token and translation function. Manual refresh and post-action reloads remain available. No API, database, permission or UI layout changes.

Verification: `node apps/mobile/scripts/verify-sales-lead-loading.cjs` passes. This isolated check executes the screen's loading hooks with mocked requests and hook scheduling: initial load settles; local edits and equivalent session objects do not reload; refresh and request identity changes reload; failures settle and explicit recovery succeeds. Restoring the original dependency array in memory makes the same check fail with a repeated fetch/render loop. This is not a native renderer or device test.

Mobile type-check (`pnpm --filter @nirman-app/mobile type-check`) and `git diff --check` passed.

Physical-device and authenticated API request-count acceptance remain pending. On device, open a lead and wait: lead/timeline requests should settle and the loading indicator disappear. Edit a note without saving to confirm no refetch, then refresh and save an action to confirm deliberate reloads still work.

The existing current-task document has invalid UTF-8, so this bounded fix is recorded separately without rewriting unrelated task history.

## Lead action popup responsiveness

Assign salesperson, Record unit interest, Request unit hold and Confirm booking previously awaited option reads before opening their sheets. They now open synchronously and load options in an effect with sheet-local loading, errors and Retry. Closing or switching a sheet invalidates its pending response. Submission remains disabled while required options load or fail, and no-inventory booking still skips inventory reads. Assignment shows a localized empty state when there are no active Project members. Stage, timeline-note, follow-up, visit and edit sheets already open without prerequisite reads.

`node apps/mobile/scripts/verify-sales-lead-sheets.cjs` passes deferred-request checks for all four sheet openers, close/reopen races, late failures after switching, error recovery, booking unit filtering and booking without inventory permission. The earlier loading-loop check, Mobile type-check, locale validation (18 namespaces, en/hi/gu) and scoped diff check also pass. These checks exercise isolated screen orchestration, not native modal animation. Device acceptance remains open: test each action with slow connectivity, close during loading, reopen, and retry after a read fails.
