## Why

`apps/backend` has no way to identify or authorize users yet — every feature beyond a public health check (workspaces, assistants, subscriptions, RBAC) requires knowing who's making a request. This change introduces the core authentication flow (register, login, logout, token refresh) so subsequent features have an actual `User` model and a way to protect routes.

## What Changes

- Add a `User` model to the Prisma schema (email, hashed password, id, timestamps) — this is the first real domain model, finally exercising the migration workflow deferred in `backend-database-access`.
- Add password hashing (bcrypt) for credential storage — plaintext passwords are never persisted.
- Add JWT-based authentication with two token types:
  - **Access token**: short-lived (15 min), sent with each request, verifies identity.
  - **Refresh token**: long-lived (7 days), used only to obtain new access tokens, tracked in Redis and rotated on each use (single-use; reuse of an already-rotated token revokes the token family).
- Add endpoints: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`.
- Add a NestJS Guard (`JwtAuthGuard`) that protects routes requiring authentication, backed by a Passport JWT strategy.
- Refresh tokens are delivered as httpOnly cookies (not readable by client-side JS); access tokens are returned in the response body for the frontend to hold in memory.

## Capabilities

### New Capabilities
- `user-auth`: Defines registration, login, logout, JWT access/refresh token issuance and rotation, and route protection via guards.

### Modified Capabilities
(none — `local-dev-infra` and `backend-database-access` are consumed as-is)

## Impact

- Affected code: `apps/backend` — new `User` Prisma model + migration, new `auth` module (controller, service, JWT strategy, guard), new Redis-backed refresh token store.
- Dependencies: adds `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `bcrypt` (or `argon2`) to `apps/backend`; a Redis client library (e.g. `ioredis`) for refresh token storage.
- Depends on: `backend-database-access` (Prisma/Postgres) and `local-dev-infra` (Redis container).
- Out of scope for this change: email verification, password reset, Google OAuth, RBAC roles beyond a basic authenticated/unauthenticated distinction — these are follow-up changes once email infrastructure (Nodemailer/BullMQ) and role requirements are designed.
