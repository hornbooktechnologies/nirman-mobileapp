# Sales Brochures Technical Plan

## 1. Status

- Status: source and database rollout verified; full browser/device/SMTP acceptance pending
- Module: Sales Brochures
- Last updated: 2026-10-22

## 2. Purpose

Implement the approved Sales Brochures contract as one coherent API, authenticated Web, and Mobile vertical slice while reusing private storage, Sales Leads, SMTP, audit, Project access, and existing design systems.

## 3. Inputs

- `docs/modules/sales/brochures/CONTRACTS.md`
- `docs/modules/sales/CONTRACT.md`
- `docs/modules/foundation/files-media/CONTRACTS.md`
- `docs/ai-development/CONTRACT_TO_IMPLEMENTATION_WORKFLOW.md`
- current shared, SQL, API Gallery/Sales/Email, Web Sales, and Mobile Sales source

## 4. Scope

In scope: shared vocabulary; additive migration `033`; API library/upload/media/archive/restore/delete/share/public delivery; Lead-create opt-in; SMTP template; permission defaults; Web/Mobile library and Lead integration; Mobile en/hi/gu; focused tests and static verification.

Out of scope: migration/seed execution, production deployment, malware scanning, video transcoding, campaign automation, forced social-app integrations, offline mutation queue, and public marketing-site changes.

## 5. Approved Decisions

- Project-scoped 50 MiB stored-byte quota.
- Link-based email delivery; no large binary email attachments.
- `brochures:read/upload/manage/share` permission keys.
- 30-day revocable share links, immutable explicit asset selection, approximate opens.
- Archive remains quota-counted; explicit permanent deletion releases bytes.
- Lead creation succeeds independently of email delivery.

## 6. Implementation Slices

| Slice | Goal | Areas | Verification | Approval Needed |
| --- | --- | --- | --- | --- |
| 1 | Shared contracts | `packages/shared` | shared type-check | approved |
| 2 | Schema/RBAC draft | migration `033` | static SQL review | approval required before execution |
| 3 | API | brochure module, Sales/Email integration | focused tests, API type-check/build | approved |
| 4 | Web | library, share, Lead opt-in, public landing | tests/type-check/lint/build as practical | approved |
| 5 | Mobile | library, native share, Lead opt-in, locales | locale validation/type-check/export as practical | approved |
| 6 | Review/docs | status and review evidence | diff check | approved |

## 7. File Plan

- Shared: brochure constants/types/errors/permission groups and exports.
- SQL: `apps/api/src/database/sql/migrations/033_sales_brochures.sql`.
- API: `modules/brochures/*`, Email template/service extension, Sales DTO/service/module integration, app module.
- Web: Sales brochure types/service/components/routes, workspace tab, Lead form opt-in, public route.
- Mobile: brochure API/screen/routes/navigation, Lead form opt-in, localized strings.
- Docs: module index, current task, progress ledger, review.

## 8. Verification Plan

Run focused brochure/API tests, shared/API/Web/Mobile type-checks, API build, Web lint/build where practical, Mobile locale validation, and `git diff --check`. Record database, SMTP, browser, and physical-device gates as unrun unless explicitly completed.

## 9. Risks

- Concurrent quota enforcement requires a locked Project-scoped quota row.
- Storage and database cannot share a transaction; upload/delete use compensating cleanup and explicit failure states.
- SMTP acceptance is not delivery/open proof.
- Public tokens must never be logged or stored raw.
- Browser/native share target availability varies by platform.

## 10. Rollback Notes

Runtime code can be removed independently while migration remains unapplied. After migration execution, rollback requires first removing brochure bytes and dependent share rows, then explicit reviewed SQL; no automatic destructive down migration is provided.

## 11. Open Decisions

None blocking implementation. Database execution and production rollout remain separately gated.

## 12. Exit Criteria

All three clients consume one shared contract; permission/tenant/quota/share security is tested; static checks pass; docs distinguish implemented from runtime/device/database acceptance.
