import test from "node:test";
import assert from "node:assert/strict";
import {
  parseBriefFromText,
  generateArchitectConcept,
  generateConceptOptions,
  reviseArchitectConcept,
  generateHandoffPackage,
  create3DGenerationJob,
  createArchitectProject,
  getArchitectProject,
  updateArchitectProject,
  attachConceptToProject,
  getProjectConcept,
  restoreConceptVersion,
  create3DJobForProject,
  exportHandoffForProject,
} from "../src/lib/architect-engine.js";
import { processConciergeRequest } from "../src/lib/ai-concierge-engine.js";

test("Phase 9 — OPROX AI Architect Engine Tests", async (t) => {
  await t.test("Section 3 — Natural Language Brief Parsing (Arabic)", () => {
    const rawText = "عندي أرض 500 متر وأبي فيلا دورين فيها 5 غرف ومجلس رجال ومسبح وحديقة وغرفة سائق";
    const brief = parseBriefFromText(rawText, { city: "الرياض", district: "حي حطين" });

    assert.equal(brief.projectType, "land");
    assert.equal(brief.plotAreaSqm, 500);
    assert.equal(brief.floorsCount, 2);
    assert.equal(brief.bedrooms, 5);
    assert.equal(brief.hasMajlis, true);
    assert.equal(brief.hasPool, true);
    assert.equal(brief.hasGarden, true);
    assert.equal(brief.hasDriverRoom, true);
    assert.ok(brief.extractedFields.length > 0);
  });

  await t.test("Section 3 — Natural Language Brief Parsing (English)", () => {
    const rawText = "Design a two-story villa on a 600 sqm plot with 5 bedrooms, a majlis, family living area, swimming pool, garden, and driver room";
    const brief = parseBriefFromText(rawText, { city: "Riyadh", district: "Hittin" });

    assert.equal(brief.plotAreaSqm, 600);
    assert.equal(brief.floorsCount, 2);
    assert.equal(brief.bedrooms, 5);
    assert.equal(brief.hasMajlis, true);
    assert.equal(brief.hasPool, true);
    assert.equal(brief.hasGarden, true);
    assert.equal(brief.hasDriverRoom, true);
  });

  await t.test("Section 2 — Production Mode Persistence Guardrail", () => {
    const oldEnv = process.env.NODE_ENV;
    const oldDb = process.env.DATABASE_URL;
    try {
      process.env.NODE_ENV = "production";
      delete process.env.DATABASE_URL;
      assert.throws(
        () => createArchitectProject({ tenantId: 1, userId: "usr_A" }, { title: "Prod Test" }),
        (err: Error) => err.message.includes("PERSISTENCE_ERROR")
      );
    } finally {
      process.env.NODE_ENV = oldEnv;
      process.env.DATABASE_URL = oldDb;
    }
  });

  await t.test("Section 4 — Revision Loop & Version Restore (V1 -> V2 -> V3 -> V4 -> V5 -> Restore V2)", () => {
    const ctx = { tenantId: 1, userId: "usr_A" };
    const proj = createArchitectProject(ctx, { title: "Version Restore Villa" });
    const brief = parseBriefFromText("فيلا دورين بمساحة 500m2", {});
    
    // V1 Initial
    let concept = generateArchitectConcept(brief, {}, "A");
    attachConceptToProject(proj.id, concept, ctx);
    assert.equal(concept.version, 1);
    
    // V2 Revision: "كبر المجلس"
    concept = reviseArchitectConcept(concept, "كبر المجلس");
    assert.equal(concept.version, 2);
    const v2Snapshot = JSON.parse(JSON.stringify(concept));
    attachConceptToProject(proj.id, concept, ctx);

    // V3 Revision: "خل المسبح خلفي"
    concept = reviseArchitectConcept(concept, "خل المسبح خلفي");
    assert.equal(concept.version, 3);
    attachConceptToProject(proj.id, concept, ctx);

    // V4 Revision: "حول غرفة الدور الأرضي إلى مكتب"
    concept = reviseArchitectConcept(concept, "حول غرفة الدور الأرضي إلى مكتب");
    assert.equal(concept.version, 4);
    attachConceptToProject(proj.id, concept, ctx);

    // V5 Revision: "خل الدور الثاني أربع غرف"
    concept = reviseArchitectConcept(concept, "خل الدور الثاني أربع غرف");
    assert.equal(concept.version, 5);
    attachConceptToProject(proj.id, concept, ctx);

    // Restore V2
    const restoredV2 = restoreConceptVersion(proj.id, concept.id!, 2, ctx);
    assert.equal(restoredV2.version, 2);
    assert.equal(restoredV2.totalBuiltAreaSqm, v2Snapshot.totalBuiltAreaSqm);
    assert.deepEqual(restoredV2.spaceProgram, v2Snapshot.spaceProgram);
  });

  await t.test("Section 4 — Concept A, B, C Structural Differentiation Evidence", () => {
    const brief = parseBriefFromText("فيلا مودرن 500m2", {});
    const opts = generateConceptOptions(brief, {});

    assert.notEqual(opts.conceptA.conceptNameAr, opts.conceptB.conceptNameAr);
    assert.notEqual(opts.conceptB.conceptNameAr, opts.conceptC.conceptNameAr);
    assert.notEqual(opts.conceptA.conceptKey, opts.conceptB.conceptKey);
    assert.ok(opts.comparisonSummaryAr.includes("الخيار (أ)"));
  });

  await t.test("Section 4 — Conceptual Floor Geometry Safety", () => {
    const brief = parseBriefFromText("فيلا دورين 500m2", {});
    const concept = generateArchitectConcept(brief, {}, "A");

    assert.ok(concept.floorPlanModel.floors.length > 0);
    concept.floorPlanModel.floors.forEach((fl) => {
      assert.ok(fl.floorKey);
      assert.ok(fl.spaces.length > 0);

      fl.spaces.forEach((rm) => {
        assert.ok(rm.width > 0, "Width must be positive");
        assert.ok(rm.height > 0, "Height must be positive");
        assert.ok(!isNaN(rm.width) && isFinite(rm.width));
        assert.ok(!isNaN(rm.height) && isFinite(rm.height));
        assert.ok(!isNaN(rm.x) && !isNaN(rm.y));
      });
    });
  });

  await t.test("Section 2 — Tenant & User Isolation Hard Rejection Gate", () => {
    const tenant1UserA = { tenantId: 1, userId: "usr_A" };
    const tenant1UserB = { tenantId: 1, userId: "usr_B" };
    const tenant2UserC = { tenantId: 2, userId: "usr_C" };

    // 1. User A creates project
    const projA = createArchitectProject(tenant1UserA, { title: "User A Villa Project", plotAreaSqm: 600 });
    assert.equal(projA.tenantId, 1);
    assert.equal(projA.userId, "usr_A");

    // 2. User A reads own project
    const fetchedA = getArchitectProject(projA.id, tenant1UserA);
    assert.equal(fetchedA.title, "User A Villa Project");

    // 3. User A updates own project
    const updatedA = updateArchitectProject(projA.id, tenant1UserA, { title: "User A Updated Title" });
    assert.equal(updatedA.title, "User A Updated Title");

    // 4. User B attempts to read User A project (Must be rejected)
    assert.throws(
      () => getArchitectProject(projA.id, tenant1UserB),
      (err: Error) => err.message.includes("FORBIDDEN_CROSS_USER")
    );

    // 5. User B attempts to modify User A project (Must be rejected)
    assert.throws(
      () => updateArchitectProject(projA.id, tenant1UserB, { title: "Hacked Title" }),
      (err: Error) => err.message.includes("FORBIDDEN_CROSS_USER")
    );

    // 6. Tenant 2 attempts to access Tenant 1 project (Must be rejected)
    assert.throws(
      () => getArchitectProject(projA.id, tenant2UserC),
      (err: Error) => err.message.includes("FORBIDDEN_CROSS_TENANT")
    );

    // Attach concept to User A project
    const brief = parseBriefFromText("فيلا 600م²", {});
    const conceptA = generateArchitectConcept(brief, {}, "A");
    attachConceptToProject(projA.id, conceptA, tenant1UserA);

    // Create a second project for User A
    const projA2 = createArchitectProject(tenant1UserA, { title: "User A Project 2" });

    // 7. Cross-project concept access (Must be rejected)
    assert.throws(
      () => getProjectConcept(projA2.id, conceptA.id!, tenant1UserA),
      (err: Error) => err.message.includes("FORBIDDEN_CROSS_PROJECT")
    );

    // 8. Cross-project version restore (Must be rejected)
    assert.throws(
      () => restoreConceptVersion(projA2.id, conceptA.id!, 1, tenant1UserA),
      (err: Error) => err.message.includes("FORBIDDEN_CROSS_PROJECT")
    );

    // 9. Cross-project export (Must be rejected)
    assert.throws(
      () => exportHandoffForProject(projA2.id, conceptA.id!, brief, tenant1UserA),
      (err: Error) => err.message.includes("FORBIDDEN_CROSS_PROJECT")
    );

    // 10. Cross-project 3D generation request (Must be rejected)
    assert.throws(
      () => create3DJobForProject(projA2.id, conceptA.id!, tenant1UserA),
      (err: Error) => err.message.includes("FORBIDDEN_CROSS_PROJECT")
    );
  });

  await t.test("should generate structured concept with accurate mathematical area summation and explicit assumptions", () => {
    const brief = parseBriefFromText("فيلا مودرن 5 غرف نوم ومجلس ومسبح في جدة", {
      plotAreaSqm: 500,
      dimensions: "20m x 25m",
    });

    const concept = generateArchitectConcept(brief, {}, "A");

    assert.equal(concept.conceptKey, "A");
    assert.ok(concept.spaceProgram.length > 5);

    // Verify mathematical summation of total built area
    const calculatedSum = concept.spaceProgram.reduce((acc, item) => acc + item.approxAreaSqm, 0);
    assert.equal(concept.totalBuiltAreaSqm, calculatedSum);

    // Verify explicit assumptions classification
    assert.ok(concept.assumptions.some((a) => a.source === "USER_PROVIDED"));
    assert.ok(concept.assumptions.some((a) => a.source === "AI_ASSUMPTION"));

    // Verify regulatory and engineering disclaimers
    assert.ok(concept.boundaries.regulatoryDisclaimer.includes("DOES NOT CONSTITUTE SAUDI BUILDING CODE OR MUNICIPAL (BALADY) APPROVAL"));
    assert.ok(concept.boundaries.structuralDisclaimer.includes("CONCEPT ONLY"));
  });

  await t.test("should generate 3 distinct concept options for side-by-side comparison", () => {
    const brief = parseBriefFromText("فيلا سكنية 4 غرف نوم بمساحة 450m2", {});
    const options = generateConceptOptions(brief, {});

    assert.equal(options.conceptA.conceptKey, "A");
    assert.equal(options.conceptB.conceptKey, "B");
    assert.equal(options.conceptC.conceptKey, "C");
    assert.ok(options.comparisonSummaryAr.includes("الخيار (أ)"));
  });

  await t.test("should process conversational revision loop correctly and increment version", () => {
    const brief = parseBriefFromText("فيلا سكنية دورين", { plotAreaSqm: 500 });
    const initialConcept = generateArchitectConcept(brief, {}, "A");

    assert.equal(initialConcept.version, 1);

    const revised = reviseArchitectConcept(initialConcept, "كبر المجلس وخل المسبح خلفي");

    assert.equal(revised.version, 2);
    assert.equal(revised.totalBuiltAreaSqm, revised.spaceProgram.reduce((acc, s) => acc + s.approxAreaSqm, 0));
    assert.ok(revised.designRationaleAr.includes("تحديث الإصدار V2"));
  });

  await t.test("should handle 3D job creation with explicit classification label", () => {
    const brief = parseBriefFromText("فيلا 500م²", {});
    const concept = generateArchitectConcept(brief, {}, "A");
    const job = create3DGenerationJob(1, concept, false);

    assert.equal(job.status, "COMPLETED");
    assert.equal(job.classification, "AI-GENERATED MODEL");
    assert.ok(job.errorMessage?.includes("REAL 3D GENERATION PROVIDER NOT TESTED"));
  });

  await t.test("should generate professional handoff package with all disclaimers intact", () => {
    const brief = parseBriefFromText("فيلا 500م²", {});
    const concept = generateArchitectConcept(brief, {}, "A");
    const pkg = generateHandoffPackage(brief, concept, [], {});

    assert.ok(pkg.title.includes(concept.conceptNameAr));
    assert.ok(pkg.disclaimer.includes("كود البناء السعودي"));
  });

  await t.test("should process AI Concierge Phase 9 architectural actions", async () => {
    const res1 = await processConciergeRequest([{ role: "user", content: "صمم لي أرض 500m2 فيلا دورين في الرياض" }]);
    assert.ok(res1.actions?.some((a) => a.action === "CREATE_ARCHITECT_BRIEF"));

    const res2 = await processConciergeRequest([{ role: "user", content: "افتح الاستوديو المعماري" }]);
    assert.ok(res2.actions?.some((a) => a.action === "OPEN_AI_ARCHITECT"));

    const res3 = await processConciergeRequest([{ role: "user", content: "تعديل المخطط وكبر المجلس" }]);
    assert.ok(res3.actions?.some((a) => a.action === "REVISE_ARCHITECT_CONCEPT"));

    const res4 = await processConciergeRequest([{ role: "user", content: "مقارنة التصاميم المعمارية" }]);
    assert.ok(res4.actions?.some((a) => a.action === "COMPARE_ARCHITECT_CONCEPTS"));
  });
});
