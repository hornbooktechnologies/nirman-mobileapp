# Local Run Setup

## Status

Draft for developer setup.

## Purpose

This document explains how to run NirmanSite visually after backend database details are filled.

## Environment Files

Local placeholder files have been created:

- `.env`
- `apps/web/.env.local`
- `apps/mobile/.env`

These files are ignored by git and must contain real local/development values before running the app.

## Database Safety

The configured database is not local to this machine.

Do not run any of these commands until you intentionally approve using that database for development/testing:

```bash
pnpm db:migrate:status
pnpm db:migrate
pnpm db:seed
```

Do not execute SQL migrations against a remote, shared, staging, or production database without explicit approval and backup/recovery confidence.

## Fill These Values

In `.env`, replace:

```text
<DB_USERNAME>
<DB_PASSWORD>
<DB_HOSTNAME>
<DB_NAME>
<replace-with-at-least-32-random-characters>
<replace-with-another-32-random-characters>
```

If your database uses a non-default port, change `3306`.

For mobile on a physical phone, update `apps/mobile/.env`:

```text
EXPO_PUBLIC_API_BASE_URL="http://<YOUR_COMPUTER_LAN_IP>:4000/api/v1"
```

## Start Commands

From the repository root:

```bash
pnpm --filter @nirman-app/shared build
pnpm --filter @nirman-app/api dev
pnpm --filter @nirman-app/web dev
pnpm mobile:lan
```

Open:

```text
Web: http://localhost:3000
API: http://localhost:4000/api/v1
```

## Login

Login requires:

- database schema exists;
- foundation permissions are seeded;
- admin user exists;
- API can connect to the configured database.

If the database is empty, login will not work until schema and seed are intentionally applied to a safe database.

## Database Commands

After a safe local or throwaway database is confirmed, inspect and apply schema in this order:

```bash
pnpm db:migrate:status
pnpm db:migrate
pnpm db:migrate:status
pnpm db:seed
```

`pnpm db:migrate` requires explicit migration confirmation environment variables before it mutates the database. The command refuses to run `_draft.sql` files.
