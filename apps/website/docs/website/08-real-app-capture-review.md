# Real app captures: review and section placement

Reviewed 2026-09-15. All 16 supplied screenshots were visually reviewed in the conversation; original file dimensions and integrity were checked locally. Source files are user-supplied, English-language Android captures. Build/version and permission to publish the displayed identities/data are not established. Dates shown in the UI are record dates, not verified capture dates.

## Library and publication status

Implementation update: following the user's explicit request to use the images, six unmodified captures (dashboard, attendance, wage batches, expenses, material requests and Sales section menu) are now served from `public/media/app/`. Responsive Next.js images are displayed in keyboard-focusable scrollable frames with full-size links. The real dashboard replaces the hero animation proof; that component remains in source for possible later reuse. The synthetic expense chart and progress panel were removed from this presentation. The language preview remains explicitly illustrative because translated real captures were not supplied.

No raster editing or redaction was performed. Phone-number screens and the health-note-bearing Kharchi screen remain excluded from public assets. Project/name/financial data in the selected captures is used as supplied under the implementation request; public release still merits the documented data-clearance check. Dashboard/progress disagreement is not presented as a matching pair because the separate progress screenshot is not used. The video remains unavailable.

Full-resolution copies are organised under `assets/app-captures/source/`, outside the web-served `public/` directory and ignored by Git. Downloads originals are unchanged. SHA-256 checks confirmed all 16 copies match their originals. The screenshots have not been recoloured, retouched, redacted or cropped. No website visuals were replaced in this review pass.

Selection below means editorial suitability, not blanket publication clearance. Worker/customer names, financial records, organisation/account labels and identifiable images need demo-data confirmation or safe recapture. Worker and sales phone numbers must not enter public exports. The Kharchi detail includes a health-related note; exclude that entire payment-notes card from a delivery crop or recapture with a neutral demo note.

## Complete inventory

All widths are 1080px. Paths below are relative to `assets/app-captures/source/`.

| Original PNG | Organised path | Height | Website placement | Review decision and treatment |
| --- | --- | ---: | --- | --- |
| 1000270177 | dashboard/dashboard-en.png | 5859 | Hero; project visibility/working arrangements | Strong overview source. Use a top viewport showing project, progress and Today at site; separately crop the financial card for supporting detail. Never shrink all 5859px into one phone. Welcome/account labels need clearance. Exclude unrelated recent-activity thumbnails. Dashboard progress is inconsistent with the supplied progress screen; do not silently correct the number. |
| 1000270173 | workforce/attendance-summary.png | 4270 | Workforce / attendance | Primary selection. Focus on the attendance-period context and 2–3 worker summary cards. The screen shows period totals, not a daily attendance list. Copy should explain automatic presence and recording exceptions, not claim every worker must be marked present manually. |
| 1000270178 | workforce/worker-detail.png | 2400 | Workforce / worker assignment detail | Supporting only. Phone number requires redaction or safe recapture. Focus on identity/trade, daily rate and primary-project assignment. Do not make the destructive End project assignment action the focal point. |
| 1000270183 | kharchi/advance-detail.png | 3271 | Kharchi / recorded advance | Primary selection after safe crop/clearance. Keep title, worker/status and Balance card. ₹500 outstanding, ₹0 deducted, Deduction pending. Exclude payment-notes card containing a health-related note. This screen does not demonstrate a completed wage deduction. |
| 1000270184 | kharchi/record-form-loading.png | 2400 | None | Reject for marketing: Loading eligible workers is visible. Keep only as source reference. Do not paint out the loader and invent a completed form. |
| 1000270185 | kharchi/record-form-empty.png | 2400 | Kharchi / how recording starts | Backup reference; better than the loading capture. Worker and amount are empty, so it is not a ready-to-submit step. Request a filled real form for the walkthrough; retain the money-already-paid explanation. |
| 1000270186 | kharchi/adjustment-form.png | 2400 | Optional record-history/corrections detail | Secondary, not main marketing visual. Useful evidence that corrections preserve original financial history. Empty amount/reason; not proof an adjustment was submitted. |
| 1000270188 | wages/wage-batches.png | 3392 | Wages / periods and payment status | Primary selection. Crop period controls and 2–3 batches, or use batch cards as a magnified detail. Captures paid and partially-paid states. Do not mix amounts across different periods. |
| 1000270190 | wages/batch-detail.png | 3251 | Wages / worker-level dues | Strong supporting selection. Net ₹6,550 = paid ₹1,600 + due ₹4,950. Preserve period and labels. Worker cards show daily rate, attendance and due status. The cancel control plus cannot-cancel explanation distracts; prefer a worker-card detail crop or fresh capture, not UI repainting. No per-worker gross/Kharchi breakdown is visible. |
| 1000270192 | expenses/expense-overview.png | 2994 | Expenses / recorded spend and approvals | Primary selection. Highlight ₹25,000 recognized spend and the two approved entries (₹20,000 + ₹5,000). Avoid the unfinished draft food entry in the primary crop. This is a totals/list screen, not evidence of a category chart; replace illustrative-chart storytelling with what the real screen proves. |
| 1000270198 | materials/material-requests.png | 2560 | Materials / requests and status | Usable for request tracking. Paint and Cement are Draft; received quantity is 0, purchase cost ₹0. Do not caption this as completed deliveries. Prefer a future populated in-progress/delivered example if the section promises delivery tracking. |
| 1000270200 | materials/new-request-form.png | 4843 | Materials / optional request walkthrough | Reference only for now: empty, very long form dominated by unit choices. A filled, normal-viewport capture would be stronger. Do not squeeze into a device or imply a request has been saved. |
| 1000270202 | progress/project-progress.png | 2904 | Project progress / stage tracking | Primary after consistency review. Shows 2.8% overall, 1 of 9 stages updated, Foundation at 25%. Use the overall/stage cluster and a separate history crop. Dashboard says 25% overall for the same project; preserve both sources and request a refreshed consistent pair. Do not infer which calculation is wrong from screenshots alone. |
| 1000270204 | sales/leads.png | 2923 | Supporting Sales section | Best populated sales view after privacy cleanup. Crop first 2–3 meaningful stages; phone numbers must be removed from delivered pixels. Exclude Test/Audit Lead entries. Do not infer completed bookings from lead stages. |
| 1000270205 | sales/section-menu.png | 2400 | Sales / scope of companion tools | Supporting option with no visible customer phone numbers in the foreground. Shows Leads, Follow-ups, Site visits, Unit inventory and Bookings navigation, not populated workflows. Crop the sheet for a capability overview. |
| 1000270208 | sales/new-lead-form.png | 4712 | Sales / optional entry walkthrough | Reference only: blank long form, not compelling primary marketing media. Mobile field appears to show placeholder-style text; do not assume it is real contact data. A populated demo form with a fictional identity is preferable. |

## Recommended first placement set

1. Hero: dashboard top-viewport crop. Keep a static product-first hero while broader animation direction is parked; do not assume this selection authorises another hero redesign.
2. Working arrangements: dashboard project card as supporting evidence only. No supplied screenshot proves the different role configurations or the multi-project switcher workflow.
3. Workforce: attendance cards, with worker assignment detail as a secondary magnified view after privacy cleanup.
4. Kharchi: saved advance header and Balance card. Show recording and settlement as separate concepts until a coherent linked sequence is supplied.
5. Wages: batch list plus worker dues detail, retaining date/period context.
6. Expenses: recognized-spend summary plus approved expense entries, replacing unsupported synthetic chart imagery.
7. Materials and progress: paired request-list and stage-progress detail panels; captions must distinguish Draft requests from deliveries.
8. Sales: stage-based lead cards after cleanup, or the section menu as a safer interim product-scope visual.
9. Languages: do not use the English capture with digitally translated labels. Obtain the same real dashboard in Hindi and Gujarati.

## Preparation rules

- Preserve the warm branded app backgrounds and actual labels, states and amounts. Do not regenerate authentic UI with AI or invent populated fields.
- These are mostly extended scrolling captures, not natural phone-height images. Use a deliberate viewport crop and separate enlarged detail crops; never stretch/compress vertically or fit the full image to a 600px-tall phone.
- Crop away Android status-bar distractions and unused bottom scenery where appropriate, while retaining app navigation when showing a whole-screen viewport. Do not splice the original bottom navigation beneath a top crop and call it an unedited screenshot.
- Keep surrounding website framing outside the screenshot. Use honest descriptive captions; avoid new overlays that resemble app controls.
- Cropping must not change meaning: retain date/period with wage totals, Pending deduction with the Kharchi balance, and Draft with material entries.
- Data corrections should happen in a demo dataset followed by recapture. For privacy derivatives, use irreversible opaque redaction rather than reversible overlays or weak blur, and inspect the output before placing it in public assets.
- Generate optimised delivery assets only after crop selection and privacy clearance. Original PNGs remain the source of truth. No delivery crop or redaction is claimed complete in this pass.

## Video

`C:/Users/admin/Downloads/1000270181.mp4.adding` exists but is **0 bytes**. A completed sibling `1000270181.mp4` was not found at review time. The `.adding` extension may indicate an unfinished transfer, but the zero-byte size is the concrete blocker. There are no frames, duration or audio to review. Do not rename it and claim it is a usable MP4. Request the completed video export/transfer.

## Remaining assets, in priority order

1. Completed MP4.
2. Normal-viewport dashboard, with progress consistent with the Project Progress screen and unrelated activity images excluded.
3. Filled Kharchi form, Kharchi list, and a worker wage-detail screen showing a real matching advance deduction. The supplied 15 Sept advance is pending; the 4–7 Sept batch is a different period and cannot serve as its after-state.
4. Hindi and Gujarati copies of the same dashboard.
5. Expense detail; preferably approved. A report/chart screenshot only if that view actually exists.
6. Material detail with a meaningful fulfilled/in-progress status, and a real site-progress photo update if available.
7. A populated follow-up/site-visit detail and project switcher, optional.

## Release checks

Confirm whether names, project identity and financial figures are demo data cleared for public marketing. Do not publish phone numbers or the health-related note regardless of visual suitability. Compare fresh dashboard/progress captures before showing them together. Review final crops at real mobile and desktop display sizes. The rest of the app's functional correctness has not been audited by this asset review.
