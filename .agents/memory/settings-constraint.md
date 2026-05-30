---
name: Settings composite constraint
description: Settings table unique constraint is (tenant_id, key); onConflictDoUpdate must use array target.
---

## Rule
The `settings` table has a composite unique constraint `settings_tenant_key_uniq` on `(tenant_id, key)`. The old single-column `settings_key_key` constraint on just `key` was dropped.

## How to apply
When upserting settings, use the array form of `target`:
```ts
await db.insert(settingsTable)
  .values({ tenantId, key, value })
  .onConflictDoUpdate({
    target: [settingsTable.tenantId, settingsTable.key],  // array, not string
    set: { value: val, updatedAt: new Date() },
  });
```

**Why:** Multi-tenant settings allow the same key (e.g. `propertyName`) to exist for each tenant. The composite constraint enforces uniqueness per tenant, not globally.
