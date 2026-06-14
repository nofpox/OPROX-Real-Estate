import { Router } from "express";
import { db, poiPlacesTable } from "@workspace/db";
import { eq, and, between, sql } from "drizzle-orm";

const router = Router();

// ── Overpass query (fixed syntax — added missing ); before out) ───────────────
const OVERPASS_QUERY = `
[out:json][timeout:60];
area["ISO3166-1"="SA"]->.saudi;
(
  node["tourism"="attraction"](area.saudi);
  node["amenity"="restaurant"](area.saudi);
  node["amenity"="cafe"](area.saudi);
  node["tourism"="hotel"](area.saudi);
  node["historic"](area.saudi);
);
out center;
`.trim();

function resolveType(tags: Record<string, string>): string {
  if (tags.tourism === "attraction")  return "attraction";
  if (tags.tourism === "hotel")       return "hotel";
  if (tags.amenity === "restaurant")  return "restaurant";
  if (tags.amenity === "cafe")        return "cafe";
  if (tags.historic)                  return "historic";
  return "other";
}

// ── POST /poi/import — fetch from Overpass and bulk-insert ────────────────────
router.post("/poi/import", async (req, res) => {
  try {
    const ovpRes = await fetch("https://overpass-api.de/api/interpreter", {
      method:  "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body:    `data=${encodeURIComponent(OVERPASS_QUERY)}`,
      signal:  AbortSignal.timeout(70_000),
    });

    if (!ovpRes.ok) {
      res.status(502).json({ error: "Overpass API error", status: ovpRes.status }); return;
    }

    const json = await ovpRes.json() as { elements: Array<{
      id: number; lat?: number; lon?: number;
      center?: { lat: number; lon: number };
      tags?: Record<string, string>;
    }> };

    const elements = json.elements ?? [];

    // Batch into chunks of 500 to avoid giant single INSERT
    const BATCH = 500;
    let inserted = 0;

    for (let i = 0; i < elements.length; i += BATCH) {
      const chunk = elements.slice(i, i + BATCH);
      const rows = chunk
        .map(el => {
          const lat = el.lat ?? el.center?.lat;
          const lng = el.lon ?? el.center?.lon;
          if (!lat || !lng) return null;
          const tags = el.tags ?? {};
          return {
            osmId:  el.id,
            type:   resolveType(tags),
            nameAr: tags["name:ar"] ?? tags.name ?? null,
            nameEn: tags["name:en"] ?? tags.name ?? null,
            lat,
            lng,
            tags,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      if (rows.length === 0) continue;

      const result = await db
        .insert(poiPlacesTable)
        .values(rows)
        .onConflictDoNothing({ target: poiPlacesTable.osmId });

      // drizzle onConflictDoNothing doesn't return rowCount easily — count manually
      inserted += rows.length;
    }

    res.json({ success: true, fetched: elements.length, inserted });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg });
  }
});

// ── GET /poi — query stored places ───────────────────────────────────────────
router.get("/poi", async (req, res) => {
  const { type, lat, lng, radius_km, limit: lim } = req.query as Record<string, string | undefined>;

  const pageLimit = Math.min(parseInt(lim ?? "200", 10), 1000);

  let rows: PoiPlaceRow[];

  if (lat && lng && radius_km) {
    const latN = parseFloat(lat);
    const lngN = parseFloat(lng);
    const km   = parseFloat(radius_km);
    const dLat = km / 111;
    const dLng = km / (111 * Math.cos((latN * Math.PI) / 180));

    const conds = [
      between(poiPlacesTable.lat, latN - dLat, latN + dLat),
      between(poiPlacesTable.lng, lngN - dLng, lngN + dLng),
    ];
    if (type) conds.push(eq(poiPlacesTable.type, type));

    rows = await db
      .select()
      .from(poiPlacesTable)
      .where(and(...conds))
      .limit(pageLimit);
  } else {
    const conds = type ? [eq(poiPlacesTable.type, type)] : undefined;
    rows = await db
      .select()
      .from(poiPlacesTable)
      .where(conds ? and(...conds) : undefined)
      .limit(pageLimit);
  }

  res.json({ count: rows.length, places: rows });
});

// ── GET /poi/stats — count per type ──────────────────────────────────────────
router.get("/poi/stats", async (_req, res) => {
  const rows = await db
    .select({ type: poiPlacesTable.type, count: sql<number>`count(*)::int` })
    .from(poiPlacesTable)
    .groupBy(poiPlacesTable.type);

  const total = rows.reduce((s, r) => s + r.count, 0);
  res.json({ total, breakdown: rows });
});

type PoiPlaceRow = typeof poiPlacesTable.$inferSelect;

export default router;
