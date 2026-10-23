# NirmanSite marketing website

The public website for NirmanSite: Next.js 16 (App Router), React 19, Tailwind CSS 4, TypeScript. Production domains: nirmansite.com (marketing), app.nirmansite.com (frontend), and api.nirmansite.com (API).

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
| `API_BASE_URL` | Contact proxy and activation API adapter (server only) | e.g. `https://api.nirmansite.com/api/v1`; set before building |
| `NEXT_PUBLIC_SITE_URL` | deployment/indexing gate | Set to `https://nirmansite.com` at live launch; staging keeps its own URL |
| `SITE_INDEXING_ENABLED` | SEO metadata, headers and sitemap | Defaults off; keep `false` on staging and enable only for the live domain |

See [SEO and search launch](docs/website/10-seo-and-search-launch.md) for staging safeguards, live launch steps and rendered SEO checks. Analytics and Google account setup follow live launch.

Contact validation, persistence and SMTP delivery live in `apps/api`. This
frontend posts through the `/api/contact` rewrite and needs no SMTP secrets.
Configure the API's `WEBSITE_URL` to this website's exact public origin and use
the root `API_SMTP_*` settings (or saved Admin Email Settings) for all emails.
Docker builds the proxy against the internal API service; separate hosting must
set `API_BASE_URL=https://api.nirmansite.com/api/v1` at build time and rebuild
when that upstream changes.

## Where things live

- `src/components/sections`: landing page sections and the shared `Eyebrow` / `Title` helpers (`kit.tsx`)
- `src/components/company`: About / Contact / legal page parts (`parts.tsx`, `ContactForm.tsx`, `LegalPage.tsx`)
- `src/components/devices`: phone, tablet and browser frames for the app screenshots
- `src/features/activation`, `src/lib/api`: activation flow and the server-only API client
- `src/assets/screens`: app screenshots, prepared by `scripts/prepare_screens.py` from the raw screenshot folders (kept locally, not committed)
- `docs/`: planning notes from the first version of the site
