---
name: Cluster mode gating
description: How CLUSTER_WORKERS env var controls Node.js cluster forking without breaking Replit dev
---

## Rule
Cluster mode is gated by `CLUSTER_WORKERS` env var. Default is `1` → single-process, no forking. Replit dev always uses single-process mode.

**Why:** `cluster.fork()` in Replit dev would spawn multiple processes sharing the same PORT, causing address-in-use errors and confusing logs. The env var gate makes the behaviour explicitly opt-in.

## Sizing formula
Primary passes `POOL_MAX = floor((112 - 10) / numWorkers)` to each worker fork as an env var:
- 1 worker  → POOL_MAX = 20  (comfortable, no cluster overhead)
- 4 workers → POOL_MAX = 25  (4 × 25 = 100 connections, safely under pg max_connections=112)

## Primary process note
Static imports in `index.ts` are always executed, even in the primary process. This means the DB pool is initialized with `min=2` in the primary process (2 idle connections). This is an acceptable waste for simplicity — dynamic imports or a separate worker file would avoid it but add bundler complexity.

## Session cleanup staggering
Each worker runs cleanup with a `workerId × 5 min` stagger to prevent all workers from hitting `DELETE FROM user_sessions WHERE expires_at < now()` simultaneously (stampede prevention).

## How to apply
To enable multi-core in production: `CLUSTER_WORKERS=4` in the environment. The API server will fork 4 workers and respawn any that crash.
