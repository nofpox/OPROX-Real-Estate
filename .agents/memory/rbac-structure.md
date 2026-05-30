---
name: RBAC structure
description: Three-tier role hierarchy, access matrix, and wiring for Grand PMS
---

## Tiers
| DB role values | Tier | Level |
|---|---|---|
| "owner", "admin" | admin | 2 |
| "manager", "property-manager", "site-supervisor" | supervisor | 1 |
| everything else | worker | 0 |

## Frontend AppRole enum
`"owner" | "manager" | "front-desk" | "housekeeping" | "maintenance" | "security"`

## Access matrix (per user spec)
- **Owner**: all pages
- **Manager**: `/tasks`, `/activity-log`, `/user-management` only (NOT finance, NOT settings)
- **Worker** (all job-function roles): `/tasks` only + own profile

## Key files
- `artifacts/hotel-dashboard/src/contexts/role-context.tsx` — `mapDbRoleToAppRole()`, `isOwnerTier()`, `RoleProvider` with `initialRole` prop
- `artifacts/hotel-dashboard/src/App.tsx` — `<RoleProvider initialRole={authUser.role}>`
- `artifacts/hotel-dashboard/src/components/layout.tsx` — route guard in `Layout`, owner-only role switcher
- `artifacts/api-server/src/routes/index.ts` — `tierGate` single middleware

## Server path gates
- Admin-only: `/expenses`, `/unit-financials`, `/settings`
- Supervisor+: `/users`, `/activity-logs`, `/staff`, `/properties`, `/rooms`, `/bookings`, `/stats`, `/guests`, `/work-orders`, `/shifts`, `/maintenance-requests`, `/field-users`, `/admin/`
- Worker+ (all auth): `/tasks`, `/notifications`, `/storage`, `/guest`
- Public: `/auth/`, `/health`

## Role switcher
Only visible when `isOwnerTier(authUser.role)` is true. Non-owners see a static badge showing their role. Owner can simulate any role for testing via the dropdown.
