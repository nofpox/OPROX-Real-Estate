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
  const allowed = [
    "rozoz_web.mp4",
    "rozoz_arabic_final.mp4",
    "rkz_cinematic_v3.mp4",
    "rkz_cinematic_final_v2.mp4",
    "rkz_cinematic_final.mp4",
  ];
  const { filename } = req.params;
  if (!allowed.includes(filename)) { res.status(404).end(); return; }
  const filePath = join(WORKSPACE_ROOT, "attached_assets/generated_videos", filename);
  res.sendFile(filePath, { headers: { "Content-Type": "video/mp4", "Accept-Ranges": "bytes" } });
});

app.get("/realestate-api/watch", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(`<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>رزوز للحلول الذكية — الفيلم السينمائي</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;700;900&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  body{
    background:#050505;
    color:#fff;
    font-family:'Tajawal',sans-serif;
    min-height:100vh;
    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:flex-start;
    overflow-x:hidden;
  }

  /* Header */
  .header{
    width:100%;
    display:flex;
    align-items:center;
    justify-content:space-between;
    padding:18px 28px;
    background:linear-gradient(180deg,#000 0%,transparent 100%);
    position:relative;
    z-index:10;
  }
  .brand{
    display:flex;
    align-items:center;
    gap:12px;
  }
  .brand-logo{
    width:44px;height:44px;
    border-radius:50%;
    background:linear-gradient(135deg,#c9a96e,#8b6914);
    display:flex;align-items:center;justify-content:center;
    font-size:1.1rem;font-weight:900;color:#000;
    box-shadow:0 0 20px rgba(201,169,110,0.5);
  }
  .brand-text{
    display:flex;flex-direction:column;
  }
  .brand-name{font-size:1.3rem;font-weight:900;color:#c9a96e;letter-spacing:1px;}
  .brand-sub{font-size:0.7rem;color:rgba(255,255,255,0.5);font-weight:300;}
  .header-badge{
    background:rgba(201,169,110,0.15);
    border:1px solid rgba(201,169,110,0.3);
    border-radius:20px;
    padding:6px 14px;
    font-size:0.75rem;
    color:#c9a96e;
    letter-spacing:1px;
  }

  /* Video container */
  .video-wrap{
    width:100%;
    max-width:1100px;
    padding:0 16px;
    margin-top:8px;
  }
  .video-frame{
    position:relative;
    width:100%;
    border-radius:16px;
    overflow:hidden;
    box-shadow:0 0 0 1px rgba(201,169,110,0.25), 0 30px 80px rgba(0,0,0,0.8), 0 0 60px rgba(201,169,110,0.08);
  }
  video{
    width:100%;
    display:block;
    background:#000;
  }
  .video-glow{
    position:absolute;inset:0;
    border-radius:16px;
    pointer-events:none;
    box-shadow:inset 0 0 60px rgba(201,169,110,0.04);
  }

  /* Info bar */
  .info-bar{
    width:100%;max-width:1100px;
    padding:16px 16px 0;
    display:flex;align-items:center;justify-content:space-between;
    flex-wrap:wrap;gap:10px;
  }
  .info-title{
    font-size:1.1rem;font-weight:700;
    background:linear-gradient(90deg,#c9a96e,#f0d080,#c9a96e);
    -webkit-background-clip:text;-webkit-text-fill-color:transparent;
    background-clip:text;
  }
  .info-meta{
    display:flex;gap:12px;align-items:center;
  }
  .info-tag{
    background:rgba(201,169,110,0.1);
    border:1px solid rgba(201,169,110,0.2);
    border-radius:8px;
    padding:3px 10px;
    font-size:0.7rem;
    color:rgba(201,169,110,0.8);
    font-weight:400;
  }

  /* Subtitle strip */
  .sub-strip{
    width:100%;max-width:1100px;
    padding:12px 16px 0;
    display:flex;gap:8px;flex-wrap:wrap;
  }
  .sub-line{
    font-size:0.85rem;
    color:rgba(255,255,255,0.38);
    font-weight:300;
    line-height:1.7;
  }
  .sub-line em{color:rgba(201,169,110,0.7);font-style:normal;}

  /* Divider */
  .divider{
    width:100%;max-width:1100px;
    height:1px;
    background:linear-gradient(90deg,transparent,rgba(201,169,110,0.2),transparent);
    margin:20px 16px 0;
  }

  /* Footer */
  .footer{
    padding:20px 16px 30px;
    text-align:center;
  }
  .footer-logo{
    font-size:2rem;font-weight:900;
    background:linear-gradient(135deg,#c9a96e 30%,#f0d080 60%,#8b6914 100%);
    -webkit-background-clip:text;-webkit-text-fill-color:transparent;
    background-clip:text;
    letter-spacing:4px;
    margin-bottom:4px;
  }
  .footer-sub{font-size:0.75rem;color:rgba(255,255,255,0.3);letter-spacing:2px;}

  /* Screen capture protection hint */
  .protect-note{
    position:fixed;bottom:10px;left:50%;transform:translateX(-50%);
    background:rgba(0,0,0,0.7);
    border:1px solid rgba(201,169,110,0.2);
    border-radius:20px;padding:5px 14px;
    font-size:0.65rem;color:rgba(255,255,255,0.3);
    white-space:nowrap;
    pointer-events:none;
  }
</style>
</head>
<body>

<header class="header">
  <div class="brand">
    <div class="brand-logo">ر</div>
    <div class="brand-text">
      <span class="brand-name">رزوز</span>
      <span class="brand-sub">للحلول الذكية</span>
    </div>
  </div>
  <span class="header-badge">🎬 العرض السينمائي</span>
</header>

<div class="video-wrap">
  <div class="video-frame">
    <video
      controls
      autoplay
      playsinline
      controlslist="nodownload"
      oncontextmenu="return false"
    >
      <source src="/realestate-api/media/rozoz_web.mp4" type="video/mp4">
    </video>
    <div class="video-glow"></div>
  </div>
</div>

<div class="info-bar">
  <span class="info-title">رزوز للحلول الذكية — الفيلم السينمائي الكامل</span>
  <div class="info-meta">
    <span class="info-tag">🎙️ صوت عربي</span>
    <span class="info-tag">🎵 موسيقى تراثية سعودية</span>
    <span class="info-tag">4K · 1080p</span>
  </div>
</div>

<div class="sub-strip">
  <span class="sub-line">
    في عالمٍ تتشكّل فيه الأحلام... <em>تُولد رزوز.</em>
    نحن لا نبني مجرد مبانٍ — نصنع حياةً بمعاييرَ استثنائية.
    <em>اختر رزوز. اختر الأفضل.</em>
  </span>
</div>

<div class="divider"></div>

<footer class="footer">
  <div class="footer-logo">رزوز</div>
  <div class="footer-sub">ROZOZ · SMART REAL ESTATE SOLUTIONS</div>
</footer>

<div class="protect-note">🔒 محتوى محمي — جميع الحقوق محفوظة لشركة رزوز</div>

</body>
</html>`);
});

app.use("/realestate-api", router);

export default app;
