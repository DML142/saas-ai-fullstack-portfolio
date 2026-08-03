## 1. Frontend build fix and Dockerfile

- [ ] 1.1 Fix `apps/frontend/next.config.ts`: collapse the conflicting `module.exports`/`export default` into a single `export default`, add `output: 'standalone'` and `outputFileTracingRoot` pointed at the monorepo root
- [ ] 1.2 Add `apps/frontend/Dockerfile` (deps stage → build stage via `turbo run build --filter=frontend` → slim runner stage running `.next/standalone/server.js`)
- [ ] 1.3 Add `apps/frontend/.dockerignore` (`node_modules`, `.next`, `.env*`, etc.)

## 2. Backend Dockerfile

- [ ] 2.1 Add `apps/backend/Dockerfile` (deps stage → build stage via `turbo run build --filter=backend` → slim runner stage with production `node_modules` + `dist`)
- [ ] 2.2 Set the runner stage `CMD` to `sh -c "npx prisma migrate deploy && node dist/main"`
- [ ] 2.3 Add `apps/backend/.dockerignore` (`node_modules`, `dist`, `.env*`, `uploads`, etc.)

## 3. Compose wiring

- [ ] 3.1 Add `healthcheck:` blocks to `postgres` (`pg_isready`) and `redis` (`redis-cli ping`) in `docker-compose.yml`
- [ ] 3.2 Add the `backend` service: `build: ./apps/backend`, `environment:` overriding `DATABASE_URL`/`REDIS_URL`/`SMTP_HOST`/`SMTP_PORT` to in-network service names/ports, `env_file: .env` for everything else, port mapping, `depends_on` with `condition: service_healthy` on `postgres`/`redis` and plain start-order on `mailpit`
- [ ] 3.3 Add the `frontend` service: `build: ./apps/frontend`, `env_file: .env`, port mapping, `depends_on: backend`
- [ ] 3.4 Add the `stripe` service (pinned `stripe/stripe-cli` tag), `command: listen --api-key ${STRIPE_API_KEY} --forward-to backend:${PORT}/billing/webhook`, `depends_on: backend`

## 4. Env and docs

- [ ] 4.1 Add `STRIPE_API_KEY` to `.env.example`; add a short comment block marking which variables are server-to-server vs browser-facing
- [ ] 4.2 Update the README's "Running it locally" section to lead with the single `docker compose up --build` flow, keep the existing `pnpm --filter ... dev` flow documented as the hot-reload alternative, and document the one-time `stripe listen --print-secret` step for `STRIPE_WEBHOOK_SECRET`
- [ ] 4.3 Update `tech.md`: move Step 1 from "Next" to "Already implemented" with a short summary of what shipped, once verified

## 5. Verification

- [ ] 5.1 Run `docker compose up --build` from a clean state and confirm all six services (postgres, redis, mailpit, backend, frontend, stripe) start and postgres/redis report healthy
- [ ] 5.2 Confirm the backend applies pending Prisma migrations on boot and is reachable at its mapped host port (`/docs` loads)
- [ ] 5.3 Confirm the frontend is reachable at its mapped host port and loads the landing page
- [ ] 5.4 Register a test account through the containerized stack end-to-end (Postgres write, Redis token, Mailpit-caught verification email)
- [ ] 5.5 Trigger a Stripe test-mode Checkout against the containerized backend and confirm the `stripe` service forwards the webhook and the subscription tier updates in the DB
- [ ] 5.6 Confirm `docker compose down` / `docker compose up` preserves Postgres data and the captured `STRIPE_WEBHOOK_SECRET` still verifies
