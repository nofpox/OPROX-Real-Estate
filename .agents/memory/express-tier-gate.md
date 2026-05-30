---
name: Express tier gate pattern
description: How to apply per-path access control in Express without blocking unrelated routes
---

## The rule
Never use `router.use(middleware, subRouter)` for tier gating. In Express, `router.use()` without a path prefix matches ALL incoming requests — the middleware runs before the sub-router even checks if the path matches. This means `requireTier("admin")` blocks workers from `/tasks`, `/notifications`, etc.

**Why:** Express middleware layers are checked sequentially. When a request for `/tasks` reaches `router.use(requireAuth, requireTier("admin"), expensesRouter)`, the `requireTier("admin")` runs and rejects the request before `expensesRouter` ever sees it.

**How to apply:** Use a single path-prefix gate middleware mounted first in the router:

```ts
function tierGate(req, res, next) {
  const path = req.path;

  // Public routes — skip auth
  if (PUBLIC_PREFIXES.some(p => path.startsWith(p))) { next(); return; }

  // Check session
  const session = getSession(req);
  if (!session) { res.status(401).json({ error: "Not authenticated" }); return; }

  // Check tier based on path prefix
  if (ADMIN_PREFIXES.some(p => path.startsWith(p)) && tier < admin) {
    res.status(403).json({ error: "Forbidden" }); return;
  }
  if (SUPERVISOR_PREFIXES.some(p => path.startsWith(p)) && tier < supervisor) {
    res.status(403).json({ error: "Forbidden" }); return;
  }

  next();
}

router.use(tierGate); // First — before all sub-routers
router.use(subRouterA);
router.use(subRouterB);
// etc.
```

This way the tier check is tied to actual request paths, not to which sub-router handles them.
