# Login redesign verification — 2026-09-10

Screenshots render the actual LoginScreen and shared controls through React Native Web with synthetic credentials and a mocked session/router. No credentials are sent to the API. Existing logo-full.png is reused unchanged, including its baked background pattern.

- [English 375px](login-375-en.png)
- [Gujarati 320px](login-320-gu.png)
- [Loading state](login-loading.png)
- [Nine-case results](verification.json)

Widths 320/375/425px in en/hi/gu passed without page errors or horizontal overflow. Each fixture checks disabled/busy Sign in state, one request during repeated submission attempts, input retention and re-enabling after failure, and successful retry routing to the dashboard. English normal/loading screenshots were visually inspected. Reduced motion was enabled. Temporary fixture runner: `.tmp/login-preview-run.cjs`; entry: `.tmp/login-preview.tsx`, with verification-only esbuild/Playwright outside the repository.

Mobile type-check and 18-namespace locale validation passed. The bundler reported pre-existing duplicate `reject` keys in the three team locale files; those files were not modified. Real authenticated sign-in, physical-device keyboard/autofill, screen-reader and native large-text acceptance were not tested.
