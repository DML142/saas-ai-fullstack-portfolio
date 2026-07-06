## 1. Environment configuration

- [x] 1.1 Add `DATABASE_URL` to root `.env.example`, assembled from the existing `POSTGRES_*` variables (format: `postgresql://<user>:<password>@localhost:<port>/<db>`)
- [x] 1.2 Add the same `DATABASE_URL` to your local `.env`

## 2. Install and configure Prisma

- [x] 2.1 Install `prisma` (dev dependency) and `@prisma/client` in `apps/backend`
- [x] 2.2 Run `npx prisma init` (or equivalent) inside `apps/backend` to scaffold `prisma/schema.prisma`
- [x] 2.3 Configure the `datasource db` block to use `provider = "postgresql"` and read `env("DATABASE_URL")`
- [x] 2.4 Configure the `generator client` block with an explicit `output` path (e.g. `../generated/prisma`) rather than the implicit default
- [x] 2.5 Add the generated client output path to `apps/backend/.gitignore`

## 3. First migration

- [ ] 3.1 ~~With `docker compose up` running, run `npx prisma migrate dev --name init`~~ — DEFERRED: schema has no models yet, nothing to migrate. Revisit once the first real model (e.g. `User`) is added.
- [ ] 3.2 ~~Confirm the migration file was created~~ — DEFERRED, same reason as 3.1.
- [ ] 3.3 ~~Run `npx prisma generate`~~ — done implicitly via `pnpm exec prisma generate` in task 2, client confirmed working.

## 4. PrismaService

- [x] 4.1 Create `PrismaService` in `apps/backend/src` that extends `PrismaClient` and implements `OnModuleInit`/`OnModuleDestroy`
- [x] 4.2 Call `this.$connect()` in `onModuleInit` and `this.$disconnect()` in `onModuleDestroy`
- [x] 4.3 Register `PrismaService` as a provider (e.g. in a dedicated `PrismaModule`) so it's injectable elsewhere

## 5. Health-check endpoint

- [x] 5.1 Create a health module/controller with a `GET /health` route
- [x] 5.2 Inject `PrismaService` and execute a raw query (e.g. `SELECT 1`) via `$queryRaw`
- [x] 5.3 Return a success response when the query succeeds
- [x] 5.4 Handle the query failure case and return an error response reflecting the database check failed (not an unhandled 500)

## 6. Verification

- [x] 6.1 Start the backend (`pnpm --filter backend start:dev`) with Postgres running and confirm it boots without connection errors
- [x] 6.2 Call `GET /health` and confirm a success response
- [x] 6.3 Stop Postgres (`docker compose stop postgres`) and call `GET /health` again, confirming a clear error response instead of a crash
- [x] 6.4 Restart Postgres and confirm `/health` recovers without restarting the backend process
