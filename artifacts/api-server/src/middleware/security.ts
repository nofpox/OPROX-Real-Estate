import helmet from "helmet";
import rateLimit from "express-rate-limit";
import xss from "xss";
import type { Request, Response, NextFunction } from "express";

// ── HTTP security headers ─────────────────────────────────────────────────────
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc:    ["'self'", "https:"],
      objectSrc:  ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000,        // 1 year
    includeSubDomains: true,
    preload: true,
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
});

// ── Rate limiting ─────────────────────────────────────────────────────────────
// 100 requests per 15-minute window per IP. Stricter limits on auth endpoints.
export const rateLimiter = rateLimit({
  windowMs:         15 * 60 * 1000, // 15 minutes
  max:              200,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { status: "error", error: "Too many requests — please try again later.", code: "RATE_LIMIT_EXCEEDED" },
  skip: (req) => req.path === "/api/healthz",
});

export const authRateLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              20,             // Stricter for login
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { status: "error", error: "Too many login attempts — please try again later.", code: "RATE_LIMIT_EXCEEDED" },
});

// ── Input sanitisation ────────────────────────────────────────────────────────
// Recursively strips XSS payloads from strings in an object/array.
function sanitizeValue(val: unknown): unknown {
  if (typeof val === "string") return xss(val, { whiteList: {}, stripIgnoreTag: true });
  if (Array.isArray(val))      return val.map(sanitizeValue);
  if (val !== null && typeof val === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      out[k] = sanitizeValue(v);
    }
    return out;
  }
  return val;
}

// Mutates an existing object's string-valued keys in place (Express 5 query/params are read-only getters)
function sanitizeObjectInPlace(obj: Record<string, unknown>): void {
  for (const key of Object.keys(obj)) {
    obj[key] = sanitizeValue(obj[key]);
  }
}

export function sanitizeInputs(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeValue(req.body);           // body IS reassignable
  }
  if (req.query)  sanitizeObjectInPlace(req.query  as Record<string, unknown>);
  if (req.params) sanitizeObjectInPlace(req.params as Record<string, unknown>);
  next();
}
