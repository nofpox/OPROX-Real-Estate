/**
 * build-and-serve.js
 *
 * Production entry point for the Expo web build.
 *
 * 1. Starts a lightweight HTTP server IMMEDIATELY on PORT so healthchecks pass.
 * 2. Runs `expo export --platform web` as a child process in the background.
 * 3. Once the build finishes, replaces the loading server with the full static server.
 *
 * This avoids healthcheck timeouts during long Expo builds.
 */

const http    = require("http");
const fs      = require("fs");
const path    = require("path");
const { spawn } = require("child_process");

const PORT     = parseInt(process.env.PORT || "3000", 10);
const BASE_PATH = (process.env.BASE_PATH || "/").replace(/\/+$/, "");
const WEB_ROOT  = path.resolve(__dirname, "..", "dist");

// ── Helpers ────────────────────────────────────────────────────────────────
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

function stripBase(pathname) {
  if (BASE_PATH && pathname.startsWith(BASE_PATH)) {
    return pathname.slice(BASE_PATH.length) || "/";
  }
  return pathname;
}

function isHealthCheck(pathname) {
  const p = stripBase(pathname);
  return p === "/healthz" || p === "/status" || p === "/" || p === "";
}

const LOADING_HTML = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Housin — جارٍ التشغيل</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{display:flex;flex-direction:column;align-items:center;justify-content:center;
    min-height:100vh;background:#0f2040;font-family:system-ui,sans-serif;color:#fff;gap:24px}
  .logo{font-size:32px;font-weight:800;color:#c9a84c;letter-spacing:2px}
  .sub{font-size:14px;color:rgba(255,255,255,0.6)}
  .spinner{width:40px;height:40px;border:3px solid rgba(201,168,76,0.2);
    border-top-color:#c9a84c;border-radius:50%;animation:spin 0.9s linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}
</style>
<meta http-equiv="refresh" content="8"/>
</head>
<body>
  <div class="logo">Housin</div>
  <div class="spinner"></div>
  <div class="sub">جارٍ تشغيل التطبيق...</div>
</body>
</html>`;

// ── State ─────────────────────────────────────────────────────────────────
let ready = fs.existsSync(path.join(WEB_ROOT, "index.html"));
let server;

// ── Request handler ────────────────────────────────────────────────────────
function handleRequest(req, res) {
  const url      = new URL(req.url || "/", `http://${req.headers.host}`);
  const pathname = url.pathname;
  const stripped = stripBase(pathname);

  // Health check — always 200
  if (stripped === "/healthz" || stripped === "/status") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, ready }));
    return;
  }

  // Error log capture
  if (req.method === "POST" && stripped === "/error-log") {
    let body = "";
    req.on("data", (c) => { body += c; });
    req.on("end", () => {
      try {
        const d = JSON.parse(body);
        console.error("[BROWSER-ERROR]", d.t, "|", d.msg, "|", d.src, "line", d.line);
      } catch {}
    });
    res.writeHead(204);
    res.end();
    return;
  }

  // Not ready yet — serve loading page
  if (!ready) {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(LOADING_HTML);
    return;
  }

  // Expo native manifest
  const platform = req.headers["expo-platform"];
  if ((stripped === "/" || stripped === "/manifest") && (platform === "ios" || platform === "android")) {
    const manifestPath = path.join(__dirname, "..", "static-build", platform, "manifest.json");
    if (fs.existsSync(manifestPath)) {
      res.writeHead(200, {
        "content-type": "application/json",
        "expo-protocol-version": "1",
        "expo-sfv-version": "0",
      });
      res.end(fs.readFileSync(manifestPath, "utf-8"));
    } else {
      res.writeHead(404);
      res.end("Not Found");
    }
    return;
  }

  // Static file
  const safePath = path.normalize(stripped).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = path.join(WEB_ROOT, safePath);

  if (!filePath.startsWith(WEB_ROOT)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
    const ext  = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || "application/octet-stream";
    const data = fs.readFileSync(filePath);
    res.writeHead(200, { "content-type": mime });
    res.end(data);
    return;
  }

  // SPA fallback → index.html
  const index = path.join(WEB_ROOT, "index.html");
  if (fs.existsSync(index)) {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(fs.readFileSync(index));
    return;
  }

  res.writeHead(404);
  res.end("Not Found");
}

// ── Start server immediately ────────────────────────────────────────────────
server = http.createServer(handleRequest);
server.listen(PORT, "0.0.0.0", () => {
  console.log(`[Housin] Server ready on port ${PORT} (ready=${ready})`);

  if (!ready) {
    console.log("[Housin] dist/ not found — running expo export...");
    runBuild();
  }
});

// ── Build step ─────────────────────────────────────────────────────────────
function runBuild() {
  const build = spawn(
    "pnpm",
    ["exec", "expo", "export", "--platform", "web"],
    { stdio: "inherit", cwd: path.resolve(__dirname, "..") }
  );

  build.on("close", (code) => {
    if (code !== 0) {
      console.error("[Housin] expo export failed with code", code);
      // Keep serving loading page; Replit will retry healthcheck
      setTimeout(runBuild, 30_000);
      return;
    }
    console.log("[Housin] Build complete — switching to production mode");
    ready = true;
  });
}
