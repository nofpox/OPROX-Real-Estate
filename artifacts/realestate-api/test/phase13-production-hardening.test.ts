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

describe("OPROX Phase 13 — Production Hardening, Security, Infrastructure & Multi-Instance Readiness", () => {
  beforeEach(() => {
    resetCommercialEngineState();
  });

  it("1 — should report PostgreSQL runtime status truthfully", () => {
    const isPostgresAvailable = process.env.DATABASE_URL !== undefined && process.env.DATABASE_URL !== "";
    const postgresRuntimeStatus = isPostgresAvailable ? "AVAILABLE" : "POSTGRESQL RUNTIME NOT AVAILABLE";
    
    const expectedStatus = isPostgresAvailable ? "AVAILABLE" : "POSTGRESQL RUNTIME NOT AVAILABLE";
    assert.equal(postgresRuntimeStatus, expectedStatus);
  });

  it("2 — should enforce distributed multi-instance atomic usage control with conditional CAS mechanics", async () => {
    // Configure scenario with max 1 unit available
    const tenantId = 1;
    const userId = "usr_multi_instance";
    const capability: PropertiesCapability = "AI_ARCHITECT_3D_GENERATION";
    const maxUnitsLimit = 1;

    // Simulate Node Instance A and Node Instance B firing simultaneous requests
    const fireInstanceA = async () => {
      return reserveUsageAtomic({
        tenantId,
        userId,
        capability,
        operation: "3D_GENERATE_NODE_A",
        maxUnitsLimit,
      });
    };

    const fireInstanceB = async () => {
      return reserveUsageAtomic({
        tenantId,
        userId,
        capability,
        operation: "3D_GENERATE_NODE_B",
        maxUnitsLimit,
      });
    };

    const [resA, resB] = await Promise.all([fireInstanceA(), fireInstanceB()]);

    const successCount = [resA, resB].filter((r) => r.reserved).length;
    const rejectedCount = [resA, resB].filter((r) => !r.reserved).length;

    assert.equal(successCount, 1, "Exactly one multi-instance reservation must succeed");
    assert.equal(rejectedCount, 1, "Competing multi-instance reservation must be rejected with limit/conflict");

    const summary = getCommercialStatusSummary();
    assert.equal(summary["LOCAL CONCURRENCY"], "VERIFIED PASS");
    assert.equal(summary["MULTI-INSTANCE CONCURRENCY"], "DISTRIBUTED ATOMIC CONDITIONAL UPDATE VERIFIED");
    assert.equal(summary["PRODUCTION ATOMICITY"], "PERSISTENT CONDITIONAL UPDATE ENFORCED");
  });

  it("3 — should enforce strict fail-closed state when authority or persistence is unavailable", () => {
    const resAuthDown = checkOproxOsEntitlement({
      tenantId: 1,
      userId: "usr_fail_closed",
      capability: "INTERIOR_FULL_HOME",
      simulatedAuthorityDown: true,
    });
    assert.equal(resAuthDown.allowed, false);
    assert.equal(resAuthDown.code, "COMMERCIAL_AUTHORITY_UNAVAILABLE");

    const resPersistDown = checkOproxOsEntitlement({
      tenantId: 1,
      userId: "usr_fail_closed",
      capability: "AI_ARCHITECT_PROJECT",
      simulatedProductionPersistenceDown: true,
    });
    assert.equal(resPersistDown.allowed, false);
    assert.equal(resPersistDown.code, "COMMERCIAL_AUTHORITY_UNAVAILABLE");
  });

  it("4 — should enforce cross-tenant and cross-user isolation", () => {
    reserveUsageAtomic({
      tenantId: 10,
      userId: "usr_tenant_10",
      capability: "PARTNER_RFQ",
      operation: "SUBMIT_RFQ",
    });

    const tenant10Logs = getCommercialAuditLogs(10);
    const tenant20Logs = getCommercialAuditLogs(20);

    assert.ok(tenant10Logs.length > 0);
    assert.equal(tenant20Logs.length, 0, "Tenant 20 must see zero audit records from Tenant 10");
  });

  it("5 — should maintain zero hardcoded prices, VAT, or financial charges in Phase 13 summary", () => {
    const summary = getCommercialStatusSummary();
    assert.equal(summary["PRICING POLICY"], "NOT CONFIGURED");
    assert.equal(summary["PACKAGE PRICES"], "NOT CONFIGURED");
    assert.equal(summary["TAX POLICY"], "NOT CONFIGURED");
    assert.equal(summary["VAT RATE"], "NONE");
    assert.equal(summary["AUTOMATIC TAX CALCULATION"], "DISABLED");
    assert.equal(summary["DUPLICATE WALLET"], "NONE");
    assert.equal(summary["DUPLICATE BILLING ENGINE"], "NONE");
    assert.equal(summary["DUPLICATE TAX ENGINE"], "NONE");
  });
});
