#!/usr/bin/env bash
set -euo pipefail

required=(DATABASE_URL MYSQL_DATABASE MYSQL_ROOT_PASSWORD)
for variable in "${required[@]}"; do
  if [[ -z "${!variable:-}" ]]; then
    echo "Required environment variable is empty: ${variable}" >&2
    exit 1
  fi
done

echo 'Checking migration state before deployment.'
status_output="$(node dist/scripts/migration-status.js)"
printf '%s\n' "$status_output"

if grep -q '^Pending migrations: 0$' <<< "$status_output"; then
  echo 'No pending migrations; skipping database backup and migration.'
  exit 0
fi

if [[ "${MIGRATION_APPROVED:-}" != 'I_UNDERSTAND_THIS_MUTATES_THE_DATABASE' ]]; then
  echo 'Automatic production migration approval is missing.' >&2
  exit 1
fi

mkdir -p /backups
chmod 700 /backups
backup_path="/backups/pre-deploy-$(date -u +%Y%m%dT%H%M%SZ).sql"

echo "Creating database backup: ${backup_path}"
export MYSQL_PWD="${MYSQL_ROOT_PASSWORD}"
mysqldump \
  --single-transaction \
  --routines \
  --triggers \
  --host=database \
  --user=root \
  "${MYSQL_DATABASE}" > "${backup_path}"
unset MYSQL_PWD
chmod 600 "${backup_path}"
test -s "${backup_path}"

echo 'Applying approved repository migrations.'
DB_MIGRATION_CONFIRM=I_UNDERSTAND_THIS_MUTATES_THE_DATABASE \
DB_MIGRATION_ALLOW_REMOTE=true \
DB_MIGRATION_ALLOW_PRODUCTION=true \
node dist/scripts/migrate.js

echo 'Verifying migration state after deployment.'
node dist/scripts/migration-status.js
