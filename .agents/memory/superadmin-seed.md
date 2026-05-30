---
name: Superadmin password seeding
description: encode(digest()) needs pgcrypto extension; use Node.js hashPwd() at server boot instead of raw SQL for seeding admin users.
---

## Rule
Never use `encode(digest('...', 'sha256'), 'hex')` in raw SQL migrations to hash passwords — the `pgcrypto` extension may not be installed.

## Why
`encode(digest(...))` are pgcrypto functions. The Replit PostgreSQL instance does not have pgcrypto installed by default, causing SQL migration failures.

## How to apply
Use the `hashPwd(password)` function from `auth.ts` which uses Node.js `crypto.createHash('sha256')`:
```ts
export function hashPwd(password: string): string {
  return crypto.createHash("sha256").update(`grand-pms::${password}`).digest("hex");
}
```
Seed admin/superadmin users via `ensureAdmin()` called at server boot (not in SQL migrations). The `ensureAdmin()` function in `artifacts/api-server/src/routes/auth.ts` creates both the default tenant (id=1) and the superadmin user if they don't exist.
