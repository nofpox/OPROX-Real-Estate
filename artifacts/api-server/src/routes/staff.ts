import { Router } from "express";
import { db, staffTable, propertiesTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { insertStaffSchema, updateStaffSchema } from "@workspace/db";
import { hashPwd, sendWelcomeEmail, getHierarchyLevel } from "./auth.js";
import type { SessionUser } from "./auth.js";

const router = Router();

function tid(req: import("express").Request): number | null {
  return ((req as any).sessionUser as any)?.tenantId ?? null;
}

function getCaller(req: import("express").Request): SessionUser | undefined {
  return (req as any).sessionUser as SessionUser | undefined;
}

function formatStaff(s: typeof staffTable.$inferSelect, propertyName?: string | null) {
  return { ...s, createdAt: s.createdAt.toISOString(), propertyName: propertyName ?? null };
}

/** Derive a unique username from an email prefix or full name, scoped to tenant. */
async function generateUsername(base: string, tenantId: number): Promise<string> {
  const sanitized = base.toLowerCase().replace(/[^a-z0-9]/g, ".");
  let candidate = sanitized;
  let suffix = 1;
  while (true) {
    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(and(eq(usersTable.username, candidate), eq(usersTable.tenantId, tenantId)));
    if (!existing) return candidate;
    candidate = `${sanitized}${suffix++}`;
  }
}

/** Generate a readable 8-char temporary password (no ambiguous chars). */
function generateTempPassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let pwd = "";
  for (let i = 0; i < 8; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

router.get("/staff", async (req, res) => {
  const { propertyId, role } = req.query as { propertyId?: string; role?: string };
  const tenantId = tid(req);
  const conditions = [];
  if (tenantId !== null) conditions.push(eq(staffTable.tenantId, tenantId));
  if (propertyId) conditions.push(eq(staffTable.propertyId, parseInt(propertyId)));
  if (role) conditions.push(eq(staffTable.role, role));

  const rows = await db
    .select({ staff: staffTable, property: propertiesTable })
    .from(staffTable)
    .leftJoin(propertiesTable, eq(staffTable.propertyId, propertiesTable.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(staffTable.name);
  res.json(rows.map(({ staff, property }) => formatStaff(staff, property?.name)));
});

router.post("/staff", async (req, res) => {
  const tenantId = tid(req) ?? 1;
  const caller = getCaller(req);

  // Hierarchy: only supervisor (level 2) or above can add staff
  if (caller) {
    const callerLevel = getHierarchyLevel(caller.role);
    if (callerLevel < 2) {
      res.status(403).json({ error: "Insufficient permissions to add staff" });
      return;
    }
  }

  const parsed = insertStaffSchema.safeParse({ ...req.body, tenantId });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [staff] = await db.insert(staffTable).values(parsed.data).returning();

  // Auto-create login account + send welcome email when email is provided
  let welcomeEmailSent = false;
  const email = (parsed.data as any).email as string | undefined;
  if (email) {
    try {
      const [existing] = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(and(eq(usersTable.email, email), eq(usersTable.tenantId, tenantId)));

      if (!existing) {
        const emailPrefix = email.split("@")[0] ?? "user";
        const username = await generateUsername(emailPrefix, tenantId);
        const tempPassword = generateTempPassword();

        await db.insert(usersTable).values({
          tenantId,
          username,
          displayName: (parsed.data as any).name ?? username,
          email,
          phoneNumber: (parsed.data as any).phone ?? null,
          passwordHash: hashPwd(tempPassword),
          role: "staff",
          permissions: "[]",
          isActive: true,
          mustChangePassword: true,
        });

        await sendWelcomeEmail(email, username, tempPassword);
        welcomeEmailSent = true;
        req.log.info({ staffId: staff.id, username }, "Welcome email dispatched for new staff member");
      }
    } catch (err) {
      req.log.error({ err, staffId: staff.id }, "Failed to create user account or send welcome email");
    }
  }

  res.status(201).json({ ...formatStaff(staff), welcomeEmailSent });
});

router.patch("/staff/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const tenantId = tid(req);
  const parsed = updateStaffSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const conds = [eq(staffTable.id, id)];
  if (tenantId !== null) conds.push(eq(staffTable.tenantId, tenantId));
  const [staff] = await db.update(staffTable).set(parsed.data).where(and(...conds)).returning();
  if (!staff) { res.status(404).json({ error: "Staff not found" }); return; }
  res.json(formatStaff(staff));
});

router.delete("/staff/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const tenantId = tid(req);
  const conds = [eq(staffTable.id, id)];
  if (tenantId !== null) conds.push(eq(staffTable.tenantId, tenantId));
  await db.delete(staffTable).where(and(...conds));
  res.status(204).end();
});

export default router;
