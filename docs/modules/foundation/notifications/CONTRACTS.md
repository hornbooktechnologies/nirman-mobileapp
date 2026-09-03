# Notifications Foundation Contract

Status: implemented vertical slice, runtime and device acceptance pending. Authority: `MVP_REQUIREMENTS.md` section 24 plus current executable source.

## A. Module Identity

Notifications gives each customer user a private, durable inbox for important account, approval, project, financial, sales, and sync events. Mobile is the primary surface. Included now: in-app persistence, unread counts, read state, device registration, Expo push outbox/delivery, localized en/hi/gu presentation, badges, and safe deep links. Deferred until their producer modules are implemented: invitation, Kharchi, follow-up/reminder, lead assignment, site visit, unit, wage, and sync-failure producers; Web inbox; user category preferences; email/SMS/WhatsApp; push-receipt reconciliation and analytics.

Mandatory dependencies are Authentication, active Organization membership, RBAC, Project Access for target records, and producer transaction boundaries. Materials, Expenses, and Gallery currently produce events. All other modules may publish later through the reusable service without owning notification storage.

## B. Domain Terminology

- Notification: immutable user-specific message and source of truth.
- Push device: one authenticated user/device token registration for the active Organization and locale.
- Delivery: transactional outbox row for one notification/device pair.
- Deep link: navigation hint only; it never carries authorization.
- Unread: `read_at IS NULL`; delivery status does not affect read state.

## C. Actors And Permissions

Customer roles with `notifications:read` can list and update only their own notifications and devices in an active Organization membership. Project roles receive this permission through seeded templates. Custom roles require an explicit grant. Platform Super Admin receives no customer notification access. Producer services may create records only inside trusted API code; no public create endpoint exists.

## D. Business Workflows

Producer state change -> resolve active same-Project recipients by effective permission -> insert deduplicated notification and device deliveries in the producer transaction -> commit -> worker claims outbox -> Expo accepts ticket or delivery retries with bounded backoff. Permanent `DeviceNotRegistered` failures disable that device. Opening a notification marks it read, then navigates; the destination rechecks current permission and project access. Mark-all is user/Organization-scoped and idempotent.

## E. Domain Model

`notifications` owns immutable content, recipient, optional Project/reference/deep link, importance, dedupe key, read timestamp, and created timestamp. `notification_push_devices` owns Organization/user/token/platform/locale/active state and registration timestamps, unique per Organization/user/token. `notification_push_deliveries` owns notification/device status, attempts, retry time, provider ticket/error, locks, and delivery timestamps, unique per notification/device. Records are retained; no destructive client operation exists.

## F. Shared Application Contract

Shared constants define importance (`NORMAL|HIGH|URGENT`), device platforms (`ANDROID|IOS`), locales (`en|hi|gu`), delivery statuses, notification/list/summary/device response types, and stable notification errors. Producer-specific notification types remain in their domain constants.

## G. API Contract

Base: `/organizations/:organizationId/notifications`, permission `notifications:read`.

- `GET /?page&pageSize&unreadOnly` -> recipient-only paginated list.
- `GET /summary` -> `{ unreadCount }`.
- `POST /:notificationId/read` -> idempotent read receipt; `NOTIFICATION_NOT_FOUND` otherwise.
- `POST /read-all` -> updated count.
- `POST /devices` with Expo token, `ANDROID|IOS`, and `en|hi|gu` -> idempotent registration.
- `DELETE /devices/:deviceId` -> owner-scoped deactivation; `NOTIFICATION_DEVICE_NOT_FOUND` otherwise.

All routes require authentication and active membership. Device tokens never appear in list responses. There is no client-controlled notification creation, recipient, deep link, or delivery endpoint.

## H. Web-Admin Experience

No Web inbox is included in this slice. Future Web work must use these APIs and contracts, never read tenant tables directly.

## I. Mobile Experience

The Home header shows an accessible unread badge and opens the inbox. Menu also exposes Notifications. The inbox uses a virtualized list, All/Unread filters, pull-to-refresh, pagination, mark-all, explicit New badges, localized content, empty/loading/error/permission states, and 44pt-or-larger controls. A notification is marked read before navigating. Unsupported references remain readable but have no unsafe action.

## J. Offline And Synchronisation Contract

No offline cache or queued read mutation is claimed. Existing rows remain server-authoritative. Temporary network or push failure never removes the in-app record; push retry is server-side.

## K. Notifications

Current producers: Materials verification/final approval and requester results; Expense approval/results/adjustment; Gallery review/results. Approval-required events default to `HIGH`; other current events default to `NORMAL`. Recipients are specific user IDs, dedupe is source-event/user/type based, and current delivery channels are in-app plus Expo push. Client and push copy are localized in en/hi/gu with stored English fallback.

## L. Audit Events

Business actions remain audited by their producer module. Read receipts and device refreshes are operational state, not business audit events. Delivery attempts are immutable in intent but update a single outbox row with status/attempt evidence.

## M. Validation And Business Rules

Expo tokens must match the canonical `ExponentPushToken[...]` form and be at most 255 characters. Page size is 1-100. Notification ownership is never accepted from the client. Duplicate producer retries do not duplicate notifications or deliveries. Retry stops after five attempts; permanent invalid-token failures disable the device.

## N. Reporting And Analytics

MVP exposes only the current user's unread count. Delivery dashboards and cross-user engagement analytics are deferred.

## O. Security And Privacy

All reads/writes scope by Organization plus authenticated user. Project content is minimal. Deep links are hints and target APIs reauthorize. Device tokens are write-only from the client perspective. Push payloads contain identifiers and generic operational copy, not financial values or secrets.

## P. Acceptance Criteria

Migration creates device/outbox tables and importance. Seed grants notification access to operational roles but not Platform Super Admin. API recipient isolation, accurate unread count, idempotent read/device registration, transactional outbox, retry, and invalid-token handling pass. Mobile en/hi/gu locale validation, type-check, export, accessible badge/list, and deep-link mapping pass. Authenticated producer-to-inbox runtime, Expo development-build delivery, physical-device layout, screen-reader, large-text, and fluent-language review remain distinct acceptance gates until run.

## Q. Test Matrix

Required: service ownership and errors; repository recipient/list/count/dedupe/device/outbox SQL; worker success/retry/permanent failure; API auth/RBAC/tenant checks; producer rollback; mobile routing and device registration; authenticated end-to-end producer -> inbox -> read -> destination; physical Android/iOS push acceptance.

## R. Decisions And Deferred Work

Confirmed: in-app record is source of truth, visibility is user-specific, unread count must be accurate, and target access is revalidated. Safe implementation decision: Expo push is the mobile transport because the app is Expo-based; it is asynchronous and replaceable behind the outbox. Deferred items are listed in A; no unresolved decision blocks this authorized slice.
