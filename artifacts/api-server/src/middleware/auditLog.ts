import type { Request, Response, NextFunction } from "express";
import { db, activityLogsTable } from "@workspace/db";

// ── Derive action type from method + path ─────────────────────────────────────
function deriveActionType(method: string, path: string): string {
  const p = path.toLowerCase();
  if (p.includes("/auth/login"))          return "AUTH_LOGIN";
  if (p.includes("/auth/logout"))         return "AUTH_LOGOUT";
  if (p.includes("/auth/reset"))          return "AUTH_RESET";
  if (p.includes("/auth/change-password")) return "AUTH_PASSWORD_CHANGE";
  if (p.includes("/users") || p.includes("/field-users")) return "USER_MGMT";
  if (p.includes("/settings"))            return "SETTINGS_CHANGE";
  if (p.includes("/storage/"))            return "UPLOAD";
  switch (method.toUpperCase()) {
    case "GET":    return "READ";
    case "POST":   return "WRITE";
    case "PUT":
    case "PATCH":  return "UPDATE";
    case "DELETE": return "DELETE";
    default:       return "OTHER";
  }
}

// ── Derive device source ──────────────────────────────────────────────────────
function deriveDeviceSource(req: Request): string {
  const explicit = req.headers["x-client-source"];
  if (explicit === "app" || explicit === "web") return explicit;
  const ua = (req.headers["user-agent"] ?? "").toLowerCase();
  if (ua.includes("dart") || ua.includes("okhttp") || ua.includes("ios") ||
      ua.includes("android") || ua.includes("mobile")) return "app";
  return "web";
}

// ── Paths to skip (health checks / high-frequency noise) ─────────────────────
const SKIP_PATHS = [
  "/api/healthz",
  "/api/stats/occupancy-heatmap",
  "/api/notifications",           // polled every 30s — too noisy
];

// ── Paths that always log regardless of method (sensitive admin paths) ─────────
const ALWAYS_LOG_PATHS = [
  "/auth/",
  "/users",
  "/field-users",
  "/settings",
  "/tenants",
  "/admin",
  "/storage",
];

export function auditLogMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip noisy paths
  if (SKIP_PATHS.some((p) => req.path.startsWith(p.replace("/api", "")))) {
    next(); return;
  }

  // Skip GET reads unless they hit a sensitive admin path
  const isSensitivePath = ALWAYS_LOG_PATHS.some((p) => req.path.includes(p));
  if (req.method === "GET" && !isSensitivePath) {
    next(); return;
  }

  res.on("finish", () => {
    const session  = (req as unknown as Record<string, unknown>).sessionUser as { id?: number; tenantId?: number; role?: string } | undefined;
    const userId   = session?.id     ?? null;
    const tenantId = session?.tenantId ?? null;

    const actionType   = deriveActionType(req.method, req.path);
    const deviceSource = deriveDeviceSource(req);

    // Capture sanitised request body for admin/write actions (strip secrets)
    let bodySnapshot: Record<string, unknown> | null = null;
    if (req.method !== "GET" && req.body && typeof req.body === "object") {
      const sanitised = { ...(req.body as Record<string, unknown>) };
      // Redact sensitive fields — never log passwords or tokens
      for (const field of ["password", "newPassword", "oldPassword", "token", "secret", "key"]) {
        if (field in sanitised) sanitised[field] = "[REDACTED]";
      }
      bodySnapshot = sanitised;
    }

    db.insert(activityLogsTable).values({
      tenantId:   tenantId ?? 1,
      actorId:    userId,
      action:     `${req.method} ${req.path}`,
      entityType: "api_request",
      details:    JSON.stringify({
        statusCode:   res.statusCode,
        endpointUrl:  req.originalUrl,
        actionType,
        deviceSource,
        ip:           req.ip,
        userAgent:    req.headers["user-agent"]?.slice(0, 200),
        role:         session?.role ?? null,
        bodySnapshot: res.statusCode < 500 ? bodySnapshot : null,
      }),
    }).catch(() => { /* audit failures must never crash the request */ });
  });

  next();
}
