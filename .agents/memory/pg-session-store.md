---
name: PostgreSQL session store
description: How sessions are stored in PostgreSQL instead of in-memory Map; class design and key callers
---

## Rule
Sessions are persisted in the `user_sessions` PostgreSQL table, not an in-memory `Map<string, SessionUser>`. The `PgSessionStore` class in `artifacts/api-server/src/lib/session-store.ts` is exported as `sessions` and re-exported from `auth.ts` for backward compatibility.

**Why:** In-memory sessions are lost on restart and are not shared between Node.js cluster workers. PostgreSQL sessions survive restarts and work across all workers with no sticky-session routing.

## Schema (`lib/db/src/schema/user-sessions.ts`)
```
user_sessions (session_id TEXT PK, user_id INT, tenant_id INT, user_data JSONB, created_at, expires_at)
Indexes: user_sessions_user_idx (user_id), user_sessions_tenant_idx, user_sessions_expires_idx
```

## API
- `await sessions.get(sessionId)` → `SessionUser | undefined` (lazy-evicts on expiry)
- `await sessions.set(sessionId, user)` → upserts with 24h TTL
- `await sessions.delete(sessionId)` → removes one session
- `await sessions.deleteByUserId(userId)` → bulk-removes all sessions for a user (used on deactivate/kill-switch)
- `await sessions.entries()` → `[string, SessionUser][]` limited to 500 active sessions (for /auth/sessions admin endpoint)
- `await sessions.cleanup()` → deletes expired rows; called hourly from index.ts (staggered per cluster worker)

## Key callers
- `routes/auth.ts` — login (set), logout (delete), me (get), change-password (get+set), sessions list (get+entries), security-log (get)
- `routes/index.ts` — async `tierGate` middleware; calls `await sessions.get()` and attaches result to `req.sessionUser`
- `routes/users.ts` — `clearUserSessions(userId)` calls `sessions.deleteByUserId()`; `getCallerSession(req)` reads `req.sessionUser`
- `routes/activityLogs.ts` — `actorFromRequest()` reads `req.sessionUser` directly (no DB call needed)

## How to apply
Any new route that needs the current user should read `(req as any).sessionUser as SessionUser` — never call `sessions.get()` inside a route handler (tierGate already did it).

The only routes that call `sessions.get()` directly are the auth routes where `tierGate` has not yet run (login, logout, me, change-password, sessions-list, security-log).
