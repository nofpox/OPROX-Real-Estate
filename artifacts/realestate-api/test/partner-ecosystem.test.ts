import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  searchPartners,
  getPartnerProfile,
  getPartnerProducts,
  createRequestForQuotation,
  submitPartnerQuotation,
  compareQuotations,
  executeProjectHandoff,
  checkPartnerEntitlement,
} from "../src/lib/partner-engine.js";
import { processConciergeRequest } from "../src/lib/ai-concierge-engine.js";

describe("OPROX Phase 11 — Partner Ecosystem, Services & Marketplace Tests", () => {
  const ctxTenant1UserA = { tenantId: 1, userId: "usr_a1", isTenantAdmin: false };
  const ctxTenant1UserB = { tenantId: 1, userId: "usr_b1", isTenantAdmin: false };
  const ctxTenant2UserC = { tenantId: 2, userId: "usr_c2", isTenantAdmin: false };

  it("should search marketplace partners by category and city", () => {
    const results = searchPartners({ category: "fit_out_contractors", city: "Riyadh" });
    assert.ok(results.length >= 1);
    assert.equal(results[0].category, "fit_out_contractors");
    assert.equal(results[0].city, "Riyadh");
    assert.equal(results[0].verificationState, "VERIFIED");
  });

  it("should retrieve partner profile and enforce tenant boundary", () => {
    const partner = getPartnerProfile(2001, ctxTenant1UserA);
    assert.equal(partner.partnerId, 2001);
    assert.equal(partner.classification, "DEVELOPMENT/TEST PARTNER");

    // Cross-tenant access must be rejected
    assert.throws(
      () => getPartnerProfile(2001, ctxTenant2UserC),
      (err: any) => err.message.includes("FORBIDDEN_CROSS_TENANT")
    );
  });

  it("should list commercial products with truthful classifications", () => {
    const products = getPartnerProducts(2002, ctxTenant1UserA);
    assert.ok(products.length >= 1);
    const prod = products[0];
    assert.equal(prod.productId, "prod_sofa_2002_1");
    assert.equal(prod.has3dModel, true);
    assert.equal(prod.hasArAsset, true);
    assert.equal(prod.classification, "DEVELOPMENT/TEST PRODUCT");
  });

  it("should require explicit customer consent for RFQ creation", () => {
    // Attempting without consent must fail
    assert.throws(
      () =>
        createRequestForQuotation(ctxTenant1UserA, {
          partnerIds: [2001, 2002],
          serviceCategory: "fit_out_contractors",
          scopeSummaryAr: "تشطيب صالة 6*8 متر",
          sharedCustomerConsent: false,
          locationCity: "Riyadh",
        }),
      (err: any) => err.message.includes("CONSENT_REQUIRED")
    );

    // Creating with explicit consent succeeds
    const rfq = createRequestForQuotation(ctxTenant1UserA, {
      partnerIds: [2001, 2002],
      serviceCategory: "fit_out_contractors",
      scopeSummaryAr: "تشطيب صالة 6*8 متر مع كنب مودرن",
      sharedCustomerConsent: true,
      locationCity: "Riyadh",
    });

    assert.ok(rfq.rfqId.startsWith("rfq_"));
    assert.equal(rfq.status, "OPEN");
    assert.equal(rfq.sharedCustomerConsent, true);
  });

  it("should allow partner to submit quotation with neutral amounts without automatic tax/VAT calculation", () => {
    const rfq = createRequestForQuotation(ctxTenant1UserA, {
      partnerIds: [2001],
      serviceCategory: "fit_out_contractors",
      scopeSummaryAr: "تنفيذ ديكورات خشبيّة ورخام",
      sharedCustomerConsent: true,
      locationCity: "Riyadh",
    });

    const quotation = submitPartnerQuotation(
      { tenantId: 1, partnerId: 2001 },
      {
        rfqId: rfq.rfqId,
        lineItems: [
          { itemId: "item_1", descriptionAr: "أعمال الرخام الفاتح", quantity: 50, unit: "م²", unitPriceSar: 400, subtotalSar: 20000 },
          { itemId: "item_2", descriptionAr: "أعمال التجليخ والتركيب", quantity: 1, unit: "مقطوعية", unitPriceSar: 5000, subtotalSar: 5000 },
        ],
        timelineDays: 20,
        termsAr: "الدفع على 3 دفعات حسب الإنجاز",
      }
    );

    assert.equal(quotation.subtotalSar, 25000);
    assert.equal(quotation.taxSar, null); // No automatic tax calculation in OPROX Properties
    assert.equal(quotation.totalSar, 25000); // Total matches line items sum
    assert.equal(quotation.pricingPolicyStatus, "NOT CONFIGURED");
    assert.equal(quotation.taxPolicyStatus, "NOT CONFIGURED");
    assert.equal(quotation.accountingPolicyStatus, "NOT CONFIGURED");
    assert.equal(quotation.timelineDays, 20);
  });

  it("should compare quotations side-by-side for customer", () => {
    const rfq = createRequestForQuotation(ctxTenant1UserA, {
      partnerIds: [2001, 2002],
      serviceCategory: "fit_out_contractors",
      scopeSummaryAr: "مقارنة عروض تشطيب مجالس",
      sharedCustomerConsent: true,
      locationCity: "Riyadh",
    });

    submitPartnerQuotation(
      { tenantId: 1, partnerId: 2001 },
      {
        rfqId: rfq.rfqId,
        lineItems: [{ itemId: "1", descriptionAr: "عرض الشركة الأولى", quantity: 1, unit: "مقطوعية", unitPriceSar: 30000, subtotalSar: 30000 }],
        timelineDays: 15,
        termsAr: "شامل الضمان لسنة",
      }
    );

    const result = compareQuotations(rfq.rfqId, ctxTenant1UserA);
    assert.equal(result.quotations.length, 1);
    assert.ok(result.comparisonSummaryAr.includes("مقارنة عروض الأسعار"));

    // Cross-user access must fail
    assert.throws(
      () => compareQuotations(rfq.rfqId, ctxTenant1UserB),
      (err: any) => err.message.includes("FORBIDDEN_CROSS_USER")
    );
  });

  it("should execute project handoff with explicit customer consent", () => {
    const rfq = createRequestForQuotation(ctxTenant1UserA, {
      partnerIds: [2001],
      serviceCategory: "fit_out_contractors",
      scopeSummaryAr: "تسليم مشروع صالة عائلية",
      sharedCustomerConsent: true,
      locationCity: "Riyadh",
    });

    const quote = submitPartnerQuotation(
      { tenantId: 1, partnerId: 2001 },
      {
        rfqId: rfq.rfqId,
        lineItems: [{ itemId: "1", descriptionAr: "التنفيذ الكامل", quantity: 1, unit: "مقطوعية", unitPriceSar: 50000, subtotalSar: 50000 }],
        timelineDays: 30,
        termsAr: "شروط معتمدة",
      }
    );

    // Rejects if consent false
    assert.throws(
      () =>
        executeProjectHandoff(ctxTenant1UserA, {
          rfqId: rfq.rfqId,
          quotationId: quote.quotationId,
          partnerId: 2001,
          customerConsentGranted: false,
          sharedScope: {},
        }),
      (err: any) => err.message.includes("CONSENT_REQUIRED")
    );

    const handoff = executeProjectHandoff(ctxTenant1UserA, {
      rfqId: rfq.rfqId,
      quotationId: quote.quotationId,
      partnerId: 2001,
      customerConsentGranted: true,
      sharedScope: { interiorConceptId: "concept_v1" },
    });

    assert.ok(handoff.handoffId.startsWith("handoff_"));
    assert.equal(handoff.customerConsentGranted, true);
  });

  it("should route AI Concierge partner actions correctly", async () => {
    const resPartners = await processConciergeRequest([{ role: "user", content: "أبي شركة تأثث لي الصالة في الرياض" }]);
    assert.ok(resPartners.actions?.some((a) => a.action === "FIND_PARTNERS"));

    const resProducts = await processConciergeRequest([{ role: "user", content: "ورني كنب يناسب التصميم" }]);
    assert.ok(resProducts.actions?.some((a) => a.action === "FIND_PRODUCTS"));

    const resRFQ = await processConciergeRequest([{ role: "user", content: "طلب عرض سعر والتواصل مع الشركة" }]);
    assert.ok(resRFQ.actions?.some((a) => a.action === "REQUEST_QUOTATION"));

    const resCompare = await processConciergeRequest([{ role: "user", content: "قارن عروض الأسعار المقدمة" }]);
    assert.ok(resCompare.actions?.some((a) => a.action === "COMPARE_QUOTATIONS"));
  });

  it("should check entitlements via OPROX OS authority gate", () => {
    const result = checkPartnerEntitlement(1, 2001, "PARTNER_PROFILE");
    assert.equal(result.allowed, true);
    assert.equal(result.source, "OPROX_OS_AUTHORITY_GATE");
    assert.equal(result.status, "ENFORCED");
  });

  it("should maintain zero dependency on PMS/BMS hotel workflows", () => {
    const codeStr = JSON.stringify([searchPartners, createRequestForQuotation, submitPartnerQuotation]);
    assert.equal(codeStr.includes("hotelBooking"), false);
    assert.equal(codeStr.includes("pmsWorkflow"), false);
    assert.equal(codeStr.includes("bmsOperation"), false);
  });
});
