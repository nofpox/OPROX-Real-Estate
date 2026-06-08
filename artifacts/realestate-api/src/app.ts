import express, { type Express } from "express";
import cors from "cors";
import compression from "compression";
import pinoHttp from "pino-http";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { logger } from "./lib/logger.js";
import router from "./routes/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

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

app.use("/realestate-api/media", express.static(join(__dirname, "../media"), {
  setHeaders(res, filePath) {
    if (filePath.endsWith(".mp4")) {
      res.setHeader("Content-Type", "video/mp4");
      res.setHeader("Accept-Ranges", "bytes");
    }
  },
}));

app.use("/realestate-api", router);

export default app;
