# NirmanSite Testing Guide

> **Purpose:** a practical guide for technical and non-technical testers. It explains what to test, the expected result, how modules connect, and how to recognise a defect or an unsupported feature.
>
> **Guide status:** initial source-backed draft. Screenshots and authenticated-device evidence are collected separately; their absence must never be treated as a passed test.

## How to use this guide

1. Start with [Platform provisioning and access](./01-platform-provisioning-and-access.md) when testing a fresh customer organisation.
2. Use [Workforce operations and financial verification](./02-workforce-operations-and-financial-verification.md) for Calendar, Attendance, Wages, and Kharchi.
3. Find the relevant module in the coverage register below. Follow its test cases in order and record the result.
4. When reporting a failure, include the test ID, role, organisation, project, date/time, steps, expected result, actual result, and a redacted screenshot or screen recording.

## Test result labels

| Label | Meaning |
| --- | --- |
| `PASS` | The observed result matches the guide. |
| `FAIL` | The observed result differs from the guide. |
| `BLOCKED` | Setup, access, environment, or a required earlier test prevents the test. |
| `NOT RUN` | The test has not been attempted. |
| `IMPLEMENTED — acceptance pending` | Source exists but authenticated or physical-device acceptance has not yet been completed. |
| `PLANNED / unavailable` | Do not report absence as a defect; record it only if the product owner says it should be released. |

## Controlled test data

Use a dedicated, non-production test organisation. Do not use real worker pay or personal contact details in screenshots.

| Item | Recommended value |
| --- | --- |
| Organisation | `Nirman Test Builder` |
| Project A | `Testing Site A` |
| Project B | `Testing Site B` |
| Worker | `Ramesh Test` |
| Daily rate | `₹800.00` |
| Test wage period | A fixed six-working-day period |
| Kharchi advance | `₹1,000.00` |

## Coverage register

| Area | Primary role | Guide chapter | Current documentation state |
| --- | --- | --- | --- |
| Platform users, roles, organisations, subscriptions | Platform Super Admin | [01](./01-platform-provisioning-and-access.md) | Source-backed draft |
| Owner activation, organisation members, project access | Platform Super Admin, Owner | [01](./01-platform-provisioning-and-access.md) | Source-backed draft |
| Authentication, sessions, members, Project Team | All roles, Owner | [06](./06-foundations-quality-and-chatgpt.md) | Source-backed draft |
| Projects and Workers | Owner, Project Manager | [02](./02-workforce-operations-and-financial-verification.md) | Flow draft |
| Work Calendar and Attendance | Owner, Supervisor | [02](./02-workforce-operations-and-financial-verification.md) | Flow draft |
| Kharchi and Wages | Owner, Supervisor | [02](./02-workforce-operations-and-financial-verification.md) | Calculation draft |
| Materials, Expenses, Progress, Gallery | Operational roles | [03](./03-construction-operations.md) | Source-backed draft |
| Sales, visits, units, bookings | Sales, Owner | [04](./04-sales-crm-and-bookings.md) | Source-backed draft |
| Notifications and dashboards | All authorised roles | [05](./05-notifications-and-dashboards.md) | Source-backed draft |

## Screenshot conventions

Each final PDF screenshot must have a matching capture ID, test ID, role, language, device/browser, and app build/version. Annotated copies are for explanation; retain an unannotated original as test evidence.

Use this naming format:

```text
<chapter>-<test-id>-<role>-<state>-<device>-<language>.png
01-PA-01-platform-super-admin-new-organization-web-en.png
02-WF-08-owner-wage-preview-android-en.png
```

Never expose passwords, invitation tokens, refresh tokens, production e-mail addresses, or financial data belonging to real workers in screenshots.

## ChatGPT tester assistant rule

The shared ChatGPT Project must receive this guide and the current screenshot PDF. It should identify the role, organisation, project, screen, date/period, and action before diagnosing an issue. It must distinguish a failed test from missing setup, unavailable functionality, or a known acceptance gap.
