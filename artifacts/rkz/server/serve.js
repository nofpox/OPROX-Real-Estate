/**
 * Standalone production server for Expo web build.
 *
 * Serves the Expo web export from dist/ (output of `expo export --platform web`).
 * - Browser requests (no expo-platform header) → SPA: serve dist/index.html
 * - Native requests with expo-platform header → served from static-build/ manifests
 * - Static assets (JS, CSS, fonts, images) → served directly from dist/
 */

const http = require("http");
const fs = require("fs");
const path = require("path");

const WEB_ROOT = path.resolve(__dirname, "..", "dist");
const STATIC_ROOT = path.resolve(__dirname, "..", "static-build");
const basePath = (process.env.BASE_PATH || "/").replace(/\/+$/, "");

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
  ".otf": "font/otf",
  ".map": "application/json",
};

function serveManifest(platform, res) {
  const manifestPath = path.join(STATIC_ROOT, platform, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: `Manifest not found for platform: ${platform}` }));
    return;
  }
  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.writeHead(200, {
    "content-type": "application/json",
    "expo-protocol-version": "1",
    "expo-sfv-version": "0",
  });
  res.end(manifest);
}

function serveFile(root, urlPath, res, fallbackToIndex = false) {
  const safePath = path.normalize(urlPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = path.join(root, safePath);

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  if (fs.existsSync(filePath) && !fs.statSync(filePath).isDirectory()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, { "content-type": contentType });
    res.end(fs.readFileSync(filePath));
    return;
  }

  if (fallbackToIndex) {
    const indexPath = path.join(root, "index.html");
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(fs.readFileSync(indexPath));
      return;
    }
  }

  res.writeHead(404);
  res.end("Not Found");
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  let pathname = url.pathname;

  if (basePath && pathname.startsWith(basePath)) {
    pathname = pathname.slice(basePath.length) || "/";
  }

  const platform = req.headers["expo-platform"];

  if ((pathname === "/" || pathname === "/manifest") && (platform === "ios" || platform === "android")) {
    return serveManifest(platform, res);
  }

  serveFile(WEB_ROOT, pathname, res, true);
});

const port = parseInt(process.env.PORT || "3000", 10);
server.listen(port, "0.0.0.0", () => {
  console.log(`Serving RKZ web app on port ${port}`);
});
