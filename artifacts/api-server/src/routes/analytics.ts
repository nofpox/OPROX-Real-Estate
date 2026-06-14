import { Router } from "express";
import { trackEvent } from "../middleware/trackEvent.js";

const router = Router();

/** POST /analytics/track — client-side event tracking */
router.post("/analytics/track", async (req, res) => {
  const { event_name } = req.body as { event_name?: string };
  if (!event_name || typeof event_name !== "string") {
    res.status(400).json({ error: "event_name is required" }); return;
  }
  await trackEvent(req, event_name);
  res.status(204).end();
});

export default router;
