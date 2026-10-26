# NirmanSite Docker production deployment

The standalone topology runs the marketing site, customer web app, API, and MySQL from one Compose project and uses Caddy. Hornbook production uses three Git-based Docker Compose Applications in Coolify so an ordinary source change builds and deploys only the affected server. The former aggregate `compose.coolify-managed.yaml` definition remains a rollback path; it must not run at the same time as the split API stack because both definitions reference the production database volume.

## Public routing

| Host | Compose service | Repository app |
| --- | --- | --- |
| `nirmansite.com` | Website application, `website:3000` | `apps/website` |
| `www.nirmansite.com` | Website application alias | `apps/website` |
| `app.nirmansite.com` | Web application, `web:3000` | `apps/web` |
| `api.nirmansite.com` | API application, `api:4000` | `apps/api` |

`apps/mobile` stays in the monorepo but is not built or started by Compose.

## 1. Network and DNS

The host currently identified as `192.168.1.200` is a private LAN address. For public access:

1. Create public DNS `A` records for `nirmansite.com`, `www.nirmansite.com`, `app.nirmansite.com`, and `api.nirmansite.com` pointing to the server's public IPv4 address.
2. If the server is behind a router/NAT, forward TCP ports 80 and 443 and UDP port 443 to `192.168.1.200`.
3. Allow those ports in the host firewall. Do not expose MySQL port 3306.
4. Make sure no other service on the Docker host already owns ports 80 or 443.

Hornbook already has Coolify and Traefik on ports 80/443. Coolify owns the proxy labels and each resource network. Configure these service domains:

- `website`: `https://nirmansite.com:3000`, `https://www.nirmansite.com:3000`
- `web`: `https://app.nirmansite.com:3000`
- `api`: `https://api.nirmansite.com:4000`

`compose.coolify.yaml` remains only as the rollback topology for the former SSH-managed deployment. Do not run the base Compose file by itself on Hornbook production.

## 2. Server prerequisites

Install Git, Docker Engine, and the Docker Compose plugin. Then clone this repository on the server and enter its directory.

```bash
git clone <nirman-mobileapp-repository-url> nirmansite
cd nirmansite
bash deploy/setup-production-env.sh
```

The setup script generates independent database, JWT, refresh-token, and website-enquiry secrets without printing them. It refuses to overwrite an already configured production file. Add the SMTP, S3, and Expo credentials that are enabled for the deployment; keep `NOTIFICATIONS_PUSH_ENABLED=false` until `EXPO_ACCESS_TOKEN` is configured.

Contact submissions are handled by the API at `/api/v1/public/contact`. Configure
one API SMTP account (`API_SMTP_*`/`API_MAIL_FROM_*`) and `CONTACT_TO_EMAIL`;
the website no longer receives SMTP credentials. Saved Admin Email Settings
override the API's environment fallback. The API's `WEBSITE_URL` is the exact
marketing origin (`https://nirmansite.com` in Compose). Rebuild and deploy API and
Website together: Docker bakes the website's `/api/contact` rewrite against the
internal `http://api:4000/api/v1` upstream. No database migration is introduced by
this contact migration. See [contact API ownership](../architecture/website-contact-api.md).

The real `.env.production` is ignored by Git. Restrict it to the deployment account (`chmod 600 .env.production` on Linux).

## 3. Create the Coolify applications

Create a `NirmanSite` project with a `production` environment and add three Git-based Docker Compose applications from the same repository and branch:

| Application | Compose location | Domains |
| --- | --- | --- |
| `NirmanSite API` | `/compose.coolify-api.yaml` | `https://api.nirmansite.com:4000` on `api` |
| `NirmanSite Web` | `/compose.coolify-web.yaml` | `https://app.nirmansite.com:3000` on `web` |
| `NirmanSite Website` | `/compose.coolify-website.yaml` | `https://nirmansite.com:3000`, `https://www.nirmansite.com:3000` on `website` |

For all three applications:

- repository: `hornbooktechnologies/nirman-mobileapp`
- branch: `main`
- build strategy: Docker Compose
- auto deploy: Manual deployments only; the LAN poller dispatches affected services
- build cache: enabled
- source commit availability during build: disabled

The API application owns `database`, one-time `migration`, and `api`. Web and Website call the stable public API origin at build/runtime, so they do not depend on an internal Compose service name. This avoids coupling their Coolify networks or requiring a production database-container move.

Sync the API and database values from the existing `.env.production` into the API application. Web and Website only need variables detected from their smaller Compose definitions. Variables written as `${VARIABLE:?}` are required and block a deployment while empty. Optional variables carry safe defaults in Compose. Set `MIGRATION_APPROVED=I_UNDERSTAND_THIS_MUTATES_THE_DATABASE` on the API application to record the standing authorization for this production deployment workflow.

The Compose definition deliberately reuses the external `nirmansite_mysql_data` volume. Do not rename it or remove `external: true`: this is the imported production database.

MySQL is pinned to patch version `8.4.13`. Upgrade that value deliberately after a fresh backup and allow for the five-minute startup grace period while MySQL runs its built-in data dictionary upgrade.

## 4. Automatic database migration

Every API deployment runs the one-time `migration` service before the API starts. It:

1. waits for MySQL health through Compose dependency conditions;
2. reports migration status and refuses checksum drift, failed, missing, or draft migrations;
3. exits without a backup when there are no pending migrations;
4. writes a timestamped logical backup under `/home/hornbook/nirmansite/backups` when a migration is pending;
5. applies migrations through the repository's lock and production safety gates;
6. verifies final status before allowing the API to start.

Coolify's `exclude_from_hc: true` marks this completed one-time container as excluded from overall application health. A backup or migration failure stops the deployment dependency chain.

Seeding is optional and should not be run on an established production database. If an initial seed is approved, set `DB_SEED_CONFIRM` to the exact database name and pass intentional initial credentials.

## 5. Launch and verify

For the initial cutover, stop the former aggregate application without deleting its external volume, remove its domain assignments to avoid duplicate proxy routes, then deploy API, Web, and Website. Never run the aggregate and split API definitions together. Inspect Deployment Logs: API `database` and `api`, Web `web`, and Website `website` must be healthy, while API `migration` should be successfully completed.

Verify:

```bash
curl -fsS https://api.nirmansite.com/api/v1/health
curl -I https://nirmansite.com
curl -I https://app.nirmansite.com
```

Also test customer login, refresh-token behavior, account activation, the contact form, a Gallery upload, and the mobile app against `https://api.nirmansite.com/api/v1` before announcing the rollout.

## 6. Updates and rollback

Hornbook's Coolify dashboard is private to the LAN, so GitHub cannot call an inbound webhook. A once-per-minute user cron job runs `deploy/coolify-poll-deploy.sh`. It maintains a bare Git cache, compares the remote `main` SHA with the last queued SHA, maps changed paths to API/Web/Website, and sends one authenticated Coolify request containing only the affected application UUIDs. Documentation-only commits advance the state without deploying an application.

Copy `deploy/coolify-poller.env.example` to the existing external poller configuration, enter all three application UUIDs, and keep the real configuration and authorization header at mode `600`. The dependency map is intentionally conservative:

- `apps/api/**` deploys API;
- `apps/web/**` deploys Web;
- `apps/website/**` deploys Website;
- `packages/shared/**` deploys API and Web;
- root dependency/build files deploy all three so pruned Docker layers can decide whether work is reusable.

The legacy `COOLIFY_APPLICATION_UUID` remains supported for rollback. When it is set, the poller deploys that aggregate application for every source commit instead of using the three split UUIDs.

New required secrets are intentionally not invented from Git: add their values in Coolify before deployment. Coolify discovers new Compose variable references when it reloads the definition; `${VARIABLE:?}` blocks deployment until a value is supplied, while safe non-secret defaults can use `${VARIABLE:-default}`.

Application rollback is performed per affected Coolify application by redeploying a previously known-good commit. For a whole-stack rollback, stop the split applications before enabling the aggregate definition. Database rollback is not automatic: SQL migrations are additive, so use the matching pre-deployment backup if a database rollback is required. During the ownership transfer, retain the former aggregate definition as a rollback path; never start both database containers against the external volume at the same time.

## 7. Build-cache behavior

Each application has its own Dockerfile and cache namespace. `turbo prune --docker` reduces the install inputs and lockfile to that application's workspace dependency graph. BuildKit persists the pnpm store and Turbo task cache, while both Next.js applications also persist `.next/cache`. Keep normal Docker build caching enabled in Coolify and reserve no-cache deployments for cache diagnosis.

The Docker build does not consume `SOURCE_COMMIT`; making it a build argument would invalidate reusable layers on every commit. Build-time API/public URL changes intentionally invalidate the applicable Next.js build.

## 8. Backup essentials

Back up both the database and Docker volumes. A logical database backup can be created without publishing MySQL:

```bash
docker compose --env-file .env.production exec -T database \
  sh -c 'exec mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --triggers "$MYSQL_DATABASE"' \
  > nirmansite-$(date +%F-%H%M).sql
```

Keep backups outside the Docker host and periodically test restoration. The `caddy_data` volume contains certificate state; it can be regenerated, but retaining it avoids unnecessary certificate reissuance.
