# Notifications Status

Mobile rendering fix (2026-09-22): addressed the reported blank notification card after opening an unread item by removing card-content clipping, keeping the native card wrapper mounted, and replacing the changing left border width with a decorative unread indicator. Read receipts, filters and destination routing retain their existing behavior. Mobile type-check and scoped diff check passed. Physical Android verification remains pending: open an unread item from All, return and confirm its content remains visible; repeat with mark-all, Unread and scrolling away/back.

Web update (2026-09-21): W8 inbox/badge/read actions and authorized destination routing implemented. Eight focused Web tests and scoped lint passed; whole-Web baseline failures, Gallery exact-entry metadata gap and pending authenticated/browser/cross-client acceptance are recorded in [W8 Web parity](../../../tasks/web-w8-notifications-parity.md). This does not change API/Mobile evidence below or mark Web accepted.

Current classification: implementation complete; authenticated device acceptance pending (2026-09-03).

Implemented source scope: formal contract, shared types/errors, migration 022, expanded API, device registration, transactional push outbox, localized Expo delivery worker, operational role seed grants, and localized Mobile inbox/badge/deep-link integration.

Verified: remote migration ledger 23/23 current; all three tables, importance enum, and nine customer role grants confirmed; shared/API/Mobile type checks and API build passed; focused Notifications tests 5/5 and full API regression 31 suites/164 tests passed; 18 namespaces have en/hi/gu parity; Android Expo export and `git diff --check` passed.

Pending acceptance: set a real `EXPO_PUBLIC_EAS_PROJECT_ID` or EAS project configuration, run an authenticated producer-to-inbox flow, confirm push delivery in an Expo development build on a physical device, and complete screen-reader/large-text/landscape/fluent Hindi-Gujarati review.
