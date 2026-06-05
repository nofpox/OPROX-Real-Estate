# Grand PMS — Standalone

A fully self-contained version of the Grand PMS hotel dashboard. **Zero server, zero API calls** — everything runs locally in your browser.

## Quick Start

```bash
npm install
npm run dev
```

Then open http://localhost:5173

## Demo Credentials

| Username | Password   | Access Level      |
|----------|------------|-------------------|
| admin    | admin123   | Manager (full access) |
| manager  | manager123 | Supervisor access |
| worker   | worker123  | Worker (mobile view) |

## Features

All pages work 100% offline with built-in seed data:

- **Dashboard** — KPI cards, occupancy heatmap, activity feed
- **Properties** — 3 properties with room management (add, edit, delete)
- **Maintenance** — Work orders with full CRUD
- **Facilities** — Facility availability schedule
- **Staff** — Staff directory with shifts calendar
- **Tasks** — Kanban board with status tracking
- **Guest Requests** — Service request management
- **Analytics** — PDF-exportable task completion reports
- **User Management** — User and role management
- **Admin Settings** — Theme, modules, custom fields
- **Activity Log** — Audit trail
- **Security Dashboard** — Session monitoring
- **Content Manager** — Website content editing
- **AI Assistant** — Rule-based Layla chatbot (no API key needed)
- **Worker View** — Mobile-optimized dashboard for field workers
- **13 Languages** — Full i18n (Arabic, English, French, and more)

## Data

All data is seeded in memory on app start:
- 3 properties (Grand Hotel Downtown, Sunset Apartments, Oakwood Compound)
- 15 rooms across all properties
- 10 staff members
- 15 tasks
- 12 work orders
- 10 shifts
- 4 notifications

Data persists within your browser session. Refreshing resets to seed data.

## Build for Production

```bash
npm run build
```

Output goes to `dist/`. Serve with any static file server.
