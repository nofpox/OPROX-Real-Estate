import { Router } from "express";
import { db, staffTable, propertiesTable, usersTable } from "@workspace/db";
import { eq, and, ne } from "drizzle-orm";
import { insertStaffSchema, updateStaffSchema } from "@workspace/db";
import { hashPwd, sendWelcomeEmail, getHierarchyLevel, USING_TEST_SENDER } from "./auth.js";
import type { SessionUser } from "./auth.js";
import { logActivity, actorFromRequest } from "./activityLogs.js";

const router = Router();

function tid(req: import("express").Request): number | null {
  return ((req as any).sessionUser as any)?.tenantId ?? null;
}

function getCaller(req: import("express").Request): SessionUser | undefined {
  return (req as any).sessionUser as SessionUser | undefined;
}

function formatStaff(
  s: typeof staffTable.$inferSelect,
  propertyName?: string | null,
  userInfo?: { hasAccount: boolean; invitePending: boolean } | null,
) {
  return {
    ...s,
    createdAt: s.createdAt.toISOString(),
    propertyName: propertyName ?? null,
    hasAccount: userInfo?.hasAccount ?? false,
    invitePending: userInfo?.invitePending ?? false,
  };
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

  const userConds = tenantId !== null ? [eq(usersTable.tenantId, tenantId)] : [];
  const users = await db
    .select({ email: usersTable.email, mustChangePassword: usersTable.mustChangePassword })
    .from(usersTable)
    .where(userConds.length > 0 ? and(...userConds) : undefined);
  const userMap = new Map(users.filter(u => u.email).map(u => [u.email!, u]));

  res.json(rows.map(({ staff, property }) => {
    const u = userMap.get(staff.email);
    return formatStaff(staff, property?.name, u
      ? { hasAccount: true, invitePending: u.mustChangePassword }
      : { hasAccount: false, invitePending: false });
  }));
});

router.post("/staff", async (req, res) => {
  const tenantId = tid(req) ?? 1;
  const caller = getCaller(req);

  if (caller) {
    const callerLevel = getHierarchyLevel(caller.role);
    if (callerLevel < 2) {
      res.status(403).json({ error: "Insufficient permissions to add staff" });
      return;
    }
  }

  const parsed = insertStaffSchema.safeParse({ ...req.body, tenantId });
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  // Enforce unique email per tenant before inserting
  const newEmail = (parsed.data as any).email as string;
  const [dupEmail] = await db
    .select({ id: staffTable.id })
    .from(staffTable)
    .where(and(eq(staffTable.email, newEmail), eq(staffTable.tenantId, tenantId)));
  if (dupEmail) {
    res.status(409).json({ error: "This email is already registered to another employee." });
    return;
  }

  // Enforce unique phone per tenant before inserting (only when phone is provided)
  const newPhone = (parsed.data as any).phone as string | undefined;
  if (newPhone) {
    const [dupPhone] = await db
      .select({ id: staffTable.id })
      .from(staffTable)
      .where(and(eq(staffTable.phone, newPhone), eq(staffTable.tenantId, tenantId)));
    if (dupPhone) {
      res.status(409).json({ error: "This phone number is already registered to another employee." });
      return;
    }
  }

  const [staff] = await db.insert(staffTable).values(parsed.data).returning();

  let welcomeEmailSent = false;
  let inviteCode: string | null = null;
  let inviteUsername: string | null = null;

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
          role: (parsed.data as any).systemRole ?? "staff",
          permissions: "[]",
          isActive: true,
          mustChangePassword: true,
        });

        inviteUsername = username;
        // Always hold the code — cleared only if the email actually delivers.
        inviteCode = tempPassword;

        try {
          const sent = await sendWelcomeEmail(email, username, tempPassword);
          if (sent && !USING_TEST_SENDER) {
            welcomeEmailSent = true;
            inviteCode = null; // Email delivered to employee — no need to surface code in UI
            req.log.info({ staffId: staff.id, username }, "Welcome email dispatched");
          } else if (sent) {
            welcomeEmailSent = true;
            req.log.info({ staffId: staff.id }, "Welcome email sent (test mode — invite code still surfaced for manual sharing)");
          } else {
            req.log.info({ staffId: staff.id }, "Resend not configured — invite code returned for manual sharing");
          }
        } catch (emailErr) {
          req.log.warn({ err: emailErr, staffId: staff.id }, "Email delivery failed — invite code returned for manual sharing");
        }
      }
    } catch (err) {
      req.log.error({ err, staffId: staff.id }, "Failed to create user account");
    }
  }

  const actor = actorFromRequest(req);
  logActivity({ ...actor, tenantId, action: "staff.created", entityType: "staff", entityId: staff.id, entityLabel: staff.name });
  res.status(201).json({ ...formatStaff(staff), welcomeEmailSent, inviteCode, inviteUsername });
});

// POST /staff/bulk — must be registered before /staff/:id to avoid route shadowing
router.post("/staff/bulk", async (req, res) => {
  const tenantId = tid(req) ?? 1;
  const caller = getCaller(req);

  if (caller) {
    const callerLevel = getHierarchyLevel(caller.role);
    if (callerLevel < 2) {
      res.status(403).json({ error: "Insufficient permissions to add staff" });
      return;
    }
  }

  const { members } = req.body as { members?: unknown[] };
  if (!Array.isArray(members) || members.length === 0) {
    res.status(400).json({ error: "members must be a non-empty array" });
    return;
  }

  let created = 0;
  const errors: Array<{ row: number; name?: string; error: string }> = [];

  for (let i = 0; i < members.length; i++) {
    const raw = members[i] as Record<string, unknown>;
    const parsed = insertStaffSchema.safeParse({ ...raw, tenantId });
    if (!parsed.success) {
      errors.push({ row: i + 1, name: String(raw.name ?? ""), error: "Validation failed: " + parsed.error.issues.map(e => e.message).join(", ") });
      continue;
    }
    try {
      await db.insert(staffTable).values(parsed.data).returning();

      const email = parsed.data.email;
      if (email) {
        const [existing] = await db
          .select({ id: usersTable.id })
          .from(usersTable)
          .where(and(eq(usersTable.email, email), eq(usersTable.tenantId, tenantId)));
        if (!existing) {
          const username = await generateUsername(email.split("@")[0] ?? "user", tenantId);
          const tempPassword = generateTempPassword();
          await db.insert(usersTable).values({
            tenantId,
            username,
            displayName: parsed.data.name,
            email,
            phoneNumber: (parsed.data as any).phone ?? null,
            passwordHash: hashPwd(tempPassword),
            role: (parsed.data as any).systemRole ?? "staff",
            permissions: "[]",
            isActive: true,
            mustChangePassword: true,
          });
          await sendWelcomeEmail(email, username, tempPassword);
        }
      }
      created++;
    } catch (err: any) {
      errors.push({ row: i + 1, name: String(raw.name ?? ""), error: err?.message ?? "Insert failed" });
      req.log.error({ err, row: i + 1 }, "Bulk staff import row failed");
    }
  }

  res.json({ created, errors });
});

router.post("/staff/:id/resend-invite", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const tenantId = tid(req) ?? 1;

  const conds = [eq(staffTable.id, id), eq(staffTable.tenantId, tenantId)];
  const [staff] = await db.select().from(staffTable).where(and(...conds));
  if (!staff) { res.status(404).json({ error: "Staff not found" }); return; }

  const email = staff.email;
  if (!email) { res.status(400).json({ error: "Staff member has no email address" }); return; }

  try {
    const [existing] = await db
      .select()
      .from(usersTable)
      .where(and(eq(usersTable.email, email), eq(usersTable.tenantId, tenantId)));

    if (!existing) {
      const emailPrefix = email.split("@")[0] ?? "user";
      const username = await generateUsername(emailPrefix, tenantId);
      const tempPassword = generateTempPassword();
      await db.insert(usersTable).values({
        tenantId,
        username,
        displayName: staff.name,
        email,
        phoneNumber: staff.phone ?? null,
        passwordHash: hashPwd(tempPassword),
        role: staff.systemRole ?? "staff",
        permissions: "[]",
        isActive: true,
        mustChangePassword: true,
      });
      let sent = false;
      try { sent = await sendWelcomeEmail(email, username, tempPassword); } catch { /* fall through */ }
      req.log.info({ staffId: id, username, sent, testMode: USING_TEST_SENDER }, "Invite sent (new account created)");
      const showCode = !sent || USING_TEST_SENDER;
      res.json({
        sent,
        inviteCode: showCode ? tempPassword : null,
        inviteUsername: showCode ? username : null,
        message: sent && !USING_TEST_SENDER
          ? "Account created and invitation email sent"
          : "Account created — share the access code manually",
      });
    } else {
      const tempPassword = generateTempPassword();
      await db.update(usersTable)
        .set({ passwordHash: hashPwd(tempPassword), mustChangePassword: true })
        .where(eq(usersTable.id, existing.id));
      let sent = false;
      try { sent = await sendWelcomeEmail(email, existing.username, tempPassword); } catch { /* fall through */ }
      req.log.info({ staffId: id, userId: existing.id, sent, testMode: USING_TEST_SENDER }, "Invite resent with fresh temp password");
      const showCode = !sent || USING_TEST_SENDER;
      res.json({
        sent,
        inviteCode: showCode ? tempPassword : null,
        inviteUsername: showCode ? existing.username : null,
        message: sent && !USING_TEST_SENDER
          ? "Invitation resent with a new temporary password"
          : "Password reset — share the access code manually",
      });
    }
  } catch (err) {
    req.log.error({ err, staffId: id }, "Failed to resend staff invite");
    res.status(500).json({ error: "Failed to send invitation" });
  }
});

router.patch("/staff/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const tenantId = tid(req);
  const parsed = updateStaffSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const tId = tenantId ?? 1;

  // If email is being updated, check it isn't already used by a different employee
  if (parsed.data.email) {
    const [dupEmail] = await db
      .select({ id: staffTable.id })
      .from(staffTable)
      .where(and(eq(staffTable.email, parsed.data.email), eq(staffTable.tenantId, tId), ne(staffTable.id, id)));
    if (dupEmail) {
      res.status(409).json({ error: "This email is already registered to another employee." });
      return;
    }
  }

  // If phone is being updated, check it isn't already used by a different employee
  if (parsed.data.phone) {
    const [dupPhone] = await db
      .select({ id: staffTable.id })
      .from(staffTable)
      .where(and(eq(staffTable.phone, parsed.data.phone), eq(staffTable.tenantId, tId), ne(staffTable.id, id)));
    if (dupPhone) {
      res.status(409).json({ error: "This phone number is already registered to another employee." });
      return;
    }
  }

  const conds = [eq(staffTable.id, id)];
  if (tenantId !== null) conds.push(eq(staffTable.tenantId, tenantId));
  const [staff] = await db.update(staffTable).set(parsed.data).where(and(...conds)).returning();
  if (!staff) { res.status(404).json({ error: "Staff not found" }); return; }
  const actor = actorFromRequest(req);
  logActivity({ ...actor, tenantId: tenantId ?? 1, action: "staff.updated", entityType: "staff", entityId: staff.id, entityLabel: staff.name });
  res.json(formatStaff(staff));
});

router.delete("/staff/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const tenantId = tid(req);
  const conds = [eq(staffTable.id, id)];
  if (tenantId !== null) conds.push(eq(staffTable.tenantId, tenantId));
  const [existing] = await db.select({ name: staffTable.name }).from(staffTable).where(and(...conds));
  await db.delete(staffTable).where(and(...conds));
  const actor = actorFromRequest(req);
  logActivity({ ...actor, tenantId: tenantId ?? 1, action: "staff.deleted", entityType: "staff", entityId: id, entityLabel: existing?.name });
  res.status(204).end();
});

export default router;
