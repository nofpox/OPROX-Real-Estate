import { Router } from "express";
import { db, rkzListingsTable } from "@workspace/db";
import { eq, desc, and, sql } from "drizzle-orm";
import { requireRkzAuth } from "./rkz-auth.js";

const router = Router();

function parseJson<T>(raw: string | null | undefined, fallback: T): T {
  try { return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
}

function formatListing(row: typeof rkzListingsTable.$inferSelect) {
  return {
    ...row,
    price: Number(row.price),
    area:  row.area  != null ? Number(row.area)  : undefined,
    lat:   row.lat   != null ? Number(row.lat)   : undefined,
    lng:   row.lng   != null ? Number(row.lng)   : undefined,
    photos:    parseJson<string[]>(row.photos,   []),
    platforms: parseJson<unknown[]>(row.platforms, []),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /rkz/public/listings  — public, no auth required
// Returns all published listings (for the company website)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/rkz/public/listings", async (req, res) => {
  const { type, city, minPrice, maxPrice, page = "1", limit = "20" } = req.query as Record<string, string>;

  const pageNum  = Math.max(1, parseInt(page,  10) || 1);
  const limitNum = Math.min(50, parseInt(limit, 10) || 20);
  const offset   = (pageNum - 1) * limitNum;

  const conditions = [eq(rkzListingsTable.status, "published")];
  if (type) conditions.push(eq(rkzListingsTable.type, type));
  if (city) conditions.push(sql`lower(${rkzListingsTable.city}) LIKE lower(${"%" + city + "%"})`);
  if (minPrice) conditions.push(sql`${rkzListingsTable.price} >= ${Number(minPrice)}`);
  if (maxPrice) conditions.push(sql`${rkzListingsTable.price} <= ${Number(maxPrice)}`);

  const rows = await db
    .select()
    .from(rkzListingsTable)
    .where(and(...conditions))
    .orderBy(desc(rkzListingsTable.publishedAt))
    .limit(limitNum)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(rkzListingsTable)
    .where(and(...conditions));

  res.json({
    data: rows.map(formatListing),
    meta: { total: count, page: pageNum, limit: limitNum, pages: Math.ceil(count / limitNum) },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// All routes below require RKZ auth
// ─────────────────────────────────────────────────────────────────────────────

// GET /rkz/listings  — listings for the authenticated user
router.get("/rkz/listings", requireRkzAuth, async (req: any, res) => {
  const rows = await db
    .select()
    .from(rkzListingsTable)
    .where(eq(rkzListingsTable.userId, req.rkzUser.id))
    .orderBy(desc(rkzListingsTable.createdAt));
  res.json(rows.map(formatListing));
});

// POST /rkz/listings  — create a new listing
router.post("/rkz/listings", requireRkzAuth, async (req: any, res) => {
  const {
    type, price, currency = "SAR", city, district, address, lat, lng,
    area, bedrooms, bathrooms, title, description, photos = [], platforms = [],
  } = req.body as {
    type: string; price: number; currency?: string; city: string;
    district?: string; address?: string; lat?: number; lng?: number;
    area?: number; bedrooms?: number; bathrooms?: number; title?: string;
    description?: string; photos?: string[]; platforms?: unknown[];
  };

  if (!type || !price || !city) {
    res.status(400).json({ error: "type, price and city are required" });
    return;
  }

  const [row] = await db
    .insert(rkzListingsTable)
    .values({
      userId: req.rkzUser.id,
      type,
      price:  String(price),
      currency,
      city,
      district:    district ?? null,
      address:     address  ?? null,
      lat:         lat  != null ? String(lat)  : null,
      lng:         lng  != null ? String(lng)  : null,
      area:        area != null ? String(area) : null,
      bedrooms:    bedrooms  ?? null,
      bathrooms:   bathrooms ?? null,
      title:       title       ?? null,
      description: description ?? null,
      photos:    JSON.stringify(photos),
      platforms: JSON.stringify(platforms),
      status: "publishing",
    })
    .returning();

  // Simulate async publish completion — mark as published after 3 s
  setTimeout(async () => {
    try {
      await db
        .update(rkzListingsTable)
        .set({ status: "published", publishedAt: new Date() })
        .where(eq(rkzListingsTable.id, row.id));
    } catch {}
  }, 3000);

  req.log.info({ listingId: row.id, userId: req.rkzUser.id, type, city }, "rkz: listing created");
  res.status(201).json(formatListing(row));
});

// PATCH /rkz/listings/:id  — update a listing (owner only)
router.patch("/rkz/listings/:id", requireRkzAuth, async (req: any, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid listing id" }); return; }

  const [existing] = await db
    .select()
    .from(rkzListingsTable)
    .where(and(eq(rkzListingsTable.id, id), eq(rkzListingsTable.userId, req.rkzUser.id)))
    .limit(1);

  if (!existing) { res.status(404).json({ error: "Listing not found or not owned by you" }); return; }

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  const allowed = ["type","price","currency","city","district","address","lat","lng","area","bedrooms","bathrooms","title","description","status"] as const;
  for (const k of allowed) {
    if (req.body[k] !== undefined) updates[k] = req.body[k];
  }
  if (req.body.photos    !== undefined) updates.photos    = JSON.stringify(req.body.photos);
  if (req.body.platforms !== undefined) updates.platforms = JSON.stringify(req.body.platforms);

  const [updated] = await db.update(rkzListingsTable).set(updates).where(eq(rkzListingsTable.id, id)).returning();
  res.json(formatListing(updated));
});

// DELETE /rkz/listings/:id  — delete a listing (owner only)
router.delete("/rkz/listings/:id", requireRkzAuth, async (req: any, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid listing id" }); return; }

  const [existing] = await db
    .select({ id: rkzListingsTable.id })
    .from(rkzListingsTable)
    .where(and(eq(rkzListingsTable.id, id), eq(rkzListingsTable.userId, req.rkzUser.id)))
    .limit(1);

  if (!existing) { res.status(404).json({ error: "Listing not found or not owned by you" }); return; }

  await db.delete(rkzListingsTable).where(eq(rkzListingsTable.id, id));
  req.log.info({ listingId: id }, "rkz: listing deleted");
  res.json({ ok: true });
});

// GET /rkz/listings/:id  — get one listing (owner or public if published)
router.get("/rkz/listings/:id", async (req: any, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid listing id" }); return; }

  const [row] = await db.select().from(rkzListingsTable).where(eq(rkzListingsTable.id, id)).limit(1);
  if (!row) { res.status(404).json({ error: "Listing not found" }); return; }

  // Increment view count for published listings viewed externally
  if (row.status === "published") {
    db.update(rkzListingsTable)
      .set({ viewCount: (row.viewCount ?? 0) + 1 })
      .where(eq(rkzListingsTable.id, id))
      .catch(() => {});
  }

  res.json(formatListing(row));
});

export default router;
