import { Router } from "express";
import { db, listingsTable, listingInquiriesTable } from "@workspace/db";
import { insertListingSchema, updateListingSchema, insertInquirySchema } from "@workspace/db";
import { eq, and, or, ilike, gte, lte, sql, desc } from "drizzle-orm";
import { sendSuccess, sendError, parsePagination, buildMeta } from "../utils/response.js";
import { listingsCache, TTL, queryCacheKey } from "../utils/cache.js";

const router = Router();

function tid(req: import("express").Request): number | null {
  return ((req as any).sessionUser as any)?.tenantId ?? null;
}

// ── Public endpoints (no auth required) ──────────────────────────────────────

// GET /listings — paginated, filterable, searchable
router.get("/listings", async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
    const {
      q, type, status = "active", minPrice, maxPrice,
      propertyType, city, featured, propertyId,
    } = req.query as Record<string, string>;

    const tenantId = tid(req);

    // ── Cache lookup ─────────────────────────────────────────────────────────
    const cacheKey = queryCacheKey("list", { ...req.query, _tid: tenantId });
    const cached = listingsCache.get<{ data: unknown; meta: unknown }>(cacheKey);
    if (cached) {
      sendSuccess(res, cached.data, cached.meta as import("../utils/response.js").ApiMeta);
      return;
    }

    const conds: import("drizzle-orm").SQL[] = [];

    if (tenantId !== null) conds.push(eq(listingsTable.tenantId, tenantId));
    if (status)            conds.push(eq(listingsTable.status, status));
    if (type)              conds.push(eq(listingsTable.listingType, type));
    if (propertyType)      conds.push(eq(listingsTable.propertyType, propertyType));
    if (city)              conds.push(ilike(listingsTable.city, `%${city}%`));
    if (featured === "true") conds.push(eq(listingsTable.featured, true));
    if (propertyId)        conds.push(eq(listingsTable.propertyId, parseInt(propertyId)));
    if (minPrice)          conds.push(gte(listingsTable.price, minPrice));
    if (maxPrice)          conds.push(lte(listingsTable.price, maxPrice));
    if (q) {
      conds.push(
        or(
          ilike(listingsTable.title,   `%${q}%`),
          ilike(listingsTable.address, `%${q}%`),
          ilike(listingsTable.city,    `%${q}%`),
          ilike(listingsTable.district,`%${q}%`),
        )!
      );
    }

    const where = conds.length ? and(...conds) : undefined;

    const [countRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(listingsTable)
      .where(where);

    const rows = await db
      .select()
      .from(listingsTable)
      .where(where)
      .orderBy(desc(listingsTable.featured), desc(listingsTable.createdAt))
      .limit(limit)
      .offset(offset);

    const total = countRow?.total ?? 0;
    const data  = rows.map(formatListing);
    const meta  = buildMeta(total, page, limit);

    listingsCache.set(cacheKey, { data, meta }, TTL.LISTINGS_LIST);
    sendSuccess(res, data, meta);
  } catch (err) {
    req.log?.error({ err }, "GET /listings failed");
    sendError(res, 500, "Failed to fetch listings");
  }
});

// GET /listings/:id — single listing, increments view count
router.get("/listings/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { sendError(res, 400, "Invalid listing id"); return; }

    const tenantId = tid(req);

    // ── Cache lookup ─────────────────────────────────────────────────────────
    const cacheKey = `item:${id}:${tenantId ?? "pub"}`;
    const cached = listingsCache.get<unknown>(cacheKey);
    if (cached) {
      sendSuccess(res, cached);
      // Still increment view count even on cache hit (fire-and-forget)
      db.update(listingsTable)
        .set({ viewCount: sql`${listingsTable.viewCount} + 1` })
        .where(eq(listingsTable.id, id))
        .catch(() => {});
      return;
    }

    const conds = [eq(listingsTable.id, id)];
    if (tenantId !== null) conds.push(eq(listingsTable.tenantId, tenantId));

    const [listing] = await db.select().from(listingsTable).where(and(...conds));
    if (!listing) { sendError(res, 404, "Listing not found"); return; }

    // Increment view count (fire-and-forget)
    db.update(listingsTable)
      .set({ viewCount: sql`${listingsTable.viewCount} + 1` })
      .where(eq(listingsTable.id, id))
      .catch(() => {});

    const data = formatListing(listing);
    listingsCache.set(cacheKey, data, TTL.LISTINGS_ITEM);
    sendSuccess(res, data);
  } catch (err) {
    req.log?.error({ err }, "GET /listings/:id failed");
    sendError(res, 500, "Failed to fetch listing");
  }
});

// POST /listings/inquiry — public lead capture (no auth)
router.post("/listings/inquiry", async (req, res) => {
  try {
    const tenantId = tid(req) ?? 1;
    const parsed = insertInquirySchema.safeParse({ ...req.body, tenantId });
    if (!parsed.success) {
      sendError(res, 400, parsed.error.message);
      return;
    }
    const [inquiry] = await db.insert(listingInquiriesTable).values(parsed.data).returning();
    sendSuccess(res, inquiry, undefined, 201);
  } catch (err) {
    req.log?.error({ err }, "POST /listings/inquiry failed");
    sendError(res, 500, "Failed to submit inquiry");
  }
});

// ── Protected endpoints (auth required, manager/admin) ───────────────────────

// POST /listings
router.post("/listings", async (req, res) => {
  try {
    const tenantId = tid(req) ?? 1;
    const parsed = insertListingSchema.safeParse({ ...req.body, tenantId });
    if (!parsed.success) {
      sendError(res, 400, parsed.error.message);
      return;
    }
    const [listing] = await db.insert(listingsTable).values(parsed.data).returning();
    listingsCache.invalidatePrefix("list:");
    sendSuccess(res, formatListing(listing), undefined, 201);
  } catch (err) {
    req.log?.error({ err }, "POST /listings failed");
    sendError(res, 500, "Failed to create listing");
  }
});

// PATCH /listings/:id
router.patch("/listings/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { sendError(res, 400, "Invalid listing id"); return; }

    const tenantId = tid(req);
    const parsed = updateListingSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, parsed.error.message);
      return;
    }

    const conds = [eq(listingsTable.id, id)];
    if (tenantId !== null) conds.push(eq(listingsTable.tenantId, tenantId));

    const [listing] = await db
      .update(listingsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(and(...conds))
      .returning();

    if (!listing) { sendError(res, 404, "Listing not found"); return; }
    listingsCache.invalidatePrefix("list:");
    listingsCache.invalidatePrefix(`item:${id}:`);
    sendSuccess(res, formatListing(listing));
  } catch (err) {
    req.log?.error({ err }, "PATCH /listings/:id failed");
    sendError(res, 500, "Failed to update listing");
  }
});

// DELETE /listings/:id
router.delete("/listings/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { sendError(res, 400, "Invalid listing id"); return; }

    const tenantId = tid(req);
    const conds = [eq(listingsTable.id, id)];
    if (tenantId !== null) conds.push(eq(listingsTable.tenantId, tenantId));

    await db.delete(listingsTable).where(and(...conds));
    listingsCache.invalidatePrefix("list:");
    listingsCache.invalidatePrefix(`item:${id}:`);
    sendSuccess(res, { deleted: true });
  } catch (err) {
    req.log?.error({ err }, "DELETE /listings/:id failed");
    sendError(res, 500, "Failed to delete listing");
  }
});

// GET /listings/inquiries — list inquiries for tenant (admin only)
router.get("/listings/inquiries", async (req, res) => {
  try {
    const tenantId = tid(req);
    const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);

    const conds = tenantId !== null ? [eq(listingInquiriesTable.tenantId, tenantId)] : [];

    const [countRow] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(listingInquiriesTable)
      .where(conds.length ? and(...conds) : undefined);

    const rows = await db
      .select()
      .from(listingInquiriesTable)
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(listingInquiriesTable.createdAt))
      .limit(limit)
      .offset(offset);

    sendSuccess(res, rows, buildMeta(countRow?.total ?? 0, page, limit));
  } catch (err) {
    req.log?.error({ err }, "GET /listings/inquiries failed");
    sendError(res, 500, "Failed to fetch inquiries");
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatListing(l: typeof listingsTable.$inferSelect) {
  return {
    ...l,
    amenities: parseJsonSafe(l.amenities, []),
    media:     parseJsonSafe(l.media, []),
    price:     l.price     ? Number(l.price)   : null,
    areaSqm:   l.areaSqm   ? Number(l.areaSqm) : null,
    lat:       l.lat       ? Number(l.lat)      : null,
    lng:       l.lng       ? Number(l.lng)      : null,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  };
}

function parseJsonSafe<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try { return JSON.parse(str) as T; } catch { return fallback; }
}

export default router;
