## Context

Today `docker-compose.yml` only provisions `postgres`, `redis`, and
`mailpit`. The Next.js frontend and NestJS backend run as host processes
(`pnpm --filter ... dev`/`start:dev`), and Stripe webhook forwarding needs a
third manually-started process (`stripe listen`). This is a monorepo
(`pnpm` workspaces + Turborepo, `apps/frontend` + `apps/backend`), which
affects how the Docker build context and Next.js's standalone output need to
be set up. Env vars today (`.env.example`) mix two audiences that must stay
distinguished when containerizing:

- **Server-to-server** values (`DATABASE_URL`, `REDIS_URL`, `SMTP_HOST`) —
  today point at `localhost`, correct for host processes, wrong inside a
  Compose network where the backend must reach `postgres`/`redis`/`mailpit`
  by service name.
- **Browser-facing** values (`NEXT_PUBLIC_API_URL`, `GOOGLE_CALLBACK_URL`,
  `FRONTEND_URL`, `STRIPE_CHECKOUT_SUCCESS_URL`, `STRIPE_PORTAL_RETURN_URL`)
  — these are followed by the user's actual browser (redirects, emailed
  links, client-side `fetch`), so they must stay `localhost:<host-port>`
  regardless of what runs in containers. Containerizing the backend must not
  accidentally rewrite these to container-network hostnames the browser
  can't resolve.

## Goals / Non-Goals

**Goals:**
- `docker compose up` alone brings up the entire stack — no local Node/pnpm
  install required to run the app.
- Backend/frontend images are production-shaped (multi-stage, slim runtime,
  no dev dependencies or source maps to build tools in the final layer).
- Stripe webhook forwarding starts automatically with the stack instead of a
  manual `stripe listen` command.
- `depends_on` gates the backend on Postgres/Redis actually being ready to
  accept connections, not just "container started."

**Non-Goals:**
- Production/deploy Docker setup (registries, orchestration, secrets
  management) — that's Step 3 in `tech.md`, deploy-time only.
- Changing local host-process development (`pnpm --filter backend
  start:dev`) — it must keep working unchanged for anyone who prefers it;
  this change is additive.
- Hot-reload inside the containers — these are production-style builds, not
  dev containers with bind-mounted source and file-watching.

## Decisions

**Multi-stage Dockerfiles, not single-stage.** Each Dockerfile has a `deps`
stage (install with pnpm, cached via `pnpm-lock.yaml`), a `build` stage
(`turbo run build --filter=<app>`), and a slim `runner` stage that copies
only build output + production `node_modules`. Alternative considered:
single-stage image with `pnpm install && pnpm build` at container-build time
and `CMD pnpm start` — rejected because it ships the entire dev toolchain
(TypeScript, ESLint, Nest CLI, Next's compiler) into the runtime image,
inflating size and attack surface for no benefit once the build is done.

**Backend runs `prisma migrate deploy` on container start, not as a
separate one-off Compose service.** The backend's `CMD` is
`sh -c "npx prisma migrate deploy && node dist/main"`. Alternative
considered: a dedicated `migrate` service that runs once and exits, with
`backend` depending on its successful completion — this is the more
"correct" pattern for a real deploy pipeline (Step 3), but for local dev it
adds a service and a `depends_on: condition: service_completed_successfully`
edge for a command that already runs in under a second and is safe to
re-run (Prisma migrations are idempotent — `migrate deploy` no-ops if there's
nothing pending). Chaining it into backend's startup is simpler and correct
for this stage; revisit the dedicated-service pattern in Step 3.

**Frontend uses Next.js `output: 'standalone'`.** `next.config.ts` gains
`output: 'standalone'` and `outputFileTracingRoot` pointed at the monorepo
root (`path.join(__dirname, '../../')`) — required because the pnpm
lockfile lives above `apps/frontend`, and without it Next's file tracer
doesn't reliably resolve workspace-hoisted `node_modules` into the
standalone bundle. The runner stage copies just `.next/standalone`,
`.next/static`, and `public`, then runs `node server.js` — this is Next's
own documented pattern for minimal-size container images, much smaller than
copying the full `node_modules` + running `next start`.

**`next.config.ts`'s conflicting exports get fixed in the same edit.** The
file currently has both `module.exports = { allowedDevOrigins: [...] }` and
`export default nextConfig` (an empty object) — under Next's config loader
this is ambiguous/last-write-wins rather than merged. Since `output` and
`outputFileTracingRoot` must land in the config Next actually reads, this
gets collapsed into one `export default` with all keys merged, rather than
adding a third conflicting export style on top.

**Explicit `healthcheck:` blocks on `postgres` and `redis`; rely on
Mailpit's built-in one.** The official `postgres` and `redis` images ship no
`HEALTHCHECK`, so Compose's `depends_on: condition: service_healthy` has
nothing to key off without one — add `pg_isready` and `redis-cli ping`
checks. Mailpit's image already defines its own `HEALTHCHECK` (backed by its
`/livez` and `/readyz` HTTP endpoints, checked via its own `mailpit readyz`
subcommand) — Compose reads that status natively, so no override is added
there; `backend` still lists `mailpit` in `depends_on` for start-ordering
(SMTP send failures at boot are non-fatal and BullMQ retries anyway), just
not gated on `service_healthy` for it.

**Stripe CLI as a pinned-version official image, not `latest`.** Runs
`stripe listen --api-key ${STRIPE_API_KEY} --forward-to
backend:${PORT}/billing/webhook`. `stripe login`'s interactive device-code
flow doesn't work in a non-interactive container, so `--api-key` (a Stripe
test-mode secret key) is required — this is the CLI's own documented
container-auth path, not a workaround. Pinned to a specific tag rather than
`latest` because unpinned versions of this image have had breaking startup
crashes reported (`stripe-cli` GitHub issue #1159) — the exact opposite of
what a "just clone and run" onboarding step needs. `depends_on: backend`
(no health condition) is enough: the CLI retries delivery until the backend
answers.

**Only container-to-container env vars are overridden in
`docker-compose.yml`; everything browser-facing stays exactly as `.env`
already has it.** The `backend` service's `environment:` block overrides
`DATABASE_URL`/`REDIS_URL`/`SMTP_HOST`/`SMTP_PORT` to the in-network service
names and ports (e.g. `postgres:5432`, not `${POSTGRES_PORT}` on the host).
Nothing else is touched — `NEXT_PUBLIC_API_URL`, `GOOGLE_CALLBACK_URL`,
`FRONTEND_URL`, and the Stripe redirect URLs keep reading straight from
`.env` unchanged, because those are followed by the user's browser and must
stay `localhost:<host-port>`. This is the one place the "single `.env` file"
model breaks slightly — documented in the README rather than solved with a
second `.env` file, to avoid duplicating every other variable.

**The webhook secret is captured once via `--print-secret`, not generated
by application code.** `stripe listen --print-secret` (run once, standalone,
against the same `--forward-to` target) prints a `whsec_...` value that is
stable across restarts for that forward target — documented Stripe CLI
behavior, not something to re-verify per run. A developer runs it once
during setup and pastes the result into `.env` as `STRIPE_WEBHOOK_SECRET`,
same as any other secret in that file. No secret-sync script or shared
volume between the `stripe` and `backend` containers is needed.

## Risks / Trade-offs

- **[Risk]** A developer edits backend/frontend source and expects
  `docker compose up` to reflect it live → **Mitigation**: this is a
  production-style build, not a dev container; the README explicitly keeps
  documenting `pnpm --filter ... dev` as the hot-reload workflow, with
  `docker compose up` as the "just run the whole thing" path.
- **[Risk]** `prisma migrate deploy` running automatically on every backend
  container start could mask a migration that should have required manual
  review → **Mitigation**: acceptable for local dev (the explicit goal of
  this change); Step 3's real deploy pipeline gets its own reviewed migration
  step, this pattern isn't carried into production as-is.
- **[Risk]** Pinning the Stripe CLI image tag means it goes stale and
  eventually stops matching current API versions → **Mitigation**: low
  impact for local test-mode webhook forwarding; a pinned tag is bumped
  manually if `stripe listen` starts erroring, same as any other pinned
  dependency in the repo.
- **[Trade-off]** Keeping browser-facing URLs on `localhost` means the
  frontend container's *server-side* code (if any ever calls the backend
  directly, not through the browser) would need its own container-network
  override later — not needed today since all current backend calls from
  the frontend are client-side `fetch`, but worth remembering if that
  changes.

## Migration Plan

1. Add Dockerfiles + `.dockerignore` for both apps; fix `next.config.ts`.
2. Extend `docker-compose.yml` with healthchecks, `backend`, `frontend`, and
   `stripe` services.
3. Update `.env.example` (add `STRIPE_API_KEY`; document the
   container-vs-browser split in a comment) and the README.
4. Verify locally: `docker compose up --build`, confirm all five services
   report healthy/running, confirm the frontend loads, register+login works
   end-to-end (proves Postgres/Redis wiring), and a Stripe test-mode
   checkout completes with the webhook received (proves the `stripe`
   service and `STRIPE_WEBHOOK_SECRET` are correct).
5. No rollback concerns beyond `git revert` — this is additive local-dev
   tooling with no persisted state migration; existing host-process
   (`pnpm dev`) workflow is untouched and keeps working if the container
   path is never used.

## Open Questions

- None outstanding — the one real ambiguity (host-process dev workflow vs.
  containerized workflow both needing to work) is resolved above by keeping
  them fully independent rather than merging into one.
