import { Router } from "express";
import multer from "multer";
import { toFile } from "openai";
import { resolveAiClient } from "../lib/ai-provider.js";
import { uploadBufferGetSignedUrl } from "../lib/objectStorage.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const router = Router();

// ── Style catalogue ────────────────────────────────────────────────────────────
const STYLE_PROMPTS: Record<string, string> = {
  modern:
    "Furnish this empty room in a luxurious modern interior design style. Use clean straight lines, a neutral palette of white, warm beige and light grey. Add a large L-shaped sectional sofa, a sleek low-profile coffee table, statement pendant lighting, tall indoor plants and framed abstract art. Photorealistic, high-end architectural photography, 8K resolution, no people.",

  classic:
    "Furnish this empty room in a timeless classic elegant interior design style. Include ornate carved wooden furniture, rich velvet and silk upholstery in deep burgundy and navy, a crystal chandelier as the centrepiece, gilded wall mirrors, a Persian-style area rug and fresh floral arrangements. Photorealistic, luxury editorial photography, 8K resolution, no people.",

  saudi:
    "Furnish this empty room in a contemporary Saudi luxury interior design style. Feature mashrabiya-inspired geometric wooden screens on the walls, warm earth tones with gold and amber accents, a low majlis seating area with plush embroidered cushions alongside modern accent chairs, an arabesque-patterned feature wall, traditional lantern-inspired pendant lights and a hand-knotted rug. Photorealistic, high-end Saudi interior photography, 8K resolution, no people.",

  bohemian:
    "Furnish this empty room in a rich bohemian interior design style. Layer eclectic textiles: macramé wall hangings, layered kilim and jute rugs, a rattan peacock chair, mismatched vintage cushions in jewel tones, lots of trailing indoor plants and hanging terracotta planters, wicker baskets, and warm Edison-bulb string lights. Photorealistic, lifestyle photography, 8K resolution, no people.",

  industrial:
    "Furnish this empty room in an urban industrial interior design style. Expose the concrete ceiling and brick walls. Add a reclaimed-wood dining table with black hairpin legs, leather Chesterfield sofa, Edison-bulb cage pendants, open iron-pipe shelving, a vintage Persian rug on polished concrete floors and metal-framed factory windows. Photorealistic, editorial interior photography, 8K resolution, no people.",

  minimalist:
    "Furnish this empty room in a strict minimalist interior design style. Use an absolute minimum of furniture: a single low-profile platform sofa in off-white linen, one sculptural side table, a single statement floor lamp, bare white walls with one subtle artwork, and a light natural-oak hardwood floor with no rug. Generous negative space throughout. Photorealistic, Zen architectural photography, 8K resolution, no people.",

  scandinavian:
    "Furnish this empty room in a cosy Scandinavian (Hygge) interior design style. Use pale birch and pine wood furniture, a cream boucle sofa, knitted wool throws and sheepskin cushions, a round wood coffee table, abundant candles and pendant lights in white ceramic, a Berber wool rug and potted greenery. Clean lines, warm and inviting. Photorealistic, Nordic lifestyle photography, 8K resolution, no people.",

  artdeco:
    "Furnish this empty room in an opulent Art Deco luxury interior design style. Feature deep emerald green and black lacquer walls with gold geometric wall mouldings, a velvet Chesterfield sofa in midnight blue, brass sunburst wall sconces, a mirrored bar trolley, chevron parquet flooring, a sculptural geometric chandelier and exotic marble side tables. Photorealistic, glamour editorial photography, 8K resolution, no people.",
};

// POST /rkz/virtual-staging
// Body: multipart/form-data { image: File, style: string }
// Returns: { imageUrl: string } — signed GCS URL (7 days) or data URL fallback
router.post(
  "/rkz/virtual-staging",
  upload.single("image"),
  async (req, res) => {
    try {
      const style  = (req.body?.style as string) ?? "modern";
      const prompt = STYLE_PROMPTS[style] ?? STYLE_PROMPTS.modern;

      if (!req.file) {
        res.status(400).json({ error: "No image uploaded" });
        return;
      }

      const aiClient = await resolveAiClient(1);

      const imageFile = await toFile(
        req.file.buffer,
        req.file.originalname || "room.jpg",
        { type: req.file.mimetype || "image/jpeg" },
      );

      const response = await aiClient.images.edit({
        model: "gpt-image-1",
        image: imageFile,
        prompt,
        size: "1024x1024",
      });

      const b64 = response.data?.[0]?.b64_json;
      if (!b64) {
        req.log.warn({ response }, "gpt-image-1 returned no image data");
        res.status(500).json({ error: "No image data returned from AI" });
        return;
      }

      const imageBuffer = Buffer.from(b64, "base64");

      // Try GCS signed URL first; fall back to inline data URL
      let imageUrl: string;
      try {
        imageUrl = await uploadBufferGetSignedUrl(
          imageBuffer,
          `${style}-${Date.now()}.png`,
          "image/png",
          7 * 24 * 3600,
        );
        req.log.info({ style }, "virtual-staging stored to GCS");
      } catch (storageErr) {
        req.log.warn({ storageErr }, "GCS upload failed — returning data URL");
        imageUrl = `data:image/png;base64,${b64}`;
      }

      res.json({ imageUrl });
    } catch (err: unknown) {
      req.log.error({ err }, "virtual-staging error");
      res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
    }
  },
);

// POST /rkz/check-image-quality
// Body: multipart/form-data { image: File }
// Returns: { blurOk: boolean, lightOk: boolean, score: number }
// Uses simple entropy heuristic: bytes-per-pixel in a JPEG correlates with sharpness/brightness
router.post(
  "/rkz/check-image-quality",
  upload.single("image"),
  async (req, res) => {
    if (!req.file) {
      res.status(400).json({ error: "No image uploaded" });
      return;
    }

    const { buffer, mimetype } = req.file;
    const sizeBytes = buffer.length;

    // Read JPEG dimensions from SOF0/SOF2 marker for accurate bytes-per-pixel
    let width = 800;
    let height = 600;
    try {
      if (mimetype.includes("jpeg") || mimetype.includes("jpg")) {
        for (let i = 0; i < buffer.length - 9; i++) {
          if (buffer[i] === 0xff && (buffer[i + 1] === 0xc0 || buffer[i + 1] === 0xc2)) {
            height = (buffer[i + 5] << 8) | buffer[i + 6];
            width  = (buffer[i + 7] << 8) | buffer[i + 8];
            break;
          }
        }
      }
    } catch { /* use defaults */ }

    const pixels        = width * height;
    const bpp           = pixels > 0 ? sizeBytes / pixels : 0;

    // Empirical thresholds (JPEG quality ~80):
    //   Sharp, well-lit room:   bpp > 0.08
    //   Acceptable:             bpp > 0.04
    //   Blurry/dark:            bpp < 0.04
    const blurOk  = bpp > 0.04;
    const lightOk = bpp > 0.025;
    const score   = Math.min(100, Math.round(bpp * 800));

    res.json({ blurOk, lightOk, score, width, height, sizeBytes });
  },
);

export default router;
