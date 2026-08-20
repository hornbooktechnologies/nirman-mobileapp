# NirmanSite Mobile Localization Glossary

## 1. Status

```text
approved_governance_translation_review_pending
```

The glossary process and source terminology are approved. Hindi and Gujarati production terms remain review-gated until fluent construction-domain reviewers approve them.

## 2. Language And Register

| Language | Locale | Native name | Required register |
| --- | --- | --- | --- |
| English | `en-IN` | English | Plain, concise, non-ERP wording |
| Hindi | `hi-IN` | हिन्दी | Respectful `आप`; modern field-familiar terminology |
| Gujarati | `gu-IN` | ગુજરાતી | Respectful `તમે`; modern field-familiar terminology |

## 3. Translation Record Format

Every approved term or message records:

- stable key;
- English source;
- screen/workflow context;
- Hindi translation;
- Gujarati translation;
- variables/placeholders;
- maximum-risk layout location, if any;
- reviewer and review date;
- status: `DRAFT`, `REVIEWED`, or `APPROVED`.

One approved glossary entry is reused across namespaces where the meaning is identical. A separate entry is required when the same English word has a different workflow meaning.

## 4. Never Translate

- `NirmanSite`;
- database IDs and UUIDs;
- permission keys such as `workers:update-rate`;
- API enums such as `ACTIVE`, `DRAFT`, and `ON_HOLD`;
- analytics event names;
- route segments;
- ISO codes such as `INR`;
- email addresses, phone numbers, invitation tokens, project/worker codes, URLs, and file names;
- Organization, Project, Member, Worker, role-label, designation, responsibility, and trade values entered by users.

These values may appear beside translated labels, but their stored value must not change.

## 5. Core Term Review Queue

The following source terms must be resolved before their first production namespace is accepted. Blank target values are intentional and prevent unreviewed AI translations from becoming canonical.

| Key | English source | Context | Hindi | Gujarati | Status |
| --- | --- | --- | --- | --- | --- |
| `organization` | Organization | Customer builder/company/business tenant | — | — | `DRAFT` |
| `project` | Project | Construction project/workspace | — | — | `DRAFT` |
| `projectTeam` | Project Team | Login members assigned to a Project | — | — | `DRAFT` |
| `member` | Member | Login user with Organization membership | — | — | `DRAFT` |
| `worker` | Worker | Non-login workforce record | — | — | `DRAFT` |
| `contractorMember` | Contractor Member | Internal hired individual with login access | — | — | `DRAFT` |
| `organizationOwner` | Organization Owner | Customer Organization owner role | — | — | `DRAFT` |
| `builderSupervisor` | Builder Supervisor | Builder-side oversight role | — | — | `DRAFT` |
| `siteSupervisor` | Site Supervisor | Field-execution role | — | — | `DRAFT` |
| `projectManager` | Project Manager | Project operational role | — | — | `DRAFT` |
| `role` | Role | Organization permission ceiling | — | — | `DRAFT` |
| `permission` | Permission | Allowed action; not the raw key | — | — | `DRAFT` |
| `assignment` | Assignment | Member/Worker allocation to a Project | — | — | `DRAFT` |
| `responsibility` | Responsibility | Descriptive Project label; grants no permission | — | — | `DRAFT` |
| `dailyRate` | Daily rate | Worker monetary rate per day | — | — | `DRAFT` |
| `attendance` | Attendance | Daily Worker presence record | — | — | `DRAFT` |
| `wages` | Wages | Worker earnings/payment workflow | — | — | `DRAFT` |
| `kharchi` | Kharchi | Construction-domain advance/deduction workflow | — | — | `DRAFT` |
| `materials` | Materials | Site material request/approval workflow | — | — | `DRAFT` |
| `siteExpenses` | Site expenses | Project expense workflow | — | — | `DRAFT` |
| `siteModeActive` | Site Mode Active | Offline/degraded UX label; not yet implemented sync | — | — | `DRAFT` |
| `updatesWaiting` | Updates waiting | Future queued-sync label | — | — | `DRAFT` |

## 6. Status And Action Rules

Machine statuses remain uppercase enum values. Locale resources provide visible labels keyed by the exact enum.

Actions are translated as complete task labels, not noun fragments. For example, `Create & assign` is one translation unit. Loading variants such as `Creating…` and destructive confirmations such as `End assignment?` require their own reviewed entries.

## 7. Review Rules

- Review terms in their actual screenshot and workflow, not only in a spreadsheet.
- Prefer wording understood by site workers and supervisors over formal ERP vocabulary.
- Record whether an English construction term should remain in Latin script, be transliterated, or be translated.
- Do not mix alternative translations for the same approved concept.
- Re-review copy when a workflow meaning changes, even if the English text remains similar.
- Financial, destructive, permission, invitation, and offline/sync copy requires explicit reviewer sign-off.

