import { Router } from "express";
import multer from "multer";
import { toFile } from "openai";
import { resolveAiClient } from "../lib/ai-provider.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const router = Router();

const STYLE_PROMPTS: Record<string, string> = {
  modern:
    "Furnish this empty room with luxurious modern interior design: clean lines, neutral tones (white, beige, warm grey), large sectional sofa, sleek coffee table, statement pendant lighting, indoor plants, abstract art. Photorealistic, high-end architectural photography, 8K, no people.",
  classic:
    "Furnish this empty room with classic elegant interior design: ornate furniture, rich velvet and silk fabrics, warm gold and deep mahogany tones, crystal chandelier, decorative gilded mirrors, Persian rug, floral arrangements. Photorealistic, luxury editorial style, no people.",
  saudi:
    "Furnish this empty room with contemporary Saudi luxury interior design: mashrabiya-inspired geometric wooden screens, warm earth tones with gold accents, low majlis seating area with plush cushions mixed with modern furniture, arabesque pattern wallpaper, traditional lantern-inspired pendant lights, hand-knotted rug. Photorealistic, high-end Saudi interior, 8K, no people.",
};

// POST /rkz/virtual-staging
// Accepts: multipart/form-data { image: File, style: "modern"|"classic"|"saudi" }
// Returns: { imageUrl: string }
router.post(
  "/rkz/virtual-staging",
  upload.single("image"),
  async (req, res) => {
    try {
      const style = (req.body?.style as string) ?? "modern";
      const prompt = STYLE_PROMPTS[style] ?? STYLE_PROMPTS.modern;

      if (!req.file) {
        res.status(400).json({ error: "No image uploaded" });
        return;
      }

      const aiClient = await resolveAiClient(1);

      const imageFile = await toFile(req.file.buffer, req.file.originalname || "room.jpg", {
        type: req.file.mimetype || "image/jpeg",
      });

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

      // Return as data URL — client can use directly as Image source
      const imageUrl = `data:image/png;base64,${b64}`;
      res.json({ imageUrl });
    } catch (err: unknown) {
      req.log.error({ err }, "virtual-staging error");
      res.status(500).json({ error: String(err instanceof Error ? err.message : err) });
    }
  },
);

export default router;
