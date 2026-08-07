# roadmap.md — Cloud Deployment Roadmap

**Goal:** move from local/Docker-Compose-only infra to a real deployment,
entirely on **AWS Free Tier** — both frontend and backend. Render and
Vercel were considered and dropped (decision: 2026-08-07); nothing in this
plan depends on either.

**Status: SCOPING ONLY.** Nothing below is implemented. This is a plan to
review, not a plan being executed — confirm it with the user before any
infra work starts (per explicit instruction: this pass is documentation
only).

---

## Frontend hosting — resolved direction

With Vercel dropped, the frontend needs an AWS home too. `apps/frontend`
already builds a Next.js `output: 'standalone'` server and already has a
working multi-stage Dockerfile — the same shape as the backend's. Default
plan: run it the same way as the backend, as a container on EC2/ECS,
**not** a static S3+CloudFront export (this app has server-rendered,
auth-gated routes — a static export would drop that).

Open sizing question to confirm before step 1: one EC2 instance running
both containers via Docker Compose (cheapest — fits a single Free Tier
`t2.micro`/`t3.micro`, mirrors the existing local `docker-compose.yml`
shape) vs. two separate EC2 instances or ECS services (cleaner isolation,
costs more / uses more of the Free Tier's instance-hours budget).
Recommendation: one instance, both containers, Compose-style — closest to
what already runs locally and cheapest on Free Tier; split later only if
resource contention becomes a real problem.

---

## Steps

### 1. Backend + frontend deployment on EC2 or ECS (Docker containers)

- Decide EC2 vs ECS. Recommendation: start on EC2 — it maps directly to
  what already works (`docker compose`-shaped Dockerfiles, backend already
  runs `prisma migrate deploy` on boot) with a much smaller learning
  surface than ECS task definitions/services/ALB. ECS can follow later if
  there's a reason to want managed orchestration.
- Reuse `apps/backend/Dockerfile` and `apps/frontend/Dockerfile` as-is —
  both are already multi-stage and already produce the images that run
  locally today. The target is "run the images that already work," not
  rewritten Dockerfiles.
- Needs: a container registry (ECR) for both images, a way to inject the
  existing `.env` vars as secrets (see step 3), and a public entrypoint
  (EC2: security group + Elastic IP; ECS: service + ALB) — frontend traffic
  public, backend reachable at least from the frontend and the public API
  surface it needs to expose.

### 2. Replace local PostgreSQL with managed RDS

- Provision RDS Postgres (Free Tier: `db.t3.micro`/`db.t4g.micro`, 20GB).
- Point `DATABASE_URL` at the RDS endpoint; run
  `pnpm --filter backend exec prisma migrate deploy` against it once
  reachable — same command the backend Dockerfile already runs on boot.
- Networking: RDS must sit in a VPC reachable by the backend compute (same
  VPC or a security-group rule permitting the backend's SG on port 5432),
  never exposed to the public internet directly.

### 3. Set up IAM roles and security groups

- **Checked what's already in place: nothing.** Confirmed via repo search —
  no IAM policies, no security groups, no `aws-sdk`/`@aws-sdk/*` dependency,
  nothing under `.aws/` or referenced in any env file. This starts from
  zero, not from an existing baseline.
- Needs:
  - An IAM role for the backend compute — least-privilege (ECR pull,
    CloudWatch Logs write, RDS reachability via security group), not a
    broad managed-admin policy.
  - A security group for the backend — inbound limited to the app port from
    the internet (or from a load balancer only); outbound to RDS's port.
  - A security group for RDS — inbound limited to the backend's security
    group on the Postgres port, no public inbound rule at all.

### 4. Set up CloudWatch for logging/monitoring

- The backend already logs via NestJS's per-class `Logger` convention
  (stdout/stderr) — needs a path into CloudWatch Logs: the `awslogs` driver
  natively on ECS, or the CloudWatch agent on EC2.
- Baseline alarms worth having from day one: 5xx rate, CPU/memory on the
  compute, RDS connection count. Exact metric set depends on the EC2-vs-ECS
  decision (available metrics differ between the two).

---

## Explicitly not doing yet

- No Terraform/CDK/CloudFormation — every step above is a manual
  console/CLI walkthrough until proven out, the same way the Stripe
  CLI/Docker Compose infra in this repo was built by hand before being
  written up. Infrastructure-as-code can follow once the manual path works.
- Nothing from `CLAUDE.md`'s pre-existing deferred list moves up yet either
  (real email provider, Cloudflare/Turnstile, live Stripe keys, secrets
  manager) — those stay tracked there and in `progress.md`, picked up
  alongside or after these four steps once a live domain/target exists.

---

## Definition of done for this roadmap's current phase

1. Backend container runs on EC2 or ECS, reachable over the internet.
2. Backend talks to RDS instead of a local/dockerized Postgres.
3. IAM roles are least-privilege; security groups block all unintended
   inbound traffic (RDS has zero public inbound).
4. Backend logs and basic health metrics are visible in CloudWatch.

Frontend container placement (shared instance vs. separate) is confirmed
per the "Frontend hosting" section above before step 1 begins.
