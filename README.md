<div align="center">
  <img src=".github/assets/cosico.png" alt="COS Code" width="96" />

  <h1>COS Code — AI SaaS Platform</h1>

  <p>
    A production-shaped fullstack SaaS platform.
  </p>

  <p>
    <img src="https://img.shields.io/badge/status-active%20development-9b4dff?style=flat-square" alt="status" />
    <img src="https://img.shields.io/badge/license-UNLICENSED-lightgrey?style=flat-square" alt="license" />
    <img src="https://img.shields.io/badge/PRs-not%20accepted-lightgrey?style=flat-square" alt="PRs" />
  </p>
</div>

---

## What this is

**COS Code** is a fictional CLI product (`npm i -g coscode` → `cos init`) that markets
itself as an automatic wrapper for AI coding agents — it inspects a project and wires
in whatever tooling an agent needs (MCP servers, Skills, `.md` context, OpenSpec,
CodeRabbit). The CLI itself is a marketing prop.

COS Code is **showcase of my skills in programming**, **not the real product**, you can't buy it and use it. In any case, do not buy it with real money.  

**The actual deliverable is everything around it**: the landing page, the auth system,
the Stripe billing, the queues, the WebSocket chat, the RBAC — a real SaaS
application built to demonstrate what shipping one production-quality end to end
actually looks like, minus the parts a portfolio doesn't need (no LLM is connected;
the in-browser "COS Assistant" is a UX/plumbing demo, not a functional AI product).

This is a **learning-first** project: every backend feature was implemented by hand
from real, complete, working code — not generated blindly — specifically so the
underlying mechanics (auth flows, webhook idempotency, queue processing, guard
composition) are understood, not just present.

---

## Highlights

- **Auth** — JWT access + rotating refresh tokens, email verification, password
  reset, all backed by Redis-tracked token families (replay/reuse detection)
- **RBAC** — `USER / PREMIUM / ADMIN` roles enforced via a `Roles` decorator + guard,
  kept as a separate axis from billing tier
- **Stripe billing** — hosted Checkout + Billing Portal for monthly Lite/Pro/Ultra
  plans; Stripe is the source of truth, with a raw-body signature-verified,
  idempotent webhook handler as the only writer of subscription state
- **Queues** — BullMQ-backed email delivery (verification, reset, billing
  notifications) and a simulated async chat-reply pipeline
- **Realtime chat** — WebSocket gateway for live message delivery and job-completion
  notifications, workspace-scoped
- **API docs** — full Swagger/OpenAPI spec generated from the live controllers
- **Tested** — Jest unit tests for signature verification, idempotency, tier
  derivation, and guard behavior; verified end-to-end against Stripe's real test
  mode (not just mocked)
- **Design system** — a near-black / cosmic-purple landing page with a hero
  word-cycler, drifting `mix-blend-mode` stars, an SVG chromatic-aberration filter,
  and a GSAP-driven constellation — all hand-built, no off-the-shelf effect libs

---

## Stack

<table>
<tr>
<td valign="top" width="50%">

### Frontend

![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)

- **Next.js 16** (App Router) + **React 19**
- **Tailwind CSS v4** + **shadcn**-style primitives on **Base UI**
- **Zustand** for client state (auth session, dashboard UI)
- **React Hook Form** + **Zod** for validated forms
- **GSAP** (`@gsap/react`) for the hero/pricing/constellation animation work
- **Socket.IO client** for the realtime chat gateway
- **react-markdown** + **rehype-highlight** for rendered, syntax-highlighted chat

</td>
<td valign="top" width="50%">

### Backend

![NestJS](https://img.shields.io/badge/NestJS_11-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma_7-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL_16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis_7-DC382D?style=for-the-badge&logo=redis&logoColor=white)

- **NestJS 11** + **TypeScript**, feature-module architecture
- **Prisma 7** (driver adapters, `@prisma/adapter-pg`) over **PostgreSQL 16**
- **Redis 7** — refresh-token families, verification/reset tokens
- **BullMQ** for background jobs (email, chat-reply simulation)
- **Passport + JWT** for auth; **Socket.IO** (`@nestjs/websockets`) for realtime
- **Stripe** (Node SDK) — Checkout, Billing Portal, signed webhooks
- **Swagger** (`@nestjs/swagger`) for live-generated API docs
- **Jest** + **ts-jest** for unit tests
- **class-validator** / **class-transformer** for DTO validation

</td>
</tr>
</table>

### Infrastructure

![Docker](https://img.shields.io/badge/Docker_Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Turborepo](https://img.shields.io/badge/Turborepo-EF4444?style=for-the-badge&logo=turborepo&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm_workspaces-F69220?style=for-the-badge&logo=pnpm&logoColor=white)

- **pnpm workspaces** + **Turborepo** monorepo (`apps/frontend`, `apps/backend`)
- **Docker Compose** for local Postgres, Redis, and **Mailpit** (SMTP catcher —
  every email in this project is caught locally, never sent to a real inbox)
- **Stripe CLI** for local webhook forwarding and test-mode event simulation

---

## Project structure

```
saas-ai-portfolio/
├─ apps/
│  ├─ frontend/        # Next.js app — landing, auth pages, dashboard, chat UI
│  └─ backend/         # NestJS API — auth, billing, chat, mail, redis modules
├─ openspec/           # Spec-driven change proposals + archived, implemented specs
├─ docker-compose.yml  # postgres + redis + mailpit
└─ turbo.json          # monorepo task graph
```

Each backend feature (`auth`, `billing`, `chat`, `mail`, `redis`, `password`) is a
self-contained Nest module: controller + service + DTOs + guards, wired through
`app.module.ts`. `openspec/` holds the actual planning trail for major features —
proposal, design decisions and trade-offs, spec requirements, and task
checklists — archived once implemented, so the *why* behind a feature is
recoverable, not just the *what*.

---

## Running it locally

```bash
# from the repo root
cp .env.example .env        # fill in the values
docker compose up -d        # postgres, redis, mailpit

pnpm install
pnpm --filter backend exec prisma migrate dev
pnpm --filter backend start:dev   # http://localhost:3000  (docs at /docs)
pnpm --filter frontend dev        # http://localhost:3001
```

Stripe billing needs test-mode keys and a local webhook forwarder:

```bash
stripe listen --forward-to localhost:3000/billing/webhook
```

Mailpit's UI (`http://localhost:8025`) is where every transactional email —
verification, password reset, billing notifications — actually lands in
development; nothing is wired to a real provider yet.

---

## Status

Actively developed as a learning project. Not for production use, not open to
external contributions, and not a real payment processor for anything —
**Stripe billing here is a working test-mode integration for demonstration
purposes only.**
