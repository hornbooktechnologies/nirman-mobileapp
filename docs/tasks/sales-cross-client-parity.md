# Sales cross-client parity — 2026-10-08

Client-only implementation under the approved Sales contract. Preserve existing layouts and Kharchi changes. Server status, permissions, pricing, allocation and availability remain authoritative. No API/DB/deployment work is authorized by this slice.

## Checklist and acceptance matrix

| Stage | Audited baseline / classification | Target and acceptance |
| --- | --- | --- |
| Common | Defective: device versus organization timezone, inconsistent active-project gates, obsolete reads | Same effective permissions/timezone; no late response crosses scope; denied/read-only/error and retained-input states |
| Leads | Web-only: stage/assignee filters, later pages, full editing/detail | Search/stage/assignee produce same records; >50 leads reachable; supported fields and assign/reassign behavior match |
| Activities | Mobile-only Call; different details/timestamp presentation | Validated call link; same manual types, actor, recorded time and separately labelled schedule/details |
| Follow-ups | Web-only status/date/assignee filters and full update | Same filters, outcomes/notes/next-time/completion; quick Complete retained; next-time metadata explained |
| Visits | Web-only dates/salesperson filters | Same actionable states, attendee validation, reschedule and all outcome fields |
| Inventory | Web-only status filter/detail actions; defective workflow edit eligibility | Same unit/pricing fields and authorized interest/hold/block/release/edit actions; blocked/booked cannot be ordinary edits |
| Import | Existing on both; missing native template sharing/guards | Same columns/parser/preview/results; native template and denied/stale/uncertain states |
| Bookings | Web-only date filters/some linkage fields; different retry guards | Same snapshots/restoration/link navigation; exact payload/key retained on uncertain retry |

Baseline: 35 existing Web Sales tests and Mobile typecheck passed. Each stage requires affected typecheck/tests; final lint/build/locales and diff checks. Browser/device acceptance requires deliberate disposable fixtures and cannot be inferred from static checks.

## API-blocked backlog

Existing effective CUSTOM read resolution, TEAM detail/list scope, atomic edit-versus-hold/conversion, revision/idempotency gaps outside booking creation, eligible-assignee discovery, terminal follow-up transition enforcement and true rescheduling remain separate API work. Clients must not broaden access or invent guarantees. Existing API follow-up statuses are retained; nextFollowUpAt is metadata, not a replacement schedule.

## Runtime acceptance

Pending: same-fixture Web/Mobile comparisons, Owner/Admin/own/team/read-only/CUSTOM roles, expired sessions, inactive projects, interrupted commands, cross-scope switching, desktop/narrow Web, physical mobile and en/hi/gu accessibility. End-to-end disposable workflow: lead → assignment → activity/follow-up → visit → interest/hold → booking → cancellation, with reads on the other client after every write.

## Delivered client checklist and source evidence

All rows below are source-implemented. Static verification is recorded separately; authenticated/device acceptance remains pending for every row.

| Surface | Matched fields, filters, actions and behavior | Source evidence |
| --- | --- | --- |
| Sales navigation/access | Leads, Follow-ups, Site Visits and Bookings readable with lead-read scope; Inventory with inventory:read; management actions separate; user/org/project/status/permission scope remounts | Mobile sales routes and sales-screen; Web sales-workspace/navigation |
| Lists | Loading/refresh/error/empty; existing server scopes; search preserved on return; status/date/member applied filters and clear; later lead pages accessible | Mobile sales-filters/services/sales-screen; Web SalesFilters and module pages |
| Lead creation | Customer name, primary/alternate mobile, email, preferred type, budget bounds, purpose/timeline, source/detail, priority, interested unit, authorized initial assignee | Mobile LeadAdditionalFields and existing create sheet; Web LeadForm |
| Lead editing/detail | All supported contact/preference fields, source/priority, loss reason, assigned/created actors, interested unit, created/updated/first-conversion facts; absent values visible | Mobile sales-lead-screen/LeadAdditionalFields/SalesDetailRows; Web lead-detail-page |
| Lead administration | Exact assign versus reassign permission; named date-eligible project/organization-wide assignees when readable, server-validated ID fallback; non-BOOKED manual stage changes/loss reason | Mobile sales-assignees/sales-rules/sales-lead-screen; Web LeadForm/sales-rules |
| Activity/contact | Validated Call links; Call outcome/Note/Brochure manual activity; summary/details/actor/recorded time; schedule separately labelled; readable booking/unit/assignment linkage and full timeline | Mobile sales-activity/sales-ui and lead/activity screens; Web lead-detail-page/activity-details |
| Follow-up scheduling | Organization-timezone date/time, type, notes, optional eligible assignee; defaults retain API behavior | Mobile lead schedule sheet; Web lead-detail-page |
| Follow-up list/detail/update | Status/date/assignee filters; customer search on both; schedule/type/notes/outcome/next-time/completed-time; quick Complete and all current API update statuses; preserved optional values, stale/review guard | Mobile FollowUpUpdateSheet and sales-screen; Web follow-ups-page |
| Site visit scheduling/update | Working-timezone schedule, optional assignee, 1–1000 integer attendees; only scheduled/rescheduled visits actionable; fresh-record comparison; reschedule requires valid date/time; all supported terminal outcomes | Mobile lead/visit sheets; Web SiteVisitForm/site-visit-rules |
| Site visit information | Status/date/salesperson filters and customer/salesperson search; schedule, customer, salesperson, attendees, feedback, objections, next action and completion time; linked lead navigation | Mobile sales-screen; Web site-visits-page |
| Unit list/detail | Search/status; unit/type/tower/floor/area/facing; pricing basis, exact server total/rate, active availability/expiry; interest/request counts; linked held lead | Mobile sales-screen/sales-unit-screen; Web inventory/unit-detail pages |
| Unit administration | Authorized edit for ordinary statuses only; blocked/booked edits prevented; manager-only direct block with eligible lead/optional future expiry; release with fresh availability check | Mobile UnitWorkflowSheet/list unit form; Web UnitForm/UnitWorkflowForm |
| Interests/holds | Interest and queue notes/status/priority/assignee/activity/next-follow-up information; related lead/unit links; INTERESTED/HIGH_INTENT/WITHDRAWN updates; hold request, pending-only decision, availability-required approval, optional expiry | Mobile lead interests, sales-unit-screen/UnitWorkflowSheet; Web LeadInventory/unit-detail-page |
| CSV import | Identical columns/parser/pricing-unit/error behavior; native template sharing; local parsing/server preview; re-preview before import; active permission/scope/duplicate-tap/uncertain-result guards | Mobile sales-unit-import-screen/unit-import; Web unit-import-page/unit-import |
| Booking list/creation | Search/status/booking-date range; amount/date/reference/actor/unit; inventory-less and eligible own-hold/available-unit conversion; inventory:book for linked units; immutable original retry payload/key | Mobile sales-screen/sales-lead-screen/sales-rules; Web bookings-page/BookingCreate/booking-rules |
| Booking detail/cancellation | Customer/mobile/reference/date/amount; booking actor distinct from first conversion actor/time; prior/current lead/unit states, created/updated times; both linked records; reason/explicit restoration/cancellation actor/time; active permissions/fresh-state/review guard | Mobile sales-booking-screen; Web booking-detail-page |
| Failure handling | Retained inputs, blocked double taps, locked pending controls, deliberate refresh/reconciliation before non-idempotent uncertain retries, cancellation/discard safeguards, ignored old-scope reads | Mobile Sales screens/sheets/rules; existing Web SalesForm/lifetime guards |
| Localization/UI | Matching English enum labels; en/hi/gu added keys/placeholders; existing theme/cards/filters/bottom sheets preserved; semantic controls and wrapping actions | Mobile locales and existing operational primitives; Web label helper and existing cards/forms |

### Verification evidence

- Nine focused Mobile/cross-client tests pass: supported filters/lead metadata, preserved follow-up payload/no automatic retry, identical CSV cases, readable activities, exact English vocabulary, effective write/assignment permissions, timezone/date/DST boundaries, validated call links and frozen booking retries/eligible holds.
- Existing 35 Web Sales tests pass. Web and Mobile typechecks passed during implementation; final compilation/bundle/lint evidence is recorded below when finished.
- Mobile locale validator passes all 19 namespaces across en/hi/gu.
- React review covers hook order, Strict Mode cleanup, scope cleanup, controlled inputs, action eligibility, guarded callbacks and form spacing. ui-ux-pro-max remains unavailable; existing design system/primitives were used.
- Authenticated role/cross-client writes, disposable full workflow, native sharing, physical-device/Indic/assistive-technology and browser visual acceptance remain pending. No production mutation or deployment was performed.

### Final local verification (2026-10-08)

- Mobile Sales rules/parity and existing Web Sales rules/service suites: 44 passed, zero failures (35 existing Web + 9 Mobile/cross-client).
- Final Mobile typecheck and scoped Web Sales ESLint: passed. Mobile has no configured lint command.
- Web production build using next build --webpack: passed, including TypeScript and all Sales routes.
- Android JS bundle using expo export --platform android --max-workers 1: passed. This verifies bundling, not device behavior or an installed application.
- Locale validator: 19 namespaces, en/hi/gu keys and placeholders passed. Diff check passed.

Stage delivery gates: common behavior, Leads/Activities, Follow-ups, Site Visits, Inventory/import and Bookings are source-implemented with affected static/test checks. Their authenticated/runtime/device gates remain open. Every checklist row must still be exercised with the same disposable fixtures on both clients before marking full parity complete. No test used production financial/conversion writes. Existing API gaps above require a separately reviewed API task.
