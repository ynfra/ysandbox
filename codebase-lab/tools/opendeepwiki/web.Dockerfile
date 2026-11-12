# Upstream web/Dockerfile runs `npm install` without a lockfile and dies with an
# npm arborist error on node:22 (v2.0.6). The repo ships bun.lock, so install
# with a pinned bun instead; everything else mirrors upstream. Source comes from
# the `src` additional build context (the pinned upstream git tag, web/ folder).
FROM node:22-bookworm AS deps
WORKDIR /app
RUN npm install -g bun@1.3.2
COPY --from=src package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM node:22-bookworm AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=src . .
RUN npm run build

FROM node:22-bookworm AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 -g nodejs nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
