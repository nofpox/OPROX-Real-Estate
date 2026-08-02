import test from "node:test";
import assert from "node:assert/strict";
import {
  parseInteriorBriefFromText,
  generateInteriorConcept,
  generateInteriorOptions,
  reviseInteriorConcept,
  validateFurnitureGeometry,
  createInteriorProject,
  getInteriorProject,
  attachConceptToInteriorProject,
  restoreInteriorConceptVersion,
  generateVirtualStaging,
  createInteriorGenerationJob,
  generateInteriorHandoffPackage,
  checkInteriorEntitlement,
  INTERIOR_STYLES,
} from "../src/lib/interior-engine.js";
import { processConciergeRequest } from "../src/lib/ai-concierge-engine.js";

test("Phase 10 — OPROX AI Interior Design & Virtual Furnishing Engine Tests", async (t) => {
  await t.test("Section 3 — Natural Language Brief Parsing (Arabic)", () => {
    const rawText = "صمم لي صالة معيشة 6 في 8 متر بطراز سعودي معاصر وألوان بيج وخشبي مع رخام وإضاءة مخفية";
    const brief = parseInteriorBriefFromText(rawText, {});

    assert.equal(brief.roomType, "family_living");
    assert.equal(brief.roomDimensions?.widthM, 6);
    assert.equal(brief.roomDimensions?.lengthM, 8);
    assert.equal(brief.designStyle, "saudi_contemporary");
    assert.ok(brief.colorPreferences.length > 0);
    assert.ok(brief.extractedFields.length > 0);
  });

  await t.test("Section 3 — Natural Language Brief Parsing (English)", () => {
    const rawText = "Design a master bedroom 5x6m in luxury style with gold accents and marble flooring";
    const brief = parseInteriorBriefFromText(rawText, {});

    assert.equal(brief.roomType, "master_bedroom");
    assert.equal(brief.roomDimensions?.widthM, 5);
    assert.equal(brief.roomDimensions?.lengthM, 6);
    assert.equal(brief.designStyle, "luxury");
  });

  await t.test("Section 3 — Missing Dimensions & Assumption Classification", () => {
    const brief = parseInteriorBriefFromText("أبي تصميم ديكور لمجلس رجال فاخر", {});

    assert.equal(brief.roomType, "majlis");
    assert.equal(brief.roomDimensions?.widthM, 5);
    assert.equal(brief.roomDimensions?.lengthM, 7);
    assert.ok(brief.assumptions.some((a) => a.code === "ASSUME_DIMENSIONS" && a.source === "AI_ASSUMPTION"));
  });

  await t.test("Section 2 — Production Mode Persistence Guardrail", () => {
    const oldEnv = process.env.NODE_ENV;
    const oldDb = process.env.DATABASE_URL;
    try {
      process.env.NODE_ENV = "production";
      delete process.env.DATABASE_URL;
      assert.throws(
        () => createInteriorProject({ tenantId: 1, userId: "usr_A" }, { title: "Prod Test", roomType: "majlis" }),
        (err: Error) => err.message.includes("PERSISTENCE_ERROR")
      );
    } finally {
      process.env.NODE_ENV = oldEnv;
      process.env.DATABASE_URL = oldDb;
    }
  });

  await t.test("Section 2 — Tenant & User Isolation Hard Rejection Gate", () => {
    const tenant1UserA = { tenantId: 1, userId: "usr_A" };
    const tenant1UserB = { tenantId: 1, userId: "usr_B" };
    const tenant2UserC = { tenantId: 2, userId: "usr_C" };

    // 1. User A creates project
    const projA = createInteriorProject(tenant1UserA, { title: "User A Majlis Project", roomType: "majlis" });
    assert.equal(projA.tenantId, 1);
    assert.equal(projA.userId, "usr_A");

    // 2. User A reads own project
    const fetchedA = getInteriorProject(projA.id, tenant1UserA);
    assert.equal(fetchedA.title, "User A Majlis Project");

    // 3. User B attempts to read User A project (Must be rejected)
    assert.throws(
      () => getInteriorProject(projA.id, tenant1UserB),
      (err: Error) => err.message.includes("FORBIDDEN_CROSS_USER")
    );

    // 4. Tenant 2 attempts to access Tenant 1 project (Must be rejected)
    assert.throws(
      () => getInteriorProject(projA.id, tenant2UserC),
      (err: Error) => err.message.includes("FORBIDDEN_CROSS_TENANT")
    );

    // Attach concept to User A project
    const brief = parseInteriorBriefFromText("مجلس 5 في 7", {});
    const conceptA = generateInteriorConcept(brief, {}, "A");
    attachConceptToInteriorProject(projA.id, conceptA, tenant1UserA);

    const projA2 = createInteriorProject(tenant1UserA, { title: "User A Project 2", roomType: "bedroom" });

    // 5. Cross-project version restore (Must be rejected)
    assert.throws(
      () => restoreInteriorConceptVersion(projA2.id, conceptA.id, 1, tenant1UserA),
      (err: Error) => err.message.includes("FORBIDDEN_CROSS_PROJECT")
    );
  });

  await t.test("Section 6 — Concept A, B, C Structural Differentiation Evidence", () => {
    const brief = parseInteriorBriefFromText("صالة معيشة 6x8م", {});
    const opts = generateInteriorOptions(brief, {});

    assert.notEqual(opts.conceptA.conceptNameAr, opts.conceptB.conceptNameAr);
    assert.notEqual(opts.conceptB.conceptNameAr, opts.conceptC.conceptNameAr);
    assert.notEqual(opts.conceptA.furnishingTier, opts.conceptB.furnishingTier);
    assert.notEqual(opts.conceptA.colorPalette.primaryHex, opts.conceptC.colorPalette.primaryHex);
    assert.ok(opts.comparisonSummaryAr.includes("الخيار (أ)"));
  });

  await t.test("Section 7 — Furniture Layout Geometry Validation", () => {
    const brief = parseInteriorBriefFromText("غرفة نوم 5x6م", {});
    const concept = generateInteriorConcept(brief, {}, "A");

    const validation = validateFurnitureGeometry(concept.furnitureLayout, 5, 6);
    assert.equal(validation.valid, true);
    assert.equal(validation.errors.length, 0);

    // Test geometry error handling
    const invalidLayout = JSON.parse(JSON.stringify(concept.furnitureLayout));
    invalidLayout[0].width = -2; // Negative width
    invalidLayout[1].x = 10; // Exceeds room boundary
    const invalidCheck = validateFurnitureGeometry(invalidLayout, 5, 6);
    assert.equal(invalidCheck.valid, false);
    assert.ok(invalidCheck.errors.length >= 2);
  });

  await t.test("Section 22 & 23 — Conversational Revision Loop & Version Restore", () => {
    const ctx = { tenantId: 1, userId: "usr_A" };
    const proj = createInteriorProject(ctx, { title: "Villa Majlis Design", roomType: "majlis" });
    const brief = parseInteriorBriefFromText("مجلس رجال 6x8", {});

    // V1 Initial
    let concept = generateInteriorConcept(brief, {}, "A");
    attachConceptToInteriorProject(proj.id, concept, ctx);
    assert.equal(concept.version, 1);

    // V2 Revision: "كبر الكنبة"
    concept = reviseInteriorConcept(concept, "كبر الكنبة");
    assert.equal(concept.version, 2);
    const v2Snapshot = JSON.parse(JSON.stringify(concept));
    attachConceptToInteriorProject(proj.id, concept, ctx);

    // V3 Revision: "غير لون الجدار"
    concept = reviseInteriorConcept(concept, "غير لون الجدار");
    assert.equal(concept.version, 3);
    attachConceptToInteriorProject(proj.id, concept, ctx);

    // V4 Revision: "بدل الرخام"
    concept = reviseInteriorConcept(concept, "بدل الرخام");
    assert.equal(concept.version, 4);
    attachConceptToInteriorProject(proj.id, concept, ctx);

    // V5 Revision: "شيل الكرسي"
    concept = reviseInteriorConcept(concept, "شيل الكرسي");
    assert.equal(concept.version, 5);
    attachConceptToInteriorProject(proj.id, concept, ctx);

    // Restore V2
    const restoredV2 = restoreInteriorConceptVersion(proj.id, concept.id, 2, ctx);
    assert.equal(restoredV2.version, 2);
    assert.equal(restoredV2.colorPalette.primaryHex, v2Snapshot.colorPalette.primaryHex);
    assert.deepEqual(restoredV2.furnitureLayout, v2Snapshot.furnitureLayout);
  });

  await t.test("Section 9 — Virtual Staging & Classification Labels", () => {
    const stagingRes = generateVirtualStaging({
      originalImageUrl: "https://example.com/empty_room.jpg",
      roomType: "family_living",
      targetStyle: "saudi_contemporary",
      mode: "EMPTY_TO_FURNISHED",
      disclaimerLabel: "AI-MODIFIED PROPERTY PHOTO",
    });

    assert.equal(stagingRes.disclaimerLabel, "AI-MODIFIED PROPERTY PHOTO");
    assert.equal(stagingRes.classification, "AI-MODIFIED PROPERTY PHOTO / VIRTUAL STAGING CONCEPT");
    assert.ok(stagingRes.stagedImageUrl.includes("_staged_"));
  });

  await t.test("Section 10 — Image Generation Job Lifecycle & Classification", () => {
    const brief = parseInteriorBriefFromText("صالة 5x6م", {});
    const concept = generateInteriorConcept(brief, {}, "A");
    const job = createInteriorGenerationJob(1, "usr_A", concept);

    assert.equal(job.status, "COMPLETED");
    assert.equal(job.classification, "REAL PROVIDER GENERATION NOT TESTED / DEVELOPMENT FALLBACK");
    assert.ok(job.errorMessage?.includes("REAL IMAGE GENERATION PROVIDER NOT TESTED"));
  });

  await t.test("Section 27 — Professional Handoff Package & Disclaimers", () => {
    const brief = parseInteriorBriefFromText("صالة 6x8م", {});
    const concept = generateInteriorConcept(brief, {}, "A");
    const pkg = generateInteriorHandoffPackage(brief, concept, [], { tenantId: 1, userId: "usr_A" });

    assert.ok(pkg.title.includes(concept.conceptNameAr));
    assert.ok(pkg.disclaimers.professionalBoundary.includes("AI-GENERATED INTERIOR CONCEPT"));
    assert.equal(pkg.disclaimers.pricingDisclaimer, "PRICE NOT AVAILABLE. Product references and prices require verified vendor quotes.");
    assert.equal(pkg.partnerIntegrationContract.status, "PHASE_11_CONTRACT_READY");
  });

  await t.test("Section 28 — OPROX OS Entitlements Enforcement", () => {
    const ent = checkInteriorEntitlement(1, "usr_A", "INTERIOR_ROOM_DESIGN");
    assert.equal(ent.allowed, true);
    assert.equal(ent.source, "OPROX_OS_AUTHORITY_GATE");
    assert.equal(ent.status, "ENFORCED");
  });

  await t.test("Section 21 — AI Concierge Phase 10 Interior Design Actions", async () => {
    const res1 = await processConciergeRequest([{ role: "user", content: "افتح التصميم الداخلي" }]);
    assert.ok(res1.actions?.some((a) => a.action === "OPEN_INTERIOR_DESIGN"));

    const res2 = await processConciergeRequest([{ role: "user", content: "صمم لي صالة معيشة فيلا" }]);
    assert.ok(res2.actions?.some((a) => a.action === "CREATE_INTERIOR_BRIEF"));

    const res3 = await processConciergeRequest([{ role: "user", content: "غير ستايل الغرفة لنيو كلاسيك" }]);
    assert.ok(res3.actions?.some((a) => a.action === "CHANGE_INTERIOR_STYLE"));

    const res4 = await processConciergeRequest([{ role: "user", content: "ألوان أفتح للجدران" }]);
    assert.ok(res4.actions?.some((a) => a.action === "CHANGE_COLOR_PALETTE"));

    const res5 = await processConciergeRequest([{ role: "user", content: "بدل الرخام بالجرانيت" }]);
    assert.ok(res5.actions?.some((a) => a.action === "CHANGE_MATERIAL"));

    const res6 = await processConciergeRequest([{ role: "user", content: "حط طاولة قهوة زجاجية" }]);
    assert.ok(res6.actions?.some((a) => a.action === "ADD_FURNITURE"));

    const res7 = await processConciergeRequest([{ role: "user", content: "شيل الكرسي الجانبي" }]);
    assert.ok(res7.actions?.some((a) => a.action === "REMOVE_FURNITURE"));

    const res8 = await processConciergeRequest([{ role: "user", content: "شوف هذا الأثاث داخل الغرفة بالواقع المعزز" }]);
    assert.ok(res8.actions?.some((a) => a.action === "OPEN_FURNITURE_AR"));

    const res9 = await processConciergeRequest([{ role: "user", content: "سوي تأثيث افتراضي للصورة" }]);
    assert.ok(res9.actions?.some((a) => a.action === "GENERATE_VIRTUAL_STAGING"));

    const res10 = await processConciergeRequest([{ role: "user", content: "تصدير حزمة الديكور" }]);
    assert.ok(res10.actions?.some((a) => a.action === "EXPORT_INTERIOR_CONCEPT"));
  });

  await t.test("Section 37 — Zero Dependency on PMS/BMS Hotel Workflows", () => {
    const brief = parseInteriorBriefFromText("مجلس 6x8م", {});
    const concept = generateInteriorConcept(brief, {}, "A");

    const jsonStr = JSON.stringify(concept).toLowerCase();
    assert.equal(jsonStr.includes("hotel"), false);
    assert.equal(jsonStr.includes("checkin"), false);
    assert.equal(jsonStr.includes("housekeeping"), false);
    assert.equal(jsonStr.includes("guest_folio"), false);
  });
});
