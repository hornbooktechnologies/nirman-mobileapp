# Local setup with one root environment file

All four apps use the repository root `.env`. Create it from the root `.env.example` on a fresh checkout:

```powershell
Copy-Item .env.example .env
```

The current workspace already has the consolidated `.env`; do not overwrite it. Previous local files are backed up under the ignored `.env-backups/` directory. Do not recreate app-level `.env` or `.env.local` overrides.

Fill database, JWT, ingestion, SMTP and AWS credentials in `.env` only. Use plain URLs, not Markdown `[url](url)` links. Percent-encode special characters in the database URL password (`$` becomes `%24`, `%` becomes `%25`); SMTP passwords remain literal. The loader preserves literal dollar characters. Keep secrets out of `NEXT_PUBLIC_*` and `EXPO_PUBLIC_*` values.

The API maps `API_SMTP_*` and `API_MAIL_FROM_*` to its mail interface for contact, activation, reset and other emails. There is one SMTP configuration. The website needs only `API_BASE_URL`, `NEXT_PUBLIC_SITE_URL` and `SITE_INDEXING_ENABLED`; it holds no mail credentials or ingestion key. Existing process/container variables win over root file values. Saved platform Settings > Email values still win over the API environment fallback; set these to the same provider, sender and mailbox credentials when testing any email flow. `CONTACT_TO_EMAIL` is the API's team enquiry recipient.

Set `WEBSITE_URL=http://localhost:3001` in the API root configuration. The contact endpoint accepts only that exact browser Origin. The website proxies `/api/contact` to the NestJS `/api/v1/public/contact` endpoint. For phone/browser LAN testing, change `WEBSITE_URL` and `NEXT_PUBLIC_SITE_URL` together to the computer's LAN website address. The legacy `/platform/website-enquiries/ingest` endpoint and secret remain API-only for compatibility; the frontend no longer uses them.

## Start and test

Use Node 20.19+ and the repository's pnpm version. Install dependencies if needed with `pnpm install`, then build shared types once:

```powershell
pnpm --filter @nirman-app/shared build
node scripts/verify-root-env.cjs
```

Run each command in its own terminal at the repository root:

```powershell
pnpm --filter @nirman-app/api dev
pnpm --filter @nirman-app/web dev
pnpm website:dev
pnpm mobile:lan
```

Web/admin runs at `http://localhost:3000`, marketing at `http://localhost:3001`, API at `http://localhost:4000/api/v1`, and Metro normally at port 8081. Restart affected apps after changing `.env`. Do not use the root `pnpm dev` for this four-app procedure: Mobile has a separate Expo start command.

1. Submit a contact enquiry at `http://localhost:3001/contact`. Check the admin inbox and the response email flags. Verify customer receipt separately from SMTP acceptance.
2. Generate an invitation from the local admin. Open its `http://localhost:3000/activate?token=...` link. A new inactive identity should show password creation; an existing active identity keeps its existing password. Creating/accepting invitations and setting passwords writes to the configured database: use a dedicated test database.
3. Test password reset from the same local Web/API. Do not open locally issued tokens on the production domain unless both environments intentionally use the same database.
4. For a physical phone, connect it to the computer's LAN and allow local API/Web/Metro ports through the firewall. The mobile API resolver maps loopback to the Metro LAN host. Set `PUBLIC_WEB_APP_URL` and `PUBLIC_ACTIVATION_WEB_URL` to `http://YOUR_PC_LAN_IP:3000` so browser links on the phone reach the computer. For Expo Go, set `EXPO_GO_PROJECT_URL=exp://YOUR_PC_LAN_IP:8081`; an installed app uses the existing scheme and must itself target this test API. A Play Store production build does not pick up your edited local `.env`.

No migration or seed runs as part of this setup. Database schema rollout requires separate authorization. Deployment keeps its own injected production configuration; `.env.production.example` documents `app.nirmansite.com`, `nirmansite.com` and `api.nirmansite.com`. Never deploy the local root `.env`.

For Docker/Coolify, rebuild and deploy API and Website together: the website's
contact rewrite targets the internal `api:4000` service at build time. The API
receives `WEBSITE_URL=https://nirmansite.com`, `CONTACT_TO_EMAIL`, and the shared
SMTP configuration. No new database migration is required for this refactor.
