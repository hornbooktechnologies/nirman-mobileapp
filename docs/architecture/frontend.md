# Frontend Architecture

The frontend is a Next.js App Router application.

Reusable UI lives in `src/components/ui` and `src/components/common`. Product or platform workflows live in `src/features`. Route files under `src/app` should stay thin and import feature-level page components.

Navigation is configured in `src/config/navigation.ts` and should be permission-aware.

Business-data PDF export buttons call the permission-protected API PDF endpoints. `src/lib/exports/pdf.ts` validates and downloads the binary response, while `src/components/common/export-progress.tsx` provides preparation feedback. PDF rendering, fonts, report datasets and layouts live in the API; the browser has no PDF-generation library. Existing CSV adapters remain for compatibility. See `docs/tasks/pdf-export-implementation-plan.md` for coverage and acceptance gates.

## Search behavior (2026-10-08)

Production Web collection search and standalone search controls use `SearchInput`, backed by `useSearchDraft` and the shared `createSearchDebouncer` (300 ms). Input text is immediate; only applied values update API query keys/URL state or complete-collection filters. Clear and Enter flush immediately; external reset/disable/unmount cancels obsolete timers; Web composition is suspended until completion. Native `SearchField` uses the same scheduler/hook behavior. Attendance screens already debounce their data query and opt out of a second field delay. Do not stack additional debounce timers around these controls. Paginated API searches must search before pagination and reset page with a changed term. Complete option collections may filter locally; native worker/picker collections must read all returned pages. Preserve API scope and ignore obsolete read responses.

### Refresh controls (2026-10-08)

Use Web/mobile `RefreshButton`, native `RefreshIconButton`, and native `GuardedRefreshControl`/`RefreshFlatList` for reads triggered by refresh. Return the real request promise from `onRefresh`; do not discard it with `void`. Pass current query/screen loading through `busy` or `disabled`. The shared per-control `createRefreshGate` locks synchronously and releases on settlement, coalescing repeated taps without introducing a global organization/project cache. Existing error handling belongs to the caller.

For grouped reads return `Promise.allSettled` when queries handle their own failures, or shared `refreshTogether` when a caller must report rejection after every sibling has settled. Never unlock early on the first rejection. Keep financial commands, payload freezing and mutation retry policies separate from refresh guards. Existing native pull-refresh spinners indicate actual refreshing, while `busy` also blocks new reads during initial loading.
