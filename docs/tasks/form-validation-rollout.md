# Consistent Web and Mobile form validation

## Status — 2026-10-28

Shared foundation and client rollout implemented; authenticated module-by-module and physical-device acceptance pending. This is a presentation/validation change; no API contracts, database operations, deployments, permissions or financial calculations changed.

## Implementation

- Web `ValidatedForm` retains actual HTML forms and forwarded form refs, disables browser popups, validates registered fields, and focuses the first invalid control in DOM order. `ValidatedField` retains existing label layout, shows danger-colored required markers/errors, validates on blur, and updates visited errors on change. Separate labels use their actual `htmlFor` association, with errors supplied to shared controls through context. Disabled controls and their custom rules do not block frozen-command retries.
- Existing module submit validators, workflow guards, uncertain-result recovery, explicit clearing and idempotency keys remain authoritative. Optional empty fields remain optional. Client validation does not replace API validation or infer field names from server messages. Existing module-specific server-error handling remains in place; unassigned API/network/permission failures retain their form-level presentation.
- Projects create/edit use one pure shared validator for name/address/code/description DTO limits and calendar-valid date ordering. Web uses typed field errors and accessible field components. Mobile retains English/Hindi/Gujarati messages, validates on blur, updates visible errors, and scrolls invalid timeline/name submissions into the sheet viewport. Status is optional in the API and is not marked mandatory.
- Mobile `FormField` supplies required/email/length blur validation, optional domain-validator callbacks and existing danger tokens. Form scopes isolate screens and nested sheets; explicitly opted-in save buttons validate registered fields first. Bottom sheets reveal the first invalid field using measured viewport coordinates and announce the error. Visibility changes reset the sheet field scope. Existing keyboard avoidance remains in use.
- Existing domain checks are reused for Mobile worker creation, member invitations, login, password minimum/confirmation, Materials, Expenses and Progress. Web Sales and Progress attach their existing field rules to the shared adapter. Required HTML attributes have been aligned with eight existing mandatory labels. User/Role creation includes the audited API length/password limits.
- Brochure upload/email and source-payment record/void panels now use real validated forms. Brochure minimum title length/file/email and payment amount/date/reason errors can be shown by attempting submission instead of silently disabling incomplete forms.
- Web `FieldError` now uses the existing danger color. No new form library was introduced. The companion `ui-ux-pro-max` skill was unavailable; existing tokens/components were used.

## Rollout coverage

| Order | Module group | Applied behavior | Acceptance |
| --- | --- | --- | --- |
| 1 | Foundation and Projects | Shared Web/Mobile adapters; Project create/edit shared DTO rules | Isolated regressions/typechecks passed; authenticated acceptance pending |
| 2 | Members and access | Web invitations, user/role forms, assignment labels; Mobile save gating and invitation blur rules | Authenticated role/assignment acceptance pending |
| 3 | Workers | Web creation/edit/allocation/rate fields; Mobile required markers/save gates and creation blur rules | Authenticated allocation/rate acceptance pending |
| 4 | Calendar and Attendance | Web form adapters; Mobile shared required validation/save gates | Calendar/exception browser/device acceptance pending |
| 5 | Wages and Kharchi | Web mandatory field styling/blur validation; Mobile shared validation/save gates; existing financial validators retained | Authenticated financial/uncertain-retry acceptance pending |
| 6 | Materials | Web native-constraint adapter; Mobile domain callbacks plus shared fields | Authenticated request/delivery/review acceptance pending |
| 7 | Expenses and Total Expenses | Web native-constraint/source-payment forms; Mobile domain callbacks/save gates | Authenticated payment/void acceptance pending |
| 8 | Progress, Gallery and Brochures | Web Progress rules, upload/review fields and brochure forms; Mobile shared fields/save gates and Progress callbacks | Authenticated media and physical-device acceptance pending |
| 9 | Sales | Web schema-driven field adapter and existing domain rules; Mobile shared fields/save gates | Dynamic/scheduling/import/booking browser/device acceptance pending |
| 10 | Account and administration | Web authentication, profile, settings, Organizations, subscriptions, enquiry forms; Mobile account/authentication shared fields | Authenticated account/admin acceptance pending |

The generated [field inventory](form-validation-inventory.md) records 408 controls across 89 source files, including filters and dynamic bindings. It records actual control constraints and API module locations; it does not certify exhaustive DTO parity or acceptance of every dynamic workflow. Existing domain validations beyond native constraints remain in module handlers unless explicitly connected above. Public marketing website and new forms for read-only modules are excluded.

## Verification

- `pnpm --filter @nirman-app/web build`: passed (production compilation, TypeScript and static routes). Next-generated changes to tracked `next-env.d.ts`/`tsconfig.json` were restored to preserve the established development-output configuration.
- `pnpm --filter @nirman-app/mobile release:check`: passed (typecheck, 19 namespaces with en/hi/gu key/placeholder parity, Android Hermes export: 2,037 modules).
- 45 focused tests passed across Project/constraint validation and existing Materials, Expenses, Kharchi, Wages, Progress and Sales rule suites.
- `node apps/web/scripts/verify-form-validation.cjs`: 19 isolated browser checks passed. Covers required stars, untouched state, blur errors, whitespace rejection, invalid-submit focus, ARIA associations, separate labels, correction, optional email, conditional mount/unmount and disabled retry controls. Five checks use mocked native controls to exercise the actual Mobile field/scope/input components; these are not physical-device acceptance.
- Changed Web sources linted. One `react-hooks/refs` finding remains in `sales-form.tsx`'s field-render map; linting the unchanged HEAD version reproduces the same finding. Other changed Web source files passed this lint run. Full-repository lint is not claimed.
- Inventory generation and whitespace checks completed. Authenticated writes, responsive visual review for every module, screen-reader review and physical-device keyboard/scroll behavior remain unrun.

## Acceptance checklist

For each module in order, verify create/edit/action forms with empty, malformed, valid and server-rejected input; check dynamic required fields and optional clearing; verify modal reopening/record switching, nested rows, keyboard navigation and first-error reveal. Check server errors remain actionable and no invalid mutation request is sent. Financial acceptance must include replay of an uncertain command with its original payload/key. Record browser/device evidence before changing any module to accepted.
