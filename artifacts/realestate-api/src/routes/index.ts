import { Router } from "express";
import healthRouter        from "./health.js";
import cmsRouter           from "./cms.js";
import guestRouter         from "./guest.js";
import listingsRouter      from "./listings.js";
import sitemapRouter       from "./sitemap.js";
import openaiRouter        from "./openai/index.js";
import portalContactRouter from "./portal-contact.js";
import previewLinksRouter  from "./preview-links.js";
import rkzAiRouter         from "./rkz-ai.js";
import valuationRouter     from "./valuation.js";
import architectRouter     from "./architect.js";
import interiorRouter      from "./interior.js";
import partnerRouter       from "./partner.js";

const router = Router();

router.use(healthRouter);
router.use(cmsRouter);
router.use(guestRouter);
router.use(listingsRouter);
router.use(sitemapRouter);
router.use(openaiRouter);
router.use(portalContactRouter);
router.use(previewLinksRouter);
router.use("/api/rkz", rkzAiRouter);
router.use("/rkz", rkzAiRouter);
router.use("/api/valuation", valuationRouter);
router.use("/api/architect", architectRouter);
router.use("/api/interior", interiorRouter);
router.use("/api/partner", partnerRouter);

export default router;
