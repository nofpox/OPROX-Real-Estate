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
  supportTicketsTable,
  customRolesTable,
  insertPortalPropertySchema,
  updatePortalPropertySchema,
  insertPortalUnitSchema,
  updatePortalUnitSchema,
  savedSearchesTable,
  listingsTable as _listingsRef,
  listingInquiriesTable,
} from "@workspace/db";
import { sessions, getRoleTier, getPortalRoleTier, hashPwd, verifyPwd, sendPortalWelcomeEmail, sendPortalTeamWelcomeEmail } from "./auth.js";
import type { SessionUser } from "../types.js";
import { Resend } from "resend";
import crypto from "node:crypto";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { eq, and, or, sql, desc, inArray, ne, gte as _gte, lte as _lte, ilike as _ilike } from "drizzle-orm";
import { sendSuccess, sendError, parsePagination, buildMeta } from "../utils/response.js";
import {
  portalCache,
  availabilityCache,
  TTL,
  availKey,
  financialsKey,
} from "../utils/cache.js";

const router = Router();

// ── Portal auth helpers ────────────────────────────────────────────────────────
const portalResend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const PORTAL_SENDER = process.env.SENDER_EMAIL ?? "ركز للحلول الذكية <onboarding@resend.dev>";

// pending login OTPs: pendingToken → { userId, tenantId, otp, expiresAt }
const pendingLoginTokens = new Map<string, { userId: number; tenantId: number | null; otp: string; expiresAt: number }>();

// WebAuthn challenges (keyed by userId for registration, by challengeKey for auth)
const waRegChallenges  = new Map<number, { challenge: string; expiresAt: number }>();
const waAuthChallenges = new Map<string, { userId: number; challenge: string; expiresAt: number }>();

// Relying-party settings derived from the deployed Replit domain (or localhost in dev)
const rpID = (() => { const d = (process.env.REPLIT_DOMAINS ?? "").split(",")[0]?.trim(); return d || "localhost"; })();
const rpOrigin = (() => { const d = (process.env.REPLIT_DOMAINS ?? "").split(",")[0]?.trim(); return d ? `https://${d}` : "http://localhost:80"; })();

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain || !local) return email;
  return local.slice(0, 2) + "***@" + domain;
}

function tid(req: Request): number | null {
  return ((req as any).sessionUser as any)?.tenantId ?? null;
}

async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const sid = req.headers.cookie?.match(/pms_session=([^;]+)/)?.[1];
  const sessionUser = sid ? await sessions.get(sid) : undefined;
  if (!sessionUser) {
    sendError(res, 401, "Authentication required");
    return;
  }
  (req as any).sessionUser = sessionUser;
  next();
}

function setPrivateCache(res: Response): void {
  res.set("Cache-Control", "private, no-cache, must-revalidate");
}

// ── POST /portal/register (public — client self-registration) ─────────────────
router.post("/portal/register", async (req, res) => {
  try {
    const { displayName, email, phone, username, password } = req.body ?? {};
    if (!displayName || !email || !username || !password) {
      sendError(res, 400, "displayName, email, username and password are required");
      return;
    }
    if (String(password).length < 8) {
      sendError(res, 400, "Password must be at least 8 characters");
      return;
    }
    const uname = String(username).trim().toLowerCase();
    if (!/^[a-z0-9_]{3,30}$/.test(uname)) {
      sendError(res, 400, "Username must be 3-30 characters: letters, numbers, underscores only");
      return;
    }
    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.username, uname))
      .limit(1);
    if (existing) {
      sendError(res, 409, "Username already taken");
      return;
    }
    const safeDisplayName = String(displayName).trim();
    const safeEmail       = String(email).trim().toLowerCase();
    const [newUser] = await db
      .insert(usersTable)
      .values({
        username:     uname,
        displayName:  safeDisplayName,
        email:        safeEmail,
        phoneNumber:  phone ? String(phone).trim() : null,
        passwordHash: hashPwd(String(password)),
        role:         "client",
        tenantId:     1,
        isActive:     true,
      })
      .returning({
        id:          usersTable.id,
        username:    usersTable.username,
        displayName: usersTable.displayName,
        role:        usersTable.role,
      });

    // Fire-and-forget welcome email — does not block the response
    sendPortalWelcomeEmail(safeEmail, safeDisplayName, uname).catch((err) => {
      req.log?.warn({ err }, "POST /portal/register: welcome email failed (non-fatal)");
    });

    sendSuccess(res, newUser);
  } catch (err) {
    req.log?.error({ err }, "POST /portal/register failed");
    sendError(res, 500, "Registration failed");
  }
});

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

// ── POST /portal/team — create a staff member (Owner/Manager only, tier ≤ 3) ──
router.post("/portal/team", requireAuth, async (req, res) => {
  try {
    const caller          = (req as any).sessionUser as { id: number; role: string; tenantId: number | null };
    const callerTierLevel = getPortalRoleTier(caller.role);
    if (callerTierLevel > 3) { sendError(res, 403, "Forbidden"); return; }

    const { username, displayName, email, phone, password, role } = req.body ?? {};
    if (!username || !displayName || !email || !password || !role) {
      sendError(res, 400, "username, displayName, email, password and role are required"); return;
    }
    if (String(password).length < 8) { sendError(res, 400, "Password must be at least 8 characters"); return; }

    const uname = String(username).trim().toLowerCase();
    if (!/^[a-z0-9_]{3,30}$/.test(uname)) {
      sendError(res, 400, "Username must be 3-30 chars: letters, numbers, underscores"); return;
    }

    const targetTierLevel = getPortalRoleTier(String(role));
    if (targetTierLevel <= callerTierLevel) {
      sendError(res, 403, "Cannot create a member at equal or higher authority"); return;
    }

    const [existing] = await db.select({ id: usersTable.id }).from(usersTable)
      .where(eq(usersTable.username, uname)).limit(1);
    if (existing) { sendError(res, 409, "Username already taken"); return; }

    const tenantId = caller.tenantId ?? 1;
    const safeDisplayName = String(displayName).trim();
    const safeEmail       = String(email).trim().toLowerCase();
    const safePassword    = String(password);
    const [newUser] = await db.insert(usersTable).values({
      username:     uname,
      displayName:  safeDisplayName,
      email:        safeEmail,
      phoneNumber:  phone ? String(phone).trim() : null,
      passwordHash: hashPwd(safePassword),
      role:         String(role),
      tenantId,
      isActive:     true,
    }).returning({
      id:          usersTable.id,
      username:    usersTable.username,
      displayName: usersTable.displayName,
      role:        usersTable.role,
      isActive:    usersTable.isActive,
    });

    // Fire-and-forget: send team welcome email with credentials
    sendPortalTeamWelcomeEmail(safeEmail, safeDisplayName, uname, safePassword).catch((err) => {
      req.log?.warn({ err }, "POST /portal/team: welcome email failed (non-fatal)");
    });

    sendSuccess(res, newUser);
  } catch (err) {
    req.log?.error({ err }, "POST /portal/team failed");
    sendError(res, 500, "Failed to create team member");
  }
});

// ── PATCH /portal/team/:id/status — toggle isActive ──────────────────────────
router.patch("/portal/team/:id/status", requireAuth, async (req, res) => {
  try {
    const caller          = (req as any).sessionUser as { id: number; role: string; tenantId: number | null };
    const callerTierLevel = getPortalRoleTier(caller.role);
    if (callerTierLevel > 3) { sendError(res, 403, "Forbidden"); return; }

    const targetId = parseInt(req.params.id as string, 10);
    if (isNaN(targetId)) { sendError(res, 400, "Invalid id"); return; }

    const tenantId = caller.tenantId ?? 1;
    const [target] = await db.select().from(usersTable)
      .where(and(eq(usersTable.id, targetId), eq(usersTable.tenantId, tenantId))).limit(1);
    if (!target) { sendError(res, 404, "User not found"); return; }

    if (getPortalRoleTier(target.role) <= callerTierLevel) {
      sendError(res, 403, "Cannot modify a member at equal or higher authority"); return;
    }

    const newActive = !target.isActive;
    await db.update(usersTable).set({ isActive: newActive }).where(eq(usersTable.id, targetId));
    sendSuccess(res, { id: targetId, isActive: newActive });
  } catch (err) {
    req.log?.error({ err }, "PATCH /portal/team/:id/status failed");
    sendError(res, 500, "Failed to update status");
  }
});

// ── DELETE /portal/team/:id — remove a staff member ──────────────────────────
router.delete("/portal/team/:id", requireAuth, async (req, res) => {
  try {
    const caller          = (req as any).sessionUser as { id: number; role: string; tenantId: number | null };
    const callerTierLevel = getPortalRoleTier(caller.role);
    if (callerTierLevel > 3) { sendError(res, 403, "Forbidden"); return; }

    const targetId = parseInt(req.params.id as string, 10);
    if (isNaN(targetId)) { sendError(res, 400, "Invalid id"); return; }

    const tenantId = caller.tenantId ?? 1;
    const [target] = await db.select().from(usersTable)
      .where(and(eq(usersTable.id, targetId), eq(usersTable.tenantId, tenantId))).limit(1);
    if (!target) { sendError(res, 404, "User not found"); return; }

    if (getPortalRoleTier(target.role) <= callerTierLevel) {
      sendError(res, 403, "Cannot delete a member at equal or higher authority"); return;
    }

    await db.delete(usersTable).where(eq(usersTable.id, targetId));
    sendSuccess(res, { id: targetId, deleted: true });
  } catch (err) {
    req.log?.error({ err }, "DELETE /portal/team/:id failed");
    sendError(res, 500, "Failed to delete team member");
  }
});

// ── POST /portal/contact — investor/client sends a support message ────────────
router.post("/portal/contact", requireAuth, async (req, res) => {
  try {
    const user    = (req as any).sessionUser as { id: number; displayName?: string; username?: string; role?: string };
    const tenantId = tid(req) ?? 1;
    const { subject, message } = req.body ?? {};

    if (!String(subject ?? "").trim() || !String(message ?? "").trim()) {
      sendError(res, 400, "subject and message are required");
      return;
    }

    await db.insert(supportTicketsTable).values({
      tenantId,
      category:           "portal_inquiry",
      title:              String(subject).trim().substring(0, 255),
      description:        String(message).trim(),
      status:             "open",
      submittedByUserId:  user.id,
      submittedByName:    user.displayName ?? user.username ?? "Portal User",
      submittedByRole:    user.role ?? "portal_client",
    });

    sendSuccess(res, { ok: true });
  } catch (err) {
    req.log?.error({ err }, "POST /portal/contact failed");
    sendError(res, 500, "Failed to send message");
  }
});

// ── POST /portal/auth/login-step1 — verify credentials, send OTP ──────────────
router.post("/portal/auth/login-step1", async (req, res) => {
  try {
    const { identifier, password } = req.body ?? {};
    if (!identifier || !password) {
      sendError(res, 400, "identifier and password are required"); return;
    }
    const ident = String(identifier).trim().toLowerCase();

    const [user] = await db.select().from(usersTable).where(
      and(
        eq(usersTable.isActive, true),
        or(eq(usersTable.username, ident), eq(usersTable.email, ident), eq(usersTable.phoneNumber, ident))
      )
    ).limit(1);

    if (!user) {
      await new Promise(r => setTimeout(r, 350)); // constant-time
      sendError(res, 401, "Invalid credentials"); return;
    }
    const { valid } = verifyPwd(user.passwordHash, String(password));
    if (!valid) { sendError(res, 401, "Invalid credentials"); return; }

    if (!user.email) { sendError(res, 400, "Account has no email for OTP delivery"); return; }

    const pendingToken = crypto.randomUUID();
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    pendingLoginTokens.set(pendingToken, { userId: user.id, tenantId: user.tenantId ?? null, otp, expiresAt: Date.now() + 5 * 60_000 });

    if (portalResend) {
      try {
        await portalResend.emails.send({
          from: PORTAL_SENDER,
          to: [user.email],
          subject: "رمز التحقق | Login Verification Code – ركز Rakez",
          html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb"><div style="background:#1a2744;padding:20px 28px"><p style="margin:0;font-size:18px;font-weight:700;color:#fff">ركز | Rakez</p><p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.55)">Investor Portal — Login Verification</p></div><div style="padding:28px"><h2 style="margin:0 0 12px;font-size:18px;color:#111">Your Login Verification Code</h2><p style="margin:0 0 20px;color:#555;font-size:14px">Enter this 6-digit code to complete your sign-in. Expires in <strong>5 minutes</strong>.</p><div style="background:#1a2744;border-radius:12px;padding:20px;text-align:center;letter-spacing:12px;font-size:38px;font-weight:900;color:#fff;font-family:monospace;margin:0 0 20px">${otp}</div><p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#111;direction:rtl;text-align:right">رمز التحقق لتسجيل دخولك إلى بوابة ركز</p><p style="margin:0;color:#aaa;font-size:11px;text-align:center">If you did not attempt to sign in, please ignore this email.<br/>إذا لم تحاول تسجيل الدخول، يرجى تجاهل هذه الرسالة.</p></div></div>`,
        });
      } catch (emailErr) {
        req.log.error({ emailErr }, "Failed to send portal login OTP email");
      }
    }

    const maskedEmail = maskEmail(user.email);
    res.json({ ok: true, pendingToken, maskedEmail, ...(portalResend ? {} : { demoOtp: otp }) });
  } catch (err) {
    req.log.error({ err }, "POST /portal/auth/login-step1 failed");
    sendError(res, 500, "Login failed");
  }
});

// ── POST /portal/auth/login-step2 — verify OTP, create session ────────────────
router.post("/portal/auth/login-step2", async (req, res) => {
  try {
    const { pendingToken, otp } = req.body ?? {};
    if (!pendingToken || !otp) { sendError(res, 400, "pendingToken and otp are required"); return; }

    const pending = pendingLoginTokens.get(String(pendingToken));
    if (!pending) { sendError(res, 400, "Invalid or expired token"); return; }
    if (pending.expiresAt < Date.now()) { pendingLoginTokens.delete(String(pendingToken)); sendError(res, 400, "Verification code has expired"); return; }
    if (pending.otp !== String(otp).trim()) { sendError(res, 400, "Invalid verification code"); return; }
    pendingLoginTokens.delete(String(pendingToken));

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, pending.userId));
    if (!user || !user.isActive) { sendError(res, 401, "Account not found or inactive"); return; }

    let effectivePerms: string[] = (() => { try { return JSON.parse(user.permissions); } catch { return []; } })();
    if (user.customRoleId) {
      const [cRole] = await db.select().from(customRolesTable).where(eq(customRolesTable.id, user.customRoleId));
      if (cRole) { try { effectivePerms = JSON.parse(cRole.permissions); } catch {} }
    }

    const sessionId = crypto.randomUUID();
    const sessionUser: SessionUser = {
      id: user.id, username: user.username, displayName: user.displayName,
      email: user.email ?? null, phoneNumber: user.phoneNumber ?? null,
      role: user.role, permissions: effectivePerms, isActive: user.isActive,
      createdAt: user.createdAt.toISOString(), mustChangePassword: user.mustChangePassword ?? false,
      tenantId: pending.tenantId, isSuperAdmin: user.role === "super_admin",
    };
    await sessions.set(sessionId, sessionUser);
    res.setHeader("Set-Cookie", `pms_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
    res.json({ ok: true, user: sessionUser });
  } catch (err) {
    req.log.error({ err }, "POST /portal/auth/login-step2 failed");
    sendError(res, 500, "Login verification failed");
  }
});

// ── WebAuthn: check registered credentials ────────────────────────────────────
router.get("/portal/auth/webauthn/credentials", requireAuth, async (req, res) => {
  try {
    const su = (req as any).sessionUser as SessionUser;
    const result = await db.execute(sql`SELECT id, created_at FROM webauthn_credentials WHERE user_id = ${su.id}`);
    res.json({ credentials: result.rows, count: result.rows.length });
  } catch (err) {
    req.log.error({ err }, "GET /portal/auth/webauthn/credentials failed");
    sendError(res, 500, "Failed to fetch credentials");
  }
});

// ── WebAuthn: start registration ──────────────────────────────────────────────
router.post("/portal/auth/webauthn/register-options", requireAuth, async (req, res) => {
  try {
    const su = (req as any).sessionUser as SessionUser;
    const existingRes = await db.execute(sql`SELECT credential_id, transports FROM webauthn_credentials WHERE user_id = ${su.id}`);
    const existing = existingRes.rows as { credential_id: string; transports: string }[];

    const options = await generateRegistrationOptions({
      rpName: "Rakez Investor Portal",
      rpID,
      userName: su.username,
      userDisplayName: su.displayName,
      attestationType: "none",
      authenticatorSelection: { residentKey: "preferred", userVerification: "required", authenticatorAttachment: "platform" },
      excludeCredentials: existing.map(r => ({
        id: r.credential_id,
        transports: (() => { try { return JSON.parse(r.transports); } catch { return []; } })(),
      })),
    });

    waRegChallenges.set(su.id, { challenge: options.challenge, expiresAt: Date.now() + 5 * 60_000 });
    res.json(options);
  } catch (err) {
    req.log.error({ err }, "POST /portal/auth/webauthn/register-options failed");
    sendError(res, 500, "Failed to generate registration options");
  }
});

// ── WebAuthn: complete registration ───────────────────────────────────────────
router.post("/portal/auth/webauthn/register-verify", requireAuth, async (req, res) => {
  try {
    const su = (req as any).sessionUser as SessionUser;
    const ch = waRegChallenges.get(su.id);
    if (!ch || ch.expiresAt < Date.now()) { waRegChallenges.delete(su.id); sendError(res, 400, "Registration session expired"); return; }

    const verification = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge: ch.challenge,
      expectedOrigin: rpOrigin,
      expectedRPID: rpID,
    });
    if (!verification.verified || !verification.registrationInfo) { sendError(res, 400, "Registration verification failed"); return; }
    waRegChallenges.delete(su.id);

    const { credential } = verification.registrationInfo;
    await db.execute(sql`
      INSERT INTO webauthn_credentials (user_id, credential_id, public_key, counter, transports)
      VALUES (${su.id}, ${credential.id}, ${Buffer.from(credential.publicKey).toString("base64url")}, ${credential.counter}, ${JSON.stringify(credential.transports ?? [])})
      ON CONFLICT (credential_id) DO UPDATE SET public_key = EXCLUDED.public_key, counter = EXCLUDED.counter, transports = EXCLUDED.transports
    `);
    res.json({ ok: true, credentialId: credential.id });
  } catch (err) {
    req.log.error({ err }, "POST /portal/auth/webauthn/register-verify failed");
    sendError(res, 500, "Failed to verify registration");
  }
});

// ── WebAuthn: start authentication (public — no session required) ──────────────
router.post("/portal/auth/webauthn/authenticate-options", async (req, res) => {
  try {
    const { identifier } = req.body ?? {};
    if (!identifier) { sendError(res, 400, "identifier is required"); return; }

    const ident = String(identifier).trim().toLowerCase();
    const [user] = await db.select({ id: usersTable.id }).from(usersTable).where(
      and(eq(usersTable.isActive, true), or(eq(usersTable.username, ident), eq(usersTable.email, ident), eq(usersTable.phoneNumber, ident)))
    ).limit(1);

    const credsRes = user
      ? await db.execute(sql`SELECT credential_id, transports FROM webauthn_credentials WHERE user_id = ${user.id}`)
      : { rows: [] };
    const creds = credsRes.rows as { credential_id: string; transports: string }[];

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: creds.map(c => ({ id: c.credential_id, transports: (() => { try { return JSON.parse(c.transports); } catch { return []; } })() })),
      userVerification: "required",
    });

    const challengeKey = crypto.randomUUID();
    waAuthChallenges.set(challengeKey, { userId: user?.id ?? -1, challenge: options.challenge, expiresAt: Date.now() + 5 * 60_000 });
    res.json({ ...options, challengeKey });
  } catch (err) {
    req.log.error({ err }, "POST /portal/auth/webauthn/authenticate-options failed");
    sendError(res, 500, "Failed to generate authentication options");
  }
});

// ── WebAuthn: complete authentication — creates session ────────────────────────
router.post("/portal/auth/webauthn/authenticate-verify", async (req, res) => {
  try {
    const { challengeKey, ...authResponse } = req.body ?? {};
    if (!challengeKey) { sendError(res, 400, "challengeKey is required"); return; }

    const ch = waAuthChallenges.get(String(challengeKey));
    if (!ch || ch.expiresAt < Date.now()) { waAuthChallenges.delete(String(challengeKey)); sendError(res, 400, "Authentication session expired"); return; }
    waAuthChallenges.delete(String(challengeKey));

    if (ch.userId === -1) { sendError(res, 401, "No biometric credential found for this account"); return; }

    const credId = String(authResponse.id ?? authResponse.rawId);
    const credRes = await db.execute(sql`
      SELECT id, credential_id, public_key, counter, transports FROM webauthn_credentials
      WHERE credential_id = ${credId} AND user_id = ${ch.userId}
    `);
    const credRow = credRes.rows[0] as { id: number; credential_id: string; public_key: string; counter: number | bigint; transports: string } | undefined;
    if (!credRow) { sendError(res, 401, "Credential not found"); return; }

    const verification = await verifyAuthenticationResponse({
      response: authResponse,
      expectedChallenge: ch.challenge,
      expectedOrigin: rpOrigin,
      expectedRPID: rpID,
      credential: {
        id: credRow.credential_id,
        publicKey: Buffer.from(credRow.public_key, "base64url"),
        counter: Number(credRow.counter),
        transports: (() => { try { return JSON.parse(credRow.transports); } catch { return []; } })(),
      },
    });
    if (!verification.verified) { sendError(res, 401, "Biometric verification failed"); return; }

    await db.execute(sql`UPDATE webauthn_credentials SET counter = ${verification.authenticationInfo.newCounter} WHERE id = ${credRow.id}`);

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, ch.userId));
    if (!user || !user.isActive) { sendError(res, 401, "Account not found or inactive"); return; }

    let effectivePerms: string[] = (() => { try { return JSON.parse(user.permissions); } catch { return []; } })();
    if (user.customRoleId) {
      const [cRole] = await db.select().from(customRolesTable).where(eq(customRolesTable.id, user.customRoleId));
      if (cRole) { try { effectivePerms = JSON.parse(cRole.permissions); } catch {} }
    }

    const sessionId = crypto.randomUUID();
    const sessionUser: SessionUser = {
      id: user.id, username: user.username, displayName: user.displayName,
      email: user.email ?? null, phoneNumber: user.phoneNumber ?? null,
      role: user.role, permissions: effectivePerms, isActive: user.isActive,
      createdAt: user.createdAt.toISOString(), mustChangePassword: user.mustChangePassword ?? false,
      tenantId: user.tenantId ?? null, isSuperAdmin: user.role === "super_admin",
    };
    await sessions.set(sessionId, sessionUser);
    res.setHeader("Set-Cookie", `pms_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
    res.json({ ok: true, user: sessionUser });
  } catch (err) {
    req.log.error({ err }, "POST /portal/auth/webauthn/authenticate-verify failed");
    sendError(res, 500, "Biometric authentication failed");
  }
});

// ── Saved Searches ────────────────────────────────────────────────────────────

// GET /portal/saved-searches
router.get("/portal/saved-searches", requireAuth, async (req, res) => {
  try {
    const user = (req as any).sessionUser as SessionUser;
    const rows = await db
      .select()
      .from(savedSearchesTable)
      .where(eq(savedSearchesTable.userId, user.id))
      .orderBy(desc(savedSearchesTable.createdAt));

    // For each saved search, count matching active listings
    const withCounts = await Promise.all(rows.map(async (s) => {
      let criteria: Record<string, string> = {};
      try { criteria = JSON.parse(s.criteria); } catch { /* ignore */ }
      const conds: import("drizzle-orm").SQL[] = [eq(_listingsRef.status, "active")];
      if (criteria.propertyType) conds.push(eq(_listingsRef.propertyType, criteria.propertyType));
      if (criteria.listingType)  conds.push(eq(_listingsRef.listingType,  criteria.listingType));
      if (criteria.city)         conds.push(_ilike(_listingsRef.city, `%${criteria.city}%`));
      if (criteria.minPrice)     conds.push(_gte(_listingsRef.price, criteria.minPrice));
      if (criteria.maxPrice)     conds.push(_lte(_listingsRef.price, criteria.maxPrice));
      if (criteria.bedrooms)     conds.push(eq(_listingsRef.bedrooms, Number(criteria.bedrooms)));
      const [{ count }] = await db.select({ count: sql`count(*)::int` }).from(_listingsRef).where(and(...conds));
      return { ...s, criteria, matchCount: Number(count) };
    }));

    sendSuccess(res, withCounts);
  } catch (err) {
    req.log.error({ err }, "GET /portal/saved-searches failed");
    sendError(res, 500, "Failed to fetch saved searches");
  }
});

// POST /portal/saved-searches
router.post("/portal/saved-searches", requireAuth, async (req, res) => {
  try {
    const user = (req as any).sessionUser as SessionUser;
    const { name, criteria, notifyEmail } = req.body as {
      name: string;
      criteria: Record<string, string | number | undefined>;
      notifyEmail?: boolean;
    };
    if (!name || typeof name !== "string" || !name.trim()) {
      sendError(res, 400, "name is required");
      return;
    }
    const [row] = await db.insert(savedSearchesTable).values({
      userId:      user.id,
      tenantId:    user.tenantId ?? 1,
      name:        name.trim().slice(0, 120),
      criteria:    JSON.stringify(criteria ?? {}),
      notifyEmail: notifyEmail !== false,
    }).returning();
    sendSuccess(res, row, undefined, 201);
  } catch (err) {
    req.log.error({ err }, "POST /portal/saved-searches failed");
    sendError(res, 500, "Failed to save search");
  }
});

// PATCH /portal/saved-searches/:id — toggle notifyEmail
router.patch("/portal/saved-searches/:id", requireAuth, async (req, res) => {
  try {
    const user = (req as any).sessionUser as SessionUser;
    const id   = parseInt(req.params.id as string, 10);
    const { notifyEmail } = req.body as { notifyEmail: boolean };
    const [row] = await db
      .update(savedSearchesTable)
      .set({ notifyEmail })
      .where(and(eq(savedSearchesTable.id, id), eq(savedSearchesTable.userId, user.id)))
      .returning();
    if (!row) { sendError(res, 404, "Not found"); return; }
    sendSuccess(res, row);
  } catch (err) {
    req.log.error({ err }, "PATCH /portal/saved-searches/:id failed");
    sendError(res, 500, "Failed to update");
  }
});

// DELETE /portal/saved-searches/:id
router.delete("/portal/saved-searches/:id", requireAuth, async (req, res) => {
  try {
    const user = (req as any).sessionUser as SessionUser;
    const id   = parseInt(req.params.id as string, 10);
    await db
      .delete(savedSearchesTable)
      .where(and(eq(savedSearchesTable.id, id), eq(savedSearchesTable.userId, user.id)));
    res.status(204).end();
  } catch (err) {
    req.log.error({ err }, "DELETE /portal/saved-searches/:id failed");
    sendError(res, 500, "Failed to delete");
  }
});

// GET /portal/buyer-dashboard — aggregate: saved searches + inquiry history
router.get("/portal/buyer-dashboard", requireAuth, async (req, res) => {
  try {
    const user = (req as any).sessionUser as SessionUser;

    const savedSearchRows = await db
      .select()
      .from(savedSearchesTable)
      .where(eq(savedSearchesTable.userId, user.id))
      .orderBy(desc(savedSearchesTable.createdAt));

    const savedSearches = await Promise.all(savedSearchRows.map(async (s) => {
      let criteria: Record<string, string> = {};
      try { criteria = JSON.parse(s.criteria); } catch { /* ignore */ }
      const conds: import("drizzle-orm").SQL[] = [eq(_listingsRef.status, "active")];
      if (criteria.propertyType) conds.push(eq(_listingsRef.propertyType, criteria.propertyType));
      if (criteria.listingType)  conds.push(eq(_listingsRef.listingType,  criteria.listingType));
      if (criteria.city)         conds.push(_ilike(_listingsRef.city, `%${criteria.city}%`));
      if (criteria.bedrooms)     conds.push(eq(_listingsRef.bedrooms, Number(criteria.bedrooms)));
      const [{ count }] = await db.select({ count: sql`count(*)::int` }).from(_listingsRef).where(and(...conds));
      return { ...s, criteria, matchCount: Number(count) };
    }));

    const recentInquiries = await db
      .select()
      .from(listingInquiriesTable)
      .where(eq(listingInquiriesTable.email, (user as any).email ?? "__no_email__"))
      .orderBy(desc(listingInquiriesTable.createdAt))
      .limit(10);

    const [{ total }] = await db
      .select({ total: sql`count(*)::int` })
      .from(listingInquiriesTable)
      .where(eq(listingInquiriesTable.email, (user as any).email ?? "__no_email__"));

    sendSuccess(res, {
      savedSearches,
      totalInquiries: Number(total),
      recentInquiries,
    });
  } catch (err) {
    req.log.error({ err }, "GET /portal/buyer-dashboard failed");
    sendError(res, 500, "Failed to fetch buyer dashboard");
  }
});

export default router;
