import { Request, Response, NextFunction } from "express";
import { db, userSessionsTable } from "@workspace/db";
import { and, eq, gt } from "drizzle-orm";

// ─── Role Constants ──────────────────────────────────────────────────────────

export const ADMIN_ROLES = [
  "owner",
  "admin_manager",
  "administrator",
  "super_admin",
  "manager",
] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export interface SessionUser {
  id?: string | number;
  role?: string;
  email?: string;
  [key: string]: unknown;
}

// ─── Session Resolution ───────────────────────────────────────────────────────

/**
 * Resolves the pms_session cookie against the database.
 * Returns the session's userData on success, or null on any failure.
 */
async function resolveSession(req: Request): Promise<SessionUser | null> {
  const sessionId = req.headers.cookie?.match(/pms_session=([^;]+)/)?.[1];
  if (!sessionId) return null;
  try {
    const [row] = await db
      .select()
      .from(userSessionsTable)
      .where(
        and(
          eq(userSessionsTable.sessionId, sessionId),
          gt(userSessionsTable.expiresAt, new Date()),
        ),
      );
    if (!row) return null;
    return row.userData as SessionUser;
  } catch {
    return null;
  }
}

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * Requires any valid, non-expired pms_session.
 * Attaches the session user to req as (req as any).sessionUser.
 * Returns 401 if the session is missing or expired.
 */
export async function requireSession(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const user = await resolveSession(req);
  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  (req as any).sessionUser = user;
  next();
}

/**
 * Requires a valid, non-expired pms_session AND an admin-level role.
 * Attaches the session user to req as (req as any).sessionUser.
 * Returns 401 if not authenticated, 403 if not an admin role.
 */
export async function requireAdminSession(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const user = await resolveSession(req);
  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (!user.role || !(ADMIN_ROLES as readonly string[]).includes(user.role)) {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  (req as any).sessionUser = user;
  next();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns true when the given role string is a recognised admin-level role. */
export function isAdminRole(role?: string): boolean {
  return !!role && (ADMIN_ROLES as readonly string[]).includes(role);
}
