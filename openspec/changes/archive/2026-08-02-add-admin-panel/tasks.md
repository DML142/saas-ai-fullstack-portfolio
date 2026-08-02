## 1. Backend — admin module scaffold [you implement]

- [x] 1.1 Create `apps/backend/src/admin/dto/list-users.query.dto.ts`: `page`,
      `limit` (numeric via `@Type(() => Number)`, `@IsInt`, `@Min`, `@Max(100)`,
      optional with defaults) and optional `search` (`@IsString`), `@ApiProperty`
- [x] 1.2 Create `apps/backend/src/admin/dto/update-role.dto.ts`: `role`
      (`@IsEnum(Role)`, `@ApiProperty({ enum: Role })`)
- [x] 1.3 Create `apps/backend/src/admin/dto/list-subscriptions.query.dto.ts`:
      `page`, `limit` (same numeric pattern as 1.1)
- [x] 1.4 Create `apps/backend/src/admin/admin.service.ts` — inject
      `PrismaService`, `BillingService`, `@InjectQueue('email')`,
      `@InjectQueue('chat-reply')`
- [x] 1.5 Create `apps/backend/src/admin/admin.controller.ts` — class-level
      `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(Role.ADMIN)` +
      `@Controller('admin')`; read `req.user as { userId: string; role: Role }`
      inline
- [x] 1.6 Create `apps/backend/src/admin/admin.module.ts` — `imports:
      [PrismaModule, BillingModule, PassportModule, JwtModule.register({}),
      BullModule.registerQueue({ name: 'email' }),
      BullModule.registerQueue({ name: 'chat-reply' })]`; controller + service
- [x] 1.7 Register `AdminModule` in `apps/backend/src/app.module.ts` imports

## 2. Backend — users administration [you implement]

- [x] 2.1 `AdminService.listUsers(query)`: `prisma.$transaction([findMany({ skip,
      take, where, orderBy: { createdAt: 'desc' }, select, include:
      { subscription: { select: { tier, status } } } }), user.count({ where })])`;
      `where` = email `contains` + `mode: 'insensitive'` when `search` present;
      return `{ data, total, page, limit }`
- [x] 2.2 `GET /admin/users` → `listUsers`
- [x] 2.3 `AdminService.getUser(id)`: `findUnique` with subscription + `_count`
      of workspaces; throw `NotFoundException` if missing
- [x] 2.4 `GET /admin/users/:id` → `getUser`
- [x] 2.5 `AdminService.updateUserRole(actingUserId, targetId, role)`: throw
      `ForbiddenException('Cannot change your own role')` if
      `targetId === actingUserId`; else `prisma.user.update`
- [x] 2.6 `PATCH /admin/users/:id/role` → `updateUserRole(req.user.userId, id,
      dto.role)`

## 3. Backend — subscriptions administration [you implement]

- [x] 3.1 `AdminService.listSubscriptions(query)`: paginated `subscription`
      `findMany` + `count`, `include: { user: { select: { email: true } } }`,
      `{ data, total, page, limit }`
- [x] 3.2 `GET /admin/subscriptions` → `listSubscriptions`
- [x] 3.3 Add `BillingService.cancelSubscription(userId)` in
      `apps/backend/src/billing/billing.service.ts`: look up
      `stripeSubscriptionId`, `NotFoundException` if none, call
      `stripe.subscriptions.update(id, { cancel_at_period_end: true })`; do NOT
      write the DB (webhook syncs it)
- [x] 3.4 `POST /admin/subscriptions/:userId/cancel` → delegate to
      `billingService.cancelSubscription`

## 4. Backend — stats & queues [you implement]

- [x] 4.1 `AdminService.getStats()`: `user.count`, `user.groupBy({ by: ['role'],
      _count })`, `subscription.groupBy({ by: ['tier'], _count })`, and a single
      `$queryRaw` bucketing signups by `date_trunc('day', "createdAt")` over the
      last 30 days; shape into a stable JSON object
- [x] 4.2 `GET /admin/stats` → `getStats`
- [x] 4.3 `AdminService.getQueues()`: `[{ name: 'email', counts: await
      emailQueue.getJobCounts() }, { name: 'chat-reply', counts: await
      chatReplyQueue.getJobCounts() }]`
- [x] 4.4 `GET /admin/queues` → `getQueues`

## 5. Backend — Swagger + tests [AI-authored — testing/docs exception]

- [x] 5.1 Swagger on every admin route (`@ApiTags('Admin')`, `@ApiBearerAuth`,
      `@ApiOperation`, `@ApiOkResponse`, `@ApiForbiddenResponse`,
      `@ApiNotFoundResponse` where relevant) in the `billing`/`users` style
- [x] 5.2 `admin.service.spec.ts` (mock Prisma/BillingService/queues via
      `useValue`): pagination + search on `listUsers`; `getUser` not-found;
      role change succeeds for another user and is refused for self; `getStats`
      aggregate shape; `getQueues` returns per-queue counts
- [x] 5.3 `admin.controller.spec.ts`: passes `req.user.userId` through to
      `updateUserRole`; delegates cancel to `BillingService`
- [x] 5.4 Extend `billing.service.spec.ts`: `cancelSubscription` calls
      `stripe.subscriptions.update` with `cancel_at_period_end: true`; throws
      `NotFoundException` when the user has no subscription

## 6. Frontend — API client [you implement — backend-integration]

- [x] 6.1 Create `apps/frontend/lib/stores/admin.ts`: an `adminAuthFetch`
      binding (copy of `chatAuthFetch`) + typed functions `listUsers`,
      `getUser`, `updateUserRole`, `listSubscriptions`, `cancelSubscription`,
      `getStats`, `getQueues` against `${API_URL}/admin/...`, with response
      types matching the backend DTOs/`select`

## 7. Frontend — admin UI [AI-authored — frontend exception]

- [x] 7.1 `components/auth/RequireAdmin.tsx`: copy of `RequireAuth` + redirect
      `role !== 'ADMIN'` → `/dashboard`
- [x] 7.2 `components/admin/AdminSidebar.tsx`: static `next/link` nav (Overview,
      Users, Subscriptions, Queues), active state via `usePathname()`
- [x] 7.3 `components/admin/DataTable.tsx`: hand-rolled table in the project
      palette (loading/empty/error string conventions reused)
- [x] 7.4 `app/(dashboard)/admin/layout.tsx`: `RequireAdmin` + `AdminSidebar`,
      mirroring `dashboard/layout.tsx`
- [x] 7.5 `app/(dashboard)/admin/page.tsx`: stats dashboard (stat cards + a
      simple signups bar)
- [x] 7.6 `app/(dashboard)/admin/users/page.tsx`: table + email search +
      pagination
- [x] 7.7 `app/(dashboard)/admin/users/[id]/page.tsx`: detail + role-change form
      (RHF + Zod) with a `Modal` confirmation
- [x] 7.8 `app/(dashboard)/admin/subscriptions/page.tsx`: table + cancel action
      with a `Modal` confirmation
- [x] 7.9 `app/(dashboard)/admin/queues/page.tsx`: per-queue count cards
- [x] 7.10 `components/dashboard/Sidebar.tsx`: ADMIN-only link to `/admin`
      (`useAuthStore` selector on `user.role`)

## 8. Verification [AI-authored — testing/docs exception]

- [x] 8.1 `pnpm --filter backend test` — admin + billing suites green
- [x] 8.2 Promote a test user to `ADMIN`; exercise every route via `/docs` or
      curl; confirm 403 for a non-admin token and for a self-role-change
- [x] 8.3 With `stripe listen --forward-to localhost:3000/billing/webhook`,
      cancel a test subscription via the admin endpoint; confirm the
      `customer.subscription.updated` webhook flips `cancelAtPeriodEnd` in the DB
- [x] 8.4 Frontend preview: log in as ADMIN → `/admin`, verify tables render and
      the two confirmation modals work (check console/network for errors,
      screenshot); log in as USER → `/admin` redirects to `/dashboard`
