# progress.md — Single Source of Truth for Ongoing Progress

This file tracks what's done, what's in flight, and what's blocked. From now
on, log all progress here — not in commit messages (keep those short), not
in scattered comments, not in ad-hoc notes elsewhere. `roadmap.md` holds the
forward-looking plan; this file holds the state.

---

## Snapshot (2026-08-07)

Feature-complete for the local/learning phase, verified live end-to-end
against a full Docker Compose stack. Condensed from the detailed history
previously kept in `tech.md`:

- **Auth & RBAC** — register/login/logout, JWT + rotating refresh tokens
  (Redis-tracked families, reuse detection), email verification + password
  reset (BullMQ + Mailpit), Google OAuth (account linking by verified
  email), `USER/PREMIUM/ADMIN` roles enforced via guards.
- **Billing (Stripe)** — hosted Checkout + Billing Portal, webhook-synced
  `Subscription` model (Stripe is the source of truth), effective tier
  (`FREE/LITE/PRO/ULTRA`) derived and exposed on session endpoints,
  duplicate-subscription guard.
- **Chat (COS Assistant demo)** — per-user workspaces, simulated-reply
  pipeline over BullMQ + WebSocket, markdown/code rendering, tier-gated
  monthly quota (Redis fixed-window counter), usage endpoint, import/export.
- **Uploads** — avatar upload/replace/remove, magic-number + size
  validation, served via static middleware, shared UI popover.
- **Cron jobs** — orphaned-avatar cleanup, expired-webhook-event cleanup.
- **Admin panel** — user list/detail/role-change, subscription list/cancel,
  stats (`groupBy` + one raw-SQL time series), queue job counts; guarded by
  `RolesGuard` + `Role.ADMIN`.
- **Security** — Redis-backed rate limiting (fixed window, fail-open) on
  auth-sensitive routes.
- **Frontend** — full landing page (hero effects, features, pricing, FAQ,
  reviews), auth pages, dashboard shell (sidebar, chat, settings, admin).
- **Infra** — full Docker Compose stack (frontend, backend, Postgres, Redis,
  Mailpit, Stripe CLI forwarder), multi-stage Dockerfiles, healthchecks.
- **Testing** — unit (92 tests), 25 Supertest integration specs against real
  Postgres/Redis, 3 Playwright E2E specs against the full stack; GitHub
  Actions CI (lint/test/build/integration/e2e) with branch protection on
  `main`.

See `tech.md` for exact versions/services and `openspec/specs/` for the
per-feature specs this was built against.

---

## Known housekeeping items

- Two `openspec/changes/` folders remain un-archived even though the
  features they describe are complete and verified live:
  `add-avatar-upload` (all tasks checked) and `add-chat-import-export`
  (a few frontend/verification tasks still unchecked, and it also has an
  archived duplicate at `archive/2026-08-03-add-chat-import-export`). Worth
  reconciling next time `openspec` is touched — not blocking anything.

---

## Deferred (explicitly out of scope until a real deploy target exists)

- Real email provider swap (Mailpit → authenticated SMTP: Gmail/Resend/Postmark)
- Cloudflare edge (DNS → Cloudflare → server) + optional Turnstile
- Live Stripe keys, live price IDs, production webhook endpoint
- Secrets management for whichever deploy target holds them
- Yearly billing (monthly-only was a deliberate scope cut)

---

## Active focus

Scoping the move from "local Docker Compose only" to a real deployment
entirely on AWS Free Tier (RDS, EC2/ECS, IAM, CloudWatch) — both frontend
and backend. Render/Vercel are dropped from the plan (2026-08-07 decision).
See `roadmap.md`. **No infra work has started** — the plan needs explicit
user confirmation before implementation begins.

---

## Log

Newest entries on top.

- **2026-08-07** — Decision: drop Render and Vercel from the deployment
  plan. Both frontend and backend move to AWS Free Tier instead. `CLAUDE.md`,
  `tech.md`, and `roadmap.md` updated accordingly.
- **2026-08-07** — Project reframed from "learn to code" to "ship to
  production." `CLAUDE.md` rewritten for the new goal and workflow rules
  (one feature/branch/PR, tests required, DRY/SOLID/OOP on backend, Russian
  conversation / English code+commits). `tech.md` repurposed from a
  progress tracker into a versions/properties reference. This file created
  as the new progress log. `roadmap.md` added, scoping the AWS deployment
  path (no implementation yet). Audited all frontend comments against
  CLAUDE.md's comment rules — already "why, not what," nothing to remove.
  Added the `stop-slop` skill (github.com/hardikpandya/stop-slop) to
  `.claude/skills/stop-slop/`; referenced
  `multica-ai/andrej-karpathy-skills`' `CLAUDE.md` engineering-discipline
  guidelines from the project `CLAUDE.md`.
