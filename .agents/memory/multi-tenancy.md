---
name: Multi-tenancy architecture
description: Shared-schema multi-tenancy design: tenant_id on every table, superadmin has null tenantId, login-slug routing.
---

## Rule
Every table has a `tenantId INTEGER` column. All queries filter by `tenantId` when it is not null. `tenantId = null` means super-admin — bypass the filter and see all tenants' data.

## How it works
- `tenants` table: id, name, slug, plan, status, logoText, logoSub, isActive
- Every table (properties, rooms, bookings, staff, tasks, expenses, workOrders, notifications, shifts, users, settings, customFields, activityLogs, fieldUsers, unitFinancials, guestRequests, guestFeedback, taskComments) has `tenant_id INTEGER` (users is nullable for superadmin; all others DEFAULT 1)
- Login: POST /api/auth/login with `{ username, password, tenantSlug? }`. If tenantSlug provided, tenant is resolved and stored in session. Superadmin omits tenantSlug.
- Session shape: `{ tenantId: number | null, isSuperAdmin: boolean, role: string, ... }`
- tierGate middleware injects `(req as any).sessionUser` and `(req as any).tenantId`
- Route handlers use `tid(req)` helper → returns `null` for super-admin or `number` for tenant users

## Route hardening pattern
```ts
function tid(req: Request): number | null {
  return ((req as any).sessionUser as any)?.tenantId ?? null;
}
// In queries:
const conds = [eq(table.id, id)];
if (tenantId !== null) conds.push(eq(table.tenantId, tenantId));
await db.select().from(table).where(and(...conds));
// On insert:
const parsed = insertSchema.safeParse({ ...req.body, tenantId: tid(req) ?? 1 });
```

## Super-admin routes
- Mounted at `/super-admin/*`
- Only accessible to users with `isSuperAdmin: true`
- CRUD for tenants: GET/POST /super-admin/tenants, GET/PATCH/DELETE /super-admin/tenants/:id
- Creates default settings for new tenants on creation

**Why:** SaaS multi-tenancy — multiple client organizations share one database. Tenant isolation prevents data leakage between clients. Super-admin manages the platform.

**How to apply:** When adding new tables or routes, always add `tenantId` to the schema and filter by it in queries using the `tid(req)` pattern.
