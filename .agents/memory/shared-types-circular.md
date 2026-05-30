---
name: Shared types to break circular imports
description: SessionUser lives in src/types.ts to prevent auth.ts ↔ session-store.ts circular dependency
---

## Rule
`SessionUser` type is defined in `artifacts/api-server/src/types.ts`. Both `auth.ts` and `session-store.ts` import it from there.

**Why:** `session-store.ts` needs `SessionUser` for the `get()` return type. `auth.ts` imports `sessions` from `session-store.ts`. If `session-store.ts` imported `SessionUser` from `auth.ts`, the cycle would be `session-store.ts → auth.ts → session-store.ts`, causing TypeScript/Node.js circular module errors.

## How to apply
- Any new file that needs `SessionUser`: import from `../types.js` (or `./types.js` depending on depth)
- `auth.ts` re-exports it: `export type { SessionUser };` so existing callers that do `import type { SessionUser } from "./auth.js"` keep working
- Never redefine `SessionUser` inline in a new file — always import from `types.ts`
