# Current Task

## Objective

Complete the primary-Owner activation handoff so successful activation redirects to Login with the invited email pre-filled, while an existing active identity can accept an additional organization membership without re-entering or changing its password.

## Implemented Scope

- Added platform-only Users, Roles, and Settings permissions under `platform-*` resources.
- Prepared the seed to remove the Platform Super Admin legacy permission bridge and grant only platform-prefixed administration permissions.
- Changed global Users, Roles, and SMTP/application Settings APIs to require platform-prefixed permissions.
- Kept organization/project/Workers authorization on active organization membership and project-access helpers.
- Added `activeRole` to the resolved session and changed web authentication/navigation to use active-membership permissions instead of the inherited global user role.
- Persisted the selected web organization locally and refresh the resolved session after organization switching.
- Added shared organization-type/operating-profile compatibility rules and API enforcement for create/update.
- Filtered web operating-profile choices by organization type and exposed incompatible legacy values for correction.
- Corrected Owner counting so ordinary system roles are not treated as protected Owners.
- Prevented platform roles and inherited global custom roles from being assigned to organization memberships.
- Prevented assigned-project users such as Site Supervisors from creating unassigned organization-wide worker records.
- Split web navigation so global Users, Roles, and Settings are platform surfaces, while Organizations can be reached through either platform or customer organization permission.
- Hid internal mobile Workflows/Design System showcase entries and protected Project Detail with `projects:read`.
- Restored the Platform Super Admin Roles & Permissions web surface as a protected platform capability, including custom-role creation and permission-set editing, while keeping system role templates read-only.
- Added a source-level compatibility path so pre-seed `Platform Super Admin`/`Super Admin` sessions can reach platform role management without granting the same access to customer roles.
- Added custom-role detail editing and deletion controls. System roles remain read-only, assigned custom roles cannot be deleted, and deleting an unassigned custom role removes its permissions and role atomically.
- Moved custom-role Edit and Delete actions into a dedicated Actions column on the Roles list. The permission editor now focuses on role details and permissions, while assigned roles expose a disabled delete icon with an explanatory tooltip.
- Rebalanced the web Profile page with consistent section headers and bottom-aligned action footers so Save Profile and Change Password share the same placement and responsive sizing.
- Added an SMTP-backed organization Owner invitation email that runs only after the existing onboarding transaction commits.
- Included organization, Owner role, login email, expiry, and both activation links in the email without sending a permanent password.
- Kept organization creation successful when SMTP is absent or rejects the message, returning `MANUAL` or `EMAIL_FAILED` while preserving both existing copyable links.
- Added `EMAIL_SENT`, `EMAIL_FAILED`, and `MANUAL` to the shared invitation-delivery contract and surfaced the result in the existing web success card.
- Reused platform email settings with optional environment fallbacks; YOPmail remains a recipient inbox and does not replace the outbound SMTP provider.
- Restored live Platform Super Admin access to Platform Settings by adding the two source-defined `platform-settings:read` and `platform-settings:update` grants that were missing from the active role rows.
- Fixed the web Settings save callback so it no longer loses its service context before issuing the General and Email PATCH requests.
- Allowed blank optional Support Email and Mail From Address values while retaining email-format validation for nonblank values.
- Added visible save success/failure feedback plus SMTP field examples and the YOPmail recipient-only clarification to the Settings form.
- Diagnosed live Gmail delivery failure as SMTP authentication rejection (`535 5.7.8`), not an organization-onboarding or network failure.
- Normalized Gmail App Password display spaces before SMTP authentication and added explicit same-account/new-App-Password guidance to Settings and the failed-delivery state.
- Replaced the HTML email's plain mobile activation URL with an `Open Mobile App` button.
- Added the optional `EXPO_GO_PROJECT_URL` development override so local invitation emails target the Expo Go route `exp://<LAN-IP>:8081/--/activate?token=...`, while installed-app builds retain the `nirmansite://` fallback.
- Redirected successful web and mobile Owner activation directly to Login with the normalized invited email pre-filled.
- Kept password creation mandatory for a new or inactive identity, while allowing an existing active user to accept a second-organization invitation without re-entering or changing the existing password.
- Preserved invitation security: acceptance still requires the valid expiring single-use token, activates only the linked membership/organization, and does not create an authenticated session.

## Explicitly Deferred

- Organization-scoped custom-role persistence and `/organizations/:organizationId/roles` APIs require a separately reviewed schema/API slice.
- General member invitations beyond the primary Owner flow remain pending.
- Member-specific grants/denials remain an open decision.
- Operating profiles are validated and exposed in session, but profile-driven responsibility and approval workflows remain gated by Attendance, Kharchi, Wages, Materials, Expenses, Progress, Gallery, Audit, and Notifications contracts.
- Existing incompatible organization/profile rows require an explicitly approved data-correction operation; this task does not mutate them.
- General notification history, retries, delivery queues, and provider webhooks remain part of the future Notifications Foundation.
- A real inbox delivery smoke test remains pending until valid outbound SMTP settings and an explicitly approved test organization write are available.

## Database State

- Migration `003_organization_owner_invitations.sql` was explicitly applied earlier on 2026-08-10 to `vishwlt9_nirmansite`.
- Read-only status reports 4 local migrations, 4 applied, 0 pending, and 0 draft.
- No migration, seed, or database write was run for this RBAC correction slice.
- The new platform permission keys exist in source only until the guarded seed is explicitly approved and executed.
- No migration, seed, organization creation, or other database write was run for the Owner invitation email slice.
- On explicit user request, exactly two missing permission rows were inserted for `Platform Super Admin` in `vishwlt9_nirmansite`: `platform-settings:read` and `platform-settings:update`. No seed, migration, role-user rotation, or organization data change was performed.
- No setting value or other database row was changed while verifying the Settings save code correction.
- The saved SMTP password was inspected only through non-secret shape checks; no credential value was printed or changed. SMTP authentication verification made no message or database write.
- Local `.env` now points the development email link at the currently running Expo Go project on `192.168.1.33:8081`; this is machine/network-specific and must be updated if the LAN address changes.
- No migration, seed, invitation acceptance, organization creation, or other database write was run for the login-prefill/existing-account activation slice.

## Verification

- Shared type-check passed.
- Shared build passed.
- API type-check passed.
- Web type-check passed after discarding stale generated Next route types.
- Mobile type-check passed.
- API production build passed.
- Web production build passed and generated all application routes successfully.
- Focused API semantic lint passed with the pre-existing Prettier rule disabled; the normal focused lint remains blocked by legacy single-quote formatting in the touched API files.
- Focused web lint reached only the two previously documented `react-hooks/set-state-in-effect` failures in Organization Detail and Settings form hydration; no new permission/session lint error was reported.
- The focused onboarding test was attempted but no test executed because the existing Jest 30/ts-jest runtime fails first with `this._moduleMocker.clearMocksOnScope is not a function`.
- `git diff --check` passed; because most of the checkout is untracked, that command can validate only Git-tracked changes.
- The Platform Roles restoration passed shared/API/web type-checks and focused API/web lint.
- Custom-role edit/delete passed API/web type-checks, focused API/web lint, and `git diff --check`.
- Custom-role list actions passed web type-check, focused lint, and `git diff --check`.
- Profile action placement passed web type-check, focused lint, `git diff --check`, and a live HTTP 200 route check.
- Read-only database role/profile audit completed.
- Shared type-check/build, API type-check/build, web type-check, focused API/web lint, and `git diff --check` passed for the invitation email slice.
- Pure runtime checks passed for the `MANUAL` path, YOPmail recipient/template content, HTML escaping, and non-throwing `EMAIL_FAILED` behavior against an unreachable local SMTP port.
- The focused onboarding Jest suite was attempted again, but no test executed because the same pre-existing Jest 30/ts-jest `clearMocksOnScope` incompatibility fails during runtime initialization.
- A read-only post-write query confirmed both Platform Settings grants; API health and the web `/settings` route returned HTTP 200. The user must start a fresh login session so permissions are re-resolved.
- Settings save corrections passed API/web type-checks, API build, focused API/web lint, blank-optional-email validation, `git diff --check`, and live API/web HTTP 200 checks. Browser form submission remains for user confirmation because no attachable authenticated browser session was available.
- Gmail SMTP was reachable, but both the saved credential and its whitespace-normalized form were rejected with `535 5.7.8`; a new App Password for the exact SMTP Username is required. The normalization change passed API/web type-checks, API build, focused lint, diff check, and API restart/health verification.
- The mobile email button/Expo Go override passed API and mobile type-checks, API build, focused lint, generated-link/template probes, `git diff --check`, and live API/web/Metro HTTP 200 checks. No organization, invitation, email, seed, migration, or database write was performed during verification.
- The login-prefill/existing-account activation slice passed shared/API/web/mobile type-checks, shared/API builds, focused static checks, and pure service/validation probes. The focused Jest suite remains blocked before test execution by the pre-existing Jest 30/ts-jest `clearMocksOnScope` incompatibility.

## Current Gate

Primary Owner invitation handling is source-complete for both new and existing identities: new identities create a password, existing active identities reuse their password, and both paths return to Login with email pre-filled. Live end-to-end acceptance remains approval-gated because it changes invitation, membership, organization, and user state. The independent RBAC runtime matrix gate remains open.

## Next Recommended Task

With explicit approval for disposable database writes, verify one new-email invitation and one same-email second-organization invitation end to end on web and Expo Go. Then return to the independent RBAC runtime matrix gate before starting another operational module.
