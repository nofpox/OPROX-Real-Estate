import helmet from "helmet";
import rateLimit from "express-rate-limit";
import xss from "xss";
import type { Request, Response, NextFunction } from "express";

// ── HTTP security headers ─────────────────────────────────────────────────────
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "'unsafe-inline'"],
      styleSrc:    ["'self'", "'unsafe-inline'"],
      imgSrc:      ["'self'", "data:", "https:"],
      connectSrc:  ["'self'"],
      fontSrc:     ["'self'", "https:"],
      objectSrc:   ["'none'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge:           31_536_000, // 1 year
    includeSubDomains: true,
    preload:           true,
  },
  referrerPolicy:       { policy: "strict-origin-when-cross-origin" },
  noSniff:              true,
  xssFilter:            true,
  hidePoweredBy:        true,
  permittedCrossDomainPolicies: { permittedPolicies: "none" },
});

// ── Rate limiting ─────────────────────────────────────────────────────────────
export const rateLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              200,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { status: "error", error: "Too many requests — please try again later.", code: "RATE_LIMIT_EXCEEDED" },
  skip: (req) => req.path === "/api/healthz",
});

export const authRateLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              20,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { status: "error", error: "Too many login attempts — please try again later.", code: "RATE_LIMIT_EXCEEDED" },
});

// Tighter limiter for password-reset and sensitive write endpoints
export const sensitiveRateLimiter = rateLimit({
  windowMs:         60 * 60 * 1000, // 1 hour
  max:              10,
  standardHeaders:  true,
  legacyHeaders:    false,
  message:          { status: "error", error: "Too many requests for this operation.", code: "RATE_LIMIT_EXCEEDED" },
});

// ── Input sanitisation ────────────────────────────────────────────────────────
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

function sanitizeObjectInPlace(obj: Record<string, unknown>): void {
  for (const key of Object.keys(obj)) {
    obj[key] = sanitizeValue(obj[key]);
  }
}

export function sanitizeInputs(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeValue(req.body);
  }
  if (req.query)  sanitizeObjectInPlace(req.query  as Record<string, unknown>);
  if (req.params) sanitizeObjectInPlace(req.params as Record<string, unknown>);
  next();
}

// ── WAF — Injection & path-traversal detection ────────────────────────────────
// Defense-in-depth layer. Drizzle ORM parameterizes all DB queries so SQL
// injection via the DB is already prevented; this layer catches attempts before
// they reach business logic and logs them for SIEM.

/** SQL injection signatures: UNION SELECT, boolean blinds, stacked queries */
const SQL_PATTERNS: RegExp[] = [
  /\b(union)\s+(all\s+)?select\b/i,
  /'\s*(?:or|and)\s+'?\d/i,
  /'\s*(?:or|and)\s+'\w+'\s*=\s*'\w+/i,
  /;\s*(?:drop|truncate|delete|insert|update)\s+/i,
  /;\s*select\b.+\bfrom\b/i,
  /--\s*(?:select|insert|update|drop)/i,
  /\/\*.*\*\/.*(?:select|insert|update|drop)/i,
  /\bexec\s*\(\s*(?:xp_|sp_)/i,
  /\bconvert\s*\(\s*int\s*,/i,
  /\bchar\s*\(\s*\d+\s*\)\s*\+/i,
  /0x[0-9a-fA-F]{4,}/,          // hex literals used to bypass filters
];

/** Path traversal: directory climbing attempts */
const PATH_TRAVERSAL_PATTERNS: RegExp[] = [
  /\.\.[/\\]/,
  /\.\.%2[fF]/,
  /%2[eE]%2[eE][/\\]/,
  /%2[eE]%2[eE]%2[fF]/,
  /%252[eE]/,               // double-encoded
  /\.\.(\/|%2[fF]){2,}/,   // repeated
];

/** Null byte injection */
const NULL_BYTE = /\x00|%00/;

/** SSRF / forbidden internal targets in user-supplied URLs */
const SSRF_TARGETS = /https?:\/\/(127\.|192\.168\.|10\.|172\.1[6-9]\.|172\.2\d\.|172\.3[01]\.|localhost|0\.0\.0\.0)/i;

/**
 * Test a single string for known attack patterns.
 * Returns the attack-type name if found, or null.
 */
function detectAttack(val: string): string | null {
  if (NULL_BYTE.test(val))                           return "null_byte";
  if (SQL_PATTERNS.some((p) => p.test(val)))         return "sql_injection";
  if (PATH_TRAVERSAL_PATTERNS.some((p) => p.test(val))) return "path_traversal";
  return null;
}

/**
 * Recursively walks any value (string, array, plain object) looking for attacks.
 * Returns the attack type name on first match, or null if clean.
 */
function deepDetect(val: unknown): string | null {
  if (typeof val === "string") return detectAttack(val);
  if (Array.isArray(val)) {
    for (const item of val) {
      const r = deepDetect(item);
      if (r) return r;
    }
  } else if (val !== null && typeof val === "object") {
    for (const v of Object.values(val as Record<string, unknown>)) {
      const r = deepDetect(v);
      if (r) return r;
    }
  }
  return null;
}

export function wafMiddleware(req: Request, res: Response, next: NextFunction): void {
  // 1 — oversized Content-Type header (fingerprinting / smuggling)
  const ct = req.headers["content-type"] ?? "";
  if (ct.length > 512) {
    res.status(400).json({ status: "error", error: "Malformed request", code: "WAF_BLOCKED" });
    return;
  }

  // 2 — path traversal in the raw URL path
  if (PATH_TRAVERSAL_PATTERNS.some((p) => p.test(req.path))) {
    res.status(400).json({ status: "error", error: "Invalid request path", code: "WAF_BLOCKED" });
    return;
  }

  // 3 — null byte in URL path
  if (NULL_BYTE.test(req.path)) {
    res.status(400).json({ status: "error", error: "Invalid request path", code: "WAF_BLOCKED" });
    return;
  }

  // 4 — injection patterns in body, query, and params
  const sources: unknown[] = [req.body, req.query, req.params];
  for (const src of sources) {
    const attack = deepDetect(src);
    if (attack) {
      // Log for SIEM — never crash the request pipeline
      try {
        req.log?.warn({
          attack,
          ip:   req.ip,
          path: req.path,
          ua:   req.headers["user-agent"]?.slice(0, 120),
        }, "WAF blocked malicious request");
      } catch { /* logger not yet available in early boot */ }
      res.status(400).json({ status: "error", error: "Request contains invalid characters", code: "WAF_BLOCKED" });
      return;
    }
  }

  // 5 — SSRF guard for any URL-valued body keys (e.g. webhook fields)
  if (req.body && typeof req.body === "object") {
    for (const v of Object.values(req.body as Record<string, unknown>)) {
      if (typeof v === "string" && v.startsWith("http") && SSRF_TARGETS.test(v)) {
        res.status(400).json({ status: "error", error: "Invalid URL in request body", code: "WAF_BLOCKED" });
        return;
      }
    }
  }

  next();
}
