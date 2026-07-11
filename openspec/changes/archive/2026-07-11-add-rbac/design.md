## Context

`add-user-auth` delivered authentication: `JwtAuthGuard` proves a request carries a valid access token and attaches `{ userId }` to `request.user`. It says nothing about *what* that user is allowed to do. This change adds authorization on top — three fixed roles (`USER`, `PREMIUM`, `ADMIN`, per the project's tech stack), enforced via a second guard layered on top of the existing authentication guard.

## Goals / Non-Goals

**Goals:**
- A `Role` enum on the `User` model, defaulting every new registration to `USER`.
- A `@Roles(...roles)` decorator marking which roles a route requires.
- A `RolesGuard` that reads that metadata and compares it against the requesting user's role, rejecting with `403 Forbidden` if it doesn't match.
- Role embedded in the access token at issue time, so `RolesGuard` never hits the database.
- At least one example admin-only route proving `JwtAuthGuard` + `RolesGuard` compose correctly together.

**Non-Goals:**
- Any endpoint or mechanism for *changing* a user's role — that's a future change (admin panel, or Stripe webhook granting `PREMIUM`). For now, promoting a user happens by editing the database directly (e.g. via `prisma studio` or a manual `UPDATE`).
- Granular/custom permissions beyond the three fixed roles — no permission matrix, no per-resource ACLs.
- Immediate role-change propagation — accepted latency is "next token refresh," not instant (see Decisions below).

## Decisions

**Decision: Role is embedded in the access token payload, not looked up per-request.**
Consistent with the existing stateless-JWT design (`JwtStrategy.validate` already avoids a DB hit, returning only `{ userId: payload.sub }`). Adding a mandatory DB query to every role-checked route would undercut that design for a real but bounded cost: a promoted/demoted user's *access* token remains stale until it naturally expires (≤15 min, per `JWT_ACCESS_EXPIRES_IN`) or they explicitly refresh. This is an accepted tradeoff, not an oversight — flagged explicitly so it's not "discovered" later as a surprise. If a use case ever needs instant revocation of elevated privileges specifically, that would be a deliberate future change (e.g. a short-lived admin-only token, or a Redis-backed role-invalidation check only on `ADMIN` routes), not a wholesale switch to per-request DB lookups everywhere.

**Decision: `Role` is a Prisma enum, not a string.**
`enum Role { USER PREMIUM ADMIN }` gives a database-level constraint — an invalid role value can't be written to the table at all, and Prisma's generated types make `role` a proper TypeScript union instead of an unconstrained `string`. Given the project's role set is small and fixed by design (not user-defined/dynamic), the flexibility a plain string would offer isn't needed and only removes a safety guarantee.

**Decision: Two separate guards (`JwtAuthGuard`, `RolesGuard`), stacked via `@UseGuards`, not one combined guard.**
Keeps each guard's responsibility narrow: `JwtAuthGuard` answers "is this a valid, authenticated request," `RolesGuard` answers "is this authenticated user allowed here." A route can require just authentication (existing pattern, e.g. `/auth/me`) or authentication *and* a specific role (new pattern) by composing the two, rather than needing a third "auth + role" guard variant for every combination. This mirrors how `@Roles()` metadata-driven guards are the standard NestJS pattern (`Reflector` reads metadata set by a custom decorator).

**Decision: `RolesGuard` reads role directly off `request.user.role` — meaning `JwtStrategy.validate` must be updated to include it.**
Currently `validate` returns only `{ userId: payload.sub }`. It needs to also return `role: payload.role`, since that's what was embedded in the token. `RolesGuard` must run *after* `JwtAuthGuard` in the guard chain (guaranteed by listing `JwtAuthGuard` first in `@UseGuards(JwtAuthGuard, RolesGuard)`), since it depends on `request.user` already being populated.

## Risks / Trade-offs

- [Risk] A demoted `ADMIN` retains admin access for up to 15 minutes (until their access token expires or they refresh) → Mitigation: acceptable for this project's scale/threat model; documented explicitly rather than silently accepted. Revisit if a real incident-response need for instant revocation ever arises.
- [Risk] Forgetting to add `@Roles()` to a route that should be restricted means it's merely authenticated, not authorized → Mitigation: no automatic enforcement of this by the framework; relies on developer discipline per-route, same as any decorator-based guard system. Worth a code-review habit, not solvable structurally without a much heavier framework.
- [Trade-off] No role-management endpoint means promoting the first `ADMIN` account requires manual database access — acceptable for a project at this stage; would need a proper solution (seed script, or a one-time bootstrap admin) before any real deployment.

## Migration Plan

Additive: adds a `role` column with a `USER` default, so existing rows (any test users created during `add-user-auth`'s verification) get backfilled to `USER` automatically by the migration's default value — no manual data migration needed.
