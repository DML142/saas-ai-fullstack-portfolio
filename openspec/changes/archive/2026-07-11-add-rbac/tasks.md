## 1. Role field and migration

- [x] 1.1 Add `enum Role { USER PREMIUM ADMIN }` to `schema.prisma`
- [x] 1.2 Add `role Role @default(USER)` to the `User` model
- [x] 1.3 Run `prisma migrate dev --name add_user_role` to create and apply the migration
- [x] 1.4 Confirm existing `User` rows (from `add-user-auth` testing) were backfilled to `USER` by the migration default

## 2. Embed role in access token

- [x] 2.1 Update `AuthService.issueToken` to accept/derive the user's role and include it (`role`) in the access token payload alongside `sub`
- [x] 2.2 Update `register`/`login`/`refresh` call sites so the role passed to `issueToken` is always the user's current database value at that moment (not stale)

## 3. Surface role on request.user

- [x] 3.1 Update `JwtStrategy`'s access-token payload type to include `role`
- [x] 3.2 Update `JwtStrategy.validate` to return `{ userId: payload.sub, role: payload.role }`

## 4. Roles decorator and guard

- [x] 4.1 Create a `ROLES_KEY` constant and `@Roles(...roles: Role[])` decorator using `SetMetadata`
- [x] 4.2 Create `RolesGuard implements CanActivate`, injecting `Reflector`, reading required roles via `getAllAndOverride`, comparing against `request.user.role`
- [x] 4.3 Return `true` (allow) when a route has no `@Roles()` metadata at all (unrestricted route, role check doesn't apply)

## 5. Apply to an example route

- [x] 5.1 Add an example admin-only route (e.g. `GET /auth/admin-check`) with `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles(Role.ADMIN)`
- [x] 5.2 Confirm guard ordering: `JwtAuthGuard` must run first so `request.user` exists before `RolesGuard` reads it

## 6. Verification

- [x] 6.1 Register a new user; confirm their access token's decoded payload includes `role: "USER"`
- [x] 6.2 Call the admin-only route as a `USER`-role user; confirm `403 Forbidden`
- [x] 6.3 Manually promote that user to `ADMIN` directly in the database (e.g. via `prisma studio` or SQL)
- [x] 6.4 Log in again (or refresh) as that user; confirm the new access token's payload now shows `role: "ADMIN"`
- [x] 6.5 Call the admin-only route with the new `ADMIN` token; confirm `200` success
- [x] 6.6 Call the admin-only route with no token at all; confirm `401 Unauthorized` (not `403`) — proving `JwtAuthGuard` short-circuits before `RolesGuard` runs
- [x] 6.7 Call `GET /auth/me` (no `@Roles()` applied) with any authenticated token; confirm it still works unaffected by `RolesGuard` being unrelated to that route
