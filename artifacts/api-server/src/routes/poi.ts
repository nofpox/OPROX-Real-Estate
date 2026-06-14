import { Router } from "express";
import { db, poiPlacesTable, apartmentsTable } from "@workspace/db";
import { eq, and, between, sql } from "drizzle-orm";

const router = Router();

// ── Overpass query ────────────────────────────────────────────────────────────
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

// ── POST /poi/import ──────────────────────────────────────────────────────────
router.post("/poi/import", async (req, res) => {
  try {
    const ovpRes = await fetch("https://maps.mail.ru/osm/tools/overpass/api/interpreter", {
      method:  "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent":   "Mozilla/5.0 (compatible; ROZOZ/1.0)",
      },
      body:    `data=${encodeURIComponent(OVERPASS_QUERY)}`,
      signal:  AbortSignal.timeout(75_000),
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
          return { osmId: el.id, type: resolveType(tags), nameAr: tags["name:ar"] ?? tags.name ?? null, nameEn: tags["name:en"] ?? tags.name ?? null, lat, lng, tags };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      if (rows.length === 0) continue;
      await db.insert(poiPlacesTable).values(rows).onConflictDoNothing({ target: poiPlacesTable.osmId });
      inserted += rows.length;
    }

    res.json({ success: true, fetched: elements.length, inserted });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// ── GET /poi — query stored places ───────────────────────────────────────────
// Supports type=restaurant|hotel|cafe|attraction|historic|apartment
// When type=apartment it queries the dedicated `apartments` table.
// All other types query the `poi_places` table (imported from Overpass).
router.get("/poi", async (req, res) => {
  const { type, lat, lng, radius_km, limit: lim } = req.query as Record<string, string | undefined>;
  const pageLimit = Math.min(parseInt(lim ?? "200", 10), 1000);

  /* ── Apartments branch ── */
  if (type === "apartment") {
    let conds = [
      sql`${apartmentsTable.lat} IS NOT NULL`,
      sql`${apartmentsTable.lng} IS NOT NULL`,
    ];

    if (lat && lng && radius_km) {
      const latN = parseFloat(lat);
      const lngN = parseFloat(lng);
      const km   = parseFloat(radius_km);
      const dLat = km / 111;
      const dLng = km / (111 * Math.cos((latN * Math.PI) / 180));
      conds = [
        ...conds,
        between(apartmentsTable.lat, String(latN - dLat), String(latN + dLat)),
        between(apartmentsTable.lng, String(lngN - dLng), String(lngN + dLng)),
      ];
    }

    const rows = await db.select().from(apartmentsTable).where(and(...conds)).limit(pageLimit);

    // Map to the same `places` shape used by all other POI types
    const places = rows.map(r => ({
      osmId:    r.id,
      type:     "apartment" as const,
      nameAr:   r.name,
      nameEn:   r.name,
      lat:      Number(r.lat),
      lng:      Number(r.lng),
      tags: {
        price_per_night: r.pricePerNight != null ? String(r.pricePerNight) : null,
        phone:            r.phone    ?? null,
        image_url:        r.imageUrl ?? null,
      },
      createdAt: r.createdAt,
    }));

    res.json({ count: places.length, places });
    return;
  }

  /* ── poi_places branch (restaurant / hotel / cafe / attraction / historic) ── */
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

    rows = await db.select().from(poiPlacesTable).where(and(...conds)).limit(pageLimit);
  } else {
    const conds = type ? [eq(poiPlacesTable.type, type)] : undefined;
    rows = await db.select().from(poiPlacesTable).where(conds ? and(...conds) : undefined).limit(pageLimit);
  }

  res.json({ count: rows.length, places: rows });
});

// ── GET /poi/stats ─────────────────────────────────────────────────────────────
router.get("/poi/stats", async (_req, res) => {
  const [poiRows, [aptRow]] = await Promise.all([
    db.select({ type: poiPlacesTable.type, count: sql<number>`count(*)::int` })
      .from(poiPlacesTable).groupBy(poiPlacesTable.type),
    db.select({ count: sql<number>`count(*)::int` }).from(apartmentsTable),
  ]);

  const total = poiRows.reduce((s, r) => s + r.count, 0) + (aptRow?.count ?? 0);
  res.json({
    total,
    breakdown: [
      ...poiRows,
      { type: "apartment", count: aptRow?.count ?? 0 },
    ],
  });
});

type PoiPlaceRow = typeof poiPlacesTable.$inferSelect;

export default router;
