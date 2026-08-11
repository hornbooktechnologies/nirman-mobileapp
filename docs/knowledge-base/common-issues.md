# Common Issues

## Do Not Run Prisma Commands

NirmanSite no longer uses Prisma in the active runtime/tooling path. Do not fix setup by running Prisma generate or migrate commands.

For local seed data on a safe database, run:

```bash
pnpm db:seed
```

## API Cannot Connect To Database

Confirm `DATABASE_URL` exists in `.env`, uses `mysql://` or `mariadb://`, and points to a running database.

## Frontend Calls The Wrong API

Confirm `NEXT_PUBLIC_API_BASE_PATH` in `.env` and restart the web dev server.
