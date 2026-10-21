# NirmanSite marketing website

The public website for NirmanSite: Next.js 16 (App Router), React 19, Tailwind CSS 4, TypeScript. Deployed on Vercel from this repository.

## Pages

| Route | What it is |
| --- | --- |
| `/` | Landing page (`src/app/(site)/page.tsx`, sections in `src/components/sections`) |
| `/about` | About Hornbook Technologies and how NirmanSite took shape |
| `/contact` | Enquiry form that sends email through the server-only contact endpoint |
| `/privacy`, `/terms` | Draft legal pages (noindex) |
| `/activate?token=…` | Account activation for invitations sent by the NirmanSite app. Calls the NirmanSite API server-side |

Marketing pages share the header and footer through `src/app/(site)/layout.tsx`. `/activate` is a standalone page.

## Development

```bash
pnpm install
cp apps/website/.env.example apps/website/.env.local   # then adjust if needed
pnpm website:dev             # http://localhost:3001
```

Checks:

```bash
pnpm --filter @nirman-app/website type-check
pnpm --filter @nirman-app/website build
pnpm --filter @nirman-app/website verify:activation    # mocked contract checks for the activation flow
```

## Environment variables

| Name | Used by | Notes |
| --- | --- | --- |
| `API_BASE_URL` | `/activate` (server only) | e.g. `https://nirman-mobileapp-api.vercel.app/api/v1` |
| `NEXT_PUBLIC_SITE_URL` | deployment/indexing gate | Set to `https://nirmansite.com` at live launch; staging keeps its own URL |
| `SITE_INDEXING_ENABLED` | SEO metadata, headers and sitemap | Defaults off; keep `false` on staging and enable only for the live domain |

See [SEO and search launch](docs/website/10-seo-and-search-launch.md) for staging safeguards, live launch steps and rendered SEO checks. Analytics and Google account setup follow live launch.

## Where things live

- `src/components/sections`: landing page sections and the shared `Eyebrow` / `Title` helpers (`kit.tsx`)
- `src/components/company`: About / Contact / legal page parts (`parts.tsx`, `ContactForm.tsx`, `LegalPage.tsx`)
- `src/components/devices`: phone, tablet and browser frames for the app screenshots
- `src/features/activation`, `src/lib/api`: activation flow and the server-only API client
- `src/assets/screens`: app screenshots, prepared by `scripts/prepare_screens.py` from the raw screenshot folders (kept locally, not committed)
- `docs/`: planning notes from the first version of the site
