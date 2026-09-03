# Kharchi Mobile Integration Contract

> Status: Mobile source implemented; authenticated and physical-device acceptance pending.
>
> API status: source and approved migrations/grants are active on the recorded target; authenticated role/workflow and live concurrency verification remain pending.
>
> Last updated: 2026-09-01.

## 1. Purpose

This document is the implementation contract for integrating Kharchi / Worker Advances into the NirmanSite Expo mobile app. It translates the approved domain and API contracts into routes, service calls, screen behavior, permission states, validation, localization, accessibility, and verification requirements.

The API remains authoritative for access, Worker eligibility, assignment-date coverage, financial calculations, idempotency, immutable history, and Wage allocation.

## 2. Required Reading

Read these sources before Mobile implementation:

1. `docs/modules/construction/kharchi/CONTRACTS.md`.
2. `docs/modules/construction/kharchi/MOBILE_INTEGRATION_CONTRACT.md`.
3. `docs/modules/construction/workers/CONTRACT.md`.
4. `docs/modules/construction/wages/CONTRACTS.md`.
5. `docs/modules/foundation/project-access/CONTRACTS.md`.
6. `docs/ai-context/04-mobile-development-rules.md`.
7. `docs/design/mobile-operational-layout-spec.md`.
8. Current Kharchi API/shared source and current Git status.

Documentation status is not proof that the Kharchi migrations or live role grants are active. Verify the current runtime gate before authenticated Mobile testing.

## 3. Product Rules The Client Must Preserve

- A create action records money already given to the Worker. It is immediately paid.
- There is no request, draft, approval, rejection, separate mark-paid, cancel, edit, or delete flow.
- Incorrect entries are corrected only through an immutable positive or negative adjustment.
- Every create and adjustment request requires a retry-safe idempotency key.
- Wage deductions are automatic and server-owned; Mobile never creates allocation rows.
- Mobile never calculates or persists an authoritative outstanding balance.
- All data and actions remain scoped to the active Organization and selected Project.

## 4. Mobile Scope

Included:

- permission-aware Kharchi navigation;
- Project summary and paginated advance list;
- search and supported filters;
- record-paid-advance flow;
- advance detail with adjustment and Wage-deduction history;
- permission-aware positive/negative adjustment flow;
- CSV API integration for authorized users;
- English, Hindi, and Gujarati copy;
- loading, refreshing, empty, permission, error, and success states;
- accessibility and responsive behavior.

Excluded:

- approval or cancellation UI;
- editing/deleting an advance, adjustment, or allocation;
- offline financial mutation queue or background sync;
- attachment/receipt upload;
- manual Wage deduction allocation;
- cross-Project Organization reporting;
- new API endpoints, migrations, permissions, or dependencies unless separately approved.

## 5. Source And Route Plan

Recommended files:

```text
apps/mobile/app/(app)/kharchi.tsx
apps/mobile/app/(app)/kharchi-detail.tsx
apps/mobile/src/features/kharchi/kharchi-screen.tsx
apps/mobile/src/features/kharchi/kharchi-detail-screen.tsx
apps/mobile/src/features/kharchi/kharchi-form-sheet.tsx
apps/mobile/src/features/kharchi/kharchi-adjustment-sheet.tsx
apps/mobile/src/features/kharchi/services.ts
apps/mobile/src/features/kharchi/types.ts
apps/mobile/src/i18n/locales/en/kharchi.json
apps/mobile/src/i18n/locales/hi/kharchi.json
apps/mobile/src/i18n/locales/gu/kharchi.json
```

Register the namespace in the existing typed i18n resources. Add Kharchi to customer navigation with `kharchi:read`; do not add it as a permanent bottom tab. Use the established Menu/operational navigation pattern.

Route parameters:

```text
/(app)/kharchi
/(app)/kharchi-detail?kharchiId=<UUID>
```

The selected Project comes from the existing session context. Do not accept an Organization or Project override from arbitrary route parameters.

## 6. API Base And Envelopes

The configured Mobile API base already contains `/api/v1`.

Kharchi base path:

```text
/organizations/:organizationId/projects/:projectId/kharchi
```

JSON success envelope:

```ts
type ApiEnvelope<TData> = {
  success: true;
  message: string;
  data: TData;
};
```

Error envelope consumed through `ApiRequestError`:

```json
{
  "success": false,
  "message": "Human-readable fallback",
  "errors": [],
  "error": {
    "code": "STABLE_ERROR_CODE",
    "message": "Human-readable fallback",
    "details": {}
  }
}
```

Do not show backend English diagnostics as the primary localized user message when a stable error code exists.

CSV export is raw `text/csv`, not a JSON envelope. Use a direct authenticated `fetch`, following the Wages export service pattern.

## 7. Canonical Shared Values

Import these from `@nirman-app/shared`; do not redefine them in Mobile.

```ts
type KharchiPaymentMethod =
  | "CASH"
  | "UPI"
  | "BANK_TRANSFER"
  | "OTHER";

type KharchiBalanceStatus =
  | "PAID"
  | "PARTIALLY_DEDUCTED"
  | "DEDUCTED";
```

User-facing balance labels should clarify deduction progress:

| API value | English display meaning |
| --- | --- |
| `PAID` | Deduction pending |
| `PARTIALLY_DEDUCTED` | Partly deducted |
| `DEDUCTED` | Fully deducted |

The stored API value remains unchanged. All display labels are localized.

Permissions:

```text
kharchi:read
kharchi:create
kharchi:adjust
kharchi:export
```

Use `getActiveProjectPermissions(session)` as the client visibility source. The API still performs final authorization.

## 8. Endpoint Integration

### 8.1 List Advances

```text
GET /organizations/:organizationId/projects/:projectId/kharchi
Permission: kharchi:read
```

Supported query parameters:

```ts
type QueryKharchi = {
  page?: number;                 // default 1
  pageSize?: number;             // 1..100, default 20
  workerId?: string;             // UUID
  workerAssignmentId?: string;   // UUID
  startDate?: string;            // YYYY-MM-DD
  endDate?: string;              // YYYY-MM-DD
  status?: KharchiBalanceStatus;
  paymentMethod?: KharchiPaymentMethod;
  search?: string;               // max 120
  sortBy?: "requestDate" | "createdAt" | "workerName" | "outstandingAmount";
  sortOrder?: "asc" | "desc";
};
```

Response `data`:

```ts
type KharchiListResponse = {
  items: KharchiAdvance[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};
```

Use `FlatList`, stable `id` keys, pull-to-refresh, and explicit load-more pagination. A filter change resets to page 1. Ignore stale responses after Organization or Project changes.

### 8.2 Summary

```text
GET /organizations/:organizationId/projects/:projectId/kharchi/summary
Permission: kharchi:read
```

Supported query:

```ts
type KharchiSummaryQuery = {
  workerId?: string;
  workerAssignmentId?: string;
  startDate?: string;
  endDate?: string;
};
```

Response `data` is `KharchiSummary` from shared. Summary totals must be displayed from the response, not recomputed from the currently loaded list page.

Summary supports only Worker, assignment, and date filters. Payment-method, balance-status, and search filters apply to the list only; do not label the summary as filtered by unsupported list filters.

### 8.3 Detail

```text
GET /organizations/:organizationId/projects/:projectId/kharchi/:kharchiId
Permission: kharchi:read
```

Response `data` is `KharchiAdvanceDetail`, including:

- immutable original advance;
- derived totals and balance status;
- `adjustments` in recorded order;
- `deductionAllocations` in recorded order.

### 8.4 Record Paid Advance

```text
POST /organizations/:organizationId/projects/:projectId/kharchi
Permission: kharchi:create
```

Payload:

```ts
type CreateKharchiInput = {
  workerAssignmentId: string;
  amount: number;
  requestDate: string;
  paymentMethod: KharchiPaymentMethod;
  paymentReference?: string | null;
  notes?: string | null;
  idempotencyKey: string;
};
```

Limits:

- `amount`: greater than zero, maximum two decimal places;
- `requestDate`: date-only `YYYY-MM-DD`;
- `paymentReference`: optional, maximum 120 characters;
- `notes`: optional, maximum 2000 characters;
- `idempotencyKey`: 8 to 120 characters.

Response `data` is the created `KharchiAdvanceDetail`.

### 8.5 Record Adjustment

```text
POST /organizations/:organizationId/projects/:projectId/kharchi/:kharchiId/adjustments
Permission: kharchi:adjust
```

Payload:

```ts
type CreateKharchiAdjustmentInput = {
  amount: number;          // signed, non-zero, maximum two decimals
  reason: string;          // 2..500 characters
  idempotencyKey: string;  // 8..120 characters
};
```

Response `data` is the refreshed `KharchiAdvanceDetail`.

The UI should offer `Increase` and `Decrease` choices with a positive magnitude input. Convert `Decrease` to a negative API amount only at submission. Do not require field users to type a minus sign.

### 8.6 Export

```text
GET /organizations/:organizationId/projects/:projectId/kharchi/export
Permission: kharchi:export
```

Use the list filters supported by the API. The response is CSV with a filename supplied in `Content-Disposition`.

The service may return CSV text in the first Mobile slice. User-facing save/share behavior must reuse an already available platform capability or receive separate dependency approval; do not add a package silently.

## 9. Worker Assignment Selection

Create requires a Worker Project Assignment, not only a Worker ID.

Use the existing Workers roster endpoint:

```text
GET /organizations/:organizationId/projects/:projectId/workers
  ?date=<requestDate>
  &assignmentScope=CURRENT
  &status=ACTIVE
  &pageSize=100
  &sortBy=name
  &sortOrder=asc
```

Use `ProjectWorkerRosterItem.currentAssignment.id` as `workerAssignmentId`.

Form order:

1. Request date, defaulting to the current India-local date.
2. Worker assignment valid on that date.
3. Amount.
4. Payment method.
5. Optional payment reference.
6. Optional notes.

Changing the request date clears a selected Worker that is absent from the refreshed eligible roster. Preserve the remaining form fields. If the roster call fails, do not allow a stale or unverified Worker selection to be submitted.

## 10. Idempotency Lifecycle

Idempotency is mandatory financial behavior, not an optional UI detail.

- Generate one collision-resistant key for a normalized submission attempt.
- Retain that same key while retrying the same unchanged payload after timeout, connection loss, or an unknown response.
- Generate a new key when the user materially changes the payload after an attempted write.
- Clear the key only after confirmed success or when the form is deliberately discarded.
- Disable repeat taps while a request is in flight.
- Never use the Kharchi record ID as the adjustment key.
- Never send an empty key.

The initial Mobile slice remains online-only. Keeping a key in mounted form state is not an offline queue and must not be described as one.

## 11. Screen Contract

### 11.1 Kharchi List

Use:

- `NirmanScreenBackground`;
- `CompactScreenHeader`;
- compact `ProjectContextCard` with switch action;
- summary cards/rows using existing semantic tokens;
- shared `ListFilterBar` with search, a Filters action, and active-filter count;
- labelled `ListFilterSheet` groups with full-width radio options, Clear all, and Apply filters;
- removable applied-filter chips only for active filters;
- `OperationalEntityCard` for each advance;
- existing loading, empty, error, and permission state primitives.

Card mapping:

```text
┌────────────────────────────────────────┐
│ WRK-0042                         MASON │
├────────────────────────────────────────┤
│ Ramesh Kumar                 ₹1,500.00 │
│ 31 Aug 2026              OUTSTANDING   │
├────────────────────────────────────────┤
│ Cash                 DEDUCTION PENDING │
└────────────────────────────────────────┘
```

| Position | Value |
| --- | --- |
| Header left | `workerCode` |
| Header right | `trade` |
| Body left | `workerName` and localized request date |
| Body right | `outstandingAmount`, formatted INR |
| Footer left | localized payment method |
| Footer right | localized deduction-progress badge |

The right-side amount label must say `Outstanding`, not imply that it is the original cash paid.

Summary should prioritize:

1. total outstanding;
2. total advances/effective amount;
3. total deducted;
4. adjustment total when non-zero.

The create action is visible only with `kharchi:create` and an active Project. A readable non-active Project remains read-only with an explanation.

### 11.2 Record Paid Advance

Use a scrollable `BottomSheet` on phones. If large text or keyboard constraints make the sheet unusable, use a dedicated screen while preserving the same field and back behavior.

Required copy must clearly state:

```text
This records money as already paid. It cannot be cancelled or deleted; corrections are added as adjustments.
```

Primary action meaning: `Record paid advance`. Do not use `Request`, `Submit for approval`, or `Approve`.

Use visible labels, inline errors, decimal keyboard for amount, `DateInput`, and accessible radio/choice controls for payment method. Preserve entered values on recoverable failure.

After success:

- close the form;
- show localized success feedback;
- update or refetch summary and list;
- open the returned detail only if that matches the initiating user action.

Do not optimistically add a financial record before the server confirms it.

### 11.3 Detail And History

Show:

- Worker identity and request date;
- original amount;
- signed adjustment total;
- effective amount;
- deducted amount;
- outstanding amount;
- payment method/reference;
- notes when present;
- recorded and paid timestamps;
- immutable adjustment history;
- Wage deduction allocations with deduction amount and timestamp.

Do not render edit, cancel, or delete actions.

An adjustment action is visible only with `kharchi:adjust` and an active Project. After adjustment success, replace detail from the returned response and refresh list/summary when returning.

### 11.4 Adjustment Sheet

Display current outstanding and deducted amounts before the form. Require:

- increase/decrease choice;
- positive magnitude;
- reason.

For decrease, client validation may prevent a magnitude above current outstanding, but the API remains authoritative because concurrent Wage allocation or another adjustment may change the balance.

Primary actions:

- `Add increase` for a positive adjustment;
- `Add correction` for a negative adjustment.

Neither is a destructive delete. The confirmation copy must explain that the adjustment itself becomes permanent history.

## 12. Money And Date Handling

- Keep amount input as text while editing.
- Accept digits and one decimal separator with no more than two decimal digits.
- Convert to a finite positive number only at submission.
- Do not send formatted commas or a currency symbol.
- Display API money strings through the existing India-aware formatter.
- Never derive an authoritative balance from JavaScript arithmetic.
- Treat `requestDate` as an India-local calendar date; do not shift it through UTC conversion.
- Format server timestamps using the current locale and India timezone conventions.

## 13. Error And Recovery Contract

Map stable codes in the shared Mobile error localization layer.

| Code | Mobile behavior |
| --- | --- |
| `KHARCHI_NOT_FOUND` | Close stale detail or show not-found state, then refresh list. |
| `KHARCHI_IDEMPOTENCY_CONFLICT` | Preserve fields, explain retry-key conflict, refresh the list/detail first, and create a new key only for a newly confirmed submission. |
| `KHARCHI_WORKER_INACTIVE` | Mark Worker selection invalid and refresh eligible roster. |
| `KHARCHI_WORKER_ASSIGNMENT_INVALID` | Clear Worker selection and refresh eligible roster. |
| `KHARCHI_REQUEST_DATE_OUTSIDE_ASSIGNMENT` | Show inline date/Worker error and refresh eligible roster. |
| `KHARCHI_ADJUSTMENT_EXCEEDS_BALANCE` | Keep adjustment input/reason, refresh detail, and show inline amount error. |
| `PROJECT_STATUS_INVALID` | Switch to read-only state and explain that writes require an active Project. |
| `VALIDATION_FAILED` | Map known fields inline and retain all input. |
| `AUTH_SESSION_REQUIRED` | Use existing session recovery. |
| `PERMISSION_DENIED` and Project access errors | Refresh session/access and show the existing permission state. |
| `SERVER_ERROR` or network failure | Preserve form and idempotency key; allow safe retry. |

Never convert a timeout into a definite failure. The first request may have committed, which is why the same unchanged idempotency key must be reused.

## 14. Permissions And State Matrix

| State | List/detail | Create | Adjust | Export |
| --- | --- | --- | --- | --- |
| Has `kharchi:read` | yes | only with permission | only with permission | only with permission |
| Missing `kharchi:read` | route/navigation hidden | no | no | no |
| Active Project | yes | allowed by permission | allowed by permission | allowed by permission |
| Draft/On-hold Project | readable if API access allows | disabled | disabled | allowed by permission |
| No selected Project | project-required state | no | no | no |
| Offline/network unavailable | no new server result | no queued claim | no queued claim | unavailable |

Do not infer permissions from role names in Mobile.

## 15. Localization

Add a typed `kharchi` namespace with identical keys and interpolation placeholders in English, Hindi, and Gujarati.

Coverage includes:

- navigation, headings, summaries, filters, statuses, and payment methods;
- form labels, helper text, immutable-history warning, and action labels;
- loading, refreshing, empty, error, success, permission, and read-only states;
- adjustment and deduction history;
- accessibility labels and hints;
- export feedback.

User-entered Worker names, trade, references, notes, and reasons remain exactly as entered. Stable API values are translated only for display.

Avoid translating Kharchi into an unrelated formal lending term. Hindi/Gujarati terminology requires fluent construction-domain review before acceptance.

## 16. Accessibility And Responsive Requirements

- Interactive controls use native semantic roles and descriptive accessibility labels.
- Touch targets are at least 44pt on iOS and 48dp on Android.
- Color never carries status or increase/decrease meaning alone.
- Screen-reader order follows header, Project, summary, filters, list, then create action.
- Money labels announce their meaning, for example `Outstanding amount, 1,500 rupees`.
- Dynamic Type may stack paired fields and card columns without clipping.
- Bottom-sheet content remains reachable above the keyboard and safe area.
- Small phone, large phone, tablet, portrait, and landscape layouts do not hide actions behind navigation.
- Loading/pressed transitions do not shift layout and respect reduced motion.
- Use the existing theme, fonts, spacing, icons, and semantic colors; do not introduce the generic colors or fonts proposed by external design tooling.

## 17. Data Refresh Rules

- Organization change clears all Kharchi screen state.
- Project change clears list, pagination, summary, selected detail, filters tied to Worker IDs, and any open mutation form.
- Pull-to-refresh refreshes summary and first list page together.
- Create success refreshes summary and list.
- Adjustment success replaces detail from the response and marks summary/list stale for refresh.
- Returning from Wage confirmation should refresh Kharchi when the screen becomes active so automatic deductions appear.
- Do not persist server financial records as an offline source of truth in this slice.

## 18. Implementation Sequence

1. Add typed service functions and re-export shared types.
2. Add `kharchi` locale resources and stable error mappings in all three languages.
3. Add permission-aware route/navigation.
4. Implement list, summary, filters, pagination, and states.
5. Implement paid-advance form and retry-key lifecycle.
6. Implement detail and immutable history.
7. Implement permission-gated adjustment flow.
8. Add CSV service integration without an unapproved dependency.
9. Run static, export, and device acceptance gates.

## 19. Verification And Acceptance

Static:

```text
pnpm --filter @nirman-app/shared type-check
pnpm --filter @nirman-app/shared build
pnpm --filter @nirman-app/mobile validate:locales
pnpm --filter @nirman-app/mobile type-check
git diff --check
```

Also run focused lint if the Mobile package adds or exposes a supported lint command, and perform an Expo export appropriate to the implementation slice.

Authenticated integration matrix:

- read/create user on an assigned active Project;
- read-only user;
- adjust/export user;
- inaccessible Project;
- non-active Project read-only behavior;
- active and inactive Worker cases;
- assignment date inside/outside coverage;
- same-payload retry after simulated unknown response;
- conflicting idempotency reuse;
- positive and negative adjustments;
- concurrent balance change returning `KHARCHI_ADJUSTMENT_EXCEEDS_BALANCE`;
- automatic Wage deduction reflected after refresh;
- no cancel/delete/approval action anywhere.

Device acceptance:

- English, Hindi, and Gujarati;
- small and large phone, tablet, portrait, and landscape;
- keyboard avoidance and failed-input retention;
- TalkBack/VoiceOver;
- largest supported text size;
- touch-target and contrast checks;
- slow network, timeout, retry, and duplicate-tap behavior.

Static checks, mocked tests, or Expo export do not prove authenticated API, database concurrency, or physical-device acceptance.

## 20. Current Verification State

The following runtime prerequisites were completed after separate exact-target approval:

1. `012_audit_foundation.sql` and `013_kharchi.sql` were applied to
   `md-in-30.webhostbox.net / vishwlt9_nirmansite`;
2. the four expected Kharchi/Audit tables and migration records were verified;
3. 22 approved `kharchi:*` default-role grants were synchronized and verified;
4. API/database health returned `200`/`ok`;
5. the rebuilt unauthenticated Kharchi route returned `401 AUTH_SESSION_REQUIRED`, proving route registration.

Mobile source now implements the contracted list, filters, summary, record-paid form, detail,
adjustment, history, export, permission states, and en/hi/gu coverage. Static Mobile checks and an
Android Expo export passed. Authenticated role/workflow, live concurrency, automatic Wage-deduction,
physical-device, screen-reader, large-text, contrast, timeout, and fluent-language acceptance remain
pending and must not be inferred from the completed checks.

The reconciled evidence record is `docs/modules/construction/kharchi/STATUS.md`.
