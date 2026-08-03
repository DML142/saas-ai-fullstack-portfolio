# syntax=docker/dockerfile:1
FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable

# ---- Prune the monorepo down to what "frontend" actually needs ----
FROM base AS prepare
WORKDIR /app
COPY . .
RUN npx turbo prune frontend --docker

# ---- Install pruned deps, then build with the full pruned source ----
FROM base AS build
WORKDIR /app
COPY --from=prepare /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=prepare /app/out/full/ .
RUN npx turbo run build --filter=frontend

# ---- Slim runtime image: only the standalone server + static assets ----
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=build --chown=nextjs:nodejs /app/apps/frontend/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=build --chown=nextjs:nodejs /app/apps/frontend/public ./apps/frontend/public

USER nextjs
EXPOSE 3000

CMD ["node", "apps/frontend/server.js"]
