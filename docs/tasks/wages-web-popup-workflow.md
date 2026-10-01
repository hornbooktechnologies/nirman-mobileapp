# Wages Web popup workflow — 2026-10-01

User requested worker calculation/history, payment entry and wage adjustment forms in closable popups to simplify the main wage batch page.

- Main page retains calculation preview, batch selection, batch totals, worker comparison, export and cancellation actions.
- Worker Details opens the existing saved calculation/history component in a wide, scrollable Dialog. Existing attendance, Kharchi and payment-history links remain available. Valid wage-item deep links open this dialog automatically.
- Common Record payment and Save adjustment buttons open separate Dialogs with worker selectors. Their submit actions and Close button remain in the dialog footer while the body scrolls.
- Existing access permissions, archived/cancelled read-only behavior, financial validation and stale-record detection remain authoritative. Successful submissions close the dialog and clear worker form state. Errors are visible inside the dialog.
- Closing dirty forms requests discard confirmation. Pending submissions and uncertain payment retries block dismissal; the existing original payment payload and idempotency key are retained until the attempt is resolved.
- Dialog reuses existing keyboard focus trapping, Escape handling, close control, backdrop dismissal and focus restoration. The companion ui-ux-pro-max skill was unavailable; existing repository UI components were used.

Verification: Web TypeScript and scoped ESLint checks passed; ten existing wage financial/display/deep-link regression tests passed. Authenticated browser interaction and live payment/adjustment mutations were not exercised.
