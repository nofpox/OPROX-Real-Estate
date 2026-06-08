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

app.get("/realestate-api/media/preview-film.mp4", (_req, res) => {
  const filePath = join(process.cwd(), "../../attached_assets/generated_videos/rkz_cinematic_v3.mp4");
  res.sendFile(filePath, {
    headers: {
      "Content-Type": "video/mp4",
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=86400",
    },
  });
});

app.use("/realestate-api", router);

export default app;
