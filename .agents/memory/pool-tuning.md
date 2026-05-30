---
name: Pool tuning for scale
description: pg.Pool configuration for 200k users; PgBouncer production config location
---

## Rule
`lib/db/src/index.ts` reads `POOL_MAX` env var (default 20) for `pg.Pool.max`. Additional production-grade settings:
- `min: 2` — keep 2 warm connections always alive
- `maxUses: 7500` — recycle connections after N queries (prevents memory bloat from long-lived PG connections)
- `allowExitOnIdle: true` — process exits cleanly when idle
- `keepAlive: true` + `keepAliveInitialDelayMillis: 10000` — prevent TCP-level drops during quiet periods

**Why:** Default pg.Pool settings leak memory slowly over days (no maxUses), drop connections silently on cloud networks (no keepAlive), and hold the process open indefinitely (no allowExitOnIdle).

## PgBouncer
`infra/pgbouncer.ini` contains the reference production configuration:
- Mode: `transaction` (best for short-lived HTTP API requests)
- `default_pool_size: 100` (server-side, under pg max_connections=112)
- `max_client_conn: 5000` (app-side)
- When running behind PgBouncer: set `POOL_MAX=5` per worker (PgBouncer handles the fanout)

## How to apply
Single-process dev: leave POOL_MAX unset → defaults to 20.
Production with cluster: primary sets `POOL_MAX = floor(102 / CLUSTER_WORKERS)` per worker fork.
Production with PgBouncer: set `POOL_MAX=5`, `CLUSTER_WORKERS=4`, point DATABASE_URL at PgBouncer port 6432.
