# Grand PMS

A comprehensive Property Management System dashboard for hotel, compound, and apartment portfolio management.

## Run & Operate

- `pnpm --filter @workspace/rozoz-pms-api run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/hotel-dashboard run dev` — run the frontend dashboard
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec (run after every openapi.yaml change)
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string, `SESSION_SECRET`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (port 8080, all routes under `/api`)
- DB: PostgreSQL + Drizzle ORM
- Frontend: React + Vite + Tailwind CSS + shadcn/ui + Recharts
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec → React Query hooks + Zod schemas)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — single source of truth for all API contracts (do NOT change `info.title`)
- `lib/db/src/schema/` — Drizzle schema files, one per entity
- `lib/db/src/schema/index.ts` — exports all schemas
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/api-server/src/routes/index.ts` — mounts all routers
- `artifacts/hotel-dashboard/src/pages/` — page-level React components
- `artifacts/hotel-dashboard/src/components/` — shared UI components
- `artifacts/hotel-dashboard/src/contexts/role-context.tsx` — RBAC role definitions + context
- `lib/api-client-react/` — auto-generated React Query hooks (do not edit manually)
- `lib/zod-schemas/` — auto-generated Zod schemas (do not edit manually)

## Architecture decisions

- **Contract-first API**: All routes are defined in `openapi.yaml` first; hooks are generated via Orval. Never write API client code by hand.
- **Frontend-only RBAC**: Role switching is a client-side demo via `RoleProvider` context — no server-side auth. Roles control nav visibility and task category filtering.
- **Drizzle push (no migrations)**: Dev DB schema is kept in sync with `pnpm --filter @workspace/db run push`. Production would need a migration workflow.
- **Recharts for all charts**: ComposedChart for cash flow, PieChart for expense breakdown, custom SVG-free heatmap for occupancy.
- **Shared proxy on port 80**: All requests go through the Replit reverse proxy. Never call service ports directly; always use `localhost:80/api/...` in scripts.

## Product

**Grand PMS** gives property managers a unified dashboard across hotels, compounds, and apartments:

- **Dashboard** — KPI cards (revenue, occupancy, rooms, bookings), 42-day occupancy heatmap per property, recent activity feed, quick actions
- **Bookings** — Full booking lifecycle (confirmed → checked-in → checked-out), date-range filtering, new booking form
- **Properties** — Multi-property management with type, address, status; detail page per property
- **Rooms** — Room inventory with type, price, status, capacity; filter by property
- **Guests** — Unified guest directory with full booking history and spend analytics per guest
- **Finance** — 5-KPI dashboard (revenue, expenses, net profit, profit margin %, expense count), monthly cash flow chart, expenses-by-category donut, per-property performance table with revenue share bars, full expense ledger with add/delete
- **Maintenance** — Work order board (open/in-progress/completed), cost tracking, priority/property filters
- **Staff** — Staff directory with role-colored cards, add/edit/deactivate; Shift Schedule tab with weekly color-coded calendar (morning/afternoon/evening/night), add/delete shifts per day
- **Tasks** — Kanban board (pending/in-progress/completed) filtered by RBAC role, category badges, assignment, due dates
- **Notifications** — Bell icon with unread badge, mark-all-read, dismiss individual

## RBAC Roles

| Role | Access |
|---|---|
| Manager | All pages and all tasks |
| Front Desk | Dashboard, Bookings, Rooms, Guests — tasks: reception + general |
| Housekeeping | Rooms, Tasks — tasks: housekeeping only |
| Maintenance | Maintenance, Tasks — tasks: maintenance only |
| Security | Tasks only — tasks: security only |

Switch roles using the "Viewing as" dropdown at the bottom of the sidebar.

## Database (seeded)

- 3 properties (Grand Hotel Downtown, Sunset Apartments, Oakwood Compound)
- 15 rooms across all properties
- 20 bookings (various statuses)
- 10 staff members
- 15 tasks (reception, housekeeping, maintenance, security, general)
- 12 work orders
- 22 expenses
- 17 shifts (current week across all properties)
- 4 notifications

## User preferences

- Use `new Date(dateStr + 'T00:00:00')` for date-only strings to avoid timezone shifts
- Prefer `font-serif` for page headings (dashboard aesthetic)
- Never use `console.log` in server code — use `req.log` in route handlers

## Gotchas

- **Always run codegen after every openapi.yaml change**: `pnpm --filter @workspace/api-spec run codegen`
- **Never edit `lib/api-client-react/` or `lib/zod-schemas/` directly** — they are auto-generated and will be overwritten
- **Do not run `pnpm dev` at workspace root** — run individual artifact workflows instead
- **Proxy paths**: requests go `browser → :80 proxy → :8080 api-server`. Scripts must use `localhost:80/api/...`
- Drizzle `insertXSchema` / `updateXSchema` come from `drizzle-zod` in `lib/db` — import from `@workspace/db`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- OpenAPI spec reference: `.local/skills/pnpm-workspace/references/openapi.md`
- Server patterns: `.local/skills/pnpm-workspace/references/server.md`
- DB schema patterns: `.local/skills/pnpm-workspace/references/db.md`
