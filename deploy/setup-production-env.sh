#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ -f .env.production ]] && ! grep -q 'replace-with' .env.production; then
  echo '.env.production is already configured; refusing to overwrite it.' >&2
  exit 1
fi

umask 077
cp .env.production.example .env.production

db_password="$(openssl rand -hex 32)"
root_password="$(openssl rand -hex 32)"
jwt_secret="$(openssl rand -hex 48)"
jwt_refresh_secret="$(openssl rand -hex 48)"
enquiry_key="$(openssl rand -hex 48)"

sed -i \
  -e "s|^MYSQL_PASSWORD=.*|MYSQL_PASSWORD=${db_password}|" \
  -e "s|^MYSQL_ROOT_PASSWORD=.*|MYSQL_ROOT_PASSWORD=${root_password}|" \
  -e "s|^DATABASE_URL=.*|DATABASE_URL=mysql://nirmansite:${db_password}@database:3306/nirmansite|" \
  -e "s|^JWT_SECRET=.*|JWT_SECRET=${jwt_secret}|" \
  -e "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=${jwt_refresh_secret}|" \
  -e "s|^WEBSITE_ENQUIRY_INGEST_KEY=.*|WEBSITE_ENQUIRY_INGEST_KEY=${enquiry_key}|" \
  .env.production

chmod 600 .env.production

if grep -q 'replace-with' .env.production; then
  echo 'A required production placeholder is unresolved.' >&2
  exit 1
fi

echo '.env.production created with mode 600.'
