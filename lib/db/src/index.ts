import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";

const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl && process.env.NODE_ENV === "production") {
  throw new Error(
    "[OPROX Real Estate] FATAL: DATABASE_URL is required in production but was not set. " +
    "Cannot start with hardcoded dev credentials. " +
    "Set DATABASE_URL to your PostgreSQL connection string."
  );
}
const connectionString = dbUrl ?? "postgres://postgres:postgres@localhost:5432/oprox";

const poolMax = parseInt(process.env.POOL_MAX ?? "20", 10);

export const pool = new Pool({
  connectionString,
  max:                         poolMax,
  min:                         2,          // keep 2 warm connections always alive
  idleTimeoutMillis:           30_000,
  connectionTimeoutMillis:     5_000,
  maxUses:                     7_500,      // recycle connections after N queries to prevent memory bloat
  allowExitOnIdle:             false,      // never let pool exhaustion exit the process
  keepAlive:                   true,       // prevent TCP-level drops during idle periods
  keepAliveInitialDelayMillis: 10_000,
});

// Absorb idle-client errors (e.g. "terminating connection due to administrator command")
// so the pg-pool 'error' event never becomes an unhandled Node.js event — which would
// crash the entire process.  The pool automatically creates a new connection on next use.
pool.on('error', (_err: Error) => {
  // intentionally empty — non-fatal, pool self-heals
});

export const db = drizzle(pool, { schema });

export * from "./schema/index.js";
