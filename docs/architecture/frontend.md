# Frontend Architecture

The frontend is a Next.js App Router application.

Reusable UI lives in `src/components/ui` and `src/components/common`. Product or platform workflows live in `src/features`. Route files under `src/app` should stay thin and import feature-level page components.

Navigation is configured in `src/config/navigation.ts` and should be permission-aware.

Business-data PDF export buttons call the permission-protected API PDF endpoints. `src/lib/exports/pdf.ts` validates and downloads the binary response, while `src/components/common/export-progress.tsx` provides preparation feedback. PDF rendering, fonts, report datasets and layouts live in the API; the browser has no PDF-generation library. Existing CSV adapters remain for compatibility. See `docs/tasks/pdf-export-implementation-plan.md` for coverage and acceptance gates.
