# W6 Web Gallery parity and review

2026-09-18. Implemented in source; authenticated/browser/cross-client acceptance pending.

## Audit and scope

Read W6 plan, CODEX, Gallery contract/status, Mobile screen/services/queue/private-image loader, API controller/DTO/service/repository, shared types/constants, current Web auth/access/components/navigation. No AGENTS.md found in the repository or inspected ancestors. Existing Web foundation supports the slice. Preserved unrelated dirty Mobile/Web/Expenses/Progress/documentation work. Only Web and docs changed; no backend/database/Mobile edits, commit, push or deployment.

## Mobile action -> API -> Web checklist

API base: `/organizations/:organizationId/projects/:projectId/gallery`.

| Mobile action | API contract | Web implementation |
| --- | --- | --- |
| Project access | Existing project-access summary, effective gallery:read | /gallery chooser and /projects/[id]/gallery access guard; CUSTOM restrictions before data requests |
| Diary/filter/pagination | GET /entries; page/pageSize/category/stage/status/dateFrom/dateTo | Month/day grid, URL filters, 24-item pages, loading/empty/error/retry/refresh |
| Summary | GET /summary; totalApproved/pendingReview/uploadedToday | Server counts |
| Private photo/detail | GET /entries/:id/media; list metadata | Authenticated lazy Blob images, cancellation/retry/revocation; full image, category/stage/caption, uploader/capture/upload/review metadata, reason, size/dimensions/version |
| Camera/library upload | POST /entries multipart; file/entryId/idempotencyKey/category/capturedAt plus stage/caption | Browser file/camera inputs, preview, shared MIME/10 MiB validation, caption limit, canonical enums |
| Durable upload/retry | Same POST, stable payload/identity | IndexedDB Blob persistence before request; user/org/project isolation, queued/uploading/failed states, attempts/errors and explicit retry; interrupted uploads recover as failed |
| Direct publish | API creates APPROVED for every permitted uploader | API result determines success; queued/offline never means published; active project and gallery:upload guard |
| Compatibility review (absent from current Mobile UI) | POST /entries/:id/approve or /reject; expectedVersion; reason 8-500 | Pending only, effective action grants, no self-review, submitting/error and stale reload |
| Sign-out/context change | Existing auth lifecycle | Disposable scoped query cache, request cancellation, queue purge on sign-out/session expiry and cross-tab sign-out notification |

## API authority and backend requirement

Mobile/API agree on direct publishing. W6 requests review states, so Web uses the existing compatibility actions only for returned PENDING records; no new approval workflow/settings. There is no availableActions field; API rejection remains authoritative.

**Standalone entry-link gap:** no single-entry metadata GET or ID filter exists. Mobile and Web open details using the current list. Stable `/projects/[id]/gallery/[entryId]` refreshable routes need `GET /entries/:entryId` returning GalleryEntry with the same project/tenant/read/non-approved visibility guards as media. No schema change is needed. This bounded backend addition requires explicit authorization and has not been made. Web does not scan every page to fake lookup.

No Gallery history-feed, export, edit or delete endpoint exists; no such workflow is invented. Available upload/review metadata is shown. Media is streamed (older contract says redirect). Optional dimensions remain absent when not supplied. Date-only API filters are forwarded unchanged; display/group timezone is Asia/Kolkata. Video/transforms/general offline sync remain excluded.

## UI review

English only; existing Manrope, semantic tokens, cards/dialog/loader. Readable labels, responsive grid, 44px controls, focus management and announced asynchronous feedback. ui-ux-pro-max keyboard-focus UX guidance applied; initial Next.js search had no match. Unsaved selection close/navigation/unload confirmation; preview URLs revoked. Queue/storage errors preserve selected input and expose retry. Queue remains local until successful upload or sign-out.

## Verification

- Eleven focused tests passed: effective/CUSTOM access, action/self-review restrictions, user/org/project isolation, interrupted identity recovery, file bounds, exact multipart replay/no automatic transport retry, scoped private reads/cancellation and review version/reason.
- Whole-Web type-check ran: existing Workers errors in use-workers.ts at 214/223/237/238 only; no Gallery diagnostics.
- Whole-Web lint ran: six existing errors in Attendance (3), Organization Detail, Project Detail and Settings. Gallery initially had two advisory img warnings; local Blob-image exceptions are now documented inline.
- Scoped ESLint passed for Gallery, routes and auth integration. Production build ran and failed on pre-existing Attendance invalid UTF-8 and Workers non-async await parsing errors.
- Queue transaction tests also cover storage abort/quota feedback, scoped Blob recovery and pending-write cancellation at sign-out; these use a deterministic IndexedDB test double, not browser storage acceptance.
- git diff --check passed. Repository Prettier executable is unavailable; no dependency was added.
- Browser inventory has no authenticated tab; no authorized identity/disposable fixture was supplied. Authenticated publish/private-media/review/replay, Web/Mobile parity, real IndexedDB quota/restart/sign-out, keyboard/screen-reader/zoom and responsive visual checks remain pending.

Queue persistence is preserved on transient profile/network failure; actual sign-out/session-clear purges it. Cross-tab sign-out uses a dedicated non-sensitive notification key, not generic token removal.
