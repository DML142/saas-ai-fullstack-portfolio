# tech.md — Tech Stack & Properties Reference

Quick-reference sheet for the exact versions, services, ports, and config
groups this repo runs on. This is **not** a progress log — see
[`progress.md`](progress.md) for what's done/in-flight/blocked, and
[`roadmap.md`](roadmap.md) for the cloud deployment plan.

---

## Monorepo

- pnpm workspaces + Turborepo (`turbo@^2.10.8`)
- Package manager: `pnpm@10.27.0` (pinned via root `package.json`
  `packageManager` field)
- Node.js: `node:22-alpine` (pinned in both Dockerfiles); local dev verified
  on Node 25.2.1

## Backend (`apps/backend`)

- NestJS 11 (`@nestjs/core ^11.0.1`, `@nestjs/common ^11.0.1`)
- Prisma ORM 7 (`prisma ^7.8.0`, `@prisma/client ^7.8.0`, `@prisma/adapter-pg`), PostgreSQL provider
- Auth: Passport (`passport ^0.7.0`), `@nestjs/jwt ^11.0.2`, Google OAuth via
  `passport-google-oauth20`, `bcrypt ^6.0.0` for password hashing
- Queues: `bullmq ^5.80.9` + `@nestjs/bullmq ^11.0.4`, Redis client
  `ioredis ^5.11.1`
- Realtime: `@nestjs/websockets` + `@nestjs/platform-socket.io`,
  `socket.io ^4.8.3`
- Payments: `stripe ^22.3.2`
- Email: `nodemailer ^9.0.3` (dev-only, unauthenticated transport → Mailpit)
- Docs: `@nestjs/swagger ^11.4.6`, served at `/docs`
- Scheduling: `@nestjs/schedule ^6.1.3` (cron jobs)
- Static files: `@nestjs/serve-static ^5.0.5` (avatar uploads)
- Validation: `class-validator ^0.15.1`, `class-transformer ^0.5.1`
- Tests: Jest — `test` (unit), `test:integration`
  (`test/jest-integration.json`, against `docker-compose.test.yml`),
  `test:e2e` (`test/jest-e2e.json`)

## Frontend (`apps/frontend`)

- Next.js `16.2.10` (App Router), React `19.2.4`
- Styling: Tailwind CSS 4, `shadcn ^4.13.0` + `@base-ui/react ^1.6.0`
- State: `zustand ^5.0.14`
- Forms: `react-hook-form ^7.81.0` + `@hookform/resolvers` + `zod ^3.25.76`
- Animation: `gsap ^3.15.0` + `@gsap/react ^2.1.2`
- 3D: React Three Fiber / Three.js / Drei are the CLAUDE.md target stack for
  the constellation effect but are **not yet installed** — that effect
  currently ships as a hand-rolled SVG/DOM implementation
  (`components/features/InitConstellation.tsx`)
- Markdown/code: `react-markdown ^10.1.0`, `remark-gfm`, `rehype-highlight`,
  `highlight.js`
- Realtime client: `socket.io-client ^4.8.3`
- E2E: `@playwright/test ^1.62.1`

## Data & infra (local dev, via Docker Compose)

- PostgreSQL: `postgres:16-alpine`
- Redis: `redis:7-alpine`
- Mailpit (SMTP catcher): `axllent/mailpit`, UI at `:8025`
- Stripe CLI (webhook forwarder): `stripe/stripe-cli:v1.45.0`
- `docker-compose.yml` — full local stack (frontend, backend, Postgres,
  Redis, Mailpit, Stripe CLI)
- `docker-compose.test.yml` — tmpfs-only Postgres + Redis on non-colliding
  ports, for integration tests (no named volume, genuinely disposable)

## CI/CD

- GitHub Actions, `.github/workflows/ci.yml`, jobs: `backend` (lint/test/
  build), `frontend` (lint/build), `integration` (Supertest against the test
  Postgres/Redis), `e2e` (Playwright, `continue-on-error` — needs Stripe
  secrets to fully pass)
- Branch protection on `main`: PR required, both required checks enforced
  (including for the repo owner), no force-push/deletion
- No CD/deploy pipeline yet — see `roadmap.md`

## Env var groups (see `.env.example`)

- **Server-to-server** (DB/Redis/SMTP hosts) — overridden to Compose service
  hostnames in `docker-compose.yml`
- **Browser-facing** (redirect URLs, emailed links, client `fetch` base) —
  must stay `localhost:<host-port>` even when everything else runs in
  containers
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
  `STRIPE_PRICE_LITE/PRO/ULTRA`, `STRIPE_API_KEY` (CLI forwarder auth)
- Google OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
  `GOOGLE_CALLBACK_URL`
- Uploads: `AVATAR_UPLOAD_DIR`
- Cron: `CRON_*` (job schedules, `CRON_WEBHOOK_EVENT_RETENTION_DAYS`)

## Deployment targets

None live yet. Both frontend and backend move to AWS Free Tier — see
`roadmap.md`. Nothing below application-level config exists for AWS today
(confirmed: no IAM policies, no security groups, no `aws-sdk`/`@aws-sdk/*`
dependency, nothing under `.aws/`).
