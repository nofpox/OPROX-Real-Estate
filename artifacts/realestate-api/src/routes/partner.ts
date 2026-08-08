import { Router, Request, Response } from "express";
import {
  searchPartners,
  getPartnerProfile,
  getPartnerProducts,
  createRequestForQuotation,
  submitPartnerQuotation,
  compareQuotations,
  executeProjectHandoff,
  checkPartnerEntitlement,
  PartnerCategoryKey,
  VerificationState,
} from "../lib/partner-engine.js";

const router = Router();

function extractSecurityContext(req: Request) {
  const tenantId = parseInt(req.header("x-tenant-id") || "1", 10);
  const userId = req.header("x-user-id") || "user_demo_1";
  const isTenantAdmin = req.header("x-tenant-admin") === "true";
  return { tenantId, userId, isTenantAdmin };
}

/** Map structured error code prefixes to HTTP status codes without leaking stack details. */
function handlePartnerError(res: Response, err: unknown): void {
  const msg = err instanceof Error ? err.message : "";
  if (msg.startsWith("FORBIDDEN"))       { res.status(403).json({ success: false, error: "Forbidden" }); return; }
  if (msg.startsWith("NOT_FOUND"))       { res.status(404).json({ success: false, error: "Not found" }); return; }
  if (msg.startsWith("CONSENT_REQUIRED")){ res.status(400).json({ success: false, error: "Customer consent is required" }); return; }
  if (msg.startsWith("PERSISTENCE_ERROR")){ res.status(500).json({ success: false, error: "Persistence error" }); return; }
  res.status(500).json({ success: false, error: "Internal server error" });
}

// GET /api/partner/search - Search marketplace partners
router.get("/search", (req: Request, res: Response) => {
  try {
    const category = req.query.category as PartnerCategoryKey | undefined;
    const city = req.query.city as string | undefined;
    const verificationState = req.query.verificationState as VerificationState | undefined;
    const tenantId = req.query.tenantId ? parseInt(req.query.tenantId as string, 10) : undefined;

    const partners = searchPartners({ category, city, verificationState, tenantId });
    res.json({ success: true, count: partners.length, partners });
  } catch (err) {
    handlePartnerError(res, err);
  }
});

// GET /api/partner/profile/:partnerId - Get partner storefront profile
router.get("/profile/:partnerId", (req: Request, res: Response) => {
  try {
    const context = extractSecurityContext(req);
    const partnerId = parseInt(req.params["partnerId"] as string, 10);

    const profile = getPartnerProfile(partnerId, context);
    res.json({ success: true, profile });
  } catch (err) {
    handlePartnerError(res, err);
  }
});

// GET /api/partner/products/:partnerId - Get partner products catalog
router.get("/products/:partnerId", (req: Request, res: Response) => {
  try {
    const context = extractSecurityContext(req);
    const partnerId = parseInt(req.params["partnerId"] as string, 10);

    const products = getPartnerProducts(partnerId, context);
    res.json({ success: true, count: products.length, products });
  } catch (err) {
    handlePartnerError(res, err);
  }
});

// POST /api/partner/rfq - Create Request for Quotation
router.post("/rfq", (req: Request, res: Response) => {
  try {
    const context = extractSecurityContext(req);
    const { partnerIds, serviceCategory, scopeSummaryAr, propertyId, architectProjectId, interiorProjectId, sharedCustomerConsent, locationCity } = req.body;

    const rfq = createRequestForQuotation(context, {
      partnerIds: partnerIds || [],
      serviceCategory,
      scopeSummaryAr,
      propertyId,
      architectProjectId,
      interiorProjectId,
      sharedCustomerConsent: !!sharedCustomerConsent,
      locationCity: locationCity || "Riyadh",
    });

    res.status(201).json({ success: true, rfq });
  } catch (err) {
    handlePartnerError(res, err);
  }
});

// POST /api/partner/quotation - Submit partner quotation
router.post("/quotation", (req: Request, res: Response) => {
  try {
    const tenantId = parseInt(req.header("x-tenant-id") || "1", 10);
    const partnerId = parseInt(req.header("x-partner-id") || "2001", 10);
    const { rfqId, lineItems, timelineDays, termsAr } = req.body;

    const quotation = submitPartnerQuotation(
      { tenantId, partnerId },
      { rfqId, lineItems: lineItems || [], timelineDays: timelineDays || 14, termsAr: termsAr || "" }
    );

    res.status(201).json({ success: true, quotation });
  } catch (err) {
    handlePartnerError(res, err);
  }
});

// GET /api/partner/rfq/:rfqId/compare - Compare quotations
router.get("/rfq/:rfqId/compare", (req: Request, res: Response) => {
  try {
    const context = extractSecurityContext(req);
    const rfqId = req.params["rfqId"] as string;

    const result = compareQuotations(rfqId, context);
    res.json({ success: true, ...result });
  } catch (err) {
    handlePartnerError(res, err);
  }
});

// POST /api/partner/handoff - Execute project handoff to selected partner
router.post("/handoff", (req: Request, res: Response) => {
  try {
    const context = extractSecurityContext(req);
    const { rfqId, quotationId, partnerId, customerConsentGranted, sharedScope } = req.body;

    const handoff = executeProjectHandoff(context, {
      rfqId,
      quotationId,
      partnerId,
      customerConsentGranted: !!customerConsentGranted,
      sharedScope: sharedScope || {},
    });

    res.status(200).json({ success: true, handoff });
  } catch (err) {
    handlePartnerError(res, err);
  }
});

// GET /api/partner/entitlements/check - Check OPROX OS entitlement
router.get("/entitlements/check", (req: Request, res: Response) => {
  try {
    const tenantId = parseInt(req.header("x-tenant-id") || "1", 10);
    const partnerId = parseInt(req.query.partnerId as string || "2001", 10);
    const key = (req.query.key as string || "PARTNER_PROFILE") as any;

    const result = checkPartnerEntitlement(tenantId, partnerId, key);
    res.json({ success: true, ...result });
  } catch {
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
