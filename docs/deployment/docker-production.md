# NirmanSite Docker production deployment

This deployment runs the marketing site, customer web app, API, and MySQL from one Compose project. The standalone topology uses Caddy. Hornbook production uses the existing Coolify Traefik proxy through `compose.coolify.yaml` and must not start a second proxy on ports 80/443.

## Public routing

| Host | Compose service | Repository app |
| --- | --- | --- |
| `nirmansite.com` | `website:3000` | `apps/website` |
| `www.nirmansite.com` | permanent redirect | `nirmansite.com` |
| `app.nirmansite.com` | `web:3000` | `apps/web` |
| `api.nirmansite.com` | `api:4000` | `apps/api` |

`apps/mobile` stays in the monorepo but is not built or started by Compose.

## 1. Network and DNS

The host currently identified as `192.168.1.200` is a private LAN address. For public access:

1. Create public DNS `A` records for `nirmansite.com`, `www.nirmansite.com`, `app.nirmansite.com`, and `api.nirmansite.com` pointing to the server's public IPv4 address.
2. If the server is behind a router/NAT, forward TCP ports 80 and 443 and UDP port 443 to `192.168.1.200`.
3. Allow those ports in the host firewall. Do not expose MySQL port 3306.
4. Make sure no other service on the Docker host already owns ports 80 or 443.

Hornbook already has Coolify and Traefik on ports 80/443. Use both Compose files there; the overlay disables Caddy, attaches the public services to the external `coolify` network, and supplies Traefik routes:

```bash
docker compose -f compose.yaml -f compose.coolify.yaml --env-file .env.production config --quiet
```

Do not run the base Compose file by itself on Hornbook production.

## 2. Server prerequisites

Install Git, Docker Engine, and the Docker Compose plugin. Then clone this repository on the server and enter its directory.

```bash
git clone <nirman-mobileapp-repository-url> nirmansite
cd nirmansite
cp .env.production.example .env.production
```

Edit `.env.production` and replace every placeholder. The password embedded in `DATABASE_URL` must match `MYSQL_PASSWORD`; URL-encode reserved password characters. Generate separate JWT values, for example with `openssl rand -hex 32`.

The real `.env.production` is ignored by Git. Restrict it to the deployment account (`chmod 600 .env.production` on Linux).

## 3. Validate and build

```bash
docker compose --env-file .env.production config --quiet
docker compose --env-file .env.production build
docker compose --env-file .env.production up -d database
docker compose --env-file .env.production ps
```

Wait for `database` to become healthy before database initialization.

## 4. Initialize or migrate the database

Database changes are deliberately not run during container startup. Back up an existing database first and review the target printed by the migration status command.

```bash
docker compose --env-file .env.production run --rm migration pnpm db:migrate:status
```

For the first approved production rollout, run the migration only after confirming the target. These flags are intentionally explicit safety gates:

```bash
docker compose --env-file .env.production run --rm \
  -e DB_MIGRATION_CONFIRM=I_UNDERSTAND_THIS_MUTATES_THE_DATABASE \
  -e DB_MIGRATION_ALLOW_REMOTE=true \
  -e DB_MIGRATION_ALLOW_PRODUCTION=true \
  migration pnpm db:migrate
```

Seeding is optional and should not be run on an established production database. If an initial seed is approved, set `DB_SEED_CONFIRM` to the exact database name and pass intentional initial credentials.

## 5. Launch

```bash
docker compose --env-file .env.production up -d
docker compose --env-file .env.production ps
docker compose --env-file .env.production logs --tail=100 api web website proxy
```

Verify:

```bash
curl -fsS https://api.nirmansite.com/api/v1/health
curl -I https://nirmansite.com
curl -I https://app.nirmansite.com
```

Also test customer login, refresh-token behavior, account activation, the contact form, a Gallery upload, and the mobile app against `https://api.nirmansite.com/api/v1` before announcing the rollout.

## 6. Updates and rollback

Before each update, record the deployed Git commit and back up MySQL. Then:

```bash
git pull --ff-only
docker compose --env-file .env.production build
docker compose --env-file .env.production up -d
docker compose --env-file .env.production ps
```

Application rollback is performed by checking out the previously recorded commit and rebuilding. Database rollback is not automatic: SQL migrations are additive, so use the pre-deployment backup if a database rollback is required.

## 7. Backup essentials

Back up both the database and Docker volumes. A logical database backup can be created without publishing MySQL:

```bash
docker compose --env-file .env.production exec -T database \
  sh -c 'exec mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --triggers "$MYSQL_DATABASE"' \
  > nirmansite-$(date +%F-%H%M).sql
```

Keep backups outside the Docker host and periodically test restoration. The `caddy_data` volume contains certificate state; it can be regenerated, but retaining it avoids unnecessary certificate reissuance.
