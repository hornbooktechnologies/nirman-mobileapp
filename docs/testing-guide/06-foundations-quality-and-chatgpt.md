# 06 — Foundations, Quality, and ChatGPT Tester Instructions

## Authentication and sessions

### FQ-01 — Sign in, sign out, and invalid credentials

1. Sign in with a valid active test user.
2. Repeat with an invalid password and an unknown email.
3. Sign out, then attempt to open a protected screen or use the previous session.

**Expected result:** valid sign-in creates an authenticated session. Invalid credentials show a safe, clear error such as `AUTH_INVALID_CREDENTIALS` without revealing which account data was valid. Sign-out removes usable local session state; protected screens require a new session.

### FQ-02 — Expired or revoked session

1. Use a controlled test session that has expired or been revoked.
2. Perform a protected read and a write from the mobile app and web app.
3. Test the retry/sign-in path.

**Expected result:** the application presents a session-required state such as `AUTH_SESSION_REQUIRED`, never a misleading data-not-found error. It must not retain financial-write controls after the server rejects the session.

## Organisation and Project access

### FQ-03 — Switch organisation and Project

1. Use a user with access to two test organisations and/or two Projects.
2. Switch organisation, then Project.
3. Open a Project-scoped module and create a disposable record.

**Expected result:** context changes before the record is loaded or created. The new record appears only in the active organisation/project. Refresh Access is appropriate after an administrator changes membership, role, or project assignment.

### FQ-04 — Member assignment and custom Project permissions

1. Invite/activate a test member with no organisation-wide Project access.
2. Assign the member to Project A in `ROLE_DEFAULT` mode.
3. Switch the assignment to `CUSTOM`, granting only a small set such as `workers:read`.
4. Test allowed and disallowed actions in Project A and all actions in Project B.

**Expected result:** custom permissions intersect with the organisation role ceiling; they cannot create a higher permission. Ended/inactive assignments do not grant access. Organisation-wide Project access uses the role default across all Projects and cannot express different permissions per Project.

## Universal quality checks

Run these checks for every released screen and every key role, not only once for the app.

| Check | What passes |
| --- | --- |
| Loading/empty/error | The state explains what happened and offers only a meaningful recovery action. |
| Network retry | A retry does not duplicate a financial/workflow record. |
| Authorization | Missing menu visibility and direct-route/API access are both denied. |
| Language | English, Hindi, and Gujarati copy, accessibility labels, errors, and dynamic values are clear. |
| Accessibility | Screen reader labels, touch targets, large text, focus/order, and contrast remain usable. |
| Responsive/device | Small phones, large phones, landscape, keyboard, and safe areas do not obscure critical actions. |
| Financial integrity | Currency has two decimals; totals, history, exports, and related-module detail agree. |
| Evidence | Every result records environment, role, test ID, actual result, and redacted visual evidence. |

## Defect report template

```markdown
### <test ID> — <short title>

- Result: PASS | FAIL | BLOCKED | NOT RUN
- Environment: <web/mobile, build/version, device/browser, API target>
- Role: <role>
- Organisation / Project: <safe test names>
- Preconditions: <relevant test data and setup>
- Steps:
  1. ...
- Expected: ...
- Actual: ...
- Evidence: <screenshot/video/log link; redact personal data/tokens>
- Reproducible: Always | Sometimes | Once
```

## Instructions for the shared ChatGPT Project

Paste the following as the project instruction after uploading the completed guide and screenshot PDF.

```text
You are the NirmanSite Test Assistant. Answer only from the uploaded guide and evidence.

Before diagnosing an issue, identify or ask for: the user role, organisation, active Project, module/screen, action attempted, relevant date or wage period, and what result was expected.

For calculations, list the inputs and show the formula. For Wages, check Calendar, worker assignment/primary-project dates, daily rate, Attendance exceptions, Kharchi outstanding balance, deduction allocation, manual adjustment, and payments in that order.

Classify each outcome as: expected behavior, missing setup/access, implemented but acceptance pending, planned/unavailable, or suspected defect. Do not guess that a hidden screen proves authorization; say that server access must be checked.

Do not request passwords, invitation tokens, session tokens, full personal data, or production financial records. Ask for a redacted screenshot and the test ID when evidence is needed.

When the guide does not establish an answer, say so and provide a complete defect-report template rather than inventing product behavior.
```

## Screenshot capture and release process

1. Complete a test case using controlled data.
2. Capture the normal, error, and empty/blocked state specified by its capture ID.
3. Redact sensitive values and create an annotated copy with numbered callouts.
4. Add the screenshot to the PDF beside its matching test case.
5. Record the app build, device, language, role, and test result.
6. Upload the released PDF and Markdown files to the shared ChatGPT Project; retain the repository Markdown as the canonical editable source.
