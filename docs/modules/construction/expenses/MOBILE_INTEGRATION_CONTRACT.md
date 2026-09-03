# Site Expenses Mobile Integration Contract

Status: implemented; authenticated physical-device acceptance pending.

## Surface

- Permission-aware `Site Expenses` Menu destination scoped to the active Project.
- List with recognized-spend summary, pending approval, net adjustments, search, status/category/
  payment/date filters, pagination, pull-to-refresh, and current-query CSV export.
- Workflow configuration for users with `expenses:configure`.
- Create with optional draft save; edit only when the API exposes `EDIT`.
- Detail with original and recognized amounts, immutable adjustments, activity timeline, and only the
  server-derived actions in `availableActions`.
- Submit, approve, reject, cancel, and signed adjustment sheets with explicit confirmation, inline
  validation, loading lockout, localized conflict recovery, and success feedback.

## Client Authority Boundary

The client never derives workflow transitions, approval eligibility, recognized totals, or reviewer
separation. Every mutation carries an idempotency key; updates and commands carry the current
`expectedVersion`. A version conflict reloads the server record before retry. Expense date validation
uses India Standard Time and the API remains authoritative.

## UX And Accessibility

The implementation reuses `CompactScreenHeader`, `ProjectContextCard`, `OperationalEntityCard`,
`ListFilterBar`, `BottomSheet`, `FormField`, semantic status tokens, and the existing Manrope/Noto
font system. Money is locale-formatted with tabular figures, status is conveyed with text plus color,
icon-only controls have accessible names, touch controls use the existing 44/48-point primitives,
and English/Hindi/Gujarati keys and placeholders are kept in parity.

No receipt, Files/Media, offline queue, or locally calculated financial workflow is introduced.

## Verification Gates

- Mobile locale parity, TypeScript, Expo production export, and whitespace checks are source gates.
- Authenticated role/workflow behavior, conflict/idempotency recovery, slow-network states, largest
  text, screen reader, landscape, fluent Hindi/Gujarati, and physical-device checks remain separate
  runtime acceptance gates.

