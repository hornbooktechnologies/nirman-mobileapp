# Account activation — 2026-09-28

`/activate?token=...` completes owner and member invitations through the existing NirmanSite API. New identities create a password; existing identities explicitly confirm organization access without changing their password. Successful activation offers `nirmansite://login`; before activation, the app alternative preserves the invitation token in `nirmansite://activate?token=...`.

The standalone page uses the existing palette and Manrope, with labeled password fields, pending/disabled submission, accessible errors, success feedback, and missing/invalid/expired/used invitation recovery. It does not create a website login session or add a back-office login page.

Server Actions call the existing invitation inspection and acceptance endpoints through the server-only API client. Inspection is read-only, uncached, and bounded by a timeout. Submission rechecks invitation state, validates password confirmation when required, and never automatically retries acceptance. The API remains authoritative for token validity, expiry, membership and password policy. Token pages are marked noindex/no-follow and no-referrer.

## Rollout

1. Deploy the website with `API_BASE_URL=https://api.nirmansite.com/api/v1` and `NEXT_PUBLIC_SITE_URL=https://nirmansite.com`.
2. Deploy the API change that supports `PUBLIC_ACTIVATION_WEB_URL`, setting it to `https://app.nirmansite.com`. Set `MOBILE_APP_SCHEME=nirmansite` and leave `EXPO_GO_PROJECT_URL` empty. The separate activation origin leaves other web auth email destinations controlled by `PUBLIC_WEB_APP_URL`.
3. Set `PUBLIC_WEB_APP_URL=https://app.nirmansite.com` too. Newly generated invitation emails point to the frontend `/activate` page; mobile actions use its `/open-app` page. The marketing website stays at `https://nirmansite.com`. Existing emails keep their original URLs.

Generate production invitations through the production API. A token created in a separate local database cannot be inspected or accepted through the public portal's API.

No dependency, database, marketing layout, or native app scheme change is required. Deployment and a real invitation/device acceptance remain pending; custom-scheme handoff depends on the installed app and email client supporting it.

## Verification

- `node scripts/verify-activation.cjs`: mocked contract checks for invalid tokens, read-only previews, password length/mismatch, new/existing accounts, uncached requests, expiry, used invitations, rate limiting and transport failures.
- Website TypeScript and focused activation ESLint checks passed.
- Production build passed, including the dynamic `/activate` route. The initial sandbox run compiled but hit `spawn EPERM`; the approved external-sandbox rerun completed successfully.
- Browser: missing-token and synthetic invalid-token pages render correctly; invalid-token inspection reaches the configured API, presents its not-found outcome and app/retry/home links; no browser console errors were captured.
- API: 9 organization onboarding service tests passed, including independent activation-origin configuration.
- No invitation emails were sent and no accounts or passwords were changed during verification.
