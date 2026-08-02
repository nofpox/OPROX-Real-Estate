import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculatePropertyEstimate,
  calculateInvestmentMetrics,
  generateInvestmentScenarios,
  filterOutliers,
  calculateMedian,
  getDistrictMarketSummary,
} from "../src/lib/oprox-estimate-engine.js";
import { processConciergeRequest } from "../src/lib/ai-concierge-engine.js";

describe("OPROX Estimate & Investment Intelligence Engine Tests (Phase 4)", () => {
  // ── 1. Math & Outlier Detection Tests ─────────────────────────────────────

  it("should calculate median correctly for odd and even lists", () => {
    assert.equal(calculateMedian([10, 20, 30]), 20);
    assert.equal(calculateMedian([10, 20, 30, 40]), 25);
    assert.equal(calculateMedian([]), 0);
  });

  it("should filter price per sqm outliers correctly", () => {
    const candidateListings = [
      { price: 2000000, areaSqm: 500 }, // 4000 SAR/m² (normal)
      { price: 2200000, areaSqm: 500 }, // 4400 SAR/m² (normal)
      { price: 1900000, areaSqm: 500 }, // 3800 SAR/m² (normal)
      { price: 10000000, areaSqm: 200 }, // 50000 SAR/m² (extreme outlier > 3x median)
      { price: 100000, areaSqm: 1000 }, // 100 SAR/m² (extreme outlier < 0.25x median)
    ];

    const filtered = filterOutliers(candidateListings);
    assert.equal(filtered.length, 3);
    assert.ok(filtered.every((l) => l.price / l.areaSqm >= 1000 && l.price / l.areaSqm <= 15000));
  });

  // ── 2. Valuation Engine Tests ─────────────────────────────────────────────

  it("should calculate property estimate with valid inputs", async () => {
    const estimate = await calculatePropertyEstimate({
      propertyType: "villa",
      city: "الرياض",
      district: "النرجس",
      areaSqm: 400,
      bedrooms: 5,
      askingPrice: 3200000,
    });

    assert.ok(estimate.estimatedMidpoint > 0);
    assert.ok(estimate.estimatedLow < estimate.estimatedMidpoint);
    assert.ok(estimate.estimatedHigh > estimate.estimatedMidpoint);
    assert.ok(estimate.estimatedPricePerSqm > 0);
    assert.ok(["HIGH", "MEDIUM", "LOW"].includes(estimate.confidence));
    assert.ok(estimate.factors.length > 0);
    assert.equal(typeof estimate.askingPricePosition, "string");
  });

  it("should handle invalid or zero area safely without crashing or returning NaN", async () => {
    const invalidEst = await calculatePropertyEstimate({
      propertyType: "apartment",
      city: "جدة",
      areaSqm: 0,
    });

    assert.equal(invalidEst.estimatedMidpoint, 0);
    assert.equal(invalidEst.confidence, "INSUFFICIENT_DATA");
    assert.equal(invalidEst.factors[0].type, "uncertainty");
  });

  it("should evaluate asking price position correctly", async () => {
    const estHigh = await calculatePropertyEstimate({
      propertyType: "apartment",
      city: "جدة",
      areaSqm: 100,
      askingPrice: 1500000, // Significantly above market
    });
    assert.equal(estHigh.askingPricePosition, "ABOVE_ESTIMATE");

    const estLow = await calculatePropertyEstimate({
      propertyType: "apartment",
      city: "الرياض",
      areaSqm: 200,
      askingPrice: 400000, // Significantly below market
    });
    assert.equal(estLow.askingPricePosition, "BELOW_ESTIMATE");
  });

  // ── 3. Investment Engine Tests ────────────────────────────────────────────

  it("should calculate investment metrics deterministically", () => {
    const metrics = calculateInvestmentMetrics({
      purchasePrice: 2000000,
      downPaymentPercent: 20,
      interestRateAnnual: 5.5,
      loanTermYears: 20,
      expectedMonthlyRent: 12000,
    });

    assert.equal(metrics.purchasePrice, 2000000);
    assert.equal(metrics.downPaymentSAR, 400000);
    assert.equal(metrics.loanAmountSAR, 1600000);
    assert.ok(metrics.monthlyMortgageSAR > 0);
    assert.equal(metrics.grossAnnualRentSAR, 144000);
    assert.equal(metrics.grossYieldPercent, 7.2);
    assert.ok(metrics.netYieldPercent > 0);
    assert.ok(metrics.netOperatingIncomeAnnualSAR > 0);
  });

  it("should generate 3 investment scenarios (Cash, 20% Down, 30% Down)", () => {
    const scenarios = generateInvestmentScenarios(3000000);

    assert.equal(scenarios.length, 3);
    assert.equal(scenarios[0].metrics.downPaymentSAR, 3000000); // Cash
    assert.equal(scenarios[0].metrics.monthlyMortgageSAR, 0);
    assert.equal(scenarios[1].metrics.downPaymentSAR, 600000); // 20%
    assert.equal(scenarios[2].metrics.downPaymentSAR, 900000); // 30%
  });

  // ── 4. District Summary Tests ─────────────────────────────────────────────

  it("should return district market summary", async () => {
    const summary = await getDistrictMarketSummary("الرياض", "النرجس");

    assert.equal(summary.city, "الرياض");
    assert.ok(summary.medianPrice > 0);
    assert.ok(summary.medianPricePerSqm > 0);
  });

  // ── 5. AI Concierge Valuation Integration Tests ───────────────────────────

  it("should answer valuation queries in AI Concierge with deterministic OPROX Estimate", async () => {
    const response = await processConciergeRequest([
      { role: "user", content: "كم تقييم فيلا 500 متر في حي النرجس بالرياض؟ وهل سعر 3.5 مليون مناسب؟" },
    ]);

    assert.ok(response.reply.includes("OPROX Estimate"));
    assert.ok(response.reply.includes("القيمة التقديرية"));
    assert.ok(response.actions?.some((a) => a.action === "GET_PROPERTY_ESTIMATE"));
  });

  it("should answer investment & rental yield queries in AI Concierge", async () => {
    const response = await processConciergeRequest([
      { role: "user", content: "كم العائد الاستثماري المتوقع لو شريت الشقة بـ 2 مليون وأجرتها؟" },
    ]);

    assert.ok(response.reply.includes("OPROX Investment Intelligence"));
    assert.ok(response.reply.includes("العائد الإجمالي"));
    assert.ok(response.actions?.some((a) => a.action === "CALCULATE_INVESTMENT"));
  });
});
