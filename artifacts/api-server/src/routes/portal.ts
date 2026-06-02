import { Router, type Request, type Response, type NextFunction } from "express";
import {
  db,
  bookingsTable,
  roomsTable,
  expensesTable,
  propertiesTable,
  portalPropertiesTable,
  portalUnitsTable,
  usersTable,
  settingsTable,
  insertPortalPropertySchema,
  updatePortalPropertySchema,
  insertPortalUnitSchema,
  updatePortalUnitSchema,
} from "@workspace/db";
import { getRoleTier, getPortalRoleTier } from "./auth.js";
import { eq, and, sql, desc, inArray, ne } from "drizzle-orm";
import { sendSuccess, sendError, parsePagination, buildMeta } from "../utils/response.js";
import {
  portalCache,
  availabilityCache,
  TTL,
  availKey,
  financialsKey,
} from "../utils/cache.js";

const router = Router();

function tid(req: Request): number | null {
  return ((req as any).sessionUser as any)?.tenantId ?? null;
}

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!(req as any).sessionUser) {
    sendError(res, 401, "Authentication required");
    return;
  }
  next();
}

function setPrivateCache(res: Response): void {
  res.set("Cache-Control", "private, no-cache, must-revalidate");
}

// ── GET /portal/properties — platform-only portfolio properties ────────────────
router.get("/portal/properties", requireAuth, async (req, res) => {
  try {
    const tenantId = tid(req);
    const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);

    const cacheKey = `pprops:${tenantId ?? "all"}:${page}:${limit}`;
    const cached = portalCache.get<{ data: unknown; meta: unknown }>(cacheKey);
    if (cached) {
      setPrivateCache(res);
      sendSuccess(res, cached.data, cached.meta as import("../utils/response.js").ApiMeta);
      return;
    }

    const conds = tenantId !== null ? [eq(portalPropertiesTable.tenantId, tenantId)] : [];
    const where = conds.length ? and(...conds) : undefined;

    const [countRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(portalPropertiesTable)
      .where(where);

    const properties = await db
      .select()
      .from(portalPropertiesTable)
      .where(where)
      .orderBy(desc(portalPropertiesTable.createdAt))
      .limit(limit)
      .offset(offset);

    const enriched = await Promise.all(
      properties.map(async (property) => {
        const [unitStats] = await db
          .select({ unitCount: sql<number>`count(*)::int` })
          .from(portalUnitsTable)
          .where(eq(portalUnitsTable.portalPropertyId, property.id));

        return {
          id:          property.id,
          name:        property.name,
          type:        property.type,
          status:      property.status,
          address:     property.address,
          city:        property.city,
          country:     property.country,
          description: property.description ?? null,
          unitCount:   unitStats?.unitCount ?? 0,
          createdAt:   property.createdAt.toISOString(),
        };
      }),
    );

    const meta = buildMeta(countRow?.total ?? 0, page, limit);
    portalCache.set(cacheKey, { data: enriched, meta }, TTL.PORTAL_PROPS);
    setPrivateCache(res);
    sendSuccess(res, enriched, meta);
  } catch (err) {
    req.log?.error({ err }, "GET /portal/properties failed");
    sendError(res, 500, "Failed to fetch portal properties");
  }
});

// ── POST /portal/properties ────────────────────────────────────────────────────
router.post("/portal/properties", requireAuth, async (req, res) => {
  try {
    const tenantId = tid(req);
    const parsed = insertPortalPropertySchema.safeParse({
      ...req.body,
      tenantId: tenantId ?? 1,
    });
    if (!parsed.success) {
      sendError(res, 400, "Invalid input");
      return;
    }

    const [created] = await db
      .insert(portalPropertiesTable)
      .values(parsed.data)
      .returning();

    portalCache.invalidatePrefix("");

    const result = {
      id:          created.id,
      name:        created.name,
      type:        created.type,
      status:      created.status,
      address:     created.address,
      city:        created.city,
      country:     created.country,
      description: created.description ?? null,
      unitCount:   0,
      createdAt:   created.createdAt.toISOString(),
    };

    sendSuccess(res, result, undefined, 201);
  } catch (err) {
    req.log?.error({ err }, "POST /portal/properties failed");
    sendError(res, 500, "Failed to create portal property");
  }
});

// ── PATCH /portal/properties/:id ──────────────────────────────────────────────
router.patch("/portal/properties/:id", requireAuth, async (req, res) => {
  try {
    const tenantId = tid(req);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { sendError(res, 400, "Invalid id"); return; }

    const existing = await db
      .select()
      .from(portalPropertiesTable)
      .where(
        tenantId !== null
          ? and(eq(portalPropertiesTable.id, id), eq(portalPropertiesTable.tenantId, tenantId))
          : eq(portalPropertiesTable.id, id),
      )
      .limit(1);

    if (!existing.length) { sendError(res, 404, "Property not found"); return; }

    const parsed = updatePortalPropertySchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "Invalid input");
      return;
    }

    const [updated] = await db
      .update(portalPropertiesTable)
      .set(parsed.data)
      .where(eq(portalPropertiesTable.id, id))
      .returning();

    portalCache.invalidatePrefix("");

    const [unitStats] = await db
      .select({ unitCount: sql<number>`count(*)::int` })
      .from(portalUnitsTable)
      .where(eq(portalUnitsTable.portalPropertyId, id));

    sendSuccess(res, {
      id:          updated.id,
      name:        updated.name,
      type:        updated.type,
      status:      updated.status,
      address:     updated.address,
      city:        updated.city,
      country:     updated.country,
      description: updated.description ?? null,
      unitCount:   unitStats?.unitCount ?? 0,
      createdAt:   updated.createdAt.toISOString(),
    });
  } catch (err) {
    req.log?.error({ err }, "PATCH /portal/properties/:id failed");
    sendError(res, 500, "Failed to update portal property");
  }
});

// ── DELETE /portal/properties/:id ─────────────────────────────────────────────
router.delete("/portal/properties/:id", requireAuth, async (req, res) => {
  try {
    const tenantId = tid(req);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { sendError(res, 400, "Invalid id"); return; }

    const existing = await db
      .select()
      .from(portalPropertiesTable)
      .where(
        tenantId !== null
          ? and(eq(portalPropertiesTable.id, id), eq(portalPropertiesTable.tenantId, tenantId))
          : eq(portalPropertiesTable.id, id),
      )
      .limit(1);

    if (!existing.length) { sendError(res, 404, "Property not found"); return; }

    await db.delete(portalPropertiesTable).where(eq(portalPropertiesTable.id, id));
    portalCache.invalidatePrefix("");
    sendSuccess(res, { deleted: true });
  } catch (err) {
    req.log?.error({ err }, "DELETE /portal/properties/:id failed");
    sendError(res, 500, "Failed to delete portal property");
  }
});

// ── GET /portal/properties/:id/units ──────────────────────────────────────────
router.get("/portal/properties/:id/units", requireAuth, async (req, res) => {
  try {
    const tenantId = tid(req);
    const propertyId = parseInt(req.params.id as string, 10);
    if (isNaN(propertyId)) { sendError(res, 400, "Invalid id"); return; }

    const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);

    const propWhere = tenantId !== null
      ? and(eq(portalPropertiesTable.id, propertyId), eq(portalPropertiesTable.tenantId, tenantId))
      : eq(portalPropertiesTable.id, propertyId);

    const [prop] = await db.select().from(portalPropertiesTable).where(propWhere).limit(1);
    if (!prop) { sendError(res, 404, "Property not found"); return; }

    const [countRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(portalUnitsTable)
      .where(eq(portalUnitsTable.portalPropertyId, propertyId));

    const units = await db
      .select()
      .from(portalUnitsTable)
      .where(eq(portalUnitsTable.portalPropertyId, propertyId))
      .orderBy(portalUnitsTable.unitNumber)
      .limit(limit)
      .offset(offset);

    const data = units.map((u) => ({
      id:               u.id,
      portalPropertyId: u.portalPropertyId,
      tenantId:         u.tenantId,
      unitNumber:       u.unitNumber,
      floor:            u.floor ?? null,
      type:             u.type,
      area:             u.area ? Number(u.area) : null,
      bedroomCount:     u.bedroomCount ?? 0,
      bathroomCount:    u.bathroomCount ?? 1,
      status:           u.status,
      monthlyRent:      u.monthlyRent ? Number(u.monthlyRent) : null,
      notes:            u.notes ?? null,
      createdAt:        u.createdAt.toISOString(),
    }));

    const meta = buildMeta(countRow?.total ?? 0, page, limit);
    setPrivateCache(res);
    sendSuccess(res, data, meta);
  } catch (err) {
    req.log?.error({ err }, "GET /portal/properties/:id/units failed");
    sendError(res, 500, "Failed to fetch portal units");
  }
});

// ── POST /portal/units ────────────────────────────────────────────────────────
router.post("/portal/units", requireAuth, async (req, res) => {
  try {
    const tenantId = tid(req);
    const body = req.body as Record<string, unknown>;
    const parsed = insertPortalUnitSchema.safeParse({
      ...body,
      tenantId:    tenantId ?? 1,
      area:        body.area        != null ? String(body.area)        : undefined,
      monthlyRent: body.monthlyRent != null ? String(body.monthlyRent) : undefined,
    });
    if (!parsed.success) {
      sendError(res, 400, "Invalid input");
      return;
    }

    const [created] = await db
      .insert(portalUnitsTable)
      .values(parsed.data)
      .returning();

    portalCache.invalidatePrefix("");

    sendSuccess(res, {
      id:               created.id,
      portalPropertyId: created.portalPropertyId,
      tenantId:         created.tenantId,
      unitNumber:       created.unitNumber,
      floor:            created.floor ?? null,
      type:             created.type,
      area:             created.area ? Number(created.area) : null,
      bedroomCount:     created.bedroomCount ?? 0,
      bathroomCount:    created.bathroomCount ?? 1,
      status:           created.status,
      monthlyRent:      created.monthlyRent ? Number(created.monthlyRent) : null,
      notes:            created.notes ?? null,
      createdAt:        created.createdAt.toISOString(),
    }, undefined, 201);
  } catch (err) {
    req.log?.error({ err }, "POST /portal/units failed");
    sendError(res, 500, "Failed to create portal unit");
  }
});

// ── PATCH /portal/units/:id ───────────────────────────────────────────────────
router.patch("/portal/units/:id", requireAuth, async (req, res) => {
  try {
    const tenantId = tid(req);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { sendError(res, 400, "Invalid id"); return; }

    const existing = await db
      .select()
      .from(portalUnitsTable)
      .where(
        tenantId !== null
          ? and(eq(portalUnitsTable.id, id), eq(portalUnitsTable.tenantId, tenantId))
          : eq(portalUnitsTable.id, id),
      )
      .limit(1);

    if (!existing.length) { sendError(res, 404, "Unit not found"); return; }

    const body2 = req.body as Record<string, unknown>;
    const parsed = updatePortalUnitSchema.safeParse({
      ...body2,
      area:        body2.area        != null ? String(body2.area)        : undefined,
      monthlyRent: body2.monthlyRent != null ? String(body2.monthlyRent) : undefined,
    });
    if (!parsed.success) {
      sendError(res, 400, "Invalid input");
      return;
    }

    const [updated] = await db
      .update(portalUnitsTable)
      .set(parsed.data)
      .where(eq(portalUnitsTable.id, id))
      .returning();

    portalCache.invalidatePrefix("");

    sendSuccess(res, {
      id:               updated.id,
      portalPropertyId: updated.portalPropertyId,
      tenantId:         updated.tenantId,
      unitNumber:       updated.unitNumber,
      floor:            updated.floor ?? null,
      type:             updated.type,
      area:             updated.area ? Number(updated.area) : null,
      bedroomCount:     updated.bedroomCount ?? 0,
      bathroomCount:    updated.bathroomCount ?? 1,
      status:           updated.status,
      monthlyRent:      updated.monthlyRent ? Number(updated.monthlyRent) : null,
      notes:            updated.notes ?? null,
      createdAt:        updated.createdAt.toISOString(),
    });
  } catch (err) {
    req.log?.error({ err }, "PATCH /portal/units/:id failed");
    sendError(res, 500, "Failed to update portal unit");
  }
});

// ── DELETE /portal/units/:id ──────────────────────────────────────────────────
router.delete("/portal/units/:id", requireAuth, async (req, res) => {
  try {
    const tenantId = tid(req);
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { sendError(res, 400, "Invalid id"); return; }

    const existing = await db
      .select()
      .from(portalUnitsTable)
      .where(
        tenantId !== null
          ? and(eq(portalUnitsTable.id, id), eq(portalUnitsTable.tenantId, tenantId))
          : eq(portalUnitsTable.id, id),
      )
      .limit(1);

    if (!existing.length) { sendError(res, 404, "Unit not found"); return; }

    await db.delete(portalUnitsTable).where(eq(portalUnitsTable.id, id));
    portalCache.invalidatePrefix("");
    sendSuccess(res, { deleted: true });
  } catch (err) {
    req.log?.error({ err }, "DELETE /portal/units/:id failed");
    sendError(res, 500, "Failed to delete portal unit");
  }
});

// ── GET /portal/bookings — bookings across tenant's properties ─────────────────
router.get("/portal/bookings", requireAuth, async (req, res) => {
  try {
    const tenantId = tid(req);
    const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
    const { propertyId, status } = req.query as Record<string, string>;

    const cacheKey = `bkgs:${tenantId ?? "all"}:${propertyId ?? "all"}:${status ?? "all"}:${page}:${limit}`;
    const cached = portalCache.get<{ data: unknown; meta: unknown }>(cacheKey);
    if (cached) {
      setPrivateCache(res);
      sendSuccess(res, cached.data, cached.meta as import("../utils/response.js").ApiMeta);
      return;
    }

    const conds: import("drizzle-orm").SQL[] = [];
    if (tenantId !== null) conds.push(eq(bookingsTable.tenantId, tenantId));
    if (propertyId)        conds.push(eq(roomsTable.propertyId, parseInt(propertyId)));
    if (status)            conds.push(eq(bookingsTable.status, status));

    const where = conds.length ? and(...conds) : undefined;

    const [countRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(bookingsTable)
      .leftJoin(roomsTable, eq(bookingsTable.roomId, roomsTable.id))
      .where(where);

    const rows = await db
      .select({
        id:           bookingsTable.id,
        checkIn:      bookingsTable.checkIn,
        checkOut:     bookingsTable.checkOut,
        status:       bookingsTable.status,
        totalAmount:  bookingsTable.totalAmount,
        guestName:    bookingsTable.guestName,
        roomName:     roomsTable.name,
        propertyId:   roomsTable.propertyId,
        propertyName: propertiesTable.name,
      })
      .from(bookingsTable)
      .leftJoin(roomsTable,      eq(bookingsTable.roomId,     roomsTable.id))
      .leftJoin(propertiesTable, eq(roomsTable.propertyId,    propertiesTable.id))
      .where(where)
      .orderBy(desc(bookingsTable.checkIn))
      .limit(limit)
      .offset(offset);

    const formatted = rows.map((r) => ({
      id:           r.id,
      guestName:    r.guestName ?? "Guest",
      checkIn:      String(r.checkIn),
      checkOut:     String(r.checkOut),
      status:       r.status,
      roomNumber:   r.roomName ?? "—",
      propertyName: r.propertyName ?? "—",
      propertyId:   r.propertyId ?? null,
      totalAmount:  r.totalAmount ? Number(r.totalAmount) : null,
    }));

    const meta = buildMeta(countRow?.total ?? 0, page, limit);
    portalCache.set(cacheKey, { data: formatted, meta }, TTL.PORTAL_BOOKINGS);
    setPrivateCache(res);
    sendSuccess(res, formatted, meta);
  } catch (err) {
    req.log?.error({ err }, "GET /portal/bookings failed");
    sendError(res, 500, "Failed to fetch portal bookings");
  }
});

// ── GET /portal/availability ───────────────────────────────────────────────────
router.get("/portal/availability", requireAuth, async (req, res) => {
  try {
    const { propertyId, checkIn, checkOut } = req.query as Record<string, string>;
    if (!propertyId || !checkIn || !checkOut) {
      sendError(res, 400, "propertyId, checkIn and checkOut are required");
      return;
    }
    const propId = parseInt(propertyId, 10);
    if (isNaN(propId)) { sendError(res, 400, "propertyId must be an integer"); return; }

    const cacheKey = availKey(propId, checkIn, checkOut);
    const cached   = availabilityCache.get<unknown[]>(cacheKey);
    if (cached) {
      setPrivateCache(res);
      sendSuccess(res, cached);
      return;
    }

    const allRooms = await db
      .select()
      .from(roomsTable)
      .where(eq(roomsTable.propertyId, propId));

    const bookedRows = await db
      .select({ roomId: bookingsTable.roomId })
      .from(bookingsTable)
      .where(
        and(
          sql`${bookingsTable.status} NOT IN ('cancelled', 'checked_out')`,
          sql`${bookingsTable.checkIn}::date  < ${checkOut}::date`,
          sql`${bookingsTable.checkOut}::date > ${checkIn}::date`,
        ),
      );

    const bookedIds = new Set(bookedRows.map((b) => b.roomId));
    const available = allRooms.filter(
      (r) => !bookedIds.has(r.id) && r.status === "available",
    );

    const data = available.map((r) => ({
      id:            r.id,
      name:          r.name,
      type:          r.type,
      pricePerNight: r.pricePerNight ?? null,
      capacity:      r.capacity ?? null,
      status:        r.status,
    }));

    availabilityCache.set(cacheKey, data, TTL.AVAILABILITY);
    setPrivateCache(res);
    sendSuccess(res, data);
  } catch (err) {
    req.log?.error({ err }, "GET /portal/availability failed");
    sendError(res, 500, "Failed to check availability");
  }
});

// ── GET /portal/financials ─────────────────────────────────────────────────────
router.get("/portal/financials", requireAuth, async (req, res) => {
  try {
    const tenantId   = tid(req);
    const { propertyId } = req.query as Record<string, string>;
    const months     = Math.min(24, Math.max(1, parseInt((req.query.months as string) || "6") || 6));

    const cacheKey = financialsKey(tenantId, propertyId, months);
    const cached   = portalCache.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      setPrivateCache(res);
      sendSuccess(res, cached);
      return;
    }

    const propConds: import("drizzle-orm").SQL[] = [];
    if (tenantId !== null) propConds.push(eq(propertiesTable.tenantId, tenantId));
    if (propertyId)        propConds.push(eq(propertiesTable.id, parseInt(propertyId, 10)));

    const props = await db
      .select({ id: propertiesTable.id })
      .from(propertiesTable)
      .where(propConds.length ? and(...propConds) : undefined);

    const propIds = props.map((p) => p.id);
    if (propIds.length === 0) {
      const empty = { totalRevenue: 0, totalExpenses: 0, netProfit: 0, profitMargin: 0, monthly: [] };
      sendSuccess(res, empty);
      return;
    }

    const expenseRows = await db
      .select({
        month: sql<string>`to_char(${expensesTable.expenseDate}::date, 'YYYY-MM')`,
        total: sql<number>`sum(${expensesTable.amount})::float`,
      })
      .from(expensesTable)
      .where(
        and(
          inArray(expensesTable.propertyId, propIds),
          sql`${expensesTable.expenseDate}::date >= (now() - make_interval(months => ${months}))::date`,
        ),
      )
      .groupBy(sql`to_char(${expensesTable.expenseDate}::date, 'YYYY-MM')`)
      .orderBy(sql`to_char(${expensesTable.expenseDate}::date, 'YYYY-MM')`);

    const revenueRows = await db
      .select({
        month: sql<string>`to_char(${bookingsTable.checkIn}::date, 'YYYY-MM')`,
        total: sql<number>`sum(${bookingsTable.totalAmount})::float`,
      })
      .from(bookingsTable)
      .innerJoin(roomsTable, eq(bookingsTable.roomId, roomsTable.id))
      .where(
        and(
          inArray(roomsTable.propertyId, propIds),
          ne(bookingsTable.status, "cancelled"),
          sql`${bookingsTable.checkIn}::date >= (now() - make_interval(months => ${months}))::date`,
        ),
      )
      .groupBy(sql`to_char(${bookingsTable.checkIn}::date, 'YYYY-MM')`)
      .orderBy(sql`to_char(${bookingsTable.checkIn}::date, 'YYYY-MM')`);

    const monthMap = new Map<string, { revenue: number; expenses: number }>();
    for (const r of revenueRows) {
      monthMap.set(r.month, { revenue: r.total ?? 0, expenses: 0 });
    }
    for (const e of expenseRows) {
      const prev = monthMap.get(e.month) ?? { revenue: 0, expenses: 0 };
      monthMap.set(e.month, { ...prev, expenses: e.total ?? 0 });
    }

    const monthly = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, { revenue, expenses }]) => ({
        month,
        revenue:   Math.round(revenue),
        expenses:  Math.round(expenses),
        netIncome: Math.round(revenue - expenses),
      }));

    const totalRevenue  = monthly.reduce((s, m) => s + m.revenue,  0);
    const totalExpenses = monthly.reduce((s, m) => s + m.expenses, 0);
    const netProfit     = totalRevenue - totalExpenses;
    const profitMargin  = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

    const result = { totalRevenue, totalExpenses, netProfit, profitMargin, monthly };
    portalCache.set(cacheKey, result, TTL.FINANCIALS);
    setPrivateCache(res);
    sendSuccess(res, result);
  } catch (err) {
    req.log?.error({ err }, "GET /portal/financials failed");
    sendError(res, 500, "Failed to fetch financial summary");
  }
});

// ── Operational permission keys ───────────────────────────────────────────────
const VALID_PERMS = [
  "property:add", "property:edit", "property:delete", "property:publish",
  "marketing:campaigns", "marketing:listings",
  "support:inquiries", "support:messages",
] as const;

function parsePerms(raw: string): string[] {
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

// ── Helpers for role-permission settings ──────────────────────────────────────
const ROLE_PERMS_KEY = "portalRolePermissions";

async function readRolePermsMap(tenantId: number): Promise<Record<string, string[]>> {
  const [row] = await db
    .select({ value: settingsTable.value })
    .from(settingsTable)
    .where(and(eq(settingsTable.tenantId, tenantId), eq(settingsTable.key, ROLE_PERMS_KEY)))
    .limit(1);
  try { return row ? JSON.parse(row.value) : {}; } catch { return {}; }
}

async function writeRolePermsMap(tenantId: number, map: Record<string, string[]>): Promise<void> {
  await db.insert(settingsTable)
    .values({ tenantId, key: ROLE_PERMS_KEY, value: JSON.stringify(map) })
    .onConflictDoUpdate({
      target: [settingsTable.tenantId, settingsTable.key],
      set:    { value: JSON.stringify(map) },
    });
}

// ── GET /portal/team — list team members with their permissions ───────────────
router.get("/portal/team", requireAuth, async (req, res) => {
  try {
    const caller          = (req as any).sessionUser as { id: number; role: string; tenantId: number | null };
    const callerTierLevel = getPortalRoleTier(caller.role);

    if (callerTierLevel > 7) { sendError(res, 403, "Forbidden"); return; }

    const tenantId = tid(req);

    const users = await db
      .select({
        id:          usersTable.id,
        displayName: usersTable.displayName,
        username:    usersTable.username,
        role:        usersTable.role,
        isActive:    usersTable.isActive,
        permissions: usersTable.permissions,
      })
      .from(usersTable)
      .where(
        tenantId !== null
          ? and(eq(usersTable.tenantId, tenantId), ne(usersTable.role, "super_admin"))
          : ne(usersTable.role, "super_admin"),
      );

    // Users see only members lower in the delegation chain (higher tier number)
    const filtered = users.filter((u) => {
      if (u.id === caller.id) return false;
      return getPortalRoleTier(u.role) > callerTierLevel;
    });

    const result = filtered.map((u) => ({
      id:          u.id,
      displayName: u.displayName,
      username:    u.username,
      role:        u.role,
      tier:        getRoleTier(u.role),
      tierLevel:   getPortalRoleTier(u.role),
      isActive:    u.isActive,
      permissions: parsePerms(u.permissions),
    }));

    sendSuccess(res, result);
  } catch (err) {
    req.log?.error({ err }, "GET /portal/team failed");
    sendError(res, 500, "Failed to load team");
  }
});

// ── PUT /portal/team/:userId/permissions ──────────────────────────────────────
router.put("/portal/team/:userId/permissions", requireAuth, async (req, res) => {
  try {
    const caller          = (req as any).sessionUser as { id: number; role: string; tenantId: number | null };
    const callerTierLevel = getPortalRoleTier(caller.role);

    if (callerTierLevel > 7) { sendError(res, 403, "Forbidden"); return; }

    const targetId = parseInt(req.params.userId as string, 10);
    if (isNaN(targetId)) { sendError(res, 400, "Invalid user id"); return; }

    const tenantId = tid(req);
    const { permissions } = req.body as { permissions: unknown };

    if (!Array.isArray(permissions)) { sendError(res, 400, "permissions must be an array"); return; }

    const cleaned = (permissions as string[]).filter((p) => (VALID_PERMS as readonly string[]).includes(p));

    const [targetUser] = await db
      .select()
      .from(usersTable)
      .where(
        tenantId !== null
          ? and(eq(usersTable.id, targetId), eq(usersTable.tenantId, tenantId))
          : eq(usersTable.id, targetId),
      )
      .limit(1);

    if (!targetUser) { sendError(res, 404, "User not found"); return; }

    const targetTierLevel = getPortalRoleTier(targetUser.role);

    // Cannot modify anyone at equal or higher authority
    if (targetTierLevel <= callerTierLevel) {
      sendError(res, 403, "Cannot modify permissions for equal or higher tier roles");
      return;
    }

    // Owner/company/manager (tier 1-3) can grant any valid perms
    if (callerTierLevel <= 3) {
      await db.update(usersTable).set({ permissions: JSON.stringify(cleaned) }).where(eq(usersTable.id, targetId));
      sendSuccess(res, { id: targetId, permissions: cleaned });
      return;
    }

    // All other callers (tiers 4-7) can only grant perms they themselves hold
    const [callerRow] = await db.select({ permissions: usersTable.permissions })
      .from(usersTable).where(eq(usersTable.id, caller.id)).limit(1);
    const callerPerms = callerRow ? parsePerms(callerRow.permissions) : [];
    const allowed = cleaned.filter((p) => callerPerms.includes(p));
    await db.update(usersTable).set({ permissions: JSON.stringify(allowed) }).where(eq(usersTable.id, targetId));
    sendSuccess(res, { id: targetId, permissions: allowed });
  } catch (err) {
    req.log?.error({ err }, "PUT /portal/team/:userId/permissions failed");
    sendError(res, 500, "Failed to update permissions");
  }
});

// ── GET /portal/role-permissions ──────────────────────────────────────────────
router.get("/portal/role-permissions", requireAuth, async (req, res) => {
  try {
    const caller          = (req as any).sessionUser as { role: string; tenantId: number | null };
    const callerTierLevel = getPortalRoleTier(caller.role);
    if (callerTierLevel > 7) { sendError(res, 403, "Forbidden"); return; }

    const tenantId        = tid(req);
    const effectiveTenant = tenantId ?? 1;
    const map             = await readRolePermsMap(effectiveTenant);
    // Owner always has all perms (hardcoded, not stored)
    map.owner = [...VALID_PERMS];
    sendSuccess(res, map);
  } catch (err) {
    req.log?.error({ err }, "GET /portal/role-permissions failed");
    sendError(res, 500, "Failed to load role permissions");
  }
});

// ── PUT /portal/role-permissions ──────────────────────────────────────────────
router.put("/portal/role-permissions", requireAuth, async (req, res) => {
  try {
    const caller          = (req as any).sessionUser as { id: number; role: string; tenantId: number | null };
    const callerTierLevel = getPortalRoleTier(caller.role);

    // Only owner/company/manager (tier <= 3) can set role-level permissions
    if (callerTierLevel > 3) { sendError(res, 403, "Forbidden — only Manager level or above can configure role permissions"); return; }

    const { role, permissions } = req.body as { role: unknown; permissions: unknown };
    if (typeof role !== "string")      { sendError(res, 400, "role must be a string"); return; }
    if (!Array.isArray(permissions))   { sendError(res, 400, "permissions must be an array"); return; }
    if (role === "owner")              { sendError(res, 403, "Cannot modify owner permissions"); return; }

    const targetTierLevel = getPortalRoleTier(role);
    if (targetTierLevel <= callerTierLevel) {
      sendError(res, 403, "Cannot assign permissions to a role equal or higher than yours");
      return;
    }

    const cleaned         = (permissions as string[]).filter((p) => (VALID_PERMS as readonly string[]).includes(p));
    const tenantId        = tid(req);
    const effectiveTenant = tenantId ?? 1;

    const map     = await readRolePermsMap(effectiveTenant);
    map[role]     = cleaned;
    delete map.owner; // never persist owner — always hardcoded
    await writeRolePermsMap(effectiveTenant, map);

    map.owner = [...VALID_PERMS];
    sendSuccess(res, map);
  } catch (err) {
    req.log?.error({ err }, "PUT /portal/role-permissions failed");
    sendError(res, 500, "Failed to update role permissions");
  }
});

export default router;
