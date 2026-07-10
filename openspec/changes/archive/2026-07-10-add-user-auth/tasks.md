## 1. User model and migration

- [x] 1.1 Add a `User` model to `schema.prisma`: `id`, unique `email`, `passwordHash`, `createdAt`, `updatedAt`
- [x] 1.2 Run `prisma migrate dev --name add_user` to create and apply the first real migration
- [x] 1.3 Confirm the migration file exists and the `User` table appears in Postgres

## 2. Dependencies

- [x] 2.1 Install `@nestjs/jwt`, `@nestjs/passport`, `passport`, `passport-jwt`, `bcrypt` in `apps/backend`
- [x] 2.2 Install `@types/passport-jwt` and `@types/bcrypt` as dev dependencies
- [x] 2.3 Install a Redis client (e.g. `ioredis`) in `apps/backend`
- [x] 2.4 Add `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN` (e.g. `15m`), `JWT_REFRESH_EXPIRES_IN` (e.g. `7d`) to `.env.example` and `.env` with real random values

## 3. Password hashing

- [x] 3.1 Create a small helper/service wrapping `bcrypt.hash` and `bcrypt.compare`
- [x] 3.2 Confirm passwords are never logged or returned in any API response (e.g. exclude `passwordHash` from serialized `User` objects)

## 4. Redis-backed refresh token store

- [x] 4.1 Create a `RedisService` (or reuse an existing Redis connection) providing basic set/get/delete with TTL
- [x] 4.2 Design the key scheme: e.g. `refresh:<jti>` → `{ userId, familyId }`, with TTL matching refresh token expiry
- [x] 4.3 Implement issuing a new refresh token: generate a `jti`, sign a JWT containing it, store the `jti` mapping in Redis
- [x] 4.4 Implement rotation: on refresh, look up the presented `jti`; if valid, delete it and issue a new one under the same `familyId`; if not found (already rotated), delete every key under that `familyId` and reject

## 5. Auth module

- [x] 5.1 Create `AuthModule`, `AuthService`, `AuthController`
- [x] 5.2 Implement `POST /auth/register`: validate input (email format, password rules), check for existing email, hash password, create `User`
- [x] 5.3 Implement `POST /auth/login`: verify credentials, issue access token (response body) and refresh token (httpOnly cookie)
- [x] 5.4 Implement `POST /auth/refresh`: read refresh token from cookie, perform rotation logic, return new access token and set new refresh token cookie
- [x] 5.5 Implement `POST /auth/logout`: invalidate the current refresh token's `jti` in Redis, clear the cookie
- [x] 5.6 Install `class-validator` and `class-transformer`; enable a global `ValidationPipe` (`whitelist: true`, `forbidNonWhitelisted: true`) in `main.ts`
- [x] 5.7 Create `RegisterDto` (`@IsEmail()` email, `@IsString() @MinLength(8)` password) and `LoginDto` (shape-only checks, no strength re-validation); replace the inline `{ email: string; password: string }` body types in `AuthController` with these DTOs

## 6. JWT strategy and guard

- [x] 6.1 Create `JwtStrategy` extending `PassportStrategy(Strategy)`, extracting the bearer token and validating against `JWT_ACCESS_SECRET`
- [x] 6.2 Create `JwtAuthGuard extends AuthGuard('jwt')`
- [x] 6.3 Apply `@UseGuards(JwtAuthGuard)` to a sample protected route (e.g. a `GET /auth/me` returning the current user) to prove the guard works

## 7. Verification

- [x] 7.1 Register a new user via `POST /auth/register`; confirm the `User` row exists in Postgres with a hashed (not plaintext) password
- [x] 7.2 Attempt to register the same email again; confirm it's rejected
- [x] 7.3 Log in with correct credentials; confirm an access token is returned and a refresh token cookie is set
- [x] 7.4 Log in with incorrect credentials; confirm a generic authentication error (not "user not found" vs "wrong password" distinction)
- [x] 7.5 Call `GET /auth/me` without a token; confirm `401 Unauthorized`
- [x] 7.6 Call `GET /auth/me` with the access token; confirm the current user's identity is returned
- [x] 7.7 Call `POST /auth/refresh` with the refresh token cookie; confirm a new access token and rotated refresh token are issued
- [x] 7.8 Replay the old (already-rotated) refresh token; confirm it's rejected and the whole token family is now invalid (a previously-valid new refresh token from step 7.7 also stops working)
- [x] 7.9 Call `POST /auth/logout`; confirm the refresh token no longer works afterward
