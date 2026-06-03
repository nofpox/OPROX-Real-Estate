import { Router, type Request } from "express";
import { db, listingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

function xmlEncode(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function getSafeBase(req: Request): string {
  const allowedDomains = (process.env.REPLIT_DOMAINS ?? "").split(",").map(d => d.trim()).filter(Boolean);
  const forwarded = (req.headers["x-forwarded-host"] as string | undefined)?.split(",")[0]?.trim() ?? "";
  const rawHost = forwarded || req.headers.host || "";
  const safeHost =
    allowedDomains.find(d => rawHost === d || rawHost.endsWith(`.${d}`)) ??
    allowedDomains[0] ??
    rawHost.replace(/[^a-zA-Z0-9.\-:]/g, "");
  return `https://${safeHost}/realestate`;
}

router.get("/sitemap.xml", async (req, res) => {
  try {
    const listings = await db
      .select({ id: listingsTable.id, updatedAt: listingsTable.updatedAt })
      .from(listingsTable)
      .where(eq(listingsTable.status, "active"));

    const base  = getSafeBase(req);
    const today = new Date().toISOString().split("T")[0];
    const staticPages = [
      { url: `${base}/`,         lastmod: today, changefreq: "weekly",  priority: "1.0" },
      { url: `${base}/listings`, lastmod: today, changefreq: "daily",   priority: "0.9" },
      { url: `${base}/services`, lastmod: today, changefreq: "monthly", priority: "0.7" },
      { url: `${base}/contact`,  lastmod: today, changefreq: "monthly", priority: "0.6" },
    ];
    const listingPages = listings.map(l => ({
      url:        `${base}/listings/${encodeURIComponent(String(l.id))}`,
      lastmod:    l.updatedAt.toISOString().split("T")[0],
      changefreq: "weekly",
      priority:   "0.8",
    }));
    const pages = [...staticPages, ...listingPages];
    const urlEls = pages.map(p =>
      `  <url>\n    <loc>${xmlEncode(p.url)}</loc>\n    <lastmod>${xmlEncode(p.lastmod)}</lastmod>` +
      `\n    <changefreq>${xmlEncode(p.changefreq)}</changefreq>\n    <priority>${xmlEncode(p.priority)}</priority>\n  </url>`
    ).join("\n");
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEls}\n</urlset>`;
    res.set("Content-Type", "application/xml; charset=utf-8");
    res.set("Cache-Control", "public, max-age=3600");
    res.send(xml);
  } catch (err) {
    req.log?.error({ err }, "GET /sitemap.xml failed");
    res.status(500).send(`<?xml version="1.0"?><error>Sitemap generation failed</error>`);
  }
});

export default router;
