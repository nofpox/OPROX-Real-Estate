import { Router } from "express";
import { db, aiActionQueueTable, aiAuditLogTable, settingsTable } from "@workspace/db";
import { eq, and, desc, sql, or } from "drizzle-orm";

const router = Router();

const AI_KILL_SWITCH_KEY     = "ai_kill_switch";
const GLOBAL_AI_KILL_SWITCH_KEY = "ai_global_kill_switch";

// Tenant-sentinel for system-wide (global) settings rows.
// Stored under tenantId=1 so the FK constraint is satisfied; enforced for ALL tenants by isAiHalted().
const GLOBAL_TENANT_SENTINEL = 1;

// ── Exported helper: check global + tenant-level kill switch in one query ────
export async function isAiHalted(tenantId: number): Promise<boolean> {
  const rows = await db
    .select({ value: settingsTable.value })
    .from(settingsTable)
    .where(
      or(
        and(eq(settingsTable.tenantId, GLOBAL_TENANT_SENTINEL), eq(settingsTable.key, GLOBAL_AI_KILL_SWITCH_KEY)),
        and(eq(settingsTable.tenantId, tenantId),               eq(settingsTable.key, AI_KILL_SWITCH_KEY))
      )
    );
  return rows.some(r => r.value === "true");
}

// ── Helper: write an audit log entry ────────────────────────────────────────
async function writeAuditLog(params: {
  tenantId: number;
  actionQueueId?: number;
  event: string;
  actorType?: string;
  actorId?: number;
  actorName?: string;
  targetEntity?: string;
  targetId?: number;
  description: string;
  beforeState?: unknown;
  afterState?: unknown;
  metadata?: unknown;
  ipAddress?: string;
}) {
  await db.insert(aiAuditLogTable).values({
    tenantId:       params.tenantId,
    actionQueueId:  params.actionQueueId ?? null,
    event:          params.event,
    actorType:      params.actorType ?? "ai",
    actorId:        params.actorId ?? null,
    actorName:      params.actorName ?? null,
    targetEntity:   params.targetEntity ?? null,
    targetId:       params.targetId ?? null,
    description:    params.description,
    beforeState:    (params.beforeState ?? null) as any,
    afterState:     (params.afterState ?? null) as any,
    metadata:       (params.metadata ?? null) as any,
    ipAddress:      params.ipAddress ?? null,
  });
}

// ── Master Global Kill Switch (super_admin only) ─────────────────────────────

// GET /ai-governance/global-kill-switch
router.get("/ai-governance/global-kill-switch", async (req, res) => {
  const session = (req as any).sessionUser;
  if (session?.role !== "super_admin") {
    res.status(403).json({ error: "FORBIDDEN", message: "Global kill switch requires super_admin role." });
    return;
  }
  const row = await db
    .select()
    .from(settingsTable)
    .where(and(eq(settingsTable.tenantId, GLOBAL_TENANT_SENTINEL), eq(settingsTable.key, GLOBAL_AI_KILL_SWITCH_KEY)))
    .limit(1);
  const active = row[0]?.value === "true";
  res.json({ active });
});

// POST /ai-governance/global-kill-switch
router.post("/ai-governance/global-kill-switch", async (req, res) => {
  const session = (req as any).sessionUser;
  if (session?.role !== "super_admin") {
    res.status(403).json({ error: "FORBIDDEN", message: "Global kill switch requires super_admin role." });
    return;
  }
  const { active } = req.body as { active: boolean };

  const current = await db
    .select()
    .from(settingsTable)
    .where(and(eq(settingsTable.tenantId, GLOBAL_TENANT_SENTINEL), eq(settingsTable.key, GLOBAL_AI_KILL_SWITCH_KEY)))
    .limit(1);
  const wasActive = current[0]?.value === "true";

  await db
    .insert(settingsTable)
    .values({ tenantId: GLOBAL_TENANT_SENTINEL, key: GLOBAL_AI_KILL_SWITCH_KEY, value: String(active) })
    .onConflictDoUpdate({
      target: [settingsTable.tenantId, settingsTable.key],
      set: { value: String(active), updatedAt: new Date() },
    });

  await writeAuditLog({
    tenantId:    GLOBAL_TENANT_SENTINEL,
    event:       active ? "GLOBAL_KILL_SWITCH_ACTIVATED" : "GLOBAL_KILL_SWITCH_DEACTIVATED",
    actorType:   "human",
    actorId:     session?.userId,
    actorName:   session?.name ?? session?.email ?? "superadmin",
    description: active
      ? `[MASTER EMERGENCY] System-wide AI HALTED across ALL tenants by ${session?.name ?? "superadmin"}`
      : `[MASTER EMERGENCY] System-wide AI RESUMED across ALL tenants by ${session?.name ?? "superadmin"}`,
    beforeState: { active: wasActive, scope: "GLOBAL" },
    afterState:  { active,            scope: "GLOBAL" },
    ipAddress:   req.ip,
  });

  res.json({ active });
});

// ── Tenant-level Kill Switch ─────────────────────────────────────────────────

// GET /ai-governance/kill-switch
router.get("/ai-governance/kill-switch", async (req, res) => {
  const tenantId: number = (req as any).tenantId ?? 1;
  const row = await db
    .select()
    .from(settingsTable)
    .where(and(eq(settingsTable.tenantId, tenantId), eq(settingsTable.key, AI_KILL_SWITCH_KEY)))
    .limit(1);
  const active = row[0]?.value === "true";
  res.json({ active });
});

// POST /ai-governance/kill-switch
router.post("/ai-governance/kill-switch", async (req, res) => {
  const tenantId: number = (req as any).tenantId ?? 1;
  const session = (req as any).sessionUser;
  const { active } = req.body as { active: boolean };

  const current = await db
    .select()
    .from(settingsTable)
    .where(and(eq(settingsTable.tenantId, tenantId), eq(settingsTable.key, AI_KILL_SWITCH_KEY)))
    .limit(1);
  const wasActive = current[0]?.value === "true";

  await db
    .insert(settingsTable)
    .values({ tenantId, key: AI_KILL_SWITCH_KEY, value: String(active) })
    .onConflictDoUpdate({
      target: [settingsTable.tenantId, settingsTable.key],
      set: { value: String(active), updatedAt: new Date() },
    });

  await writeAuditLog({
    tenantId,
    event:       active ? "KILL_SWITCH_ACTIVATED" : "KILL_SWITCH_DEACTIVATED",
    actorType:   "human",
    actorId:     session?.userId,
    actorName:   session?.name ?? session?.email,
    description: active
      ? `AI autonomous processing HALTED by ${session?.name ?? "administrator"}`
      : `AI autonomous processing RESUMED by ${session?.name ?? "administrator"}`,
    beforeState: { active: wasActive },
    afterState:  { active },
    ipAddress:   req.ip,
  });

  res.json({ active });
});

// ── Action queue ─────────────────────────────────────────────────────────────

// GET /ai-governance/action-queue
router.get("/ai-governance/action-queue", async (req, res) => {
  const tenantId: number = (req as any).tenantId ?? 1;
  const status = req.query.status as string | undefined;
  const limit  = Math.min(Number(req.query.limit ?? 50), 200);
  const offset = Number(req.query.offset ?? 0);

  const rows = await db
    .select()
    .from(aiActionQueueTable)
    .where(
      status
        ? and(eq(aiActionQueueTable.tenantId, tenantId), eq(aiActionQueueTable.status, status))
        : eq(aiActionQueueTable.tenantId, tenantId)
    )
    .orderBy(desc(aiActionQueueTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(aiActionQueueTable)
    .where(
      status
        ? and(eq(aiActionQueueTable.tenantId, tenantId), eq(aiActionQueueTable.status, status))
        : eq(aiActionQueueTable.tenantId, tenantId)
    );

  res.json({ rows, total: count, limit, offset });
});

// POST /ai-governance/action-queue  — propose a new action
router.post("/ai-governance/action-queue", async (req, res) => {
  const tenantId: number = (req as any).tenantId ?? 1;
  const session = (req as any).sessionUser;
  const { actionType, targetEntity, targetId, description, payload, proposedBy } = req.body as {
    actionType: string;
    targetEntity: string;
    targetId?: number;
    description: string;
    payload?: unknown;
    proposedBy?: string;
  };

  if (!actionType || !targetEntity || !description) {
    res.status(400).json({ error: "actionType, targetEntity, description are required" });
    return;
  }

  // Honour both global and tenant-level kill switches
  if (await isAiHalted(tenantId)) {
    res.status(423).json({ error: "AI_HALTED", message: "AI autonomous processing is currently halted by the kill-switch." });
    return;
  }

  const [row] = await db
    .insert(aiActionQueueTable)
    .values({
      tenantId,
      actionType,
      targetEntity,
      targetId: targetId ?? null,
      description,
      payload: (payload ?? null) as any,
      proposedBy: proposedBy ?? "ai-engine",
      status: "pending",
    })
    .returning();

  await writeAuditLog({
    tenantId,
    actionQueueId: row.id,
    event:        "ACTION_PROPOSED",
    actorType:    "ai",
    actorName:    proposedBy ?? "ai-engine",
    targetEntity,
    targetId,
    description:  `Proposed action: ${description}`,
    afterState:   row,
    ipAddress:    req.ip,
  });

  res.status(201).json(row);
});

// PATCH /ai-governance/action-queue/:id  — approve | reject | cancel
router.patch("/ai-governance/action-queue/:id", async (req, res) => {
  const tenantId: number = (req as any).tenantId ?? 1;
  const session = (req as any).sessionUser;
  const id = Number(req.params.id);
  const { decision, note } = req.body as { decision: "approved" | "rejected" | "cancelled"; note?: string };

  if (!["approved", "rejected", "cancelled"].includes(decision)) {
    res.status(400).json({ error: "decision must be approved | rejected | cancelled" });
    return;
  }

  const [existing] = await db
    .select()
    .from(aiActionQueueTable)
    .where(and(eq(aiActionQueueTable.id, id), eq(aiActionQueueTable.tenantId, tenantId)));

  if (!existing) {
    res.status(404).json({ error: "Action not found" });
    return;
  }
  if (existing.status !== "pending") {
    res.status(409).json({ error: `Action is already ${existing.status}` });
    return;
  }

  const now = new Date();
  const [updated] = await db
    .update(aiActionQueueTable)
    .set({
      status:          decision,
      reviewedById:    session?.userId ?? null,
      reviewedByName:  session?.name ?? session?.email ?? null,
      reviewNote:      note ?? null,
      reviewedAt:      now,
      executedAt:      decision === "approved" ? now : null,
    })
    .where(and(eq(aiActionQueueTable.id, id), eq(aiActionQueueTable.tenantId, tenantId)))
    .returning();

  const eventMap: Record<string, string> = {
    approved:  "ACTION_APPROVED",
    rejected:  "ACTION_REJECTED",
    cancelled: "ACTION_CANCELLED",
  };

  await writeAuditLog({
    tenantId,
    actionQueueId: id,
    event:        eventMap[decision],
    actorType:    "human",
    actorId:      session?.userId,
    actorName:    session?.name ?? session?.email,
    targetEntity: existing.targetEntity,
    targetId:     existing.targetId ?? undefined,
    description:  `${decision.toUpperCase()}: ${existing.description}${note ? ` — Note: ${note}` : ""}`,
    beforeState:  existing,
    afterState:   updated,
    ipAddress:    req.ip,
  });

  res.json(updated);
});

// ── Audit log ────────────────────────────────────────────────────────────────

// GET /ai-governance/audit-log
router.get("/ai-governance/audit-log", async (req, res) => {
  const tenantId: number = (req as any).tenantId ?? 1;
  const limit  = Math.min(Number(req.query.limit ?? 50), 200);
  const offset = Number(req.query.offset ?? 0);

  const rows = await db
    .select()
    .from(aiAuditLogTable)
    .where(eq(aiAuditLogTable.tenantId, tenantId))
    .orderBy(desc(aiAuditLogTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(aiAuditLogTable)
    .where(eq(aiAuditLogTable.tenantId, tenantId));

  res.json({ rows, total: count, limit, offset });
});

export default router;
