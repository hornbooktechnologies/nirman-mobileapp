# Frontend Architecture

The frontend is a Next.js App Router application.

Reusable UI lives in `src/components/ui` and `src/components/common`. Product or platform workflows live in `src/features`. Route files under `src/app` should stay thin and import feature-level page components.

Navigation is configured in `src/config/navigation.ts` and should be permission-aware.
