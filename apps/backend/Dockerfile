# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat openssl
RUN corepack enable

# ---- Prune the monorepo down to what "backend" actually needs ----
FROM base AS prepare
WORKDIR /app
COPY . .
RUN npx turbo prune backend --docker

# ---- Install full deps, generate the Prisma client, compile ----
FROM base AS build
WORKDIR /app
COPY --from=prepare /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=prepare /app/out/full/ .
RUN npx prisma generate --config=apps/backend/prisma.config.ts
RUN npx turbo run build --filter=backend

# ---- Production-only node_modules, no dev toolchain ----
FROM base AS prod-deps
WORKDIR /app
COPY --from=prepare /app/out/json/ .
RUN pnpm install --prod --frozen-lockfile

# ---- Slim runtime image ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

RUN addgroup --system --gid 1001 nestjs \
  && adduser --system --uid 1001 nestjs

COPY --from=prod-deps --chown=nestjs:nestjs /app/node_modules ./node_modules
COPY --from=prod-deps --chown=nestjs:nestjs /app/apps/backend/node_modules ./apps/backend/node_modules
COPY --from=build --chown=nestjs:nestjs /app/apps/backend/dist ./apps/backend/dist
COPY --from=build --chown=nestjs:nestjs /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=build --chown=nestjs:nestjs /app/apps/backend/prisma.config.ts ./apps/backend/prisma.config.ts
COPY --from=build --chown=nestjs:nestjs /app/apps/backend/prisma ./apps/backend/prisma

RUN mkdir -p /app/apps/backend/uploads/avatars && chown -R nestjs:nestjs /app/apps/backend/uploads

USER nestjs
WORKDIR /app/apps/backend
EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]
