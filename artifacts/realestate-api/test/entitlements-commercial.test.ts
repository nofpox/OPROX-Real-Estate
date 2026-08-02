import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  checkOproxOsEntitlement,
  reserveUsageAtomic,
  finalizeUsage,
  getPropertiesFeatureCatalog,
  getCommercialAuditLogs,
  getCommercialStatusSummary,
  resetCommercialEngineState,
  PropertiesCapability,
} from "../src/lib/oprox-os-commercial-engine.js";
import { checkInteriorEntitlement } from "../src/lib/interior-engine.js";
import { checkPartnerEntitlement } from "../src/lib/partner-engine.js";
import { processConciergeRequest } from "../src/lib/ai-concierge-engine.js";

describe("OPROX Phase 12 — OPROX OS Commercial Integration, Entitlements & Paid Feature Control", () => {
  const ctxTenant1UserA = { tenantId: 1, userId: "usr_a1" };
  const ctxTenant1UserB = { tenantId: 1, userId: "usr_b1" };
  const ctxTenant2UserC = { tenantId: 2, userId: "usr_c2" };

  beforeEach(() => {
    resetCommercialEngineState();
  });

  it("should register all 38 Properties capabilities with OPROX OS without hardcoded prices or taxes", () => {
    const catalog = getPropertiesFeatureCatalog();
    assert.equal(catalog.length, 38);

    catalog.forEach((item) => {
      assert.equal(item.pricingPolicy, "NOT CONFIGURED");
      assert.equal(item.taxPolicy, "NOT CONFIGURED");
    });
  });

  it("should enforce central entitlement decision model (ALLOW)", () => {
    const res = checkOproxOsEntitlement({
      tenantId: ctxTenant1UserA.tenantId,
      userId: ctxTenant1UserA.userId,
      capability: "AI_ARCHITECT_PROJECT",
    });

    assert.equal(res.allowed, true);
    assert.equal(res.code, "ALLOW");
    assert.equal(res.source, "OPROX_OS_CENTRAL_AUTHORITY");
    assert.equal(res.authorityStatus, "ENFORCED");
    assert.equal(res.pricingPolicy, "NOT CONFIGURED");
    assert.equal(res.taxPolicy, "NOT CONFIGURED");
    assert.equal(res.vatRate, null);
    assert.equal(res.automaticTaxCalculation, false);
  });

  it("should reject invalid tenant ID or missing user identity (DENY)", () => {
    const resInvalidTenant = checkOproxOsEntitlement({
      tenantId: 0,
      userId: ctxTenant1UserA.userId,
      capability: "PROPERTY_VR",
    });
    assert.equal(resInvalidTenant.allowed, false);
    assert.equal(resInvalidTenant.code, "DENY");

    const resMissingUser = checkOproxOsEntitlement({
      tenantId: 1,
      userId: "",
      capability: "PROPERTY_VR",
    });
    assert.equal(resMissingUser.allowed, false);
    assert.equal(resMissingUser.code, "DENY");
  });

  it("should enforce FAIL-CLOSED behavior when central OPROX OS authority is unavailable", () => {
    const resDown = checkOproxOsEntitlement({
      tenantId: ctxTenant1UserA.tenantId,
      userId: ctxTenant1UserA.userId,
      capability: "INTERIOR_FULL_HOME",
      simulatedAuthorityDown: true,
    });

    assert.equal(resDown.allowed, false);
    assert.equal(resDown.code, "COMMERCIAL_AUTHORITY_UNAVAILABLE");
    assert.equal(resDown.authorityStatus, "UNAVAILABLE");
  });

  it("should enforce FAIL-CLOSED behavior when production persistence store is unavailable", () => {
    const resPersistDown = checkOproxOsEntitlement({
      tenantId: ctxTenant1UserA.tenantId,
      userId: ctxTenant1UserA.userId,
      capability: "AI_ARCHITECT_3D_GENERATION",
      simulatedProductionPersistenceDown: true,
    });

    assert.equal(resPersistDown.allowed, false);
    assert.equal(resPersistDown.code, "COMMERCIAL_AUTHORITY_UNAVAILABLE");
  });

  it("should enforce TRIAL_EXHAUSTED status when trial count is consumed", () => {
    const resTrialExhausted = checkOproxOsEntitlement({
      tenantId: ctxTenant1UserA.tenantId,
      userId: ctxTenant1UserA.userId,
      capability: "AI_ARCHITECT_TRIAL",
      configuredLimits: { trialExhausted: true },
    });

    assert.equal(resTrialExhausted.allowed, false);
    assert.equal(resTrialExhausted.code, "TRIAL_EXHAUSTED");
    assert.equal(resTrialExhausted.trialState?.trialPolicyStatus, "EXHAUSTED");
  });

  it("should enforce LIMIT_REACHED status when configured usage quota is reached", () => {
    // Consume 2 units with limit of 2
    reserveUsageAtomic({
      tenantId: ctxTenant1UserA.tenantId,
      userId: ctxTenant1UserA.userId,
      capability: "INTERIOR_IMAGE_GENERATION",
      operation: "GENERATE_ROOM",
      units: 2,
      maxUnitsLimit: 2,
    });

    const resLimit = checkOproxOsEntitlement({
      tenantId: ctxTenant1UserA.tenantId,
      userId: ctxTenant1UserA.userId,
      capability: "INTERIOR_IMAGE_GENERATION",
      configuredLimits: { maxUnits: 2 },
    });

    assert.equal(resLimit.allowed, false);
    assert.equal(resLimit.code, "LIMIT_REACHED");
    assert.equal(resLimit.usageState?.remainingUnits, 0);
  });

  it("should execute atomic usage reservation and rollback on failure safely", () => {
    const reserve1 = reserveUsageAtomic({
      tenantId: ctxTenant1UserA.tenantId,
      userId: ctxTenant1UserA.userId,
      capability: "PROPERTY_VR",
      operation: "ENTER_VR_SESSION",
      units: 1,
      maxUnitsLimit: 1,
    });

    assert.equal(reserve1.reserved, true);
    assert.ok(reserve1.usageId);

    // Second reservation must be rejected due to limit reached
    const reserve2 = reserveUsageAtomic({
      tenantId: ctxTenant1UserA.tenantId,
      userId: ctxTenant1UserA.userId,
      capability: "PROPERTY_VR",
      operation: "ENTER_VR_SESSION",
      units: 1,
      maxUnitsLimit: 1,
    });

    assert.equal(reserve2.reserved, false);

    // Finalize first usage with failure to trigger rollback
    finalizeUsage(reserve1.usageId!, "FAILED");

    // Retry reservation after rollback
    const reserve3 = reserveUsageAtomic({
      tenantId: ctxTenant1UserA.tenantId,
      userId: ctxTenant1UserA.userId,
      capability: "PROPERTY_VR",
      operation: "ENTER_VR_SESSION",
      units: 1,
      maxUnitsLimit: 1,
    });

    assert.equal(reserve3.reserved, true);
  });

  it("should enforce tenant and user boundaries across entitlement checks and audit logs", () => {
    // User A in Tenant 1 reserves usage
    reserveUsageAtomic({
      tenantId: ctxTenant1UserA.tenantId,
      userId: ctxTenant1UserA.userId,
      capability: "VIRTUAL_STAGING",
      operation: "STAGE_ROOM",
    });

    // User C in Tenant 2 checks audit logs
    const logsTenant1 = getCommercialAuditLogs(ctxTenant1UserA.tenantId);
    const logsTenant2 = getCommercialAuditLogs(ctxTenant2UserC.tenantId);

    assert.ok(logsTenant1.length > 0);
    assert.equal(logsTenant2.length, 0);
  });

  it("should delegate interior-engine entitlement checks to central OPROX OS authority", () => {
    const resInterior = checkInteriorEntitlement(1, "usr_a1", "INTERIOR_FULL_HOME");
    assert.equal(resInterior.allowed, true);
    assert.equal(resInterior.source, "OPROX_OS_AUTHORITY_GATE");
  });

  it("should delegate partner-engine entitlement checks to central OPROX OS authority", () => {
    const resPartner = checkPartnerEntitlement(1, 2001, "PARTNER_RFQ");
    assert.equal(resPartner.allowed, true);
    assert.equal(resPartner.source, "OPROX_OS_AUTHORITY_GATE");
  });

  it("should provide commercial awareness in AI Concierge without inventing prices or taxes", async () => {
    const conciergeRes = await processConciergeRequest([{ role: "user", content: "ورني أسعار الباقات والاشتراكات" }]);
    assert.ok(conciergeRes.reply.includes("NOT CONFIGURED"));
    assert.ok(conciergeRes.actions?.some((a) => a.action === "VIEW_AVAILABLE_PLANS"));
  });

  it("should confirm zero duplicate wallet, billing, or tax engines in commercial summary", () => {
    const summary = getCommercialStatusSummary();
    assert.equal(summary["PRICING POLICY"], "NOT CONFIGURED");
    assert.equal(summary["TAX POLICY"], "NOT CONFIGURED");
    assert.equal(summary["VAT RATE"], "NONE");
    assert.equal(summary["AUTOMATIC TAX CALCULATION"], "DISABLED");
    assert.equal(summary["DUPLICATE WALLET"], "NONE");
    assert.equal(summary["DUPLICATE BILLING ENGINE"], "NONE");
    assert.equal(summary["DUPLICATE TAX ENGINE"], "NONE");
  });
});
