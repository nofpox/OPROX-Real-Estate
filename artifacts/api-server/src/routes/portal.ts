import { Router, type Request, type Response, type NextFunction } from "express";
import {
  db,
  propertiesTable,
  bookingsTable,
  roomsTable,
  listingsTable,
  expensesTable,
} from "@workspace/db";
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

// ── Cache-Control helper for authenticated portal responses ────────────────────
// Data is user-specific so we tell CDNs not to cache; the server-side
// in-memory cache handles repeat requests within the TTL window.
function setPrivateCache(res: Response): void {
  res.set("Cache-Control", "private, no-cache, must-revalidate");
}

// ── GET /portal/properties — managed properties with live occupancy stats ──────
router.get("/portal/properties", requireAuth, async (req, res) => {
  try {
    const tenantId = tid(req);
    const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);

    const cacheKey = `props:${tenantId ?? "all"}:${page}:${limit}`;
    const cached = portalCache.get<{ data: unknown; meta: unknown }>(cacheKey);
    if (cached) {
      setPrivateCache(res);
      sendSuccess(res, cached.data, cached.meta as import("../utils/response.js").ApiMeta);
      return;
    }

    const conds = tenantId !== null ? [eq(propertiesTable.tenantId, tenantId)] : [];
    const where = conds.length ? and(...conds) : undefined;

    const [countRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(propertiesTable)
      .where(where);

    const properties = await db
      .select()
      .from(propertiesTable)
      .where(where)
      .orderBy(desc(propertiesTable.createdAt))
      .limit(limit)
      .offset(offset);

    const enriched = await Promise.all(
      properties.map(async (property) => {
        const [roomStats] = await db
          .select({ totalRooms: sql<number>`count(*)::int` })
          .from(roomsTable)
          .where(eq(roomsTable.propertyId, property.id));

        const [bookingStats] = await db
          .select({ activeBookings: sql<number>`count(*)::int` })
          .from(bookingsTable)
          .innerJoin(roomsTable, eq(bookingsTable.roomId, roomsTable.id))
          .where(
            and(
              eq(roomsTable.propertyId, property.id),
              sql`${bookingsTable.status} IN ('confirmed', 'checked_in')`,
            ),
          );

        const totalRooms     = roomStats?.totalRooms     ?? 0;
        const activeBookings = bookingStats?.activeBookings ?? 0;
        const occupancyRate  = totalRooms > 0 ? Math.round((activeBookings / totalRooms) * 100) : 0;

        const [linked] = await db
          .select({ id: listingsTable.id })
          .from(listingsTable)
          .where(
            and(
              eq(listingsTable.propertyId, property.id),
              eq(listingsTable.status, "active"),
            ),
          )
          .limit(1);

        return {
          id:              property.id,
          name:            property.name,
          type:            property.type,
          status:          property.status,
          address:         property.address ?? "",
          totalRooms,
          activeBookings,
          occupancyRate,
          linkedListingId: linked?.id ?? null,
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

// ── GET /portal/bookings — bookings across tenant's properties ─────────────────
router.get("/portal/bookings", requireAuth, async (req, res) => {
  try {
    const tenantId = tid(req);
    const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
    const { propertyId, status } = req.query as Record<string, string>;

    // ── Cache lookup ──────────────────────────────────────────────────────────
    const cacheKey = `bkgs:${tenantId ?? "all"}:${propertyId ?? "all"}:${status ?? "all"}:${page}:${limit}`;
    const cached = portalCache.get<{ data: unknown; meta: unknown }>(cacheKey);
    if (cached) {
      setPrivateCache(res);
      sendSuccess(res, cached.data, cached.meta as import("../utils/response.js").ApiMeta);
      return;
    }

    // Filter by propertyId goes through rooms join (bookings have no direct propertyId)
    const conds: import("drizzle-orm").SQL[] = [];
    if (tenantId !== null) conds.push(eq(bookingsTable.tenantId, tenantId));
    if (propertyId)        conds.push(eq(roomsTable.propertyId, parseInt(propertyId)));
    if (status)            conds.push(eq(bookingsTable.status, status));

    const where = conds.length ? and(...conds) : undefined;

    // Count also needs the rooms join for propertyId filter to work
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

// ── GET /portal/availability — available rooms for a property + date range ─────
router.get("/portal/availability", requireAuth, async (req, res) => {
  try {
    const { propertyId, checkIn, checkOut } = req.query as Record<string, string>;
    if (!propertyId || !checkIn || !checkOut) {
      sendError(res, 400, "propertyId, checkIn and checkOut are required");
      return;
    }
    const propId = parseInt(propertyId, 10);
    if (isNaN(propId)) { sendError(res, 400, "propertyId must be an integer"); return; }

    // ── Cache lookup ──────────────────────────────────────────────────────────
    const cacheKey = availKey(propId, checkIn, checkOut);
    const cached   = availabilityCache.get<unknown[]>(cacheKey);
    if (cached) {
      setPrivateCache(res);
      sendSuccess(res, cached);
      return;
    }

    // All rooms for this property
    const allRooms = await db
      .select()
      .from(roomsTable)
      .where(eq(roomsTable.propertyId, propId));

    // Rooms with an overlapping active booking
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

// ── GET /portal/financials — monthly revenue vs expenses for managed properties ─
router.get("/portal/financials", requireAuth, async (req, res) => {
  try {
    const tenantId   = tid(req);
    const { propertyId } = req.query as Record<string, string>;
    const months     = Math.min(24, Math.max(1, parseInt((req.query.months as string) || "6") || 6));

    // ── Cache lookup ──────────────────────────────────────────────────────────
    const cacheKey = financialsKey(tenantId, propertyId, months);
    const cached   = portalCache.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      setPrivateCache(res);
      sendSuccess(res, cached);
      return;
    }

    // Resolve property IDs scoped to this tenant
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

    // Monthly expenses grouped by YYYY-MM
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

    // Monthly revenue from non-cancelled bookings
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

    // Merge into a single month map
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

export default router;
