# On-demand API PDF exports - 2026-10-01

User approved moving PDF generation from Web/Mobile into the API. This supersedes the earlier client-rendering implementation. Covered modules: Attendance, Wages, Kharchi, Materials, Expenses and Progress. Modules without business-data export remain outside this slice.

## Contract and workflow

- Existing CSV endpoints retain their routes, content type, permission checks, field mappings, filter semantics and full export pagination.
- PDF endpoints are `GET /organizations/:organizationId/projects/:projectId/<module>/export/pdf`; Wages uses `GET /organizations/:organizationId/projects/:projectId/wages/batches/:batchId/export/pdf`.
- PDF endpoints use the same export query DTOs and corresponding `:export` grants as CSV. UUID route validation and tenant/project authorization remain required.
- Both formats use the same authorized structured report dataset. PDF does not parse CSV and does not recalculate financial values.
- Successful PDF responses are raw `application/pdf` attachments, with readable ASCII filenames, Content-Length, private/no-store cache policy and nosniff. Errors retain the API JSON error envelope.
- PDF generation uses memory only. No PDF database rows, BLOBs, migrations, server temp files, S3 uploads or report archives are created.
- PDF headings show project names, selected date/filter scope and batch From/To/status; no batch/project UUID headings. Wage items and payment history remain separate tables.
- English/Hindi/Gujarati report text uses bundled Noto fonts. Wide tables repeat record numbers and the first identifying field; headers repeat on pages, with generated IST timestamp and page numbers.
- PDF requests above 5,000 rows fail explicitly with PDF_EXPORT_TOO_LARGE; data is never silently truncated. Paginated queries stop early when the PDF limit is exceeded. Renderer permits two concurrent generations per API instance, otherwise PDF_EXPORT_BUSY. CSV retains its existing full-data behavior.

## Folder structure

- `apps/api/src/common/exports/report.ts`: report types, common CSV serialization, scope/filename helpers, row limit and column groups.
- `apps/api/src/common/exports/pdf-export.service.ts`: centralized in-memory pdfmake renderer and binary download response.
- `apps/api/src/common/exports/pdf-export.module.ts`: reusable singleton registered in the API.
- `apps/api/src/common/exports/assets`: bundled OFL-licensed fonts, copied into dist/src by Nest build.
- Module services acquire authorized datasets via exportReport; controllers expose PDF routes alongside existing CSV routes.
- `apps/web/src/lib/exports/pdf.ts`: binary API request, error decoding, PDF validation and browser download only. No pdfmake/font assets remain in Web.
- `apps/mobile/src/lib/exports/pdf.ts`: authorized binary download to unique app-cache file, PDF validation, Android folder save and native share. No Expo Print or client PDF renderer remains.
- Existing reusable progress UI remains: Web preparation dialog with elapsed time/background option; Mobile preparation -> ready -> save/share, cancellation, request timeout and duplicate-tap guard. Organization/project changes cancel Mobile requests. A cancelled client request does not promise to stop an already running server renderer; its temporary memory is released after rendering/request completion.
- Mobile temporary files are removed after completion/cancellation. User-saved files remain. Expo Sharing and FileSystem remain required.
- Mobile popup footer fills the BottomSheet's horizontal footer, groups compact Download/Share buttons on the left and keeps Cancel on the right. Short localized labels keep the actions in one row, with minimum 44-point touch targets.

## Verification and remaining acceptance

Passed: API/Web/Mobile TypeScript checks, API and Web production builds with packaged fonts, new PDF code and scoped Web lint, locale parity, 273 API tests, 14 client/adapter tests and diff checks. Broad API lint still reports seven pre-existing errors and one warning in Attendance/Wages services, verified against HEAD. API regression suite plus renderer/controller tests cover raw PDF responses for all six modules, denied project access, route validation, real multipage PDF bytes, Indic font selection, CSV compatibility, wide-column retention and row-limit rejection. Client tests cover all six adapters, binary validation/error decoding, exact-byte downloads, filenames, native save/share and cancellation before file creation.

Authenticated live API/browser exports, real dataset volume/performance, fluent Indic typography, accessible visual acceptance and physical Android/iOS save/share remain pending. Deploy the API with its packaged font assets before switching deployed clients. No database operation is required. Native binaries still need Expo Sharing installed; Expo Print is no longer required.

## Local missing-route investigation - 2026-10-01

The reported Web request used localhost:3000. During investigation the API process started with the updated compiled routes. Fresh unauthenticated requests to the exact wage PDF URL, plus all other five module PDF URLs, returned AUTH_SESSION_REQUIRED (401) through both localhost:3000 and localhost:4000, rather than Cannot GET (404). The Web rewrite targets localhost:4000. This establishes current route registration, not an authenticated live export acceptance.

### Web response succeeds but download is missing

User confirmed Mobile succeeds and supplied a Web 200 application/pdf attachment response. The shared Web utility now retains the returned PDF in the export popup and exposes a direct Download PDF link alongside the automatic attempt. The ready popup remains available after the request completes; Done/Escape/unmount release the retained Blob URL. The link downloads the already received bytes without a second API request. Wage export errors are now caught and displayed instead of becoming unhandled promise rejections. All six Web export buttons use this shared flow.

Client download tests (10), Web typecheck and scoped lint passed. Chromium displayed the actual React ready popup with Download PDF and Done. A controlled browser test also established that programmatic downloads outside a modal can succeed, so inert modal content was not established as the cause of the user's failure. Authenticated user-browser downloading remains an acceptance check; browser automation of the real PDF download did not complete reliably. No Mobile/API generation behavior or PDF persistence was changed for this follow-up.

Controller integration tests now exercise the full /api/v1 prefix and the real renderer for every PDF endpoint, verifying PDF signature, attachment filename and response byte length. All 15 PDF API tests and 9 client adapter/download tests passed. The running API uses nest start without watch; use pnpm --filter @nirman-app/api dev during development so API changes reload. Restart a non-watch API process after changing export controllers. The separately probed public Web deployment still returned 404 for PDF and needs the updated API deployed before remote exports work.
