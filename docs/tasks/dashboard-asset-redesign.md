# Dashboard asset redesign — 2026-09-09

## Reference analysis (before implementation)

Approved source: `apps/mobile/assets/design-reference/ChatGPT Image Sep 2, 2026, 03_57_54 PM.png` and the existing brand library. The brief's `app/mobile` resolves to the actual `apps/mobile` workspace.

Preserve the reference's architectural hero, olive/sand summary pair, warm full-width surfaces, restrained overlapping objects, Manrope typography, rounded cards and subtle blueprint depth. The selected-project card uses a light, full-bleed construction scene: its title slightly overlaps the building, the project access and Open Project controls share the lower edge, and no decorative slogan is displayed. Adapt the wide reference to 320px with vertical sections and at most two metric/action columns. Header, footer menu and bottom navigation stay unchanged. Preserve the existing 14px tab-label edit.

Palette: warm ivory #FEF6EB, blueprint #CBF6FF, coffee #2F2010, orange #FE4F04, green #194826 and existing NirmanSite olive. Component colors consume existing semantic theme tokens.

## Asset mapping

All final PNGs belong to `apps/mobile/assets/dashboard/`. Generate separate files using built-in image generation; reuse approved architectural assets where appropriate. Transparent object assets have consistent upper-left warm lighting and realistic materials. No baked-in UI text, values or percentages.

| Folder          | Required assets                                                                                         | Consumer                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| backgrounds     | dashboard-background, blueprint-overlay, construction-line-art                                          | Content-only background layers                                            |
| hero            | selected-project-building, crane-overlay, project-hero-decoration                                       | Selected project hero                                                     |
| progress        | progress-building, progress-ring, construction-stage-icon                                               | Progress card; ring PNG is decorative, actual progress remains dynamic    |
| project-summary | helmet, project-folder, site-building-mini                                                              | Summary pair                                                              |
| statistics      | assigned-workers, present-workers, absent-workers, expense-wallet, sales-chart, calendar, inventory-box | Site statistics and sales pulse                                           |
| quick-actions   | create-project, attendance, update-progress, more-actions                                               | Permission-aware quick actions and Actions tab                            |
| financial       | money-stack, kharchi-wallet, wage-payment                                                               | Financial tab                                                             |
| attention       | warning, material-request, delayed-work                                                                 | Attention tab; delayed work reserved until supported by API               |
| activity        | labour-photo-placeholder, material-delivery, site-update                                                | Clearly illustrative fallback assets; never presented as real site photos |
| decorative      | construction-tools, safety-helmet, bulldozer, cement-bags, blueprint-paper                              | Reusable optional accents; not all displayed simultaneously               |

## Implementation boundaries

Refine existing dashboard composites, introduce the requested `Dashboard/` feature components, and preserve existing consumers through exports. Reuse project switching and create-project flows. Continue using the existing role dashboard endpoint and null/permission semantics. No API, schema, financial calculation or navigation changes. Sample project names, counts and percentages in the brief are illustrative, not production data. The existing API supplies a gallery summary, not a per-event timeline, and no delayed-work metric; do not fabricate either.

## Verification plan

Validate PNG dimensions/alpha, mobile TypeScript, en/hi/gu locale parity, focused lint, Expo web/Android export and diff whitespace. Render actual reusable components at 320, 375 and 425px, inspect screenshots and verify overflow and touch targets. Distinguish fixture-based component previews from authenticated app and physical-device acceptance.

## Status

Implementation complete. The [asset catalog](../../apps/mobile/assets/dashboard/README.md) contains 38 separate PNGs in ten folders: 35 generated images, two exports of approved brand assets, and the user-supplied approved dashboard-card background, approximately 7.86 MB total. The manifest records prompts, provenance, dimensions and alpha checks.

Reusable components in `apps/mobile/src/features/home/components/Dashboard/` now render the hero, summary, progress, site statistics, Sales Pulse, quick actions, financial/actions/attention tabs and recent Gallery activity. The existing Gallery entries endpoint provides up to three actual entries with authenticated thumbnails; the project endpoint supplies city/state. Both are scoped to the active organization/project. Null metrics remain omitted and actions remain permission-derived, including all server-provided actions in the Actions tab. No delayed-work count was invented. Header, footer menu and bottom navigation remain unchanged.

Mobile TypeScript, 18-namespace en/hi/gu parity, focused ESLint, PNG alpha/dimension checks, and Expo web/Android exports passed. The [screenshot report](artifacts/dashboard-redesign/README.md) includes 320/375/425px previews in all three languages: all nine combinations passed overflow, minimum 50px interactive target and tab-selection checks. The persisted fixture harness is reproducible and uses synthetic data; it does not claim authenticated or device acceptance.

Pending acceptance: authenticated project location/Gallery reads, physical-device parallax and reduced-motion behavior, budget-Android performance, native font scaling, screen readers, landscape and fluent Hindi/Gujarati review. No API/schema/dependency changes were needed for this redesign; unrelated worktree changes were preserved.
