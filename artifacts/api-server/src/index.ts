import cluster from "node:cluster";
import app from "./app.js";
import { logger } from "./lib/logger.js";
import { runMigrations } from "./lib/migrate.js";
import { ensureAdmin } from "./routes/auth.js";
import { sessions } from "./lib/session-store.js";

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required but was not provided.");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

// ── Cluster configuration ─────────────────────────────────────────────────────
// Default: CLUSTER_WORKERS=1 (single-process, Replit dev-friendly — no forking).
// Production: set CLUSTER_WORKERS=4 to use all CPU cores.
//
// The primary process calculates a safe POOL_MAX per worker so the combined
// connection count across all workers stays below PostgreSQL's max_connections
// (112 by default). It passes POOL_MAX as an env-var to each worker fork.
//
//   1 worker  → POOL_MAX = 20  (safe for dev / single-node)
//   4 workers → POOL_MAX = 25  (4 × 25 = 100, safely under 112)
const numWorkers = Math.max(1, parseInt(process.env.CLUSTER_WORKERS ?? "1", 10));

if (numWorkers > 1 && cluster.isPrimary) {
  const poolMax = Math.floor((112 - 10) / numWorkers);
  logger.info({ numWorkers, poolMaxPerWorker: poolMax }, "Starting API server cluster");

  for (let i = 0; i < numWorkers; i++) {
    cluster.fork({ POOL_MAX: String(poolMax) });
  }

  cluster.on("exit", (worker, code, signal) => {
    logger.warn({ workerId: worker.id, code, signal }, "Worker died — restarting");
    cluster.fork({ POOL_MAX: String(poolMax) });
  });
} else {
  // ── Single-process mode (default) or cluster worker ───────────────────────
  const workerId = cluster.worker?.id ?? 0;

  runMigrations()
    .then(() => ensureAdmin())
    .then(() => {
      app.listen(port, (err) => {
        if (err) {
          logger.error({ err }, "Error listening on port");
          process.exit(1);
        }
        logger.info({ port, workerId }, "Server listening");
      });

      // Session cleanup: remove expired rows once per hour.
      // Workers stagger their cleanup intervals by 5 min each to avoid a
      // simultaneous DELETE stampede on the user_sessions table.
      const staggerMs = workerId * 5 * 60 * 1000; // 0 / 5 / 10 / 15 min offset
      setTimeout(() => {
        const cleanup = async () => {
          try {
            const deleted = await sessions.cleanup();
            if (deleted > 0) logger.info({ deleted }, "Expired sessions cleaned up");
          } catch { /* non-critical */ }
        };
        void cleanup(); // run once immediately after stagger
        setInterval(cleanup, 60 * 60 * 1000); // then every hour
      }, staggerMs);
    })
    .catch((err) => {
      logger.error({ err }, "Failed to run migrations");
      process.exit(1);
    });
}
