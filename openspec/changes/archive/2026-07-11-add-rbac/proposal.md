## Why

`add-user-auth` established authentication (proving *who* a request is from) but not authorization (deciding *what* they're allowed to do). Every user is currently treated identically once logged in — there's no distinction between a free user, a paying subscriber, or an administrator. This blocks the subscription/billing features (Pro/Business plans need to actually gate something) and any future admin panel, both explicitly called for in the project's tech stack.

## What Changes

- Add a `role` field to the `User` model (`USER`, `PREMIUM`, `ADMIN`), defaulting to `USER` on registration.
- Add a `@Roles(...)` decorator and a `RolesGuard` that reads required roles for a route and compares against the requesting user's role.
- Embed the user's role in the access token payload at issue time, so role checks don't require a database lookup on every guarded request (role changes take effect on next token refresh, not instantly — a deliberate tradeoff, detailed in design.md).
- Apply `RolesGuard` (stacked alongside the existing `JwtAuthGuard`) to at least one example admin-only route to prove the mechanism works end-to-end.
- No new user-facing endpoints for *changing* a user's role in this change — role promotion (e.g. an admin panel, or Stripe webhook granting PREMIUM on subscription) is out of scope; for now, roles above `USER` are set directly in the database.

## Capabilities

### New Capabilities
- `rbac`: Defines role-based authorization — the `Role` enum, the `@Roles` decorator, `RolesGuard`, and how role information flows from token issuance through to route protection.

### Modified Capabilities
(none — `user-auth`'s existing requirements around registration/login/tokens/guards remain accurate as-is; RBAC layers authorization on top without changing those requirements' behavior)

## Impact

- Affected code: `apps/backend` — Prisma schema (`role` field + migration), `AuthService.issueToken` (embed role in access token payload), new `RolesGuard`/`@Roles` decorator, `JwtStrategy.validate` (surface role on `request.user`).
- Depends on: `user-auth` (JWT issuance, `JwtAuthGuard`).
- Out of scope: role-change endpoints, Stripe-driven role promotion, granular permissions beyond three fixed roles.
