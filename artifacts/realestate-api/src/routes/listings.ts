import { Router } from "express";
import { db, listingsTable, listingInquiriesTable } from "@workspace/db";
import { insertListingSchema, updateListingSchema, insertInquirySchema } from "@workspace/db";
import { eq, and, or, ilike, gte, lte, sql, desc } from "drizzle-orm";
import { sendSuccess, sendError, parsePagination, buildMeta } from "../utils/response.js";
import { listingsCache, TTL, queryCacheKey } from "../utils/cache.js";

const router = Router();

function parseJsonSafe<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try { return JSON.parse(str) as T; } catch { return fallback; }
}

function formatListing(l: typeof listingsTable.$inferSelect) {
  return {
    ...l,
    amenities: parseJsonSafe(l.amenities, []),
    media:     parseJsonSafe(l.media, []),
    price:     l.price   ? Number(l.price)   : null,
    areaSqm:   l.areaSqm ? Number(l.areaSqm) : null,
    lat:       l.lat     ? Number(l.lat)     : null,
    lng:       l.lng     ? Number(l.lng)     : null,
    createdAt: l.createdAt.toISOString(),
    updatedAt: l.updatedAt.toISOString(),
  };
}

// ── Public ────────────────────────────────────────────────────────────────────

router.get("/listings", async (req, res) => {
  try {
    const { page, limit, offset } = parsePagination(req.query as Record<string, unknown>);
    const { q, type, status = "active", minPrice, maxPrice, propertyType, city, featured, propertyId } =
      req.query as Record<string, string>;

    const cacheKey = queryCacheKey("list", req.query);
    const cached = listingsCache.get<{ data: unknown; meta: unknown }>(cacheKey);
    if (cached) { res.set("X-Cache", "HIT"); sendSuccess(res, cached.data, cached.meta as any); return; }
    res.set("X-Cache", "MISS");

    const conds: import("drizzle-orm").SQL[] = [];
    if (status)           conds.push(eq(listingsTable.status, status));
    if (type)             conds.push(eq(listingsTable.listingType, type));
    if (propertyType)     conds.push(eq(listingsTable.propertyType, propertyType));
    if (city)             conds.push(ilike(listingsTable.city, `%${city}%`));
    if (featured === "true") conds.push(eq(listingsTable.featured, true));
    if (propertyId)       conds.push(eq(listingsTable.propertyId, parseInt(propertyId)));
    if (minPrice)         conds.push(gte(listingsTable.price, minPrice));
    if (maxPrice)         conds.push(lte(listingsTable.price, maxPrice));
    if (q) {
      conds.push(or(
        ilike(listingsTable.title,    `%${q}%`),
        ilike(listingsTable.address,  `%${q}%`),
        ilike(listingsTable.city,     `%${q}%`),
        ilike(listingsTable.district, `%${q}%`),
      )!);
    }

    const where = conds.length ? and(...conds) : undefined;
    const [countRow] = await db.select({ total: sql<number>`count(*)::int` }).from(listingsTable).where(where);
    const rows = await db.select().from(listingsTable).where(where)
      .orderBy(desc(listingsTable.featured), desc(listingsTable.createdAt))
      .limit(limit).offset(offset);

    const total = countRow?.total ?? 0;
    const data  = rows.map(formatListing);
    const meta  = buildMeta(total, page, limit);
    listingsCache.set(cacheKey, { data, meta }, TTL.LISTINGS_LIST);
    res.set("Cache-Control", "public, max-age=60, s-maxage=120, stale-while-revalidate=30");
    sendSuccess(res, data, meta);
  } catch (err) {
    req.log?.error({ err }, "GET /listings failed");
    sendError(res, 500, "Failed to fetch listings");
  }
});

router.get("/listings/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) { sendError(res, 400, "Invalid listing id"); return; }

    const cacheKey = `item:${id}`;
    const cached = listingsCache.get<unknown>(cacheKey);
    if (cached) {
      res.set("X-Cache", "HIT"); sendSuccess(res, cached);
      db.update(listingsTable).set({ viewCount: sql`${listingsTable.viewCount} + 1` }).where(eq(listingsTable.id, id)).catch(() => {});
      return;
    }
    res.set("X-Cache", "MISS");

    const [listing] = await db.select().from(listingsTable).where(eq(listingsTable.id, id));
    if (!listing) { sendError(res, 404, "Listing not found"); return; }
    db.update(listingsTable).set({ viewCount: sql`${listingsTable.viewCount} + 1` }).where(eq(listingsTable.id, id)).catch(() => {});
    const data = formatListing(listing);
    listingsCache.set(cacheKey, data, TTL.LISTINGS_ITEM);
    res.set("Cache-Control", "public, max-age=60, s-maxage=120, stale-while-revalidate=30");
    sendSuccess(res, data);
  } catch (err) {
    req.log?.error({ err }, "GET /listings/:id failed");
    sendError(res, 500, "Failed to fetch listing");
  }
});

router.post("/listings/inquiry", async (req, res) => {
  try {
    const parsed = insertInquirySchema.safeParse({ ...req.body, tenantId: 1 });
    if (!parsed.success) { sendError(res, 400, parsed.error.message); return; }
    const [inquiry] = await db.insert(listingInquiriesTable).values(parsed.data).returning();
    sendSuccess(res, inquiry, undefined, 201);
  } catch (err) {
    req.log?.error({ err }, "POST /listings/inquiry failed");
    sendError(res, 500, "Failed to submit inquiry");
  }
});

export default router;
