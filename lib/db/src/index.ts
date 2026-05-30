import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// ── Connection pool sizing ─────────────────────────────────────────────────────
// With Node.js cluster mode, the primary process passes POOL_MAX per worker so
// that all workers together stay well under PostgreSQL's max_connections (112).
//
// Formula: floor((pg_max_connections − 10_reserved) / cluster_worker_count)
//   Single process (CLUSTER_WORKERS=1): POOL_MAX = 20  (comfortable headroom)
//   4 workers:                           POOL_MAX = 25  (4 × 25 = 100, under 112)
//
// Production note: deploy PgBouncer in transaction-pooling mode in front of this
// pool to multiplex thousands of app connections down to ~50 real DB connections.
// See /infra/pgbouncer.ini for the reference configuration.
const poolMax = parseInt(process.env.POOL_MAX ?? "20", 10);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max:                         poolMax,
  min:                         2,          // keep 2 warm connections always alive
  idleTimeoutMillis:           30_000,
  connectionTimeoutMillis:     5_000,
  maxUses:                     7_500,      // recycle connections after N queries to prevent memory bloat
  allowExitOnIdle:             true,       // let the process exit cleanly when no connections are active
  keepAlive:                   true,       // prevent TCP-level drops during idle periods
  keepAliveInitialDelayMillis: 10_000,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
