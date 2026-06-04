import { Router } from "express";
import { randomUUID } from "crypto";
import {
  db,
  usersTable,
  propertiesTable,
  bookingsTable,
  expensesTable,
  roomsTable,
} from "@workspace/db";
import { eq, desc, and, ne, inArray, sql } from "drizzle-orm";
import { sessions, verifyPwd } from "./auth.js";
import type { SessionUser } from "../types.js";

const router = Router();

// ── Token extraction (Bearer prefix) ─────────────────────────────────────────
function extractPortalToken(
  req: { headers: Record<string, string | string[] | undefined> },
): string | null {
  const auth = req.headers["x-portal-token"];
  if (auth && typeof auth === "string") return auth;
  return null;
}

async function requirePortalAuth(req: any, res: any, next: any): Promise<void> {
  const token = extractPortalToken(req);
  if (!token) {
    res.status(401).json({ error: "Portal auth token required" });
    return;
  }
  const session = await sessions.get(token);
  if (!session) {
    res.status(401).json({ error: "Invalid or expired portal token" });
    return;
  }
  req.portalSession = session;
  next();
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /rkz/portal/auth/login
// Validates PMS credentials (same usersTable as web portal) and returns a
// session token the mobile app can use as X-Portal-Token header.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/rkz/portal/auth/login", async (req, res) => {
  const { username, password } = (req.body ?? {}) as Record<string, unknown>;

  if (!username || !password || typeof username !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "username and password are required" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, username.trim().toLowerCase()))
    .limit(1);

  if (!user || !user.isActive) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const { valid } = verifyPwd(user.passwordHash, password);
  if (!valid) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const sessionId = randomUUID();
  const sessionUser: SessionUser = {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    email: user.email ?? null,
    phoneNumber: user.phoneNumber ?? null,
    role: user.role,
    permissions: [],
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    mustChangePassword: user.mustChangePassword ?? false,
    tenantId: user.tenantId ?? null,
    isSuperAdmin: !user.tenantId,
  };

  await sessions.set(sessionId, sessionUser);

  res.json({
    token: sessionId,
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /rkz/portal/auth/me
// ─────────────────────────────────────────────────────────────────────────────
router.get("/rkz/portal/auth/me", requirePortalAuth, (req: any, res) => {
  const s = req.portalSession as SessionUser;
  res.json({
    id: s.id,
    username: s.username,
    displayName: s.displayName,
    role: s.role,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /rkz/portal/auth/logout
// ─────────────────────────────────────────────────────────────────────────────
router.post("/rkz/portal/auth/logout", requirePortalAuth, async (req: any, res) => {
  const token = extractPortalToken(req)!;
  await sessions.delete(token);
  res.json({ ok: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /rkz/portal/summary
// Returns KPIs + recent bookings scoped to the authenticated user's tenant.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/rkz/portal/summary", requirePortalAuth, async (req: any, res) => {
  try {
    const session   = req.portalSession as SessionUser;
    const tenantId  = session.tenantId;

    // ── Properties ────────────────────────────────────────────────────────
    const propCond = tenantId !== null ? eq(propertiesTable.tenantId, tenantId) : undefined;
    const props    = await db
      .select({ id: propertiesTable.id, name: propertiesTable.name, type: propertiesTable.type })
      .from(propertiesTable)
      .where(propCond);

    const propIds = props.map((p) => p.id);

    if (propIds.length === 0) {
      res.json({
        user: { id: session.id, username: session.username, displayName: session.displayName, role: session.role },
        stats: {
          totalRevenue: 0, totalExpenses: 0, netProfit: 0,
          activeBookings: 0, totalProperties: 0, occupancyRate: 0,
        },
        recentBookings: [],
        properties: [],
      });
      return;
    }

    // ── Revenue (non-cancelled bookings in last 12 months) ────────────────
    const [revenueRow] = await db
      .select({ total: sql<number>`coalesce(sum(${bookingsTable.totalAmount})::float, 0)` })
      .from(bookingsTable)
      .innerJoin(roomsTable, eq(bookingsTable.roomId, roomsTable.id))
      .where(
        and(
          inArray(roomsTable.propertyId, propIds),
          ne(bookingsTable.status, "cancelled"),
          sql`${bookingsTable.checkIn}::date >= (now() - interval '12 months')::date`,
        ),
      );

    // ── Expenses (last 12 months) ──────────────────────────────────────────
    const [expenseRow] = await db
      .select({ total: sql<number>`coalesce(sum(${expensesTable.amount})::float, 0)` })
      .from(expensesTable)
      .where(
        and(
          inArray(expensesTable.propertyId, propIds),
          sql`${expensesTable.expenseDate}::date >= (now() - interval '12 months')::date`,
        ),
      );

    // ── Active bookings count ─────────────────────────────────────────────
    const [activeRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(bookingsTable)
      .innerJoin(roomsTable, eq(bookingsTable.roomId, roomsTable.id))
      .where(
        and(
          inArray(roomsTable.propertyId, propIds),
          sql`${bookingsTable.status} IN ('confirmed', 'checked_in')`,
        ),
      );

    // ── Total rooms for occupancy rate ────────────────────────────────────
    const [roomRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(roomsTable)
      .where(inArray(roomsTable.propertyId, propIds));

    // ── Recent bookings (last 8) ───────────────────────────────────────────
    const recentRows = await db
      .select({
        id:           bookingsTable.id,
        guestName:    bookingsTable.guestName,
        checkIn:      bookingsTable.checkIn,
        checkOut:     bookingsTable.checkOut,
        status:       bookingsTable.status,
        totalAmount:  bookingsTable.totalAmount,
        roomName:     roomsTable.name,
        propertyName: propertiesTable.name,
      })
      .from(bookingsTable)
      .innerJoin(roomsTable,      eq(bookingsTable.roomId,    roomsTable.id))
      .innerJoin(propertiesTable, eq(roomsTable.propertyId,   propertiesTable.id))
      .where(inArray(roomsTable.propertyId, propIds))
      .orderBy(desc(bookingsTable.checkIn))
      .limit(8);

    const totalRevenue  = Math.round(revenueRow?.total ?? 0);
    const totalExpenses = Math.round(expenseRow?.total ?? 0);
    const netProfit     = totalRevenue - totalExpenses;
    const activeCount   = activeRow?.count ?? 0;
    const roomCount     = roomRow?.count ?? 1;
    const occupancyRate = Math.round((activeCount / roomCount) * 100);

    res.json({
      user: {
        id: session.id,
        username: session.username,
        displayName: session.displayName,
        role: session.role,
      },
      stats: {
        totalRevenue,
        totalExpenses,
        netProfit,
        activeBookings: activeCount,
        totalProperties: props.length,
        occupancyRate: Math.min(occupancyRate, 100),
      },
      recentBookings: recentRows.map((r) => ({
        id:           r.id,
        guestName:    r.guestName ?? "Guest",
        checkIn:      String(r.checkIn),
        checkOut:     String(r.checkOut),
        status:       r.status,
        totalAmount:  r.totalAmount ? Number(r.totalAmount) : null,
        roomName:     r.roomName ?? "—",
        propertyName: r.propertyName ?? "—",
      })),
      properties: props.map((p) => ({ id: p.id, name: p.name, type: p.type })),
    });
  } catch (err) {
    req.log?.error({ err }, "GET /rkz/portal/summary failed");
    res.status(500).json({ error: "Failed to fetch portal summary" });
  }
});

export default router;
