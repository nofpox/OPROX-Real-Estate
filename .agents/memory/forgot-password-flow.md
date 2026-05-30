---
name: Forgot-password flow
description: How the password-reset flow works in the auth route — token generation, verification, and demo-mode behaviour
---

## How it works

`POST /api/auth/forgot-password` accepts `{ email, phoneNumber, tenantSlug }`.

1. Resolves `tenantSlug` → `tenantId` (returns `{ok:true}` silently if not found — avoids tenant enumeration).
2. Finds a user matching `tenantId + email + phoneNumber + isActive=true`.
3. If no match: returns `{ok:true}` silently (avoids user enumeration).
4. If match: generates a 6-character uppercase hex token (e.g. `D6EEBA`), stores in `resetTokens` Map with 15-minute expiry.
5. Returns `{ok:true, resetToken}` — **in production** this token would be sent via email/SMS; in demo mode it is returned directly.

`POST /api/auth/reset-password` accepts `{ resetToken, newPassword }`.
- Validates token exists and is not expired.
- Requires `newPassword.length >= 8`.
- Updates `password_hash`, clears `must_change_password`, deletes token from map.

**Why:** No email/SMS service is connected, so demo mode includes the token in the response body to allow end-to-end testing.

**How to apply:** The resetTokens Map is in-memory; a server restart clears it. Fine for now — a production deployment would store tokens in the DB with a `reset_token` + `reset_token_expires_at` column.

## DB changes shipped alongside this
- `phone_number text` column added to `users` table.
- `displayName` already serves as Full Name.
- `email` already existed (nullable).
- All three are now included in `SessionUser`, `fmt()`, and the create/update routes.
