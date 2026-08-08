# OPROX Real Estate — API Server
# Build context: OPROX-Real-Estate/ (workspace root)
#   docker build -f Dockerfile -t oprox-realestate-api .

# ─── Stage 1: Install dependencies ──────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /workspace
RUN apk add --no-cache wget && npm install -g pnpm@10

# Copy manifests first for layer caching
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY lib/db/package.json                         ./lib/db/
COPY artifacts/realestate-api/package.json       ./artifacts/realestate-api/
RUN pnpm install --frozen-lockfile

# ─── Stage 2: Build ──────────────────────────────────────────────────────────
FROM deps AS builder
COPY lib/    ./lib/
COPY artifacts/realestate-api/ ./artifacts/realestate-api/
RUN pnpm --filter @workspace/oprox-properties-api run build

# ─── Stage 3: Production image ───────────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /workspace
RUN apk add --no-cache wget && npm install -g pnpm@10

ENV NODE_ENV=production
ENV PORT=3000

# Re-install production dependencies only
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY lib/db/package.json                         ./lib/db/
COPY artifacts/realestate-api/package.json       ./artifacts/realestate-api/
RUN pnpm install --frozen-lockfile --prod

# Copy built artifact
COPY --from=builder /workspace/artifacts/realestate-api/dist \
                    ./artifacts/realestate-api/dist

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-3000}/health || exit 1

WORKDIR /workspace/artifacts/realestate-api
CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
