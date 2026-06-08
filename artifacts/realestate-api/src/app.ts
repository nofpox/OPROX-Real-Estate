import express, { type Express } from "express";
import cors from "cors";
import compression from "compression";
import pinoHttp from "pino-http";
import { join } from "path";
import { logger } from "./lib/logger.js";
import router from "./routes/index.js";

const app: Express = express();

app.set("trust proxy", 1);

app.use(pinoHttp({
  logger,
  serializers: {
    req(req) { return { id: req.id, method: req.method, url: req.url?.split("?")[0] }; },
    res(res) { return { statusCode: res.statusCode }; },
  },
}));

app.use(cors({ origin: true, credentials: true }));
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

const WORKSPACE_ROOT = "/home/runner/workspace";

app.get("/realestate-api/media/:filename", (req, res) => {
  const allowed = ["rkz_cinematic_v3.mp4", "rkz_cinematic_final_v2.mp4", "rkz_cinematic_final.mp4"];
  const { filename } = req.params;
  if (!allowed.includes(filename)) { res.status(404).end(); return; }
  const filePath = join(WORKSPACE_ROOT, "attached_assets/generated_videos", filename);
  res.sendFile(filePath, { headers: { "Content-Type": "video/mp4", "Accept-Ranges": "bytes" } });
});

app.get("/realestate-api/watch", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(`<!DOCTYPE html><html lang="ar" dir="rtl">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>روزوز — مشاهدة الفيلم</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0a0a0a;color:#fff;font-family:sans-serif;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;padding:20px}h1{font-size:1.4rem;color:#c9a96e;letter-spacing:2px}video{width:100%;max-width:900px;border-radius:12px;box-shadow:0 0 40px rgba(201,169,110,0.3)}p{color:#888;font-size:.9rem}</style>
</head><body>
<h1>🎬 روزوز السينمائي</h1>
<video controls autoplay playsinline>
  <source src="/realestate-api/media/rkz_cinematic_v3.mp4" type="video/mp4">
</video>
<p>Rkz Cinematic — 37s · 1080p · Voiceover + Najdi Ardah Score</p>
</body></html>`);
});

app.use("/realestate-api", router);

export default app;
