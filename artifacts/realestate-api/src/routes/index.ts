import { Router } from "express";
import healthRouter        from "./health.js";
import cmsRouter           from "./cms.js";
import guestRouter         from "./guest.js";
import listingsRouter      from "./listings.js";
import sitemapRouter       from "./sitemap.js";
import openaiRouter        from "./openai/index.js";
import portalContactRouter from "./portal-contact.js";
import previewLinksRouter  from "./preview-links.js";

const router = Router();

router.use(healthRouter);
router.use(cmsRouter);
router.use(guestRouter);
router.use(listingsRouter);
router.use(sitemapRouter);
router.use(openaiRouter);
router.use(portalContactRouter);
router.use(previewLinksRouter);

export default router;
