import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Allow enough DB connections for multiple Node.js instances behind a load balancer.
  // Formula: (pg max_connections - 10 reserved for admin) / expected_node_instances
  // Current DB max_connections = 112, so 20 per instance supports ~5 Node processes.
  // Production: use PgBouncer in transaction mode to pool thousands of app connections
  // down to a small DB-side pool (e.g., 50 total DB connections, 1000+ app connections).
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
