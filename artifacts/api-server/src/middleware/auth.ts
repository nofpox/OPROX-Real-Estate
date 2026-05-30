import type { Request, Response, NextFunction } from "express";
import { sessions, getRoleTier } from "../routes/auth.js";

const TIER_LEVEL: Record<"admin" | "supervisor" | "worker", number> = {
  worker: 0,
  supervisor: 1,
  admin: 2,
};

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const sessionId = req.headers.cookie?.match(/pms_session=([^;]+)/)?.[1];
  const session = sessionId ? sessions.get(sessionId) : undefined;
  if (!session) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  (req as any).sessionUser = session;
  next();
}

export function requireTier(minTier: "admin" | "supervisor" | "worker") {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).sessionUser;
    if (!user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const tier = getRoleTier(user.role);
    if (TIER_LEVEL[tier] < TIER_LEVEL[minTier]) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}
