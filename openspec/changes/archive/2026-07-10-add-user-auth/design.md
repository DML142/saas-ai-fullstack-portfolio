## Context

`apps/backend` has Prisma/Postgres (`backend-database-access`) and Redis (`local-dev-infra`) available, but no domain models or route protection. This is the first change to add a real Prisma model and the first to introduce NestJS Guards. The project's CLAUDE.md specifies JWT + refresh tokens with rotation as the auth mechanism, and RBAC (User/Premium/Admin) as a later layer on top of whatever route-protection foundation this change builds.

## Goals / Non-Goals

**Goals:**
- A `User` model with hashed passwords (never plaintext).
- `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout` endpoints.
- Access tokens (short-lived, 15 min) for per-request identity; refresh tokens (long-lived, 7 days) for obtaining new access tokens without re-login.
- Refresh token rotation: each use invalidates the old token and issues a new one; reuse of a rotated (already-invalidated) token revokes the entire token family, treated as a theft signal.
- A reusable `JwtAuthGuard` that any future controller can apply to require authentication.

**Non-Goals:**
- Email verification, password reset (deferred — need Nodemailer/BullMQ email infrastructure first).
- Google OAuth (separate future change).
- RBAC roles/permissions beyond "authenticated or not" (this change establishes the guard mechanism; role-based authorization is layered on top later).

## Decisions

**Decision: `User` model fields kept minimal — `id`, `email` (unique), `passwordHash`, `createdAt`, `updatedAt`.**
No `name`, `avatar`, or profile fields yet — those belong to a future profile/workspace change. Keeping this model minimal avoids speculative schema design before those features are actually specified.

**Decision: Password hashing via `bcrypt`.**
`bcrypt` is the long-established, battle-tested choice for NestJS apps and has first-class NestJS documentation/community support. Alternative considered: `argon2` (newer, technically stronger against GPU-cracking) — reasonable to switch to later, but `bcrypt` is the more conventional default and sufficient for a portfolio-scale project; the interface (`hash`/`compare`) is small enough that switching later is a contained change if ever needed.

**Decision: Access tokens returned in the response body; refresh tokens set as httpOnly cookies.**
Access tokens are meant to be attached to the `Authorization: Bearer` header per-request, which requires the frontend to hold them (in memory, not localStorage, to limit XSS exposure). Refresh tokens are long-lived and more dangerous if stolen via XSS, so they go in an httpOnly cookie — inaccessible to any client-side JS, only sent automatically by the browser to the API origin. This asymmetry is intentional, not an oversight: each token type gets the storage mechanism matching its risk profile.

**Decision: Refresh tokens tracked in Redis, keyed by a token identifier (jti), not the token itself.**
Each issued refresh token carries a unique `jti` (JWT ID) claim. Redis stores `jti -> { userId, familyId, expiresAt }` with a TTL matching the token's expiry. On refresh: look up the `jti`, verify it's still valid (not already rotated), delete it, and create a new one under the same `familyId`. If a `jti` is looked up and found already deleted/rotated, treat it as reuse — invalidate every `jti` under that `familyId` (log the user out everywhere), since it indicates the old token leaked.

**Decision: Standard NestJS Passport pattern (`PassportStrategy` + `AuthGuard`), following the official recipe.**
A `JwtStrategy` extending `PassportStrategy(Strategy)` validates the access token's signature/expiry and attaches the decoded payload to `request.user`; a thin `JwtAuthGuard extends AuthGuard('jwt')` is applied via `@UseGuards(JwtAuthGuard)` on any route needing authentication. This is the documented, idiomatic NestJS approach — no need to hand-roll middleware for this.

## Risks / Trade-offs

- [Risk] JWT secret leaking would allow forging arbitrary access tokens → Mitigation: secret loaded from `.env` (never committed), and this change should use a long, random value — not a placeholder left in `.env.example`.
- [Risk] Clock skew or misconfigured expiry causing tokens to appear expired/valid incorrectly → Mitigation: rely on `@nestjs/jwt`'s built-in `expiresIn` handling rather than manual expiry math.
- [Trade-off] Storing refresh token metadata in Redis (not Postgres) means losing Redis data (e.g. `docker compose down -v`) logs out every user — acceptable for local development; a production deployment would need Redis persistence configured, which is out of scope here.
- [Risk] Rotation logic has subtle correctness requirements (delete-then-issue must be atomic enough to avoid race conditions on concurrent refresh calls) → Mitigation: keep the rotation check simple (single Redis lookup + delete) for this first pass; revisit with distributed locking only if it proves to be a real problem.

## Migration Plan

Additive only. The `User` model is the first entry in the Prisma schema — creates the first real migration (finally exercising the migration workflow deferred since `backend-database-access`). No existing data to migrate.
