#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ "${MIGRATION_APPROVED:-}" != 'I_UNDERSTAND_THIS_MUTATES_THE_DATABASE' ]]; then
  echo 'Set MIGRATION_APPROVED=I_UNDERSTAND_THIS_MUTATES_THE_DATABASE to continue.' >&2
  exit 1
fi

compose=(docker compose -f compose.yaml -f compose.coolify.yaml --env-file .env.production)

# Rebuild the migration target after a pull so its command/runtime layout always
# matches this script. Application containers remain running during this build.
"${compose[@]}" build migration

for _ in {1..60}; do
  if [[ "$(docker inspect --format '{{.State.Health.Status}}' nirmansite-database-1 2>/dev/null || true)" == 'healthy' ]]; then
    break
  fi
  sleep 2
done

if [[ "$(docker inspect --format '{{.State.Health.Status}}' nirmansite-database-1 2>/dev/null || true)" != 'healthy' ]]; then
  echo 'Database did not become healthy.' >&2
  exit 1
fi

"${compose[@]}" run --rm migration node dist/scripts/migration-status.js

mkdir -p backups
chmod 700 backups
backup_path="backups/pre-migration-$(date -u +%Y%m%dT%H%M%SZ).sql"
"${compose[@]}" exec -T database sh -c \
  'exec mysqldump --single-transaction --routines --triggers -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' \
  > "${backup_path}"
chmod 600 "${backup_path}"
test -s "${backup_path}"
echo "Backup created: ${backup_path}"

"${compose[@]}" run --rm \
  -e DB_MIGRATION_CONFIRM=I_UNDERSTAND_THIS_MUTATES_THE_DATABASE \
  -e DB_MIGRATION_ALLOW_REMOTE=true \
  -e DB_MIGRATION_ALLOW_PRODUCTION=true \
  migration node dist/scripts/migrate.js

"${compose[@]}" run --rm migration node dist/scripts/migration-status.js
