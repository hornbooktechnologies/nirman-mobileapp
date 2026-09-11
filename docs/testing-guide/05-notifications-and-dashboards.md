# 05 — Notifications and Dashboards

## Notifications

Notifications are user-specific durable in-app records. Push delivery is supplemental: a failed push must not remove the inbox record. Opening a notification marks it read before navigation, and the destination must re-check current permission and Project access.

### ND-01 — Receive, read, filter, and navigate from a notification

1. Produce a supported event: Materials verification/approval/result, Expense approval/result/adjustment, or Gallery review/result.
2. Open the recipient’s Home badge and Notifications inbox.
3. Test All/Unread filters, pagination, pull-to-refresh, opening an item, and mark-all.

**Expected result:** only the intended user sees the record. Unread count equals records where `readAt` is absent. Opening is idempotent, marks the item read, then navigates only if access still exists. Mark-all affects only the signed-in user and active organisation.

### ND-02 — Notification privacy and device registration

1. Register a physical test device from the authenticated mobile app with its current locale.
2. Verify a recipient cannot read another user’s notifications by changing route parameters or switching organisation.
3. Remove/deactivate the device registration and repeat notification production.

**Expected result:** device tokens are write-only from the client view and are never returned by inbox APIs. Deep links are hints only and cannot bypass access. Invalid/unregistered push devices do not remove the in-app notification.

**Current producer boundary:** invitation, Kharchi, wage, attendance, lead, follow-up, site-visit, Unit, and sync-failure notifications are not current producer flows. Do not mark their absence as a defect until released.

## Role-specific dashboards

Dashboard content is determined by active organisation membership, Project access, `dashboards:read`, and effective custom Project grants. The displayed profile controls presentation priority; it does not grant data.

### ND-03 — Verify role-specific dashboard content

1. Sign in separately as an Owner/Project Manager, Contractor, Supervisor, Sales User, and a restricted custom role.
2. Select the same Project where each role has appropriate access.
3. Compare Home dashboard sections, metrics, and quick actions.

**Expected result:** sections that the role cannot read are `null`/hidden, not shown as misleading zero values. Quick actions are server-derived. Platform roles have no customer dashboard by default.

### ND-04 — Verify project switching and financial data isolation

1. Give a role access to Project A but not Project B.
2. Switch active Project and refresh access.
3. Inspect dashboard financial, attendance, progress, workflow, gallery, and sales cards.

**Expected result:** cards contain only active-project authorised data. No inaccessible aggregate is returned or inferred through counts. A project switch updates the context before operations are performed.

### ND-05 — Verify dashboard usability and languages

1. Test narrow and large phones, landscape, largest text, screen reader, and reduced motion.
2. Repeat key screens in English, Hindi, and Gujarati.
3. Test an empty Project with no business data.

**Expected result:** labels, accessibility hints, empty/loading/error states, and number/date formatting remain clear. Do not claim physical-device or fluent-language acceptance until these checks have actually been run.

## Screenshot capture list

| Capture ID | Screen/state |
| --- | --- |
| `05-ND-01` | Notification badge, All/Unread inbox, read and mark-all states |
| `05-ND-02` | Notification deep link destination and access-denied state |
| `05-ND-03` | Owner, Supervisor, Sales, and restricted-role dashboards |
| `05-ND-04` | Dashboard after Project switch and empty state |
| `05-ND-05` | Hindi/Gujarati and large-text dashboard/inbox review |
