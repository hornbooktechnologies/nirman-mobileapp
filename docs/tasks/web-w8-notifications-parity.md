# W8 Web Notifications parity and review

## 1. Status and scope

Implemented 2026-09-21; focused verification passed. Not accepted: authenticated browser/cross-client checks and exact Gallery entry navigation remain pending.

Reviewed W8 plan, CODEX, MVP, module contract/status, shared types/constants, Mobile inbox/provider/routing/services, API controller/DTO/service/repository/migrations and current producers, Web authentication/project-access/shell/components and destination modules. No applicable AGENTS.md found. Existing foundations support this slice. Current producers remain Materials, Expenses and Gallery.

Preserved concurrent Mobile configuration, Sales and documentation work. Changes are Web/docs only; no API, Mobile, database, migrations, seeds, commit, push or deployment.

## 2. Implemented work

`/notifications`, Main navigation and accessible header unread badge; All/Unread, 25-item server pagination, importance/read labels, English server content and refresh. Read one/all and read-before-open have duplicate-action prevention, success/error/retry and inaccessible/deleted-record feedback. Counts refresh from the server rather than optimistic subtraction.

A notification-only QueryClient is scoped by user/organization/permission availability, cancels requests and clears on switch/sign-out. No previous-context placeholder data. Foreground 60-second polling and window-focus refetch synchronize other clients. Async actions stop after context changes or leaving the inbox. Fresh effective project grants precede target requests, route mapping ignores arbitrary deepLink strings, and target APIs reauthorize. Destination workspaces independently check access.

Existing semantic tokens/components, responsive wrapping, 44px actions, visible focus, semantic lists/headings/time and announced feedback are reused. No new dependencies, localization or fabricated metrics.

## 3. Mobile action -> API -> Web checklist

Inbox base: `/organizations/:organizationId/notifications`; all operations require `notifications:read` and derive recipient from authentication.

| Mobile action | API / fields | Web implementation / evidence |
| --- | --- | --- |
| Inbox/load more | GET base; page/pageSize/unreadOnly; items/pagination | All/Unread, 25-item pages, previous/next, loading/empty/error/retry; adapter test |
| Unread badge | GET /summary; unreadCount | Header/inbox share scoped summary; focus/foreground refresh; cache isolation test |
| Read/open one | POST /:notificationId/read; id/read | Mark as read and read-before-open; server refresh; deliberate retry preserves endpoint; adapter test |
| Mark all | POST /read-all; updated | Submission guard, list/count invalidation, return to page 1; no invented version/idempotency fields |
| Materials/Expenses targets | GET project-access/me, then existing detail GET | Exact project-specific detail routes; effective grants and preflight failure tests |
| Lead/Unit targets (no current producers) | Existing Lead detail / authorized Unit list | Existing exact Web detail routes; API remains visibility authority |
| Gallery target | Only list/media APIs available | Explains exact-target limitation and offers authorized Gallery module; no all-pages scan |
| Site visit/wage payment (no current producers) | Existing module lists | Explicit authorized module fallback, as Mobile does; no exact-record claim |
| Unknown reference | No supported target | Readable message, explicit unsupported-destination error; arbitrary URLs ignored |
| Expo registration/delivery | ANDROID/IOS-only DTO | Deferred Web push; no registration/delivery claim |

No notification create/edit/delete form, export, calculations, versioned workflow or separate history API exists. The durable inbox is available history. Read operations are API-idempotent; no new business contract was introduced.

## 4. Verification

- Eight focused Node tests passed: recipient/organization isolation, effective CUSTOM grants, allowlisted/encoded routes, cache cancellation/disposal, API mapping, deliberate retries, denied/deleted preflight and missing Unit handling.
- Scoped ESLint passed: Notifications, route, shell, top bar, navigation.
- Whole-Web type-check ran: existing Workers hook non-async await/mutation-return errors only; no Notifications errors reported.
- Whole-Web lint ran: six existing Attendance memoization and Organization Detail/Project Detail/Settings effect errors; no Notifications errors.
- Production build attempted twice: network-enabled retry resolved font downloads and still failed on existing Attendance invalid UTF-8 and three Workers await syntax errors. No Notifications build error reported.
- `git diff --check` passed with existing CRLF conversion warnings.

## 5. Runtime and acceptance

No authenticated browser tab or authorized test credentials/fixtures were available. No business records were mutated for testing. Pending: authenticated producer -> inbox -> read -> destination, Mobile/Web read-count sync, Owner/Supervisor/Viewer/CUSTOM/platform separation, revoked access, organization switch during slow requests, expired session, narrow/wide layout, 200% zoom, keyboard and screen-reader checks. Static checks do not prove runtime acceptance.

## 6. Discrepancies and backend requirement

Mobile inbox routing uses current project context and sometimes module-list destinations; Web uses notification.projectId and fresh effective access. Mobile silently ignores receipt failures and locally decrements counts; Web surfaces failures and reloads server counts. Mobile mark-all lacks visible catch feedback; Web includes it. These safeguards do not alter business rules.

**Exact Gallery entry gap (also W6):** no `GET /organizations/:organizationId/projects/:projectId/gallery/entries/:entryId` metadata lookup or entry-ID filter exists. A notification can reference an entry outside the current page; media alone cannot supply entry metadata/actions. Smallest proposed backend change: this GET returning existing GalleryEntry with the same organization/project/read/non-approved visibility guards as media. No schema change needed. Explicit backend authorization is required and has not been given; no backend change made. Web offers the authorized Gallery module with an explicit limitation.

Browser push needs a separate transport and remains deferred. No backend requirement blocks inbox/read/count functionality.

## 7. Recommendation

Independent Web work can continue. Resolve existing whole-Web blockers, authorize the bounded Gallery lookup if exact-entry acceptance is required, then run authenticated and accessibility checks. W8 is implemented, not accepted.
