import { Router, type Request, type Response, type NextFunction } from "express";
import {
  db,
  propertiesTable,
  bookingsTable,
  roomsTable,
  guestsTable,
  listingsTable,
} from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { sendSuccess, sendError, parsePagination, buildMeta } from "../utils/response.js";

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

// GET /portal/properties — managed properties with live occupancy stats
router.get("/portal/properties", requireAuth, async (req, res) => {
  try {
    const tenantId = tid(req);
    const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);

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
          .where(
            and(
              eq(bookingsTable.propertyId, property.id),
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

    sendSuccess(res, enriched, buildMeta(countRow?.total ?? 0, page, limit));
  } catch (err) {
    req.log?.error({ err }, "GET /portal/properties failed");
    sendError(res, 500, "Failed to fetch portal properties");
  }
});

// GET /portal/bookings — bookings across tenant's properties
router.get("/portal/bookings", requireAuth, async (req, res) => {
  try {
    const tenantId = tid(req);
    const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
    const { propertyId, status } = req.query as Record<string, string>;

    const conds: import("drizzle-orm").SQL[] = [];
    if (tenantId !== null) conds.push(eq(bookingsTable.tenantId, tenantId));
    if (propertyId)        conds.push(eq(bookingsTable.propertyId, parseInt(propertyId)));
    if (status)            conds.push(eq(bookingsTable.status, status));

    const where = conds.length ? and(...conds) : undefined;

    const [countRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(bookingsTable)
      .where(where);

    const rows = await db
      .select({
        id:           bookingsTable.id,
        checkIn:      bookingsTable.checkIn,
        checkOut:     bookingsTable.checkOut,
        status:       bookingsTable.status,
        totalAmount:  bookingsTable.totalAmount,
        propertyId:   bookingsTable.propertyId,
        roomNumber:   roomsTable.roomNumber,
        propertyName: propertiesTable.name,
        guestName:    guestsTable.name,
      })
      .from(bookingsTable)
      .leftJoin(roomsTable,      eq(bookingsTable.roomId,     roomsTable.id))
      .leftJoin(propertiesTable, eq(bookingsTable.propertyId, propertiesTable.id))
      .leftJoin(guestsTable,     eq(bookingsTable.guestId,    guestsTable.id))
      .where(where)
      .orderBy(desc(bookingsTable.checkIn))
      .limit(limit)
      .offset(offset);

    const formatted = rows.map((r) => ({
      id:           r.id,
      guestName:    r.guestName ?? "Guest",
      checkIn:      r.checkIn instanceof Date ? r.checkIn.toISOString() : String(r.checkIn),
      checkOut:     r.checkOut instanceof Date ? r.checkOut.toISOString() : String(r.checkOut),
      status:       r.status,
      roomNumber:   r.roomNumber ?? "—",
      propertyName: r.propertyName ?? "—",
      propertyId:   r.propertyId,
      totalAmount:  r.totalAmount ? Number(r.totalAmount) : null,
    }));

    sendSuccess(res, formatted, buildMeta(countRow?.total ?? 0, page, limit));
  } catch (err) {
    req.log?.error({ err }, "GET /portal/bookings failed");
    sendError(res, 500, "Failed to fetch portal bookings");
  }
});

export default router;
