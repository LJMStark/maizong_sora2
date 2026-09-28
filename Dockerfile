# syntax=docker/dockerfile:1
#
# Multi-stage build for Zeabur. The runtime image only carries Next's
# standalone output (server.js + traced dependencies), not the full
# node_modules tree and source checkout that the zbpack image ships.
#
# Rollback: set ZBPACK_IGNORE_DOCKERFILE=true on the Zeabur service to return
# to the zbpack build. next.config.ts only enables standalone output when
# NEXT_OUTPUT_STANDALONE=1, so `next start` keeps working there.

FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN corepack enable
# Zeabur only passes service variables into a multi-stage build for declared
# ARGs. NEXT_PUBLIC_* values and APP_COMMIT_SHA (read from
# ZEABUR_GIT_COMMIT_SHA, shown by /api/health) are fixed at build time, so
# declare everything the app reads. NODE_ENV is intentionally not declared.
ARG ZEABUR_GIT_COMMIT_SHA
ARG NEXT_PUBLIC_BASE_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_XIAOXIAODONG_GALLERY_BASE
ARG DATABASE_URL
ARG DIRECT_URL
ARG BETTER_AUTH_SECRET
ARG BETTER_AUTH_URL
ARG CRON_SECRET
ARG DUOMI_API
ARG KIE_AI_API_KEY
ARG GOOGLE_GEMINI_API_KEY
ARG RESEND_API_KEY
ARG RESEND_FROM_EMAIL
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_OUTPUT_STANDALONE=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=8080
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 8080
# Kubernetes sets HOSTNAME to the pod name and server.js binds to HOSTNAME,
# so pin it to all interfaces.
CMD ["sh", "-c", "HOSTNAME=0.0.0.0 exec node server.js"]
