import { Router } from "express";
import {
  db,
  guestRequestsTable,
  workOrdersTable,
  bookingsTable,
  activityLogsTable,
  supportTicketsTable,
  archivingLogsTable,
  notificationsTable,
} from "@workspace/db";
import { eq, and, lte, desc } from "drizzle-orm";
import { objectStorageClient } from "../lib/objectStorage.js";

const router = Router();

function tid(req: import("express").Request): number {
  return ((req as any).sessionUser as any)?.tenantId ?? 1;
}

function getQuarterPeriod(d = new Date()): string {
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `${d.getFullYear()}-Q${q}`;
}

function getBucket() {
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  if (!bucketId) throw new Error("DEFAULT_OBJECT_STORAGE_BUCKET_ID not set");
  return objectStorageClient.bucket(bucketId);
}

const ARCHIVE_DATASETS = [
  "guest-requests",
  "work-orders",
  "bookings",
  "support-tickets",
  "activity-logs",
] as const;
type Dataset = (typeof ARCHIVE_DATASETS)[number];

const DEFAULT_OLDER_THAN_DAYS = 90;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getLastCompletedRun(tenantId: number) {
  const [row] = await db
    .select()
    .from(archivingLogsTable)
    .where(
      and(
        eq(archivingLogsTable.tenantId, tenantId),
        eq(archivingLogsTable.status, "completed")
      )
    )
    .orderBy(desc(archivingLogsTable.runAt))
    .limit(1);
  return row ?? null;
}

async function getActiveSnooze(tenantId: number) {
  const [row] = await db
    .select()
    .from(archivingLogsTable)
    .where(
      and(
        eq(archivingLogsTable.tenantId, tenantId),
        eq(archivingLogsTable.status, "snoozed")
      )
    )
    .orderBy(desc(archivingLogsTable.createdAt))
    .limit(1);
  if (!row?.snoozedUntil) return null;
  return row.snoozedUntil > new Date() ? row : null;
}

function isOverdue(lastRunAt: Date | null, snoozedUntil: Date | null): boolean {
  const now = new Date();
  if (snoozedUntil && snoozedUntil > now) return false;
  if (!lastRunAt) return true;
  return (now.getTime() - lastRunAt.getTime()) / (1000 * 60 * 60 * 24) >= 30;
}

async function ensureMaintenanceDueNotification(tenantId: number): Promise<void> {
  const [existing] = await db
    .select()
    .from(notificationsTable)
    .where(
      and(
        eq(notificationsTable.tenantId, tenantId),
        eq(notificationsTable.type, "maintenance_due"),
        eq(notificationsTable.isRead, false)
      )
    )
    .limit(1);
  if (!existing) {
    await db.insert(notificationsTable).values({
      tenantId,
      type: "maintenance_due",
      title: "Scheduled System Maintenance Due",
      message:
        "A monthly data archiving maintenance window is ready. Visit Data Archiving to review and approve.",
      isRead: false,
    });
  }
}

async function clearMaintenanceDueNotifications(tenantId: number): Promise<void> {
  await db
    .update(notificationsTable)
    .set({ isRead: true })
    .where(
      and(
        eq(notificationsTable.tenantId, tenantId),
        eq(notificationsTable.type, "maintenance_due")
      )
    );
}

// ── GET /archiving/status ─────────────────────────────────────────────────────

router.get("/archiving/status", async (req, res) => {
  const tenantId = tid(req);
  try {
    const lastRun = await getLastCompletedRun(tenantId);
    const snooze = await getActiveSnooze(tenantId);
    const isDue = isOverdue(lastRun?.runAt ?? null, snooze?.snoozedUntil ?? null);

    if (isDue) await ensureMaintenanceDueNotification(tenantId);

    const nextDueAt = lastRun
      ? new Date(lastRun.runAt.getTime() + 30 * 24 * 60 * 60 * 1000)
      : null;

    const logs = await db
      .select()
      .from(archivingLogsTable)
      .where(eq(archivingLogsTable.tenantId, tenantId))
      .orderBy(desc(archivingLogsTable.createdAt))
      .limit(20);

    res.json({
      lastRunAt: lastRun?.runAt?.toISOString() ?? null,
      nextDueAt: nextDueAt?.toISOString() ?? null,
      isDue,
      hasPendingAlert: isDue,
      snoozedUntil: snooze?.snoozedUntil?.toISOString() ?? null,
      logs: logs.map((l) => ({
        id: l.id,
        runAt: l.runAt.toISOString(),
        status: l.status,
        triggeredBy: l.triggeredBy,
        recordsArchived: l.recordsArchived,
        datasets: l.datasets,
        archiveKeys: l.archiveKeys,
        notes: l.notes,
      })),
    });
  } catch (err) {
    req.log.error(err, "archiving status error");
    res.status(500).json({ error: "Failed to get archiving status" });
  }
});

// ── Archive one dataset → write JSON to GCS ───────────────────────────────────

async function archiveDataset(
  tenantId: number,
  dataset: Dataset,
  olderThanDays: number,
  period: string,
  bucket: ReturnType<typeof getBucket>
): Promise<{ key: string; count: number }> {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
  let records: object[] = [];

  switch (dataset) {
    case "guest-requests":
      records = await db.select().from(guestRequestsTable).where(
        and(eq(guestRequestsTable.tenantId, tenantId), lte(guestRequestsTable.createdAt, cutoff))
      );
      break;
    case "work-orders":
      records = await db.select().from(workOrdersTable).where(
        and(
          eq(workOrdersTable.tenantId, tenantId),
          eq(workOrdersTable.status, "completed"),
          lte(workOrdersTable.createdAt, cutoff)
        )
      );
      break;
    case "bookings":
      records = await db.select().from(bookingsTable).where(
        and(
          eq(bookingsTable.tenantId, tenantId),
          eq(bookingsTable.status, "checked_out"),
          lte(bookingsTable.createdAt, cutoff)
        )
      );
      break;
    case "support-tickets":
      records = await db.select().from(supportTicketsTable).where(
        and(eq(supportTicketsTable.tenantId, tenantId), lte(supportTicketsTable.createdAt, cutoff))
      );
      break;
    case "activity-logs":
      records = await db.select().from(activityLogsTable).where(
        and(eq(activityLogsTable.tenantId, tenantId), lte(activityLogsTable.createdAt, cutoff))
      );
      break;
  }

  if (records.length === 0) return { key: "", count: 0 };

  const gcsKey = `archives/${tenantId}/${period}/${dataset}-${Date.now()}.json`;
  await bucket.file(gcsKey).save(
    Buffer.from(
      JSON.stringify(
        { archivedAt: new Date().toISOString(), dataset, period, tenantId, olderThanDays, count: records.length, records },
        null,
        2
      )
    ),
    { contentType: "application/json", metadata: { tenantId: String(tenantId), dataset, period } }
  );

  return { key: gcsKey, count: records.length };
}

// ── POST /archiving/run ───────────────────────────────────────────────────────

router.post("/archiving/run", async (req, res) => {
  const tenantId = tid(req);
  const user = (req as any).sessionUser;
  const {
    datasets = [...ARCHIVE_DATASETS] as Dataset[],
    olderThanDays = DEFAULT_OLDER_THAN_DAYS,
  } = (req.body ?? {}) as { datasets?: Dataset[]; olderThanDays?: number };

  try {
    const bucket = getBucket();
    const period = getQuarterPeriod();
    const results: { dataset: string; key: string; count: number }[] = [];

    for (const dataset of datasets) {
      const { key, count } = await archiveDataset(tenantId, dataset, olderThanDays, period, bucket);
      if (key) results.push({ dataset, key, count });
    }

    const totalRecords = results.reduce((s, r) => s + r.count, 0);
    const archiveKeys = results.map((r) => r.key);

    await db.insert(archivingLogsTable).values({
      tenantId,
      triggeredBy: user?.username ?? "admin",
      status: "completed",
      datasets: datasets as string[],
      recordsArchived: totalRecords,
      archiveKeys,
      notes: `Archived ${results.length} dataset(s) from ${period}. ${totalRecords} records total.`,
    });

    await clearMaintenanceDueNotifications(tenantId);

    res.json({
      success: true,
      recordsArchived: totalRecords,
      archiveKeys,
      message: `Successfully archived ${totalRecords} records across ${results.length} dataset(s).`,
    });
  } catch (err) {
    req.log.error(err, "archiving run error");
    res.status(500).json({ error: "Archiving failed" });
  }
});

// ── POST /archiving/snooze ────────────────────────────────────────────────────

router.post("/archiving/snooze", async (req, res) => {
  const tenantId = tid(req);
  const user = (req as any).sessionUser;
  const { days = 30 } = (req.body ?? {}) as { days?: number };

  try {
    const snoozedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    await db.insert(archivingLogsTable).values({
      tenantId,
      triggeredBy: user?.username ?? "admin",
      status: "snoozed",
      recordsArchived: 0,
      snoozedUntil,
      notes: `Snoozed for ${days} day(s) until ${snoozedUntil.toISOString()}`,
    });
    await clearMaintenanceDueNotifications(tenantId);
    res.json({ success: true, snoozedUntil: snoozedUntil.toISOString() });
  } catch (err) {
    req.log.error(err, "archiving snooze error");
    res.status(500).json({ error: "Snooze failed" });
  }
});

// ── GET /archiving/archives ───────────────────────────────────────────────────

router.get("/archiving/archives", async (req, res) => {
  const tenantId = tid(req);
  try {
    const bucket = getBucket();
    const [files] = await bucket.getFiles({ prefix: `archives/${tenantId}/` });

    const archives = await Promise.all(
      files.map(async (file) => {
        const [meta] = await file.getMetadata();
        const parts = file.name.split("/");
        const period = parts[2] ?? "unknown";
        const filename = parts[parts.length - 1] ?? file.name;
        const dataset = filename.replace(/-\d+\.json$/, "");
        return {
          key: file.name,
          name: filename,
          period,
          dataset,
          createdAt: (meta.timeCreated as string) ?? new Date().toISOString(),
          size: parseInt(String(meta.size ?? "0"), 10),
        };
      })
    );

    archives.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({ archives, total: archives.length });
  } catch (err) {
    req.log.error(err, "archiving list error");
    res.status(500).json({ error: "Failed to list archives" });
  }
});

// ── GET /archiving/archive-content ───────────────────────────────────────────

router.get("/archiving/archive-content", async (req, res) => {
  const tenantId = tid(req);
  const { key } = req.query as { key?: string };
  if (!key) { res.status(400).json({ error: "key is required" }); return; }
  if (!key.startsWith(`archives/${tenantId}/`)) { res.status(403).json({ error: "Forbidden" }); return; }

  try {
    const bucket = getBucket();
    const file = bucket.file(key);
    const [exists] = await file.exists();
    if (!exists) { res.status(404).json({ error: "Archive not found" }); return; }

    const [content] = await file.download();
    const data = JSON.parse(content.toString()) as {
      dataset?: string; period?: string; records?: object[];
      count?: number; archivedAt?: string;
    };

    res.json({
      key,
      dataset: data.dataset ?? "unknown",
      period: data.period ?? "unknown",
      records: data.records ?? [],
      count: data.count ?? (data.records?.length ?? 0),
      archivedAt: data.archivedAt ?? null,
      restorable: true,
    });
  } catch (err) {
    req.log.error(err, "archive content error");
    res.status(500).json({ error: "Failed to read archive" });
  }
});

// ── POST /archiving/restore ───────────────────────────────────────────────────

router.post("/archiving/restore", async (req, res) => {
  const tenantId = tid(req);
  const user = (req as any).sessionUser;
  const { archiveKey } = (req.body ?? {}) as { archiveKey?: string };
  if (!archiveKey) { res.status(400).json({ error: "archiveKey is required" }); return; }
  if (!archiveKey.startsWith(`archives/${tenantId}/`)) { res.status(403).json({ error: "Forbidden" }); return; }

  try {
    const bucket = getBucket();
    const file = bucket.file(archiveKey);
    const [exists] = await file.exists();
    if (!exists) { res.status(404).json({ error: "Archive not found" }); return; }

    const [content] = await file.download();
    const data = JSON.parse(content.toString()) as { dataset?: string; period?: string; count?: number };

    await db.insert(archivingLogsTable).values({
      tenantId,
      triggeredBy: user?.username ?? "admin",
      status: "restored",
      recordsArchived: data.count ?? 0,
      archiveKeys: [archiveKey],
      notes: `Restore requested for "${data.dataset}" archive from ${data.period}.`,
    });

    res.json({
      success: true,
      recordsArchived: data.count ?? 0,
      archiveKeys: [archiveKey],
      message: `Archive "${data.dataset}" from ${data.period} has been flagged for restoration.`,
    });
  } catch (err) {
    req.log.error(err, "archive restore error");
    res.status(500).json({ error: "Restore failed" });
  }
});

export default router;
