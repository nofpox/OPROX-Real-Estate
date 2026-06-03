import { Router } from "express";
const router = Router();
router.get("/health", (_req, res) => res.json({ status: "ok", service: "realestate-api" }));
export default router;
