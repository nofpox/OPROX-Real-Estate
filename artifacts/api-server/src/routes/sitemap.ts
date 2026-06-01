import { Router } from "express";
import { db, listingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

/**
 * GET /sitemap.xml — dynamic XML sitemap for the real estate portal.
 *
 * Lists all static portal pages plus one <url> per active listing.
 * Cached for 1 hour via Cache-Control; bots should not hammer this.
 * Referenced from /robots.txt served by the portal's Vite public dir.
 */
router.get("/sitemap.xml", async (req, res) => {
  try {
    const listings = await db
      .select({ id: listingsTable.id, updatedAt: listingsTable.updatedAt })
      .from(listingsTable)
      .where(eq(listingsTable.status, "active"));

    const proto = (req.headers["x-forwarded-proto"] as string | undefined) ?? "https";
    const host  = (req.headers["x-forwarded-host"] as string | undefined) ?? req.headers.host ?? "";
    const base  = `${proto}://${host}/realestate`;

    const today = new Date().toISOString().split("T")[0];

    const staticPages = [
      { url: `${base}/`,         lastmod: today, changefreq: "weekly",  priority: "1.0" },
      { url: `${base}/listings`, lastmod: today, changefreq: "daily",   priority: "0.9" },
      { url: `${base}/services`, lastmod: today, changefreq: "monthly", priority: "0.7" },
      { url: `${base}/contact`,  lastmod: today, changefreq: "monthly", priority: "0.6" },
    ];

    const listingPages = listings.map((l) => ({
      url:        `${base}/listings/${l.id}`,
      lastmod:    l.updatedAt.toISOString().split("T")[0],
      changefreq: "weekly",
      priority:   "0.8",
    }));

    const pages = [...staticPages, ...listingPages];

    const urlEls = pages
      .map(
        (p) =>
          `  <url>\n    <loc>${p.url}</loc>\n    <lastmod>${p.lastmod}</lastmod>` +
          `\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`,
      )
      .join("\n");

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEls}\n</urlset>`;

    res.set("Content-Type", "application/xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=3600");
    res.send(xml);
  } catch (err) {
    req.log?.error({ err }, "GET /sitemap.xml failed");
    res.status(500).send("<?xml version=\"1.0\"?><error>Sitemap generation failed</error>");
  }
});

export default router;
