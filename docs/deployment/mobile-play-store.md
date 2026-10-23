# Mobile Play Store release

The production Android application is the Expo project under `apps/mobile`.
Its immutable Play package is `com.hornbook.nirmansite`.

## Release configuration

- Public store version: `apps/mobile/app.json` (`expo.version`).
- Android build number: EAS remote `versionCode` with production
  `autoIncrement` enabled.
- Production output: Android App Bundle (`.aab`).
- Production API: `https://api.nirmansite.com/api/v1`.
- Recommended local/EAS Node version: `22.13.0`.
- R8 minification and resource shrinking: enabled for release builds.
- Android edge-to-edge and resizable portrait/landscape layouts: enabled.

Expo SDK 54 / React Native 0.81 targets Android API 36 and uses the New
Architecture. Do not change the Android package or EAS project ID for an update
to the existing Play listing.

## One-time version synchronization

Sign in to the Expo account that owns `raxitvs-team/nirmansite-mobile`, then set
the EAS remote version to the latest `versionCode` already published in Play:

```bash
cd apps/mobile
eas login
eas build:version:set
```

Select Android and enter the latest published Play `versionCode`, not the next
number. The production build increments it automatically. Repeat this only if
Play and EAS version histories become unsynchronized.

## Build and submit

```bash
pnpm mobile:release:check
cd apps/mobile
eas build --platform android --profile production
eas submit --platform android --profile production
```

Before promoting the release, verify the Play Console app-bundle explorer,
pre-launch report, Data safety declaration, permissions, target API, 16 KB page
compatibility, and a physical-device smoke test for login, notifications,
camera/gallery upload, navigation, rotation, split-screen/foldable resizing, and
the production API. Retain the EAS build's Android mapping artifact for
deobfuscating native crash reports after R8 is enabled.

The Play Console store listing icon/screenshots are managed separately from the
launcher assets bundled by Expo.

## Invitation and password email links

Deploy API and Web together for `/open-app`. Production account URLs are rooted
at `https://app.nirmansite.com`; set `PUBLIC_WEB_APP_URL` and
`PUBLIC_ACTIVATION_WEB_URL` to that origin (without `/activate`).
The API also enforces this canonical origin in production to prevent stale
Vercel/localhost links. Previously delivered emails cannot be rewritten;
regenerate activation links or request a fresh password reset after rollout.

The HTTPS mobile landing page requires a user tap. On Android, it targets
`com.hornbook.nirmansite` via `nirmansite://activate?token=...` (or
`reset-password`) and falls back to the Play Store when the intent cannot be
opened. Browser completion and a direct store link remain available. After
installation, return to the email link. In-app email browsers may require
opening the page in Chrome. This uses the existing custom scheme, not verified
HTTPS App Links; no signing certificate or assetlinks deployment is required.

Before acceptance, test a fresh owner and member invitation on the installed
Play build, plus a password reset, a device without the app, an expired token,
and browser-only completion. Updated mobile token handling requires a new
mobile release. Keep `EXPO_GO_PROJECT_URL` unset in production.
