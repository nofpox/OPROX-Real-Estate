import express, { type Express } from "express";
import cors from "cors";
import compression from "compression";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { helmetMiddleware, rateLimiter, sanitizeInputs, wafMiddleware } from "./middleware/security.js";
import { startScheduler } from "./lib/scheduler.js";

const app: Express = express();

// Trust the Replit reverse proxy so X-Forwarded-For is used for rate limiting
app.set("trust proxy", 1);

// ── Security headers (Helmet) ─────────────────────────────────────────────────
app.use(helmetMiddleware);

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use(rateLimiter);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
// Gzip all JSON/text responses — critical at scale (100k-row payloads are MB-sized uncompressed)
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Input sanitisation (XSS stripping) ───────────────────────────────────────
// Runs after body parsing so req.body is populated.
app.use(sanitizeInputs);

// ── WAF — SQL injection, path traversal, null byte, SSRF detection ────────────
// Runs after sanitisation; blocks and logs before reaching route handlers.
app.use(wafMiddleware);

app.use("/api", router);

app.get("/", (_req, res) => { res.redirect(301, "/grand-pms/"); });

// ── Scheduled maintenance tasks ───────────────────────────────────────────────
// Daily compressed DB backup (./backups/) + weekly vulnerability scan.
startScheduler();

export default app;
