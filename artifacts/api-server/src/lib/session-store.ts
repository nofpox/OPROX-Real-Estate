/**
 * PostgreSQL-backed session store.
 *
 * Drop-in replacement for the in-memory Map<string, SessionUser> that was
 * the original session storage. Storing sessions in PostgreSQL means:
 *  - All cluster workers share the same session state (no sticky-session routing required)
 *  - Sessions survive API server restarts
 *  - Horizontal scaling (multiple pods / VMs) works out of the box
 *
 * TTL: 24 hours (matching the pms_session cookie Max-Age)
 * Cleanup: call cleanup() periodically to remove expired rows (done in index.ts)
 */

import { pool } from "@workspace/db";
import type { SessionUser } from "../types.js";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 h

export class PgSessionStore {
  async get(sessionId: string): Promise<SessionUser | undefined> {
    const { rows } = await pool.query<{ user_data: SessionUser; expires_at: Date }>(
      "SELECT user_data, expires_at FROM user_sessions WHERE session_id = $1",
      [sessionId],
    );
    const row = rows[0];
    if (!row) return undefined;
    if (row.expires_at < new Date()) {
      void this.delete(sessionId); // lazy eviction — don't block the request
      return undefined;
    }
    return row.user_data as SessionUser;
  }

  async set(sessionId: string, user: SessionUser): Promise<void> {
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await pool.query(
      `INSERT INTO user_sessions (session_id, user_id, tenant_id, user_data, expires_at)
       VALUES ($1, $2, $3, $4::jsonb, $5)
       ON CONFLICT (session_id) DO UPDATE
         SET user_data = $4::jsonb, expires_at = $5`,
      [sessionId, user.id, user.tenantId, JSON.stringify(user), expiresAt],
    );
  }

  async delete(sessionId: string): Promise<void> {
    await pool.query("DELETE FROM user_sessions WHERE session_id = $1", [sessionId]);
  }

  /**
   * Bulk-invalidate all active sessions for a given user.
   * Used when deactivating a user or triggering a security kill-switch.
   * Returns the number of sessions deleted.
   */
  async deleteByUserId(userId: number): Promise<number> {
    const { rowCount } = await pool.query(
      "DELETE FROM user_sessions WHERE user_id = $1",
      [userId],
    );
    return rowCount ?? 0;
  }

  /**
   * Bulk-invalidate ALL active sessions for every user belonging to a tenant.
   * Called immediately when a tenant is suspended / kill-switched so that
   * currently-logged-in users are evicted within one request cycle.
   * Returns the number of sessions deleted.
   */
  async deleteByTenantId(tenantId: number): Promise<number> {
    const { rowCount } = await pool.query(
      "DELETE FROM user_sessions WHERE tenant_id = $1",
      [tenantId],
    );
    return rowCount ?? 0;
  }

  /**
   * List all active sessions (not expired).
   * Used by the /auth/sessions admin endpoint.
   * Limited to 500 rows to prevent huge result sets.
   */
  async entries(): Promise<[string, SessionUser][]> {
    const { rows } = await pool.query<{ session_id: string; user_data: SessionUser }>(
      `SELECT session_id, user_data
       FROM user_sessions
       WHERE expires_at > now()
       ORDER BY created_at DESC
       LIMIT 500`,
    );
    return rows.map((r) => [r.session_id, r.user_data as SessionUser]);
  }

  /**
   * Delete all expired sessions.
   * Designed to be called every hour (or on a fixed interval) by the primary process.
   */
  async cleanup(): Promise<number> {
    const { rowCount } = await pool.query(
      "DELETE FROM user_sessions WHERE expires_at < now()",
    );
    return rowCount ?? 0;
  }
}

export const sessions = new PgSessionStore();
