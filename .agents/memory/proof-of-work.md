---
name: Proof-of-work accountability
description: How task completion proof photos and actor tracking work across DB, API, and frontend
---

## Rule
Tasks require a proof photo to be marked "completed" by non-admin users. Admins (role: owner/admin) can bypass.

**Why:** Physical accountability — workers must photograph completed work before the system accepts the status change.

## DB columns (added via raw SQL + Drizzle schema)
- `tasks`: `assigned_by_user_id`, `completed_by_user_id`, `proof_photo_url`
- `activity_logs`: `actor_id`, `assigned_by_name`, `completed_by_name`, `proof_photo_url`

## Server enforcement (artifacts/api-server/src/routes/tasks.ts)
- `PATCH /tasks/:id` with `status: "completed"` → checks `proofPhotoUrl` in body or existing record
- Returns `422 { error: "proof_required" }` if non-admin has no proof photo
- Role tiers: `owner/admin` = Admin, `manager` = Supervisor, everything else = Worker
- `actorFromRequest` prefers real session cookie over x-actor-* headers

## Actor extraction (artifacts/api-server/src/routes/activityLogs.ts)
- `actorFromRequest(req)` checks `pms_session` cookie first, falls back to x-actor-* headers
- Returns `{ actorId, actorName, actorRole }`
- `getRoleTier(role)` maps role string to "admin" | "supervisor" | "worker"

## Object storage upload flow (frontend)
1. POST /api/storage/uploads/request-url → { uploadURL, objectPath }
2. PUT file to uploadURL (direct to GCS, outside API server)
3. objectPath looks like `/objects/uploads/<uuid>`
4. Serving URL = `/api/storage` + objectPath

## Frontend (artifacts/hotel-dashboard/src/pages/tasks.tsx)
- `ProofPhotoDialog` intercepts "Mark Complete" action
- "Skip (Admin only)" button exists for admin bypass
- Completed tasks show "View proof photo" link on TaskCard
- TaskDetailSheet shows full proof photo with link to GCS-served image

## Activity Log (artifacts/hotel-dashboard/src/pages/activity-log.tsx)
- `task.status_changed → completed` entries show green ShieldCheck icon
- Shows `completedByName` below the event
- Shows `assignedByName` for task.assigned / task.created events
- Shows proof photo thumbnail (clickable) when `proofPhotoUrl` present
