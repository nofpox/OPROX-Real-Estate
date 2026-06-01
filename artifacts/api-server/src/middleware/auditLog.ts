import type { Request, Response, NextFunction } from "express";
import { db, activityLogsTable } from "@workspace/db";

// ── Derive action type from method + path ─────────────────────────────────────
function deriveActionType(method: string, path: string): string {
  const p = path.toLowerCase();
  if (p.includes("/auth/login") || p.includes("/auth/logout") || p.includes("/auth/reset")) return "AUTH";
  if (p.includes("/storage/"))    return "UPLOAD";
  switch (method.toUpperCase()) {
    case "GET":    return "READ";
    case "POST":   return "WRITE";
    case "PUT":
    case "PATCH":  return "WRITE";
    case "DELETE": return "DELETE";
    default:       return "OTHER";
  }
}

// ── Derive device source ──────────────────────────────────────────────────────
// Priority: explicit X-Client-Source header → User-Agent sniff → default "web"
function deriveDeviceSource(req: Request): string {
  const explicit = req.headers["x-client-source"];
  if (explicit === "app" || explicit === "web") return explicit;
  const ua = (req.headers["user-agent"] ?? "").toLowerCase();
  if (ua.includes("dart") || ua.includes("okhttp") || ua.includes("ios") ||
      ua.includes("android") || ua.includes("mobile")) return "app";
  return "web";
}

// ── Paths to skip (health checks / high-frequency noise) ─────────────────────
const SKIP_PATHS = ["/api/healthz", "/api/stats/occupancy-heatmap"];

export function auditLogMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (SKIP_PATHS.some((p) => req.path.startsWith(p.replace("/api", "")))) {
    next(); return;
  }

  res.on("finish", () => {
    const session  = (req as any).sessionUser as { id?: number; tenantId?: number } | undefined;
    const userId   = session?.id   ?? null;
    const tenantId = session?.tenantId ?? null;

    const actionType   = deriveActionType(req.method, req.path);
    const deviceSource = deriveDeviceSource(req);

    db.insert(activityLogsTable).values({
      tenantId:     tenantId ?? 1,
      actorId:      userId,
      action:       `${req.method} ${req.path}`,
      entityType:   "api_request",
      details:      JSON.stringify({
        statusCode:  res.statusCode,
        endpointUrl: req.originalUrl,
        actionType,
        deviceSource,
        ip:          req.ip,
      }),
    }).catch(() => { /* audit failures must never crash the request */ });
  });

  next();
}
