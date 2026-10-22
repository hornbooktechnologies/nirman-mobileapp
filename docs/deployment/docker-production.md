# NirmanSite Docker production deployment

This deployment runs the marketing site, customer web app, API, and MySQL from one Compose project. The standalone topology uses Caddy. Hornbook production is managed as a Git-based Docker Compose Application in Coolify using `compose.coolify-managed.yaml`; it must not start a second proxy on ports 80/443.

## Public routing

| Host | Compose service | Repository app |
| --- | --- | --- |
| `nirmansite.com` | `website:3000` | `apps/website` |
| `www.nirmansite.com` | website alias | `apps/website` |
| `app.nirmansite.com` | `web:3000` | `apps/web` |
| `api.nirmansite.com` | `api:4000` | `apps/api` |

`apps/mobile` stays in the monorepo but is not built or started by Compose.

## 1. Network and DNS

The host currently identified as `192.168.1.200` is a private LAN address. For public access:

1. Create public DNS `A` records for `nirmansite.com`, `www.nirmansite.com`, `app.nirmansite.com`, and `api.nirmansite.com` pointing to the server's public IPv4 address.
2. If the server is behind a router/NAT, forward TCP ports 80 and 443 and UDP port 443 to `192.168.1.200`.
3. Allow those ports in the host firewall. Do not expose MySQL port 3306.
4. Make sure no other service on the Docker host already owns ports 80 or 443.

Hornbook already has Coolify and Traefik on ports 80/443. Coolify owns the proxy labels and resource network. Configure these service domains in the application:

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

The real `.env.production` is ignored by Git. Restrict it to the deployment account (`chmod 600 .env.production` on Linux).

## 3. Create the Coolify application

Create a `NirmanSite` project with a `production` environment and add a Git-based application with:

- repository: `hornbooktechnologies/nirman-mobileapp`
- branch: `main`
- build strategy: Docker Compose
- Compose location: `/compose.coolify-managed.yaml`
- auto deploy: Deploy on push (webhooks)

Sync the existing `.env.production` values into Coolify. Variables written as `${VARIABLE:?}` are required and block a deployment while empty. Optional variables carry safe defaults in Compose. Set `MIGRATION_APPROVED=I_UNDERSTAND_THIS_MUTATES_THE_DATABASE` to record the standing authorization for this production deployment workflow.

The Compose definition deliberately reuses the external `nirmansite_mysql_data` volume. Do not rename it or remove `external: true`: this is the imported production database.

## 4. Automatic database migration

Every new Compose build runs the one-time `migration` service before the API starts. It:

1. waits for MySQL health through Compose dependency conditions;
2. reports migration status and refuses checksum drift, failed, missing, or draft migrations;
3. writes a timestamped logical backup under `/home/hornbook/nirmansite/backups`;
4. applies migrations through the repository's lock and production safety gates;
5. verifies final status before allowing the API to start.

Coolify's `exclude_from_hc: true` marks this completed one-time container as excluded from overall application health. A backup or migration failure stops the deployment dependency chain.

Seeding is optional and should not be run on an established production database. If an initial seed is approved, set `DB_SEED_CONFIRM` to the exact database name and pass intentional initial credentials.

## 5. Launch and verify

Deploy from the Coolify application and inspect Deployment Logs. The `database`, `api`, `web`, and `website` components must be healthy, while `migration` should be successfully completed.

Verify:

```bash
curl -fsS https://api.nirmansite.com/api/v1/health
curl -I https://nirmansite.com
curl -I https://app.nirmansite.com
```

Also test customer login, refresh-token behavior, account activation, the contact form, a Gallery upload, and the mobile app against `https://api.nirmansite.com/api/v1` before announcing the rollout.

## 6. Updates and rollback

Pushes to `main` trigger a Coolify deployment. New required secrets are intentionally not invented from Git: add their values in Coolify before deployment. Safe non-secret defaults can use `${VARIABLE:-default}` in Compose and appear automatically when the definition reloads.

Application rollback is performed from Coolify by redeploying a previously known-good commit. Database rollback is not automatic: SQL migrations are additive, so use the matching pre-deployment backup if a database rollback is required. During the initial ownership transfer, the former `/home/hornbook/nirmansite` checkout and Compose definition are retained as a rollback path; never start both database containers against the external volume at the same time.

## 7. Backup essentials

Back up both the database and Docker volumes. A logical database backup can be created without publishing MySQL:

```bash
docker compose --env-file .env.production exec -T database \
  sh -c 'exec mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --triggers "$MYSQL_DATABASE"' \
  > nirmansite-$(date +%F-%H%M).sql
```

Keep backups outside the Docker host and periodically test restoration. The `caddy_data` volume contains certificate state; it can be regenerated, but retaining it avoids unnecessary certificate reissuance.
