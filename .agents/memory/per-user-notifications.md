---
name: Per-user notifications pattern
description: How notifications are scoped to individual users vs. tenant-wide broadcasts
---

## Rule
`notifications.user_id` is nullable. `null` = tenant-wide broadcast (all users in tenant see it). Non-null = targeted notification visible only to that user.

**Why:** Without user-level targeting, every check-in/maintenance alert goes to all 200k users in the tenant. Targeted notifications let supervisors see only reports relevant to them.

## Query pattern (GET /notifications)
```sql
WHERE tenant_id = $tenantId
  AND (user_id IS NULL OR user_id = $currentUserId)
  AND [optional: is_read = false]
ORDER BY created_at DESC
LIMIT 50
```

## Index
`notifications_tenant_user_unread_idx ON notifications (tenant_id, user_id, is_read, created_at DESC)` — covers the common bell-icon query pattern.

## Creating targeted notifications
`createTaskNotification()` in `tasks.ts` accepts optional `userId?: number | null`. Pass `userId` to target a specific user (e.g., supervisor who owns the task). Omit or pass `null` for tenant-wide broadcast.

## Read-all scoping
`PATCH /notifications/read-all` marks only the current user's visible notifications as read — `WHERE (user_id IS NULL OR user_id = currentUserId)`. Tenant-wide broadcasts marked read by one user ARE marked read globally (limitation of the single `is_read` boolean — full per-user read state would require a `notification_reads` junction table).

## How to apply
When adding a new notification type:
- System events (check-in, maintenance alert) → omit userId → broadcast
- User-specific events (task report submitted to supervisor) → pass `userId: supervisorId`
