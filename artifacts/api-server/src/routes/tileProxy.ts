/**
 * GET /api/tiles/:z/:x/:y.png
 *
 * Proxy for OpenStreetMap tiles so Android WebView doesn't need to reach
 * tile.openstreetmap.org directly — all requests stay on the same Replit domain.
 *
 * Cache-Control: 7 days (tiles rarely change).
 */
import { Router } from "express";
import https from "https";
import http from "http";

const router = Router();

const SUBDOMAINS = ["a", "b", "c"];
let sdIdx = 0;

router.get("/tiles/:z/:x/:y.png", (req, res) => {
  const { z, x, y } = req.params;

  // Basic sanity — prevent path traversal
  if (!/^\d{1,3}$/.test(z) || !/^\d{1,7}$/.test(x) || !/^\d{1,7}$/.test(y)) {
    res.status(400).end();
    return;
  }

  const sd = SUBDOMAINS[sdIdx++ % SUBDOMAINS.length];
  const tileUrl = `https://${sd}.tile.openstreetmap.org/${z}/${x}/${y}.png`;

  const lib = tileUrl.startsWith("https") ? https : http;
  lib.get(tileUrl, {
    headers: {
      "User-Agent": "RozozMapProxy/1.0",
      "Referer":    "https://rozoz.app/",
    },
  }, (upstream) => {
    if (!upstream.statusCode || upstream.statusCode >= 400) {
      res.status(upstream.statusCode ?? 503).end();
      return;
    }
    res.setHeader("Content-Type", upstream.headers["content-type"] ?? "image/png");
    res.setHeader("Cache-Control", "public, max-age=604800, immutable");
    res.setHeader("Access-Control-Allow-Origin", "*");
    upstream.pipe(res);
  }).on("error", () => {
    res.status(503).end();
  });
});

export default router;
